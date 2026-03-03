import http from "http";
import { WebSocketServer } from "ws";
import { setupWSConnection } from "y-websocket";
import { parse } from "url";

const PORT = process.env.PORT || 8080;

/**
 * HTTP SERVER (health + CORS)
 */
const server = http.createServer((req, res) => {
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
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
            JSON.stringify({
                status: "ok",
                clients: wss.clients.size,
                uptime: process.uptime(),
                timestamp: Date.now(),
            })
        );
        return;
    }

    res.writeHead(404);
    res.end();
});

/**
 * WEBSOCKET SERVER (Yjs)
 */
const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
    console.log("Client connected");

    setupWSConnection(ws, req);

    ws.on("close", () => {
        console.log("Client disconnected");
    });
});

/**
 * START
 */
server.listen(PORT, () => {
    console.log(`Yjs WebSocket server running on port ${PORT}`);
});