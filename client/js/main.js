import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";


let roomId = null;
let ydoc = null;
let provider = null;

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
});

window.addEventListener("load", () => {
    const savedRoom = localStorage.getItem("roomId");
    if (!savedRoom) return;
    roomId = savedRoom;
    joinRoomById(roomId);
});

function createRoom() {
    roomId = crypto.randomUUID().slice(0, 8);
    localStorage.setItem("roomId", roomId);
    joinRoomById(roomId);
}

function joinRoom() {
    const input = roomIdInput.value.trim();
    if (!input) return alert("Enter Room ID");
    roomId = input;
    localStorage.setItem("roomId", roomId);
    joinRoomById(roomId);
}

async function joinRoomById(roomId) {
    await Editor.initializeEditor(languageSelect.value);

    ydoc = new Y.Doc();

    const WS_URL =
        location.hostname === "localhost"
            ? "ws://localhost:1234"
            : "wss://live-code-share-ld0g.onrender.com";

    provider = new WebsocketProvider(WS_URL, roomId, ydoc);

    const yText = ydoc.getText("monaco");
    new MonacoBinding(yText, Editor.getEditorInstance().getModel(), new Set([Editor.getEditorInstance()]), provider.awareness);

    provider.awareness.setLocalStateField("language", languageSelect.value);
    provider.awareness.on("change", () => {
        const states = Array.from(provider.awareness.getStates().values());
        if (states.length > 0 && states[0].language) {
            Editor.setEditorLanguage(states[0].language);
            languageSelect.value = states[0].language;
        }
    });

    enterRoom();
    updateConnectionStatus("connected");

    provider.on("status", (event) => {
        updateConnectionStatus(event.status);
    });
}

function exitRoom() {
    if (provider) provider.destroy();
    if (ydoc) ydoc.destroy();

    roomId = null;
    localStorage.removeItem("roomId");

    app.classList.add("hidden");
    lobby.classList.remove("hidden");
    roomIdLabel.textContent = "";
    updateConnectionStatus("disconnected");
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