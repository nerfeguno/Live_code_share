import { WebSocketServer } from "ws";
import { createServer } from "http";
import { parse } from "url";
import crypto from "crypto";

const PORT = process.env.PORT || 8080;

const MAX_ROOM_SIZE = 10;
const ROOM_EXPIRY = 24 * 60 * 60 * 1000;

const server = createServer((req, res) => {

    const { pathname } = parse(req.url || "");

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }

    if (pathname === "/health") {

        res.writeHead(200, {
            "Content-Type": "application/json"
        });

        res.end(JSON.stringify({

            status: "ok",
            rooms: rooms.size,
            clients: wss.clients.size,
            time: Date.now()

        }));

        return;
    }

    res.writeHead(404);
    res.end();

});


const wss = new WebSocketServer({ server });

const rooms = new Map();


setInterval(() => {

    const now = Date.now();

    for (const [id, room] of rooms.entries()) {

        if (
            room.clients.size === 0 &&
            now - room.lastAccessed > ROOM_EXPIRY
        ) {

            rooms.delete(id);

            console.log("Deleted room:", id);

        }

    }

}, 60 * 60 * 1000);


wss.on("connection", (ws) => {

    ws.clientId =
        crypto.randomBytes(16).toString("hex");

    ws.room = null;


    ws.send(JSON.stringify({

        type: "connected",
        clientId: ws.clientId

    }));


    const ping = setInterval(() => {

        if (ws.readyState === 1) {
            ws.ping();
        }

    }, 30000);


    ws.on("message", (msg) => {

        try {

            const data =
                JSON.parse(msg.toString());

            handleMessage(ws, data);

        } catch {

            sendError(ws, "Invalid JSON");

        }

    });


    ws.on("close", () => {

        clearInterval(ping);

        handleLeave(ws);

    });

});


function handleMessage(ws, data) {

    switch (data.type) {

        case "create":
            handleCreate(ws);
            break;

        case "join":
            handleJoin(ws, data.room);
            break;

        case "code-update":
            handleCodeUpdate(ws, data.code);
            break;

        case "language-update":
            handleLanguageUpdate(ws, data.language);
            break;

        case "leave":
            handleLeave(ws);
            break;

    }

}


function handleCreate(ws) {

    const roomId =
        crypto.randomBytes(4).toString("hex");

    rooms.set(roomId, {

        content: "",
        language: "javascript",
        clients: new Set(),
        lastAccessed: Date.now()

    });

    ws.room = roomId;

    rooms.get(roomId)
        .clients.add(ws.clientId);


    ws.send(JSON.stringify({

        type: "room-created",
        room: roomId

    }));

}


function handleJoin(ws, roomId) {

    if (!rooms.has(roomId)) {

        sendError(ws, "Room not found");
        return;

    }

    const room = rooms.get(roomId);

    if (room.clients.size >= MAX_ROOM_SIZE) {

        sendError(ws, "Room full");
        return;

    }

    ws.room = roomId;

    room.clients.add(ws.clientId);

    room.lastAccessed = Date.now();


    ws.send(JSON.stringify({

        type: "room-joined",
        room: roomId,
        code: room.content,
        language: room.language

    }));


    broadcastToRoom(roomId, ws, {

        type: "peer_joined",
        clientId: ws.clientId

    });

}


function handleCodeUpdate(ws, code) {

    if (!ws.room) return;

    if (!rooms.has(ws.room)) return;

    const room =
        rooms.get(ws.room);

    room.content = code || "";

    room.lastAccessed = Date.now();


    broadcastToRoom(ws.room, ws, {

        type: "code-update",
        code: room.content,
        sender: ws.clientId

    });

}


function handleLanguageUpdate(ws, language) {

    if (!ws.room) return;

    const room =
        rooms.get(ws.room);

    room.language = language;

    broadcastToRoom(ws.room, ws, {

        type: "language-update",
        language

    });

}


function handleLeave(ws) {

    if (!ws.room) return;

    if (!rooms.has(ws.room)) return;

    const room =
        rooms.get(ws.room);

    room.clients.delete(ws.clientId);

    ws.room = null;

}


function broadcastToRoom(roomId, sender, message) {

    const msg =
        JSON.stringify(message);

    for (const client of wss.clients) {

        if (
            client !== sender &&
            client.readyState === 1 &&
            client.room === roomId
        ) {

            client.send(msg);

        }

    }

}


function sendError(ws, message) {

    if (ws.readyState === 1) {

        ws.send(JSON.stringify({

            type: "error",
            message

        }));

    }

}


server.listen(PORT, () => {

    console.log(
        "Server running on port",
        PORT
    );

});