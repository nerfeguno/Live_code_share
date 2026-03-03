import { WebSocketServer } from "ws";
import { createServer } from "http";
import { setupWSConnection } from "y-websocket/bin/utils";

const PORT = process.env.PORT || 1234;

const server = createServer((req, res) => {
    if (req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", time: Date.now() }));
        return;
    }
    res.writeHead(404);
    res.end();
});

const wss = new WebSocketServer({ server });

wss.on("connection", (conn, req) => {
    setupWSConnection(conn, req);
    console.log("New connection established via Yjs");
});

server.listen(PORT, () => {
    console.log(`✅ Yjs Relay Server running on port ${PORT}`);
});