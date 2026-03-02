const lobby = document.getElementById("lobby");
const app = document.getElementById("app");
const createBtn = document.getElementById("createRoomBtn");
const joinBtn = document.getElementById("joinRoomBtn");
const roomInput = document.getElementById("roomInput");
const connectionStatus = document.getElementById("connectionStatus");
const shareMenu = document.getElementById("shareMenu");
const peersSidebar = document.getElementById("peersSidebar");
const peersList = document.getElementById("peersList");
const userCountSpan = document.getElementById("userCount");

let ws;
let isRemote = false;
let currentRoom = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let peers = new Map();

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getWebSocketUrl() {
    if (window.location.hostname === 'live-code-share-theta.vercel.app') {
        return 'wss://live-code-share-ld0g.onrender.com';
    }

    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'ws://localhost:8080';
    }

    return 'wss://live-code-share-ld0g.onrender.com';
}

window.copyRoomLink = function () {
    const url = new URL(window.location.href);
    url.searchParams.set("room", currentRoom);
    const link = url.toString();

    navigator.clipboard.writeText(link).then(() => {
        showToast('Link copied to clipboard!', 'success');

        const copyBtn = document.querySelector('.copy-btn');
        if (copyBtn) {
            copyBtn.classList.add('copied');
            setTimeout(() => copyBtn.classList.remove('copied'), 2000);
        }
    }).catch(() => {
        showToast('Failed to copy link', 'error');
    });
};

window.toggleShareMenu = function () {
    const linkInput = document.getElementById('shareLinkInput');
    if (linkInput) {
        linkInput.value = window.location.href;
    }

    if (currentRoom) {
        generateQRCode(currentRoom);
    }

    shareMenu.classList.toggle('open');
};

window.copyShareLink = function () {
    const input = document.getElementById('shareLinkInput');
    input.select();
    navigator.clipboard.writeText(input.value).then(() => {
        showToast('Link copied!', 'success');
    });
};

function generateQRCode(roomCode) {
    const url = `${window.location.origin}?room=${roomCode}`;
    const qrContainer = document.getElementById('qrCodeContainer');
    if (qrContainer) {
        qrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}" alt="QR Code">`;
    }
}

window.downloadQR = function () {
    const qrImg = document.querySelector('#qrCodeContainer img');
    if (qrImg) {
        const link = document.createElement('a');
        link.download = `room-${currentRoom}-qr.png`;
        link.href = qrImg.src;
        link.click();
        showToast('QR code downloaded', 'success');
    }
};

window.shareVia = function (platform) {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Join my coding session in room: ${currentRoom}`);

    let shareUrl = '';

    switch (platform) {
        case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
            break;
        case 'whatsapp':
            shareUrl = `https://wa.me/?text=${text}%20${url}`;
            break;
    }

    if (shareUrl) {
        window.open(shareUrl, '_blank', 'width=600,height=400');
    }
};

window.togglePeersSidebar = function () {
    peersSidebar.classList.toggle('open');
};

function updatePeersList(clients) {
    peersList.innerHTML = '';
    if (userCountSpan) {
        userCountSpan.textContent = clients.length;
    }

    clients.forEach(clientId => {
        const peerItem = document.createElement('div');
        peerItem.className = 'peer-item';
        peerItem.innerHTML = `
            <i class="fas fa-circle peer-dot"></i>
            <span class="peer-id">${clientId.substring(0, 8)}...</span>
        `;
        peersList.appendChild(peerItem);
    });
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';

    toast.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function setConnectionStatus(status) {
    if (connectionStatus) {
        connectionStatus.className = `connection-status ${status}`;
        const textEl = connectionStatus.querySelector('.status-text');

        if (textEl) {
            textEl.textContent = status.charAt(0).toUpperCase() + status.slice(1);
        }
    }
}

createBtn.onclick = () => {
    const code = generateRoomCode();
    startApp(code);
};

joinBtn.onclick = () => {
    const code = roomInput.value.trim().toUpperCase();
    if (!code) {
        showToast('Please enter a room code', 'error');
        return;
    }
    startApp(code);
};

roomInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        joinBtn.click();
    }
});

function startApp(room) {
    currentRoom = room;

    const url = new URL(window.location.href);
    url.searchParams.set("room", room);
    window.history.pushState({}, "", url);

    lobby.classList.add("hidden");
    app.classList.remove("hidden");

    document.getElementById("roomLabel").innerHTML = `
        <div class="room-info">
            <span class="room-label">Room:</span>
            <span class="room-code">${room}</span>
        </div>
        <div class="room-actions">
            <button class="icon-btn copy-btn" onclick="copyRoomLink()" data-tooltip="Copy link">
                <i class="fas fa-copy"></i>
            </button>
            <button class="icon-btn share-btn" onclick="toggleShareMenu()" data-tooltip="Share">
                <i class="fas fa-share-alt"></i>
            </button>
            <button class="icon-btn users-btn" onclick="togglePeersSidebar()" data-tooltip="Users">
                <i class="fas fa-users"></i>
                <span class="badge">1</span>
            </button>
        </div>
    `;

    createEditor();
    connect(room);

    const editor = getEditor();
    const saved = localStorage.getItem(`room_${room}`);
    if (saved) {
        editor.setValue(saved);
    }
}

function connect(room) {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        setConnectionStatus('disconnected');
        showToast('Unable to connect to server', 'error');
        return;
    }

    setConnectionStatus('connecting');

    const wsUrl = getWebSocketUrl();
    console.log('Connecting to WebSocket:', wsUrl);

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log("WebSocket connected");
        setConnectionStatus('connected');
        reconnectAttempts = 0;

        ws.send(JSON.stringify({
            type: "join",
            room: room
        }));
    };

    ws.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            handleMessage(data);
        } catch (error) {
            console.error("Error parsing message:", error);
        }
    };

    ws.onclose = () => {
        console.log("WebSocket disconnected");
        setConnectionStatus('disconnected');

        reconnectAttempts++;
        setTimeout(() => {
            if (currentRoom) {
                connect(currentRoom);
            }
        }, 3000);
    };

    ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setConnectionStatus('disconnected');
    };
}

function handleMessage(data) {
    const editor = getEditor();

    if (!editor) return;

    switch (data.type) {
        case "init":
            isRemote = true;
            editor.setValue(data.text || "");
            isRemote = false;

            if (data.clients) {
                updatePeersList(data.clients);

                const badge = document.querySelector('.badge');
                if (badge) {
                    badge.textContent = data.clients.length;
                }
            }
            break;

        case "edit":
            isRemote = true;
            editor.setValue(data.text);
            isRemote = false;
            break;

        case "peer_joined":
        case "peer_left":
            if (data.clients) {
                updatePeersList(data.clients);

                const badge = document.querySelector('.badge');
                if (badge) {
                    badge.textContent = data.clients.length;
                }
            }

            if (data.type === "peer_joined") {
                showToast('New user joined the room', 'success');
            }
            break;
    }
}

window.addEventListener("load", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get("room");

    if (roomParam) {
        roomInput.value = roomParam;
        startApp(roomParam);
    }
});

window.addEventListener("beforeunload", () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "leave" }));
    }
});

window.addEventListener("click", (e) => {
    if (shareMenu.classList.contains('open') &&
        !shareMenu.contains(e.target) &&
        !e.target.closest('.share-btn')) {
        shareMenu.classList.remove('open');
    }

    if (peersSidebar.classList.contains('open') &&
        !peersSidebar.contains(e.target) &&
        !e.target.closest('.users-btn')) {
        peersSidebar.classList.remove('open');
    }
});