/* Friend management specific styles */

.friend - item {
    transition: all 0.2s ease;
}

.friend - item:hover {
    background - color: rgba(0, 0, 0, 0.03);
}

.online - indicator {
    width: 12px;
    height: 12px;
}

.avatar {
    object - fit: cover;
}

.min - width - 0 {
    min - width: 0;
}

/* User search results */
#searchResults {
    max - height: 400px;
    overflow - y: auto;
}

/* User details modal */
.user - info {
    font - size: 0.9rem;
}

/* Animations */
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.friend - item, #friendRequestsList.list - group - item {
    animation: fadeIn 0.3s ease;
}
