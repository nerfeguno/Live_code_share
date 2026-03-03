import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";

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

document.getElementById("createRoomBtn").addEventListener("click", createRoom);
document.getElementById("joinRoomBtn").addEventListener("click", joinRoom);
document.getElementById("exitBtn").addEventListener("click", exitRoom);

languageSelect.addEventListener("change", () => {
    const lang = languageSelect.value;
    Editor.setEditorLanguage(lang);
    // Sync language choice to other users via Awareness
    if (provider) {
        provider.awareness.setLocalStateField("language", lang);
    }
});

window.addEventListener("load", () => {
    const savedRoom = localStorage.getItem("roomId");
    if (savedRoom) {
        roomId = savedRoom;
        joinRoomById(roomId);
    }
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

    // 1. Initialize Monaco Editor
    await Editor.initializeEditor(languageSelect.value);

    // 2. Setup Yjs
    ydoc = new Y.Doc();
    const WS_URL = location.hostname === "localhost"
        ? "ws://localhost:1234"
        : "wss://your-production-url.com";

    provider = new WebsocketProvider(WS_URL, roomId, ydoc);

    // 3. Bind Yjs to Monaco
    const yText = ydoc.getText("monaco");
    binding = new MonacoBinding(
        yText,
        Editor.getEditorInstance().getModel(),
        new Set([Editor.getEditorInstance()]),
        provider.awareness
    );

    // 4. Handle Language Syncing via Awareness
    provider.awareness.on("change", () => {
        const states = Array.from(provider.awareness.getStates().values());
        const remoteState = states.find(s => s.language);
        if (remoteState && remoteState.language !== languageSelect.value) {
            Editor.setEditorLanguage(remoteState.language);
            languageSelect.value = remoteState.language;
        }
    });

    provider.on("status", (event) => {
        updateConnectionStatus(event.status);
    });

    enterRoom();
}

function exitRoom() {
    if (binding) binding.destroy();
    if (provider) provider.destroy();
    if (ydoc) ydoc.destroy();

    localStorage.removeItem("roomId");
    location.reload(); // Cleanest way to reset the editor state
}

function enterRoom() {
    lobby.classList.add("hidden");
    app.classList.remove("hidden");
    roomIdLabel.textContent = roomId;
}

function updateConnectionStatus(status) {
    connectionStatus.className = "connection-status " + status;
    connectionStatus.textContent = status.charAt(0).toUpperCase() + status.slice(1);
}