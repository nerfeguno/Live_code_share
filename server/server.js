import { WebSocketServer } from "ws";

const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: PORT });

const rooms = new Map();

wss.on("connection", ws => {

    ws.on("message", msg => {
        let data;

        try {
            data = JSON.parse(msg.toString());
        } catch {
            return;
        }

        if (data.type === "join") {
            ws.room = data.room;

            if (!rooms.has(ws.room)) {
                rooms.set(ws.room, "");
            }

            ws.send(JSON.stringify({
                type: "init",
                text: rooms.get(ws.room)
            }));

            return;
        }

        if (data.type === "edit") {

            if (!ws.room) return;

            rooms.set(ws.room, data.text);

            for (const client of wss.clients) {
                if (
                    client !== ws &&
                    client.readyState === 1 &&
                    client.room === ws.room
                ) {
                    client.send(JSON.stringify({
                        type: "edit",
                        text: data.text
                    }));
                }
            }
        }
    });

});

console.log("WebSocket server running at ws://localhost:8080");