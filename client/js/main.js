let shareMenu = null;

function copyRoomLink() {
    const url = new URL(window.location.href);
    url.searchParams.set("room", currentRoom);
    const link = url.toString();

    navigator.clipboard.writeText(link).then(() => {
        toast.show('Link copied to clipboard!', 'success');

        const copyBtn = document.querySelector('.copy-btn');
        if (copyBtn) {
            copyBtn.classList.add('copied');
            setTimeout(() => copyBtn.classList.remove('copied'), 2000);
        }
    }).catch(() => {
        toast.show('Failed to copy link', 'error');
    });
}

function createShareMenu() {
    const menu = document.createElement('div');
    menu.className = 'share-menu';
    menu.innerHTML = `
    <div class="share-menu-header">
      <span>Share Room</span>
      <button class="share-menu-close">${Icons.close}</button>
    </div>
    <div class="share-menu-body">
      <div class="share-link-container">
        <input type="text" id="shareLinkInput" readonly value="${window.location.href}">
        <button id="copyLinkBtn" class="share-action-btn">${Icons.copy} Copy</button>
      </div>
      
      <div class="share-options">
        <button class="share-option" onclick="shareVia('twitter')">
          ${getSocialIcon('twitter')} Twitter
        </button>
        <button class="share-option" onclick="shareVia('facebook')">
          ${getSocialIcon('facebook')} Facebook
        </button>
        <button class="share-option" onclick="shareVia('linkedin')">
          ${getSocialIcon('linkedin')} LinkedIn
        </button>
        <button class="share-option" onclick="shareVia('whatsapp')">
          ${getSocialIcon('whatsapp')} WhatsApp
        </button>
        <button class="share-option" onclick="shareVia('email')">
          ${getSocialIcon('email')} Email
        </button>
        <button class="share-option" onclick="shareVia('telegram')">
          ${getSocialIcon('telegram')} Telegram
        </button>
      </div>
      
      <div class="share-qr">
        <div class="share-qr-header">
          <span>QR Code</span>
          <button onclick="downloadQR()">${Icons.download}</button>
        </div>
        <div id="qrCodeContainer"></div>
      </div>
    </div>
  `;

    document.body.appendChild(menu);

    menu.querySelector('.share-menu-close').addEventListener('click', () => {
        menu.classList.remove('open');
    });

    menu.querySelector('#copyLinkBtn').addEventListener('click', () => {
        const input = document.getElementById('shareLinkInput');
        input.select();
        navigator.clipboard.writeText(input.value).then(() => {
            toast.show('Link copied!', 'success');
        });
    });

    menu.addEventListener('click', (e) => {
        if (e.target === menu) {
            menu.classList.remove('open');
        }
    });

    return menu;
}

function generateQRCode(roomCode) {
    const url = `${window.location.origin}?room=${roomCode}`;

    const qrContainer = document.getElementById('qrCodeContainer');
    if (qrContainer) {
        qrContainer.innerHTML = `
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}" 
           alt="QR Code for room ${roomCode}"
           title="Scan to join room">
    `;
    }
}

function downloadQR() {
    const qrImg = document.querySelector('#qrCodeContainer img');
    if (qrImg) {
        const link = document.createElement('a');
        link.download = `room-${currentRoom}-qr.png`;
        link.href = qrImg.src;
        link.click();
        toast.show('QR code downloaded', 'success');
    }
}

function shareVia(platform) {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Join my coding session in room: ${currentRoom}`);

    let shareUrl = '';

    switch (platform) {
        case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
            break;
        case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
            break;
        case 'linkedin':
            shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
            break;
        case 'whatsapp':
            shareUrl = `https://wa.me/?text=${text}%20${url}`;
            break;
        case 'telegram':
            shareUrl = `https://t.me/share/url?url=${url}&text=${text}`;
            break;
        case 'email':
            shareUrl = `mailto:?subject=Join my coding session&body=${text}%20${url}`;
            break;
    }

    if (shareUrl) {
        window.open(shareUrl, '_blank', 'width=600,height=400');
    }
}

function getSocialIcon(platform) {
    const icons = {
        twitter: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg>`,
        facebook: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>`,
        linkedin: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>`,
        whatsapp: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
        telegram: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>`,
        email: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`
    };
    return icons[platform] || '';
}

function startApp(room) {
    currentRoom = room;

    const url = new URL(window.location.href);
    url.searchParams.set("room", room);
    window.history.pushState({}, "", url);

    lobby.classList.add("hidden");
    app.classList.remove("hidden");

    document.getElementById("roomLabel").innerHTML = `
    <span class="room-info">
      <span class="room-label">Room:</span>
      <span class="room-code">${room}</span>
    </span>
    <div class="room-actions">
      <button class="icon-btn copy-btn" onclick="copyRoomLink()" title="Copy room link">
        ${Icons.copy}
        <span class="btn-tooltip">Copy link</span>
      </button>
      <button class="icon-btn share-btn" onclick="toggleShareMenu()" title="Share room">
        ${Icons.share}
        <span class="btn-tooltip">Share</span>
      </button>
      <button class="icon-btn users-btn" onclick="togglePeersSidebar()" title="Show users">
        ${Icons.users}
        <span class="btn-tooltip">Users (1)</span>
        <span class="badge" id="userCount">1</span>
      </button>
    </div>
  `;

    if (!shareMenu) {
        shareMenu = createShareMenu();
    }

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

function toggleShareMenu() {
    if (!shareMenu) {
        shareMenu = createShareMenu();
    }

    const linkInput = document.getElementById('shareLinkInput');
    if (linkInput) {
        linkInput.value = window.location.href;
    }

    generateQRCode(currentRoom);

    shareMenu.classList.toggle('open');
}

function updateUserCount(count) {
    const badge = document.querySelector('.badge');
    const usersBtn = document.querySelector('.users-btn .btn-tooltip');
    if (badge) {
        badge.textContent = count;
    }
    if (usersBtn) {
        usersBtn.textContent = `Users (${count})`;
    }
}

function togglePeersSidebar() {
    const sidebar = document.getElementById('peersSidebar');
    sidebar.classList.toggle('open');
}

function updatePeersList(clients) {
    if (!peersList) return;

    const count = clients?.length || 1;
    updateUserCount(count);

    peersList.innerHTML = `
    <div class="peers-header">
      <span>Connected (${count})</span>
      <button class="icon-btn small" onclick="togglePeersSidebar()" title="Close">
        ${Icons.close}
      </button>
    </div>
    <div class="peers-list">
      ${clients?.map((id, index) => `
        <div class="peer-item" data-client-id="${id}">
          <div class="peer-avatar">
            <span class="peer-avatar-text">${id.substring(0, 2).toUpperCase()}</span>
          </div>
          <div class="peer-info">
            <span class="peer-name">User ${index + 1}</span>
            <span class="peer-id">${id.substring(0, 8)}...</span>
          </div>
          <span class="peer-status" title="Active"></span>
        </div>
      `).join("")}
    </div>
  `;
}