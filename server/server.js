const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");

const wss = new WebSocket.Server({ port: 3000 });

const rooms = {};

wss.on("connection", (ws) => {
    ws.id = uuidv4();

    ws.on("message", (message) => {
        let data;
        try { data = JSON.parse(message); } catch (e) { return; }

        if (data.type === "create") {
            const roomId = uuidv4().split("-")[0];
            rooms[roomId] = rooms[roomId] || [];
            rooms[roomId].push(ws);
            ws.send(JSON.stringify({ type: "room-created", room: roomId }));
        }

        if (data.type === "join" && data.room) {
            const room = rooms[data.room];
            if (room) {
                room.push(ws);
                ws.send(JSON.stringify({ type: "room-joined", room: data.room }));
            }
        }

        if (data.type === "code-update" && data.room) {
            const room = rooms[data.room];
            if (room) {
                room.forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(data));
                    }
                });
            }
        }
    });

    ws.on("close", () => {
        for (const roomId in rooms) {
            rooms[roomId] = rooms[roomId].filter(client => client !== ws);
            if (rooms[roomId].length === 0) delete rooms[roomId];
        }
    });
});

console.log("WebSocket server running at ws://localhost:3000");