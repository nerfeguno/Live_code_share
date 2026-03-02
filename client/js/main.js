const lobby = document.getElementById("lobby");
const app = document.getElementById("app");

const createBtn = document.getElementById("createRoomBtn");
const joinBtn = document.getElementById("joinRoomBtn");
const roomInput = document.getElementById("roomInput");

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8);
}

createBtn.onclick = () => {
    const code = generateRoomCode();
    startApp(code);
};

joinBtn.onclick = () => {
    const code = roomInput.value.trim();
    if (!code) return;
    startApp(code);
};

function startApp(room) {

    lobby.classList.add("hidden");
    app.classList.remove("hidden");

    document.getElementById("roomLabel").textContent =
        "room: " + room;

    createEditor();
    connect(room);
}


let ws;
let isRemote = false;

function connect(room) {

    ws = new WebSocket("ws://localhost:8080");

    ws.onopen = () => {
        ws.send(JSON.stringify({
            type: "join",
            room
        }));
    };

    ws.onmessage = (e) => {

        const data = JSON.parse(e.data);
        const editor = getEditor();

        if (!editor) return;

        if (data.type === "init") {
            isRemote = true;
            editor.setValue(data.text || "");
            isRemote = false;
        }

        if (data.type === "edit") {
            isRemote = true;
            editor.setValue(data.text);
            isRemote = false;
        }
    };

    const wait = setInterval(() => {

        const editor = getEditor();
        if (!editor) return;

        clearInterval(wait);

        editor.onDidChangeModelContent(() => {

            if (isRemote) return;

            ws.send(JSON.stringify({
                type: "edit",
                text: editor.getValue()
            }));

        });

    }, 40);
}