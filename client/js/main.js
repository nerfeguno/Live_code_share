const lobby = document.getElementById("lobby");
const app = document.getElementById("app");
const createBtn = document.getElementById("createRoomBtn");
const joinBtn = document.getElementById("joinRoomBtn");
const roomInput = document.getElementById("roomInput");
const languageSelect = document.getElementById("languageSelect");
const peersList = document.getElementById("peersList");
const connectionStatus = document.getElementById("connectionStatus");

let ws;
let isRemote = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let currentRoom = null;
let reconnectTimeout = null;
let heartBeatInterval = null;

function setConnectionStatus(status, message) {
    if (connectionStatus) {
        connectionStatus.className = `status ${status}`;
        connectionStatus.textContent = message || status;
    }
}

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateSecureRoomCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    const array = new Uint8Array(6);
    crypto.getRandomValues(array);
    array.forEach(num => {
        code += chars[num % chars.length];
    });
    return code;
}

createBtn.onclick = () => {
    const code = generateSecureRoomCode();
    startApp(code);
};

joinBtn.onclick = () => {
    const code = roomInput.value.trim().toUpperCase();
    if (!code) {
        showNotification("Please enter a room code", "error");
        return;
    }
    if (code.length !== 6) {
        showNotification("Room code must be 6 characters", "warning");
        return;
    }
    startApp(code);
};

roomInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        joinBtn.click();
    }
});

function copyRoomLink() {
    const url = new URL(window.location.href);
    url.searchParams.set("room", currentRoom);

    navigator.clipboard.writeText(url.toString()).then(() => {
        showNotification("Room link copied to clipboard!", "success");
    }).catch(() => {
        showNotification("Failed to copy link", "error");
    });
}

function showNotification(message, type = "info") {
    console.log(`[${type}] ${message}`);

    if (type === "error") {
        alert(`Error: ${message}`);
    }
}

function startApp(room) {
    currentRoom = room;

    const url = new URL(window.location.href);
    url.searchParams.set("room", room);
    window.history.pushState({}, "", url);

    lobby.classList.add("hidden");
    app.classList.remove("hidden");

    document.getElementById("roomLabel").innerHTML = `
    <span class="room-code">${room}</span>
    <button class="copy-btn" onclick="copyRoomLink()" title="Copy room link">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
    </button>
  `;

    createEditor();
    connect(room);

    const editor = getEditor();
    const saved = localStorage.getItem(`room_${room}`);
    if (saved) {
        editor.setValue(saved);
    }

    setInterval(() => {
        if (editor && currentRoom) {
            localStorage.setItem(`room_${currentRoom}`, editor.getValue());
        }
    }, 30000);
}

function connect(room) {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        setConnectionStatus("disconnected", "Failed to connect");
        showNotification("Unable to connect to server. Please refresh the page.", "error");
        return;
    }

    setConnectionStatus("connecting", "Connecting...");

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log("WebSocket connected");
        setConnectionStatus("connected", "Connected");
        reconnectAttempts = 0;

        ws.send(JSON.stringify({
            type: "join",
            room: room
        }));

        heartBeatInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "ping" }));
            }
        }, 30000);
    };

    ws.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            handleWebSocketMessage(data);
        } catch (error) {
            console.error("Error parsing message:", error);
        }
    };

    ws.onclose = () => {
        console.log("WebSocket disconnected");
        setConnectionStatus("disconnected", "Reconnecting...");

        clearInterval(heartBeatInterval);

        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);

        reconnectTimeout = setTimeout(() => {
            if (currentRoom) {
                connect(currentRoom);
            }
        }, delay);
    };

    ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setConnectionStatus("error", "Connection error");
    };
}

function handleWebSocketMessage(data) {
    const editor = getEditor();

    if (!editor) return;

    switch (data.type) {
        case "init":
            isRemote = true;
            editor.setValue(data.text || "");
            isRemote = false;

            if (data.language && languageSelect) {
                languageSelect.value = data.language;
                monaco.editor.setModelLanguage(editor.getModel(), data.language);
            }

            if (data.clients) {
                updatePeersList(data.clients);
            }
            break;

        case "edit":
            isRemote = true;
            editor.setValue(data.text);
            isRemote = false;
            break;

        case "cursor":

            break;

        case "peer_joined":
        case "peer_left":
            updatePeersList(data.clients);
            showNotification(
                data.type === "peer_joined" ? "New user joined" : "User left",
                "info"
            );
            break;

        case "error":
            showNotification(data.message, "error");
            break;

        case "connected":
            console.log("Server connection confirmed:", data.message);
            break;
    }
}

function updatePeersList(clients) {
    if (!peersList) return;

    const count = clients?.length || 1;
    peersList.innerHTML = `
    <div class="peers-header">
      <span>Connected (${count})</span>
    </div>
    <div class="peers-list">
      ${clients?.map(id => `
        <div class="peer-item">
          <span class="peer-dot"></span>
          <span class="peer-id">${id.substring(0, 8)}...</span>
        </div>
      `).join("")}
    </div>
  `;
}

window.addEventListener("beforeunload", () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "leave" }));
    }
    clearTimeout(reconnectTimeout);
    clearInterval(heartBeatInterval);
});

window.addEventListener("load", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get("room");

    if (roomParam) {
        roomInput.value = roomParam;
        startApp(roomParam);
    }
});