let socket;
let roomId = null;

const lobby = document.getElementById("lobby");
const app = document.getElementById("app");
const roomIdInput = document.getElementById("roomIdInput");
const roomIdLabel = document.getElementById("roomIdLabel");
const connectionStatus = document.getElementById("connectionStatus");
const languageSelect = document.getElementById("languageSelect");

document.getElementById("createRoomBtn").addEventListener("click", createRoom);
document.getElementById("joinRoomBtn").addEventListener("click", joinRoom);
languageSelect.addEventListener("change", () => {
    Editor.setEditorLanguage(languageSelect.value);
});

function createRoom() {
    socket = new WebSocket("wss://live-code-share-ld0g.onrender.com");
    socket.addEventListener("open", () => {
        socket.send(JSON.stringify({ type: "create" }));
    });
    setupSocket();
}

function joinRoom() {
    roomId = roomIdInput.value.trim();
    if (!roomId) return alert("Enter Room ID");
    socket = new WebSocket("ws://localhost:3000");
    socket.addEventListener("open", () => {
        socket.send(JSON.stringify({ type: "join", room: roomId }));
    });
    setupSocket();
}

function setupSocket() {
    socket.addEventListener("message", (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "room-created") {
            roomId = data.room;
            enterRoom();
        } else if (data.type === "room-joined") {
            enterRoom();
        } else if (data.type === "code-update" && data.sender !== socket.id) {
            Editor.setEditorContent(data.code);
        }
    });

    socket.addEventListener("open", () => {
        updateConnectionStatus("connected");
    });
    socket.addEventListener("close", () => {
        updateConnectionStatus("disconnected");
    });

    Editor.initializeEditor(languageSelect.value);
    Editor.getEditorContent && setInterval(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "code-update", room: roomId, code: Editor.getEditorContent(), sender: socket.id }));
        }
    }, 500);
}

function enterRoom() {
    lobby.classList.add("hidden");
    app.classList.remove("hidden");
    roomIdLabel.textContent = roomId;
}

function updateConnectionStatus(status) {
    connectionStatus.className = "connection-status " + status;
    connectionStatus.querySelector(".status-dot");
    connectionStatus.textContent = status.charAt(0).toUpperCase() + status.slice(1);
}