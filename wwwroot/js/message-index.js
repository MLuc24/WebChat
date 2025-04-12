/**
 * WeChat - Message Index
 * Handles the main messages list page functionality
 */

// App state 
const state = {
    connection: null,
    searchTimeout: null,
    userSearchResults: []
};

// DOM elements
const elements = {};

// Initialize on document load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM references
    initializeDomReferences();

    // Initialize event listeners
    initializeEventListeners();

    // Initialize SignalR
    initializeSignalR();

    // Load conversations
    loadConversations();
});

/**
 * Initialize DOM element references
 */
function initializeDomReferences() {
    elements.conversationsList = document.getElementById('conversationsList');
    elements.searchConversation = document.getElementById('searchConversation');
    elements.loadingConversations = document.getElementById('loadingConversations');
    elements.newMessageBtn = document.getElementById('newMessageBtn');
    elements.newMessageBtnLarge = document.getElementById('newMessageBtnLarge');
    elements.newMessageModal = document.getElementById('newMessageModal');
    elements.userSearch = document.getElementById('userSearch');
    elements.usersList = document.getElementById('usersList');
}

/**
 * Initialize event listeners
 */
function initializeEventListeners() {
    // Search conversation functionality
    elements.searchConversation.addEventListener('input', filterConversations);

    // New message buttons
    elements.newMessageBtn.addEventListener('click', showNewMessageModal);
    elements.newMessageBtnLarge.addEventListener('click', showNewMessageModal);

    // User search in modal
    elements.userSearch.addEventListener('input', () => {
        clearTimeout(state.searchTimeout);
        state.searchTimeout = setTimeout(searchUsers, 300);
    });
}

/**
 * Initialize SignalR connection
 */
function initializeSignalR() {
    // Create connection
    state.connection = new signalR.HubConnectionBuilder()
        .withUrl('/chatHub')
        .withAutomaticReconnect()
        .build();

    // Register event handlers
    state.connection.on('ReceiveMessage', handleNewMessage);
    state.connection.on('UserOnline', handleUserOnline);
    state.connection.on('UserOffline', handleUserOffline);
    state.connection.on('FriendRequestReceived', handleFriendRequestReceived);
    state.connection.on('FriendRequestUpdated', handleFriendRequestUpdated);

    // Start connection
    state.connection.start()
        .then(() => console.log('Connected to SignalR hub'))
        .catch(err => console.error('Error connecting to SignalR hub:', err));
}

/**
 * Load conversations list
 */
async function loadConversations() {
    showElement(elements.loadingConversations);

    try {
        const response = await fetch('/Message/GetConversations');
        const conversations = await response.json();

        hideElement(elements.loadingConversations);

        if (!conversations || conversations.length === 0) {
            elements.conversationsList.innerHTML = `
                <div class="text-center p-4 my-4">
                    <i class="bi bi-chat-square-text display-5 text-muted mb-3"></i>
                    <p class="text-muted">Chưa có cuộc trò chuyện nào</p>
                </div>
            `;
            return;
        }

        elements.conversationsList.innerHTML = '';

        conversations.forEach(conversation => {
            appendConversationItem(conversation);
        });
    } catch (error) {
        console.error('Error loading conversations:', error);
        hideElement(elements.loadingConversations);
        showErrorMessage(elements.conversationsList, 'Không thể tải danh sách cuộc trò chuyện', () => loadConversations());
    }
}

/**
 * Create and append a conversation item to the list
 */
function appendConversationItem(conversation) {
    const lastMessageDate = new Date(conversation.lastMessageDate);
    const formattedDate = formatConversationDate(lastMessageDate);

    // Create badge for unread messages
    let unreadBadge = '';
    if (conversation.unreadCount > 0) {
        unreadBadge = `<span class="badge bg-danger rounded-pill">${conversation.unreadCount}</span>`;
    }

    const onlineIndicator = conversation.isOnline
        ? '<span class="position-absolute bottom-0 end-0 bg-success rounded-circle p-1 border border-white" style="width: 12px; height: 12px;"></span>'
        : '';

    // Add friend status indicator
    let friendStatus = '';
    if (conversation.isFriend) {
        friendStatus = '<span class="badge bg-info rounded-circle p-1 ms-1" title="Bạn bè"><i class="bi bi-people-fill"></i></span>';
    }

    const conversationItem = document.createElement('div');
    conversationItem.className = 'conversation-item d-flex align-items-center px-3 py-2';
    conversationItem.dataset.userId = conversation.userId;
    conversationItem.innerHTML = `
        <div class="me-3 position-relative">
            <img src="${conversation.profilePicture || '/images/default-avatar.png'}" alt="${conversation.fullName || conversation.username}"
                 class="rounded-circle" style="width: 50px; height: 50px; object-fit: cover;">
            ${onlineIndicator}
        </div>
        <div class="flex-grow-1 overflow-hidden">
            <div class="d-flex justify-content-between align-items-center">
                <h6 class="mb-0 conversation-name d-flex align-items-center">
                    ${conversation.fullName || conversation.username}
                    ${friendStatus}
                </h6>
                <small class="text-muted ms-2">${formattedDate}</small>
            </div>
            <div class="d-flex justify-content-between align-items-center">
                <p class="mb-0 text-truncate conversation-last-message ${conversation.unreadCount > 0 ? 'fw-bold' : 'text-muted'}"
                   style="max-width: 150px;">${conversation.lastMessage}</p>
                ${unreadBadge}
            </div>
        </div>
    `;

    conversationItem.addEventListener('click', () => {
        window.location.href = `/Message/Conversation/${conversation.userId}`;
    });

    elements.conversationsList.appendChild(conversationItem);
}

/**
 * Filter conversations based on search term
 */
function filterConversations() {
    const searchTerm = elements.searchConversation.value.toLowerCase();
    const conversations = document.querySelectorAll('.conversation-item');

    conversations.forEach(conversation => {
        const name = conversation.querySelector('.conversation-name').textContent.toLowerCase();
        const lastMessage = conversation.querySelector('.conversation-last-message').textContent.toLowerCase();

        if (name.includes(searchTerm) || lastMessage.includes(searchTerm)) {
            conversation.style.display = '';
        } else {
            conversation.style.display = 'none';
        }
    });
}

/**
 * Show the new message modal
 */
function showNewMessageModal() {
    // Clear previous search results
    elements.userSearch.value = '';
    elements.usersList.innerHTML = '';

    // Show the modal
    const modalElement = elements.newMessageModal;
    const modal = new bootstrap.Modal(modalElement);
    modal.show();

    // Focus the search input
    setTimeout(() => {
        elements.userSearch.focus();
    }, 500);
}

/**
 * Search for users
 */
async function searchUsers() {
    const searchTerm = elements.userSearch.value.trim();

    if (searchTerm.length < 2) {
        elements.usersList.innerHTML = searchTerm.length === 0
            ? ''
            : '<div class="text-center p-3 text-muted">Nhập ít nhất 2 ký tự để tìm kiếm</div>';
        return;
    }

    // Show loading indicator
    elements.usersList.innerHTML = `
        <div class="text-center p-3">
            <div class="spinner-border spinner-border-sm text-primary" role="status">
                <span class="visually-hidden">Đang tìm kiếm...</span>
            </div>
        </div>
    `;

    try {
        const response = await fetch(`/Message/GetUsers?search=${encodeURIComponent(searchTerm)}`);
        const users = await response.json();

        if (!users || users.length === 0) {
            elements.usersList.innerHTML = '<div class="text-center p-3 text-muted">Không tìm thấy người dùng</div>';
            return;
        }

        // Save in state
        state.userSearchResults = users;

        // Display results
        elements.usersList.innerHTML = '';
        users.forEach(user => {
            const userItem = document.createElement('a');
            userItem.href = `javascript:void(0)`;
            userItem.className = 'list-group-item list-group-item-action d-flex align-items-center';
            userItem.dataset.userId = user.userId;

            const onlineIndicator = user.isOnline
                ? '<span class="position-absolute bottom-0 end-0 bg-success rounded-circle p-1 border border-white" style="width: 10px; height: 10px;"></span>'
                : '';

            // Friend status indicators and actions
            let friendStatus = '';
            let friendButtons = '';

            if (user.isFriend) {
                friendStatus = '<span class="badge bg-info ms-2">Bạn bè</span>';
            } else if (user.hasSentRequest) {
                friendStatus = '<span class="badge bg-warning ms-2">Đã gửi lời mời</span>';
            } else if (user.hasReceivedRequest) {
                friendStatus = '<span class="badge bg-warning ms-2">Đã nhận lời mời</span>';
                friendButtons = `
                    <button class="btn btn-sm btn-success ms-2 btn-accept-friend" data-user-id="${user.userId}">
                        <i class="bi bi-check"></i> Chấp nhận
                    </button>
                    <button class="btn btn-sm btn-danger ms-1 btn-reject-friend" data-user-id="${user.userId}">
                        <i class="bi bi-x"></i> Từ chối
                    </button>
                `;
            } else {
                friendButtons = `
                    <button class="btn btn-sm btn-outline-primary ms-2 btn-add-friend" data-user-id="${user.userId}">
                        <i class="bi bi-person-plus"></i> Kết bạn
                    </button>
                `;
            }

            userItem.innerHTML = `
                <div class="me-3 position-relative">
                    <img src="${user.profilePicture || '/images/default-avatar.png'}" alt="${user.fullName || user.username}"
                        class="rounded-circle" style="width: 40px; height: 40px; object-fit: cover;">
                    ${onlineIndicator}
                </div>
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center">
                        <h6 class="mb-0">${user.fullName || user.username}</h6>
                        ${friendStatus}
                    </div>
                    <small class="text-muted">${user.department || ''}</small>
                </div>
                <div class="actions">
                    <button class="btn btn-sm btn-primary btn-message" data-user-id="${user.userId}">
                        <i class="bi bi-chat"></i> Nhắn tin
                    </button>
                    ${friendButtons}
                </div>
            `;

            // Add event listeners for the buttons
            userItem.addEventListener('click', (e) => {
                // Prevent default behavior only if clicking on a button
                if (e.target.closest('button')) {
                    e.preventDefault();
                }
            });

            elements.usersList.appendChild(userItem);
        });

        // Add event listeners for friend actions
        document.querySelectorAll('.btn-add-friend').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const userId = btn.getAttribute('data-user-id');
                sendFriendRequest(userId);
            });
        });

        document.querySelectorAll('.btn-accept-friend').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const userId = btn.getAttribute('data-user-id');
                respondToFriendRequest(userId, true);
            });
        });

        document.querySelectorAll('.btn-reject-friend').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const userId = btn.getAttribute('data-user-id');
                respondToFriendRequest(userId, false);
            });
        });

        document.querySelectorAll('.btn-message').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const userId = btn.getAttribute('data-user-id');
                startConversation(userId);
            });
        });

    } catch (error) {
        console.error('Error searching users:', error);
        elements.usersList.innerHTML = '<div class="text-center p-3 text-danger">Lỗi khi tìm kiếm người dùng</div>';
    }
}

/**
 * Send a friend request to a user
 */
async function sendFriendRequest(userId) {
    try {
        const response = await fetch('/Friend/SendRequest', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ recipientId: userId })
        });

        const result = await response.json();

        if (result.success) {
            // Update UI to reflect the sent request
            const button = document.querySelector(`.btn-add-friend[data-user-id="${userId}"]`);
            if (button) {
                const parent = button.closest('.actions');
                if (parent) {
                    parent.innerHTML = `<span class="badge bg-warning">Đã gửi lời mời</span>`;
                }
            }

            // Show success toast
            showToast('Đã gửi lời mời kết bạn');
        } else {
            showToast('Không thể gửi lời mời kết bạn: ' + result.message);
        }
    } catch (error) {
        console.error('Error sending friend request:', error);
        showToast('Có lỗi xảy ra khi gửi lời mời kết bạn');
    }
}

/**
 * Respond to a friend request
 */
async function respondToFriendRequest(userId, accept) {
    try {
        const response = await fetch('/Friend/RespondToRequest', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                requesterId: userId,
                accept: accept
            })
        });

        const result = await response.json();

        if (result.success) {
            // Update UI to reflect the response
            const buttons = document.querySelectorAll(`.btn-accept-friend[data-user-id="${userId}"], .btn-reject-friend[data-user-id="${userId}"]`);
            buttons.forEach(button => {
                const parent = button.closest('.actions');
                if (parent) {
                    if (accept) {
                        parent.innerHTML = `
                            <span class="badge bg-info">Bạn bè</span>
                            <button class="btn btn-sm btn-primary ms-2 btn-message" data-user-id="${userId}">
                                <i class="bi bi-chat"></i> Nhắn tin
                            </button>
                        `;

                        // Re-add event listener for message button
                        parent.querySelector('.btn-message').addEventListener('click', (e) => {
                            e.stopPropagation();
                            startConversation(userId);
                        });
                    } else {
                        parent.innerHTML = `
                            <button class="btn btn-sm btn-outline-primary ms-2 btn-add-friend" data-user-id="${userId}">
                                <i class="bi bi-person-plus"></i> Kết bạn
                            </button>
                            <button class="btn btn-sm btn-primary btn-message" data-user-id="${userId}">
                                <i class="bi bi-chat"></i> Nhắn tin
                            </button>
                        `;

                        // Re-add event listeners
                        parent.querySelector('.btn-add-friend').addEventListener('click', (e) => {
                            e.stopPropagation();
                            sendFriendRequest(userId);
                        });
                        parent.querySelector('.btn-message').addEventListener('click', (e) => {
                            e.stopPropagation();
                            startConversation(userId);
                        });
                    }
                }
            });

            // Show success toast
            showToast(accept ? 'Đã chấp nhận lời mời kết bạn' : 'Đã từ chối lời mời kết bạn');
        } else {
            showToast('Không thể xử lý lời mời kết bạn: ' + result.message);
        }
    } catch (error) {
        console.error('Error responding to friend request:', error);
        showToast('Có lỗi xảy ra khi xử lý lời mời kết bạn');
    }
}

/**
 * Start a conversation with a user
 */
function startConversation(userId) {
    window.location.href = `/Message/Conversation/${userId}`;
}

/**
 * Handle new message from SignalR
 */
function handleNewMessage(message) {
    // Reload conversations to show new messages
    loadConversations();

    // Play notification sound
    playMessageSound();
}

/**
 * Handle user online status update
 */
function handleUserOnline(userId) {
    const conversationItem = document.querySelector(`.conversation-item[data-user-id="${userId}"]`);
    if (conversationItem) {
        const avatarContainer = conversationItem.querySelector('.position-relative');

        if (!avatarContainer.querySelector('.bg-success')) {
            const onlineIndicator = document.createElement('span');
            onlineIndicator.className = 'position-absolute bottom-0 end-0 bg-success rounded-circle p-1 border border-white';
            onlineIndicator.style.width = '12px';
            onlineIndicator.style.height = '12px';
            avatarContainer.appendChild(onlineIndicator);
        }
    }

    // Update in search results if visible
    const userItem = document.querySelector(`.list-group-item[data-user-id="${userId}"]`);
    if (userItem) {
        const avatarContainer = userItem.querySelector('.position-relative');

        if (!avatarContainer.querySelector('.bg-success')) {
            const onlineIndicator = document.createElement('span');
            onlineIndicator.className = 'position-absolute bottom-0 end-0 bg-success rounded-circle p-1 border border-white';
            onlineIndicator.style.width = '10px';
            onlineIndicator.style.height = '10px';
            avatarContainer.appendChild(onlineIndicator);
        }
    }
}

/**
 * Handle user offline status update
 */
function handleUserOffline(userId) {
    const conversationItem = document.querySelector(`.conversation-item[data-user-id="${userId}"]`);
    if (conversationItem) {
        const onlineIndicator = conversationItem.querySelector('.bg-success');
        if (onlineIndicator) {
            onlineIndicator.remove();
        }
    }

    // Update in search results if visible
    const userItem = document.querySelector(`.list-group-item[data-user-id="${userId}"]`);
    if (userItem) {
        const onlineIndicator = userItem.querySelector('.bg-success');
        if (onlineIndicator) {
            onlineIndicator.remove();
        }
    }
}

/**
 * Handle receiving a friend request via SignalR
 */
function handleFriendRequestReceived(request) {
    showToast(`Bạn có lời mời kết bạn mới từ ${request.requesterName}`);

    // Update UI if user is in the search results
    const userItem = document.querySelector(`.list-group-item[data-user-id="${request.requesterId}"]`);
    if (userItem) {
        const statusContainer = userItem.querySelector('.actions');
        if (statusContainer) {
            statusContainer.innerHTML = `
                <button class="btn btn-sm btn-success ms-2 btn-accept-friend" data-user-id="${request.requesterId}">
                    <i class="bi bi-check"></i> Chấp nhận
                </button>
                <button class="btn btn-sm btn-danger ms-1 btn-reject-friend" data-user-id="${request.requesterId}">
                    <i class="bi bi-x"></i> Từ chối
                </button>
            `;

            // Add event listeners
            statusContainer.querySelector('.btn-accept-friend').addEventListener('click', (e) => {
                e.stopPropagation();
                respondToFriendRequest(request.requesterId, true);
            });

            statusContainer.querySelector('.btn-reject-friend').addEventListener('click', (e) => {
                e.stopPropagation();
                respondToFriendRequest(request.requesterId, false);
            });
        }
    }
}

/**
 * Handle friend request status update
 */
function handleFriendRequestUpdated(update) {
    if (update.status === 'Accepted') {
        showToast(`${update.userName} đã chấp nhận lời mời kết bạn của bạn`);

        // Update UI if user is in the search results
        const userItem = document.querySelector(`.list-group-item[data-user-id="${update.userId}"]`);
        if (userItem) {
            const statusContainer = userItem.querySelector('.actions');
            if (statusContainer) {
                statusContainer.innerHTML = `
                    <span class="badge bg-info">Bạn bè</span>
                    <button class="btn btn-sm btn-primary ms-2 btn-message" data-user-id="${update.userId}">
                        <i class="bi bi-chat"></i> Nhắn tin
                    </button>
                `;

                // Add event listener for message button
                statusContainer.querySelector('.btn-message').addEventListener('click', (e) => {
                    e.stopPropagation();
                    startConversation(update.userId);
                });
            }
        }

        // Reload conversations in case this was an existing conversation
        loadConversations();
    } else if (update.status === 'Rejected') {
        showToast(`${update.userName} đã từ chối lời mời kết bạn của bạn`);

        // Update UI if user is in the search results
        const userItem = document.querySelector(`.list-group-item[data-user-id="${update.userId}"]`);
        if (userItem) {
            const statusContainer = userItem.querySelector('.actions');
            if (statusContainer) {
                statusContainer.innerHTML = `
                    <button class="btn btn-sm btn-outline-primary ms-2 btn-add-friend" data-user-id="${update.userId}">
                        <i class="bi bi-person-plus"></i> Kết bạn
                    </button>
                    <button class="btn btn-sm btn-primary btn-message" data-user-id="${update.userId}">
                        <i class="bi bi-chat"></i> Nhắn tin
                    </button>
                `;

                // Add event listeners
                statusContainer.querySelector('.btn-add-friend').addEventListener('click', (e) => {
                    e.stopPropagation();
                    sendFriendRequest(update.userId);
                });
                statusContainer.querySelector('.btn-message').addEventListener('click', (e) => {
                    e.stopPropagation();
                    startConversation(update.userId);
                });
            }
        }
    }
}

/**
 * Play message notification sound
 */
function playMessageSound() {
    try {
        const audio = new Audio('/sounds/message.mp3'); // Make sure this file exists
        audio.volume = 0.5;
        audio.play().catch(err => console.log('Error playing sound:', err));
    } catch (error) {
        console.log('Error playing sound:', error);
    }
}

/**
 * Format a date for conversation list
 */
function formatConversationDate(date) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date >= today) {
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } else if (date >= yesterday) {
        return 'Hôm qua';
    } else if (date.getFullYear() === now.getFullYear()) {
        return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });
    } else {
        return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' });
    }
}

/**
 * Show toast message
 */
function showToast(message) {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toastId = 'toast-' + Date.now();
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = 'toast show';
    toast.role = 'alert';
    toast.ariaLive = 'assertive';
    toast.ariaAtomic = 'true';
    toast.innerHTML = `
        <div class="toast-header">
            <strong class="me-auto">Thông báo</strong>
            <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">${message}</div>
    `;

    toastContainer.appendChild(toast);

    // Auto hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

/**
 * Show error message
 */
function showErrorMessage(container, message, retryCallback) {
    container.innerHTML = `
        <div class="text-center p-4">
            <i class="bi bi-exclamation-circle text-danger" style="font-size: 3rem;"></i>
            <p class="text-danger mt-3">${message}</p>
            ${retryCallback ? `
                <button class="btn btn-outline-primary mt-2">
                    <i class="bi bi-arrow-clockwise me-2"></i>Thử lại
                </button>
            ` : ''}
        </div>
    `;

    if (retryCallback) {
        container.querySelector('button').addEventListener('click', retryCallback);
    }
}

/**
 * Show an element
 */
function showElement(element) {
    if (element) element.style.display = 'block';
}

/**
 * Hide an element
 */
function hideElement(element) {
    if (element) element.style.display = 'none';
}
