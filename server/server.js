import { WebSocketServer } from "ws";
import { createServer } from "http";
import { parse } from "url";
import crypto from "crypto";

const PORT = process.env.PORT || 8080;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
    'http://localhost:3000,https://live-code-share-theta.vercel.app').split(',');

const server = createServer((req, res) => {
    const { pathname } = parse(req.url || "");

    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (pathname === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            status: "ok",
            timestamp: Date.now(),
            connections: wss.clients.size,
            rooms: Array.from(rooms.keys()).length
        }));
        return;
    }

    res.writeHead(404);
    res.end();
});

const wss = new WebSocketServer({
    server,
    verifyClient: (info, cb) => {
        const origin = info.origin;
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            cb(true);
        } else {
            console.log('Rejected connection from origin:', origin);
            cb(false, 403, 'Forbidden');
        }
    }
});

const rooms = new Map();
const MAX_ROOM_SIZE = 10;
const ROOM_EXPIRY = 24 * 60 * 60 * 1000;

setInterval(() => {
    const now = Date.now();
    for (const [roomId, room] of rooms.entries()) {
        if (room.clients.size === 0 && (now - room.lastAccessed) > ROOM_EXPIRY) {
            rooms.delete(roomId);
            console.log(`Cleaned up inactive room: ${roomId}`);
        }
    }
}, 60 * 60 * 1000);

wss.on("connection", (ws, req) => {
    console.log(`Client connected from ${req.socket.remoteAddress}`);

    ws.clientId = crypto.randomBytes(16).toString("hex");
    ws.room = null;

    const pingInterval = setInterval(() => {
        if (ws.readyState === 1) {
            ws.ping();
        }
    }, 30000);

    ws.on("message", (msg) => {
        try {
            const data = JSON.parse(msg.toString());
            handleMessage(ws, data);
        } catch (error) {
            console.error("Error parsing message:", error);
            sendError(ws, "Invalid message format");
        }
    });

    ws.on("close", () => {
        console.log(`Client ${ws.clientId} disconnected from room: ${ws.room}`);
        clearInterval(pingInterval);
        if (ws.room && rooms.has(ws.room)) {
            const room = rooms.get(ws.room);
            room.clients.delete(ws.clientId);
            broadcastToRoom(ws.room, ws, {
                type: "peer_left",
                clientId: ws.clientId,
                clients: Array.from(room.clients)
            });
        }
    });

    ws.on("error", (error) => {
        console.error(`WebSocket error for client ${ws.clientId}:`, error);
    });

    ws.send(JSON.stringify({
        type: "connected",
        clientId: ws.clientId,
        message: "Connected to server"
    }));
});

function handleMessage(ws, data) {
    switch (data.type) {
        case "join":
            handleJoin(ws, data.room);
            break;
        case "edit":
            handleEdit(ws, data.text, data.cursor);
            break;
        case "cursor":
            handleCursor(ws, data.position);
            break;
        case "leave":
            handleLeave(ws);
            break;
        default:
            console.log(`Unknown message type: ${data.type}`);
    }
}

function handleJoin(ws, roomId) {
    if (!roomId || typeof roomId !== "string" || roomId.length > 50) {
        sendError(ws, "Invalid room ID");
        return;
    }

    roomId = roomId.replace(/[^a-zA-Z0-9_-]/g, "");

    if (!rooms.has(roomId)) {
        rooms.set(roomId, {
            content: "",
            lastAccessed: Date.now(),
            clients: new Set(),
            language: "javascript"
        });
    }

    const room = rooms.get(roomId);

    if (room.clients.size >= MAX_ROOM_SIZE) {
        sendError(ws, "Room is full");
        return;
    }

    if (ws.room && rooms.has(ws.room)) {
        const prevRoom = rooms.get(ws.room);
        prevRoom.clients.delete(ws.clientId);
    }

    ws.room = roomId;
    room.clients.add(ws.clientId);
    room.lastAccessed = Date.now();

    ws.send(JSON.stringify({
        type: "init",
        text: room.content,
        language: room.language,
        clients: Array.from(room.clients)
    }));

    broadcastToRoom(roomId, ws, {
        type: "peer_joined",
        clientId: ws.clientId,
        clients: Array.from(room.clients)
    });
}

function handleEdit(ws, text, cursor = null) {
    if (!ws.room || !rooms.has(ws.room)) return;

    const room = rooms.get(ws.room);
    if (text && text.length > 10 * 1024 * 1024) {
        sendError(ws, "Content too large");
        return;
    }
    room.content = text || "";
    room.lastAccessed = Date.now();

    broadcastToRoom(ws.room, ws, {
        type: "edit",
        text: text,
        cursor: cursor,
        clientId: ws.clientId
    });
}

function handleCursor(ws, position) {
    if (!ws.room || !rooms.has(ws.room)) return;

    broadcastToRoom(ws.room, ws, {
        type: "cursor",
        position: position,
        clientId: ws.clientId
    });
}

function handleLeave(ws) {
    if (ws.room && rooms.has(ws.room)) {
        const room = rooms.get(ws.room);
        room.clients.delete(ws.clientId);
        broadcastToRoom(ws.room, ws, {
            type: "peer_left",
            clientId: ws.clientId,
            clients: Array.from(room.clients)
        });
        ws.room = null;
    }
}

function broadcastToRoom(roomId, senderWs, message) {
    if (!rooms.has(roomId)) return;
    const messageStr = JSON.stringify(message);
    for (const client of wss.clients) {
        if (client !== senderWs && client.readyState === 1 && client.room === roomId) {
            try {
                client.send(messageStr);
            } catch (error) {
                console.error(`Error broadcasting to client:`, error);
            }
        }
    }
}

function sendError(ws, message) {
    if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: "error", message }));
    }
}

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});