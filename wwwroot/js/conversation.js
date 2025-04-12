/**
 * WeChat - Conversation.js
 * Handles real-time messaging between users
 */

// App state management
const state = {
    otherUserId: null,        // ID of the user we're chatting with
    messages: [],             // Array of message objects
    connection: null,         // SignalR connection
    isTyping: false,          // Current typing state
    typingTimer: null,        // Timer for typing indicator
    isLoadingMessages: false, // Flag to prevent duplicate loading
    isScrolledToBottom: true, // Track if user has scrolled to bottom
    messageGroups: {}         // Cache for message groups
};

// DOM Element references
const elements = {
    // Will be populated on initialization
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Set the other user ID from the global variable set in the Razor view
    state.otherUserId = otherUserId;

    // Initialize DOM references
    initializeDomReferences();

    // Initialize event listeners
    initializeEventListeners();

    // Initialize SignalR
    initializeSignalR();

    // Load data
    loadConversations();
    loadUserDetails();
    loadMessages();
});

/**
 * Initialize DOM element references
 */
function initializeDomReferences() {
    elements.messageForm = document.getElementById('messageForm');
    elements.messageContent = document.getElementById('messageContent');
    elements.attachments = document.getElementById('attachments');
    elements.attachmentPreview = document.getElementById('attachmentPreview');
    elements.messagesList = document.getElementById('messagesList');
    elements.loadingMessages = document.getElementById('loadingMessages');
    elements.conversationsList = document.getElementById('conversationsList');
    elements.loadingConversations = document.getElementById('loadingConversations');
    elements.searchConversation = document.getElementById('searchConversation');
    elements.conversationUsername = document.getElementById('conversationUsername');
    elements.conversationStatus = document.getElementById('conversationStatus');
    elements.otherUserAvatar = document.getElementById('otherUserAvatar');
    elements.onlineIndicator = document.getElementById('onlineIndicator');
    elements.typingIndicator = document.getElementById('typingIndicator');
    elements.typingAvatar = document.getElementById('typingAvatar');
    elements.newMessagesIndicator = document.getElementById('newMessagesIndicator');
}

/**
 * Initialize event listeners
 */
function initializeEventListeners() {
    // Message form submission
    elements.messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        sendMessage();
    });

    // Typing indicator
    elements.messageContent.addEventListener('input', handleTypingInput);

    // Search functionality
    elements.searchConversation.addEventListener('input', filterConversations);

    // Attachment selection
    elements.attachments.addEventListener('change', showAttachmentPreviews);

    // Handle scroll for loading more messages and scroll tracking
    elements.messagesList.addEventListener('scroll', handleMessagesScroll);

    // New message indicator click
    if (elements.newMessagesIndicator) {
        elements.newMessagesIndicator.addEventListener('click', scrollToBottom);
    }
}

/**
 * Initialize SignalR connection
 */
function initializeSignalR() {
    // Create connection
    state.connection = new signalR.HubConnectionBuilder()
        .withUrl('/chatHub')
        .withAutomaticReconnect([0, 1000, 5000, 10000]) // Reconnection timing
        .build();

    // Register event handlers
    state.connection.on('ReceiveMessage', handleReceiveMessage);
    state.connection.on('MessageRead', handleMessageRead);
    state.connection.on('MessageDeleted', handleMessageDeleted);
    state.connection.on('ReceiveTypingStatus', handleReceiveTypingStatus);
    state.connection.on('UserOnline', handleUserOnline);
    state.connection.on('UserOffline', handleUserOffline);

    // Start connection
    startSignalRConnection();
}

/**
 * Start SignalR connection
 */
function startSignalRConnection() {
    state.connection.start()
        .then(() => {
            console.log('Connected to SignalR hub');
        })
        .catch(err => {
            console.error('Error connecting to SignalR hub:', err);
            // Retry after 5 seconds
            setTimeout(startSignalRConnection, 5000);
        });
}

/**
 * Handle SignalR disconnection with reconnect logic
 */
function handleSignalRDisconnect() {
    console.log('Disconnected from SignalR hub, attempting to reconnect...');
    startSignalRConnection();
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

    // Add active class if this is the current conversation
    const isActive = conversation.userId === state.otherUserId;

    const onlineIndicator = conversation.isOnline
        ? '<span class="position-absolute bottom-0 end-0 bg-success rounded-circle p-1 border border-white" style="width: 12px; height: 12px;"></span>'
        : '';

    const conversationItem = document.createElement('div');
    conversationItem.className = `conversation-item d-flex align-items-center px-3 py-2 ${isActive ? 'active' : ''}`;
    conversationItem.innerHTML = `
        <div class="me-3 position-relative">
            <img src="${conversation.profilePicture || '/images/default-avatar.png'}" alt="${conversation.fullName || conversation.username}"
                 class="rounded-circle" style="width: 50px; height: 50px; object-fit: cover;">
            ${onlineIndicator}
        </div>
        <div class="flex-grow-1 overflow-hidden">
            <div class="d-flex justify-content-between align-items-center">
                <h6 class="mb-0 conversation-name">${conversation.fullName || conversation.username}</h6>
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
 * Load user details
 */
async function loadUserDetails() {
    try {
        const response = await fetch(`/User/GetUserDetails/${state.otherUserId}`);
        const user = await response.json();

        if (!user || user.success === false) {
            console.error('Error loading user details');
            elements.conversationUsername.textContent = 'Người dùng không xác định';
            return;
        }

        // Update UI with user details
        elements.conversationUsername.textContent = user.fullName || user.username;
        elements.otherUserAvatar.src = user.profilePicture || '/images/default-avatar.png';
        elements.typingAvatar.src = user.profilePicture || '/images/default-avatar.png';

        // Check if user is online
        const isOnline = user.lastLogin && (new Date() - new Date(user.lastLogin)) / (1000 * 60) < 15;
        updateUserStatus(isOnline, user.lastLogin);
    } catch (error) {
        console.error('Error loading user details:', error);
        elements.conversationUsername.textContent = 'Người dùng không xác định';
    }
}

/**
 * Update user online status in the UI
 */
function updateUserStatus(isOnline, lastLogin) {
    if (isOnline) {
        elements.conversationStatus.textContent = 'Đang hoạt động';
        elements.conversationStatus.className = 'text-success';
        elements.onlineIndicator.style.display = 'block';
    } else {
        elements.conversationStatus.className = 'text-muted';
        elements.onlineIndicator.style.display = 'none';

        // Format last login time if available
        if (lastLogin) {
            const lastActive = new Date(lastLogin);
            const now = new Date();
            const diffMs = now - lastActive;

            if (diffMs < 60000) { // Less than a minute
                elements.conversationStatus.textContent = 'Vừa mới truy cập';
            } else if (diffMs < 3600000) { // Less than an hour
                const mins = Math.floor(diffMs / 60000);
                elements.conversationStatus.textContent = `Hoạt động ${mins} phút trước`;
            } else if (diffMs < 86400000) { // Less than a day
                const hours = Math.floor(diffMs / 3600000);
                elements.conversationStatus.textContent = `Hoạt động ${hours} giờ trước`;
            } else { // More than a day
                const days = Math.floor(diffMs / 86400000);
                elements.conversationStatus.textContent = `Hoạt động ${days} ngày trước`;
            }
        } else {
            elements.conversationStatus.textContent = 'Không hoạt động';
        }
    }
}

/**
 * Load messages
 */
async function loadMessages() {
    if (state.isLoadingMessages) return;
    state.isLoadingMessages = true;

    showElement(elements.loadingMessages);

    try {
        const response = await fetch(`/Message/GetMessages/${state.otherUserId}`);
        const messages = await response.json();

        hideElement(elements.loadingMessages);

        if (!messages || messages.length === 0) {
            elements.messagesList.innerHTML = `
                <div class="text-center p-5 my-5">
                    <i class="bi bi-chat-text display-1 text-muted"></i>
                    <p class="text-muted mt-3">Chưa có tin nhắn nào. <br>Hãy bắt đầu cuộc trò chuyện!</p>
                </div>
            `;
            state.isLoadingMessages = false;
            return;
        }

        // Store messages in state
        state.messages = messages;

        // Display messages
        displayMessages(messages);

        // Scroll to bottom
        scrollToBottom();

        state.isLoadingMessages = false;
    } catch (error) {
        console.error('Error loading messages:', error);
        hideElement(elements.loadingMessages);
        showErrorMessage(elements.messagesList, 'Không thể tải tin nhắn', () => loadMessages());
        state.isLoadingMessages = false;
    }
}

/**
 * Display messages with proper grouping and date separators
 */
function displayMessages(messages) {
    elements.messagesList.innerHTML = '';
    state.messageGroups = {};

    let currentDate = null;
    let currentSender = null;
    let messageGroup = null;

    messages.forEach((message, index) => {
        const messageDate = new Date(message.sentAt);
        const messageDay = messageDate.toDateString();

        // Add date separator if needed
        if (currentDate !== messageDay) {
            addDateSeparator(messageDay);
            currentDate = messageDay;
            currentSender = null; // Reset sender on date change
        }

        // Check if we need a new message group
        const isNewGroup = currentSender !== message.senderId ||
            (index > 0 && messageDate - new Date(messages[index - 1].sentAt) > 5 * 60 * 1000); // 5 minutes

        if (isNewGroup) {
            // Create new message group
            messageGroup = document.createElement('div');
            messageGroup.className = 'message-group';
            elements.messagesList.appendChild(messageGroup);
            currentSender = message.senderId;

            // Add first message with avatar
            appendMessageToGroup(message, messageGroup, false);
        } else {
            // Add consecutive message
            appendMessageToGroup(message, messageGroup, true);
        }
    });
}

/**
 * Add a date separator to the messages list
 */
function addDateSeparator(dateString) {
    const date = new Date(dateString);
    const separator = document.createElement('div');
    separator.className = 'date-separator';
    separator.innerHTML = `<div class="badge bg-light text-dark">${formatMessageDate(date)}</div>`;
    elements.messagesList.appendChild(separator);
}

/**
 * Append a message to a message group
 */
function appendMessageToGroup(message, container, isConsecutive) {
    const messageTime = formatTime(new Date(message.sentAt));
    const messageId = message.id;

    // Create message container
    const messageItem = document.createElement('div');
    messageItem.className = `message-item d-flex ${message.isMine ? 'justify-content-end' : 'justify-content-start'} new-message`;
    messageItem.dataset.id = messageId;

    // Message with avatar container
    const messageWithAvatar = document.createElement('div');
    messageWithAvatar.className = `message-with-avatar ${isConsecutive ? 'consecutive' : ''}`;

    // Add avatar for other user's messages if not consecutive
    if (!message.isMine && !isConsecutive) {
        const avatar = document.createElement('img');
        avatar.src = elements.otherUserAvatar.src;
        avatar.className = 'message-avatar';
        avatar.alt = 'Avatar';
        messageWithAvatar.appendChild(avatar);
    }

    // Message bubble container
    const messageContainer = document.createElement('div');
    messageContainer.className = 'message-container position-relative mb-1';

    // Create message bubble
    const messageBubble = document.createElement('div');
    messageBubble.className = `message-bubble ${message.isMine ? 'message-receiver' : 'message-sender'}`;

    // Add message content
    if (message.content && message.content.trim()) {
        const contentDiv = document.createElement('div');
        contentDiv.textContent = message.content;
        messageBubble.appendChild(contentDiv);
    }

    // Add attachments if any
    if (message.hasAttachments && message.attachments && message.attachments.length > 0) {
        const attachmentsContainer = document.createElement('div');
        attachmentsContainer.className = 'message-attachments mt-2';

        message.attachments.forEach(attachment => {
            attachmentsContainer.appendChild(createAttachmentElement(attachment, message.isMine));
        });

        messageBubble.appendChild(attachmentsContainer);
    }

    // Add timestamp and read status
    const messageFooter = document.createElement('div');
    messageFooter.className = `d-flex ${message.isMine ? 'justify-content-end' : 'justify-content-start'} align-items-center mt-1`;

    const timeStamp = document.createElement('small');
    timeStamp.className = `time-stamp ${message.isMine ? 'text-white-50' : 'text-muted'}`;
    timeStamp.textContent = messageTime;
    messageFooter.appendChild(timeStamp);

    // Add read status for own messages
    if (message.isMine) {
        const readStatus = document.createElement('small');
        readStatus.className = `ms-2 message-status ${message.isRead ? 'text-info' : 'text-white-50'}`;
        readStatus.textContent = message.isRead ? 'Đã xem' : 'Đã gửi';
        messageFooter.appendChild(readStatus);
    }

    messageBubble.appendChild(messageFooter);
    messageContainer.appendChild(messageBubble);

    // Add message actions
    const messageActions = document.createElement('div');
    messageActions.className = 'message-actions';

    if (message.isMine) {
        messageActions.innerHTML = `
            <button class="btn-delete" title="Xóa"><i class="bi bi-trash"></i></button>
        `;

        // Add delete event listener
        messageActions.querySelector('.btn-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Bạn có chắc muốn xóa tin nhắn này?')) {
                deleteMessage(messageId);
            }
        });
    }

    messageContainer.appendChild(messageActions);
    messageWithAvatar.appendChild(messageContainer);

    // Add avatar for own messages if not consecutive
    if (message.isMine && !isConsecutive) {
        const avatar = document.createElement('img');
        avatar.src = '/images/default-avatar.png'; // Replace with current user avatar
        avatar.className = 'message-avatar';
        avatar.alt = 'Avatar';
        messageWithAvatar.appendChild(avatar);
    }

    messageItem.appendChild(messageWithAvatar);
    container.appendChild(messageItem);
}

/**
 * Create an attachment element based on file type
 */
function createAttachmentElement(attachment, isMine) {
    const textColorClass = isMine ? 'text-white-50' : 'text-muted';
    const wrapper = document.createElement('div');
    wrapper.className = 'attachment mb-2';

    // Check if it's an image
    const isImage = attachment.fileType && attachment.fileType.startsWith('image/');

    if (isImage) {
        wrapper.innerHTML = `
            <a href="${attachment.filePath}" target="_blank" data-fancybox="gallery">
                <img src="${attachment.filePath}" class="img-thumbnail rounded" 
                     style="max-height: 150px; max-width: 100%;" alt="${attachment.fileName}">
            </a>
            <div class="small mt-1">
                <span class="${textColorClass}">${attachment.fileName} (${formatFileSize(attachment.fileSize)})</span>
            </div>
        `;
    } else {
        let fileIcon = 'bi-file-earmark';

        // Determine file icon based on type
        if (attachment.fileType.includes('pdf')) {
            fileIcon = 'bi-file-earmark-pdf';
        } else if (attachment.fileType.includes('word')) {
            fileIcon = 'bi-file-earmark-word';
        } else if (attachment.fileType.includes('excel')) {
            fileIcon = 'bi-file-earmark-excel';
        } else if (attachment.fileType.includes('zip') || attachment.fileType.includes('rar')) {
            fileIcon = 'bi-file-earmark-zip';
        } else if (attachment.fileType.includes('video')) {
            fileIcon = 'bi-file-earmark-play';
        } else if (attachment.fileType.includes('audio')) {
            fileIcon = 'bi-file-earmark-music';
        }

        wrapper.innerHTML = `
            <div class="p-2 rounded border ${isMine ? 'border-light' : ''}">
                <i class="bi ${fileIcon} me-2"></i>
                <a href="${attachment.filePath}" target="_blank" download="${attachment.fileName}"
                   class="${isMine ? 'text-white' : ''}">
                   ${attachment.fileName}
                </a>
                <span class="ms-2 ${textColorClass}">(${formatFileSize(attachment.fileSize)})</span>
            </div>
        `;
    }

    return wrapper;
}

/**
 * Send a message
 */
async function sendMessage() {
    const content = elements.messageContent.value.trim();
    const files = elements.attachments.files;

    // Check if there's something to send
    if (!content && files.length === 0) return;

    // Create form data
    const formData = new FormData();
    formData.append('receiverId', state.otherUserId);
    formData.append('content', content);

    // Add files
    for (let i = 0; i < files.length; i++) {
        formData.append('attachments', files[i]);
    }

    // Clear form
    elements.messageContent.value = '';
    elements.attachments.value = '';
    elements.attachmentPreview.innerHTML = '';

    // Create temporary message ID for optimistic UI update
    const tempId = 'temp-' + Date.now();

    // Create optimistic message
    const optimisticMessage = {
        id: tempId,
        senderId: -1, // Will be replaced with actual ID
        receiverId: state.otherUserId,
        content: content,
        sentAt: new Date().toISOString(),
        isRead: false,
        isMine: true,
        hasAttachments: files.length > 0,
        attachments: []
    };

    // Add to state
    state.messages.push(optimisticMessage);

    // Add to UI optimistically
    addOptimisticMessage(optimisticMessage);

    try {
        // Send to server
        const response = await fetch('/Message/SendMessage', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const result = await response.json();

        if (result.success) {
            // Remove optimistic message
            removeMessage(tempId);

            // Remove from state
            state.messages = state.messages.filter(m => m.id !== tempId);

            // Add real message to state
            state.messages.push(result.message);

            // Add real message to UI
            addRealMessage(result.message);

            // Scroll to bottom
            if (state.isScrolledToBottom) {
                scrollToBottom();
            }

            // Reload conversations to update last message
            loadConversations();
        } else {
            // Show error on optimistic message
            showMessageError(tempId, result.errors ? result.errors[0] : 'Failed to send message');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        showMessageError(tempId, 'Network error');
    }
}

/**
 * Add optimistic message to UI before server confirmation
 */
function addOptimisticMessage(message) {
    // Get or create a new message group for this message
    let messageGroup;
    const lastGroup = elements.messagesList.querySelector('.message-group:last-child');

    if (lastGroup && lastGroup.querySelector('.message-item:last-child')?.classList.contains('justify-content-end')) {
        // Can add to existing group
        messageGroup = lastGroup;
        appendMessageToGroup(message, messageGroup, true);
    } else {
        // Create new group
        messageGroup = document.createElement('div');
        messageGroup.className = 'message-group';
        elements.messagesList.appendChild(messageGroup);
        appendMessageToGroup(message, messageGroup, false);
    }

    // Scroll to bottom
    scrollToBottom();
}

/**
 * Add real message after server confirmation
 */
function addRealMessage(message) {
    const tempElement = document.querySelector(`[data-id="temp-${message.id}"]`);

    if (tempElement) {
        // Replace existing element
        tempElement.dataset.id = message.id;

        // Update status
        const statusElement = tempElement.querySelector('.message-status');
        if (statusElement) {
            statusElement.textContent = message.isRead ? 'Đã xem' : 'Đã gửi';
            statusElement.className = `ms-2 message-status ${message.isRead ? 'text-info' : 'text-white-50'}`;
        }
    } else {
        // Get or create a new message group
        let messageGroup;
        const lastGroup = elements.messagesList.querySelector('.message-group:last-child');

        if (lastGroup && lastGroup.querySelector('.message-item:last-child')?.classList.contains('justify-content-end')) {
            // Can add to existing group
            messageGroup = lastGroup;
            appendMessageToGroup(message, messageGroup, true);
        } else {
            // Create new group
            messageGroup = document.createElement('div');
            messageGroup.className = 'message-group';
            elements.messagesList.appendChild(messageGroup);
            appendMessageToGroup(message, messageGroup, false);
        }
    }
}

/**
 * Delete a message
 */
async function deleteMessage(messageId) {
    try {
        const response = await fetch(`/Message/DeleteMessage/${state.otherUserId}/${messageId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const result = await response.json();

        if (result.success) {
            // Remove from UI
            removeMessage(messageId);

            // Remove from state
            state.messages = state.messages.filter(m => m.id !== messageId);
        } else {
            showToast('Xóa tin nhắn thất bại');
        }
    } catch (error) {
        console.error('Error deleting message:', error);
        showToast('Lỗi kết nối: Không thể xóa tin nhắn');
    }
}

/**
 * Remove a message from the UI
 */
function removeMessage(messageId) {
    const messageElement = document.querySelector(`[data-id="${messageId}"]`);

    if (messageElement) {
        // Get parent group
        const messageGroup = messageElement.closest('.message-group');

        // Remove with fade out effect
        messageElement.style.opacity = '0';
        messageElement.style.transform = 'translateY(10px)';
        messageElement.style.transition = 'opacity 0.3s, transform 0.3s';

        setTimeout(() => {
            messageElement.remove();

            // If group is now empty, remove it
            if (messageGroup && messageGroup.children.length === 0) {
                messageGroup.remove();
            }
        }, 300);
    }
}

/**
 * Show error on a message
 */
function showMessageError(messageId, errorText) {
    const messageBubble = document.querySelector(`[data-id="${messageId}"] .message-bubble`);

    if (messageBubble) {
        messageBubble.classList.add('bg-danger');

        // Add error message
        const errorElement = document.createElement('div');
        errorElement.className = 'text-white small mt-2';
        errorElement.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-1"></i>${errorText}`;
        messageBubble.appendChild(errorElement);
    }
}

/**
 * Handle receiving a new message via SignalR
 */
function handleReceiveMessage(message) {
    // Only process if it's from the current conversation partner
    if (message.senderId !== parseInt(state.otherUserId)) return;

    // Convert to client-side format
    message.isMine = false;

    // Add to state
    state.messages.push(message);

    // Check if we need to add a date separator
    const messageDate = new Date(message.sentAt);
    const messageDay = messageDate.toDateString();

    const lastDateSeparator = elements.messagesList.querySelector('.date-separator:last-child');
    const lastSeparatorDate = lastDateSeparator ? new Date(lastDateSeparator.textContent).toDateString() : null;

    if (lastSeparatorDate !== messageDay) {
        addDateSeparator(messageDay);
    }

    // Get or create message group
    let messageGroup;
    const lastGroup = elements.messagesList.querySelector('.message-group:last-child');

    if (lastGroup && !lastGroup.querySelector('.message-item:last-child')?.classList.contains('justify-content-end')) {
        // Last message was also from the other user, can add to this group
        messageGroup = lastGroup;
        appendMessageToGroup(message, messageGroup, true);
    } else {
        // Create new group
        messageGroup = document.createElement('div');
        messageGroup.className = 'message-group';
        elements.messagesList.appendChild(messageGroup);
        appendMessageToGroup(message, messageGroup, false);
    }

    // Play notification sound
    playMessageSound();

    // Mark as read if we're viewing the conversation
    markAsRead(message.id);

    // Scroll to bottom if we're already near bottom
    if (state.isScrolledToBottom) {
        scrollToBottom();
    } else {
        // Show new message indicator
        showNewMessageIndicator();
    }

    // Update conversation list
    loadConversations();
}

/**
 * Handle message read event from SignalR
 */
function handleMessageRead(messageId) {
    // Find message in UI and update status
    const statusElement = document.querySelector(`[data-id="${messageId}"] .message-status`);

    if (statusElement) {
        statusElement.textContent = 'Đã xem';
        statusElement.className = 'ms-2 message-status text-info';
    }

    // Update in state
    const message = state.messages.find(m => m.id === messageId);
    if (message) {
        message.isRead = true;
    }
}

/**
 * Handle message deleted event from SignalR
 */
function handleMessageDeleted(messageId) {
    removeMessage(messageId);

    // Update state
    state.messages = state.messages.filter(m => m.id !== messageId);
}

/**
 * Handle typing indicator from SignalR
 */
function handleReceiveTypingStatus(userId, isTyping) {
    if (parseInt(userId) !== parseInt(state.otherUserId)) return;

    if (isTyping) {
        showElement(elements.typingIndicator);
    } else {
        hideElement(elements.typingIndicator);
    }
}

/**
 * Handle user online status from SignalR
 */
function handleUserOnline(userId) {
    if (parseInt(userId) !== parseInt(state.otherUserId)) return;

    updateUserStatus(true);
}

/**
 * Handle user offline status from SignalR
 */
function handleUserOffline(userId) {
    if (parseInt(userId) !== parseInt(state.otherUserId)) return;

    updateUserStatus(false);
}

/**
 * Handle typing input for sending typing status
 */
function handleTypingInput() {
    if (!state.isTyping) {
        state.isTyping = true;

        // Send typing status
        if (state.connection && state.connection.state === signalR.HubConnectionState.Connected) {
            state.connection.invoke('SendTypingStatus', parseInt(state.otherUserId), true)
                .catch(err => console.error('Error sending typing status:', err));
        }
    }

    // Reset typing timer
    clearTimeout(state.typingTimer);
    state.typingTimer = setTimeout(() => {
        state.isTyping = false;

        // Send stopped typing status
        if (state.connection && state.connection.state === signalR.HubConnectionState.Connected) {
            state.connection.invoke('SendTypingStatus', parseInt(state.otherUserId), false)
                .catch(err => console.error('Error sending typing status:', err));
        }
    }, 3000);
}

/**
 * Handle messages list scrolling
 */
function handleMessagesScroll() {
    const messagesList = elements.messagesList;

    // Check if scrolled to bottom
    const isNearBottom = messagesList.scrollHeight - messagesList.scrollTop - messagesList.clientHeight < 100;
    state.isScrolledToBottom = isNearBottom;

    // Hide new message indicator if at bottom
    if (isNearBottom && elements.newMessagesIndicator.style.display !== 'none') {
        hideElement(elements.newMessagesIndicator);
    }

    // Check if at top to load older messages (not implemented)
    if (messagesList.scrollTop === 0) {
        // loadOlderMessages(); // Would be implemented for pagination
    }
}

/**
 * Mark message as read
 */
async function markAsRead(messageId) {
    try {
        const response = await fetch(`/Message/MarkAsRead/${messageId}`, {
            method: 'POST'
        });

        if (!response.ok) {
            console.error('Error marking message as read');
        }
    } catch (error) {
        console.error('Error marking message as read:', error);
    }
}

/**
 * Show attachment previews
 */
function showAttachmentPreviews() {
    const files = elements.attachments.files;
    const previewContainer = elements.attachmentPreview;
    previewContainer.innerHTML = '';

    if (files.length === 0) return;

    const previewsRow = document.createElement('div');
    previewsRow.className = 'd-flex flex-wrap mt-2';
    previewContainer.appendChild(previewsRow);

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isImage = file.type.startsWith('image/');

        const previewItem = document.createElement('div');
        previewItem.className = 'attachment-preview';

        if (isImage) {
            // Create image preview with FileReader
            const reader = new FileReader();
            reader.onload = function (e) {
                previewItem.innerHTML = `
                    <div class="card" style="width: 80px;">
                        <img src="${e.target.result}" class="card-img-top" style="height: 80px; object-fit: cover;">
                        <div class="card-body p-1">
                            <p class="card-text small text-truncate">${file.name}</p>
                        </div>
                    </div>
                    <button type="button" class="attachment-remove btn-close btn-close-white bg-danger"></button>
                `;

                // Add remove button event
                previewItem.querySelector('.attachment-remove').addEventListener('click', function () {
                    previewItem.remove();
                    // Note: Can't remove from files directly as it's a readonly property
                });

                previewsRow.appendChild(previewItem);
            };
            reader.readAsDataURL(file);
        } else {
            // Create file icon preview
            let fileIcon = 'bi-file-earmark';

            if (file.type.includes('pdf')) fileIcon = 'bi-file-earmark-pdf';
            else if (file.type.includes('word')) fileIcon = 'bi-file-earmark-word';
            else if (file.type.includes('excel')) fileIcon = 'bi-file-earmark-excel';
            else if (file.type.includes('zip') || file.type.includes('rar')) fileIcon = 'bi-file-earmark-zip';
            else if (file.type.includes('video')) fileIcon = 'bi-file-earmark-play';
            else if (file.type.includes('audio')) fileIcon = 'bi-file-earmark-music';

            previewItem.innerHTML = `
                <div class="card" style="width: 80px;">
                    <div class="card-body text-center p-2">
                        <i class="bi ${fileIcon}" style="font-size: 2rem;"></i>
                        <p class="card-text small text-truncate mt-1">${file.name}</p>
                    </div>
                </div>
                <button type="button" class="attachment-remove btn-close btn-close-white bg-danger"></button>
            `;

            // Add remove button event
            previewItem.querySelector('.attachment-remove').addEventListener('click', function () {
                previewItem.remove();
                // Note: Can't remove from files directly as it's a readonly property
            });

            previewsRow.appendChild(previewItem);
        }
    }
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
 * Show new message indicator
 */
function showNewMessageIndicator() {
    elements.newMessagesIndicator.style.display = 'block';
}

/**
 * Scroll to bottom of messages list
 */
function scrollToBottom() {
    elements.messagesList.scrollTop = elements.messagesList.scrollHeight;
    state.isScrolledToBottom = true;
    hideElement(elements.newMessagesIndicator);
}

/**
 * Show toast notification
 */
function showToast(message) {
    // Create toast if it doesn't exist
    let toastContainer = document.getElementById('toast-container');

    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }

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

    // Auto-hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);

    // Add close button event
    toast.querySelector('.btn-close').addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    });
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
 * Format a file size in bytes to a human-readable string
 */
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
}

/**
 * Format a date for messages
 */
function formatMessageDate(date) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Hôm nay';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Hôm qua';
    } else {
        return date.toLocaleDateString('vi-VN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
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
 * Format time (HH:MM)
 */
function formatTime(date) {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
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
