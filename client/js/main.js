import * as Y from "https://esm.sh/yjs@13.6.8";
import { WebsocketProvider } from "https://esm.sh/y-websocket@1.5.0?deps=yjs@13.6.8";
import { MonacoBinding } from "https://esm.sh/y-monaco@0.1.6?deps=yjs@13.6.8";


let roomId = null;
let ydoc = null;
let provider = null;
let binding = null;

const lobby = document.getElementById("lobby");
const app = document.getElementById("app");
const roomIdInput = document.getElementById("roomIdInput");
const roomIdLabel = document.getElementById("roomIdLabel");
const connectionStatus = document.getElementById("connectionStatus");
const languageSelect = document.getElementById("languageSelect");

function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `${type === "success" ? "✅" : "⚠️"} ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

document.getElementById("createRoomBtn").addEventListener("click", createRoom);
document.getElementById("joinRoomBtn").addEventListener("click", joinRoom);
document.getElementById("exitBtn").addEventListener("click", exitRoom);

languageSelect.addEventListener("change", () => {
    const lang = languageSelect.value;
    Editor.setEditorLanguage(lang);
    if (provider) provider.awareness.setLocalStateField("language", lang);
});

window.addEventListener("load", () => {
    const savedRoom = localStorage.getItem("roomId");
    if (savedRoom) joinRoomById(savedRoom);
});

function createRoom() {
    roomId = crypto.randomUUID().slice(0, 8);
    joinRoomById(roomId);
}

function joinRoom() {
    const input = roomIdInput.value.trim();
    if (!input) return alert("Enter Room ID");
    roomId = input;
    joinRoomById(roomId);
}

async function joinRoomById(id) {
    roomId = id;
    localStorage.setItem("roomId", roomId);

    await Editor.initializeEditor(languageSelect.value);

    ydoc = new Y.Doc();

    const WS_URL = location.hostname === "localhost"
        ? "ws://localhost:1234"
        : "wss://live-code-share-ld0g.onrender.com";

    console.log(`[Yjs] Connecting to ${WS_URL} room: ${roomId}`);

    provider = new WebsocketProvider(WS_URL, roomId, ydoc, {
        connect: true
    });

    const yText = ydoc.getText("monaco");
    binding = new MonacoBinding(
        yText,
        Editor.getEditorInstance().getModel(),
        new Set([Editor.getEditorInstance()]),
        provider.awareness
    );

    provider.on("status", ({ status }) => {
        console.log(`[Yjs] Status changed → ${status}`);
        updateConnectionStatus(status);

        if (status === "connected") {
            showToast("✅ Connected to room!", "success");
        }
        if (status === "disconnected") {
            showToast("⚠️ Disconnected. Reconnecting...", "error");
        }
    });

    setTimeout(() => {
        if (provider && provider.ws && provider.ws.readyState !== WebSocket.OPEN) {
            console.log("[Yjs] Force reconnect...");
            provider.connect();
        }
    }, 8000);

    provider.awareness.on("change", () => {
        const states = Array.from(provider.awareness.getStates().values());
        const remote = states.find(s => s.language && s.language !== languageSelect.value);
        if (remote) {
            Editor.setEditorLanguage(remote.language);
            languageSelect.value = remote.language;
        }
    });

    enterRoom();
}

function exitRoom() {
    if (binding) binding.destroy();
    if (provider) provider.destroy();
    if (ydoc) ydoc.destroy();
    localStorage.removeItem("roomId");
    location.reload();
}

function enterRoom() {
    lobby.classList.add("hidden");
    app.classList.remove("hidden");
    roomIdLabel.textContent = roomId;
}

function updateConnectionStatus(status) {
    connectionStatus.className = `connection-status ${status}`;
    let text = status.charAt(0).toUpperCase() + status.slice(1);
    if (status === "connecting") text = "Connecting... (waking server)";
    connectionStatus.textContent = text;
}