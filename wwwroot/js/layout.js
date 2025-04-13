/**
 * Layout JavaScript for WeChat application
 * Handles common interactions across the entire site with fetch API
 */
document.addEventListener('DOMContentLoaded', function () {
    // Display the last document access time if it exists
    const documentAccessBtn = document.getElementById('documentAccessBtn');
    if (documentAccessBtn) {
        documentAccessBtn.addEventListener('click', function () {
            showLastDocumentAccess();
        });
    }

    // Preloader
    setTimeout(function () {
        const preloader = document.querySelector('.preloader');
        if (preloader) {
            preloader.style.display = 'none';
        }
    }, 700);

    // Navbar scroll effect
    window.addEventListener('scroll', function () {
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }
    });

    // Initialize tooltips
    initializeTooltips();

    // Handle floating action button
    initFloatingActionButton();

    // Handle logout with fetch API - no confirmation needed
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();

            // Show loading indicator
            showToast('Info', 'Logging out...', 'info');

            fetch('/Account/Logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
                .then(response => {
                    // Redirect after logout
                    window.location.href = '/';
                })
                .catch(error => {
                    showToast('Error', 'An error occurred during logout', 'error');
                });
        });
    }

    // Handle modal switching for registration and login
    const showRegisterModal = document.getElementById('showRegisterModal');
    if (showRegisterModal) {
        showRegisterModal.addEventListener('click', function (e) {
            e.preventDefault();
            const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
            loginModal.hide();
            setTimeout(function () {
                const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
                registerModal.show();
            }, 400);
        });
    }

    const showLoginModal = document.getElementById('showLoginModal');
    if (showLoginModal) {
        showLoginModal.addEventListener('click', function (e) {
            e.preventDefault();
            const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
            registerModal.hide();
            setTimeout(function () {
                const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
                loginModal.show();
            }, 400);
        });
    }

    // Show login modal
    const loginNavLink = document.getElementById('loginNavLink');
    if (loginNavLink) {
        loginNavLink.addEventListener('click', function (e) {
            e.preventDefault();
            const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
            loginModal.show();
        });
    }

    // Show register modal
    const registerNavLink = document.getElementById('registerNavLink');
    if (registerNavLink) {
        registerNavLink.addEventListener('click', function (e) {
            e.preventDefault();
            const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
            registerModal.show();
        });
    }

    // Back to Top button functionality
    window.addEventListener('scroll', function () {
        const backToTopBtn = document.querySelector('.back-to-top');
        if (backToTopBtn) {
            if (window.scrollY > 300) {
                backToTopBtn.classList.add('active');
            } else {
                backToTopBtn.classList.remove('active');
            }
        }
    });

    const backToTopBtn = document.querySelector('.back-to-top');
    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', function (e) {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // Login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const rememberMe = document.getElementById('rememberMe').checked;

            if (!email || !password) {
                showToast('Error', 'Please fill in all required fields', 'error');
                return false;
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showToast('Error', 'Please enter a valid email address', 'error');
                return false;
            }

            // Show loading state
            const loginButton = loginForm.querySelector('button[type="submit"]');
            const originalText = loginButton.innerHTML;
            loginButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Logging in...';
            loginButton.disabled = true;

            // Create form data instead of JSON
            const formData = new FormData();
            formData.append('UsernameOrEmail', email);
            formData.append('Password', password);
            formData.append('RememberMe', rememberMe);

            // Perform login with traditional form POST
            fetch('/Account/Login', {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showToast('Success', 'Login successful! Redirecting...', 'success');
                        setTimeout(function () {
                            window.location.reload();
                        }, 1000);
                    } else {
                        loginButton.innerHTML = originalText;
                        loginButton.disabled = false;
                        showToast('Error', data.message || 'Invalid login attempt', 'error');
                    }
                })
                .catch(error => {
                    loginButton.innerHTML = originalText;
                    loginButton.disabled = false;
                    showToast('Error', 'An error occurred during login', 'error');
                    console.error('Login error:', error);
                });
        });
    }

    // Register form submission
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const firstName = document.getElementById('registerFirstName').value;
            const lastName = document.getElementById('registerLastName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('registerConfirmPassword').value;
            const termsAccepted = document.getElementById('termsAccept').checked;

            // Basic validation
            if (!firstName || !lastName || !email || !password || !confirmPassword) {
                showToast('Error', 'Please fill in all required fields', 'error');
                return false;
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showToast('Error', 'Please enter a valid email address', 'error');
                return false;
            }

            // Password validation
            if (password.length < 6) {
                showToast('Error', 'Password must be at least 6 characters long', 'error');
                return false;
            }

            // Password confirmation
            if (password !== confirmPassword) {
                showToast('Error', 'Passwords do not match', 'error');
                return false;
            }

            // Terms acceptance
            if (!termsAccepted) {
                showToast('Error', 'You must accept the Terms of Service', 'error');
                return false;
            }

            // Show loading state
            const registerButton = registerForm.querySelector('button[type="submit"]');
            const originalText = registerButton.innerHTML;
            registerButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Creating account...';
            registerButton.disabled = true;

            // Create form data instead of JSON
            const formData = new FormData();
            formData.append('Username', email.split('@')[0]); // Generate username from email
            formData.append('Email', email);
            formData.append('FullName', firstName + ' ' + lastName);
            formData.append('Password', password);
            formData.append('ConfirmPassword', confirmPassword);

            // Perform registration with traditional form POST
            fetch('/Account/Register', {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showToast('Success', 'Registration successful! Redirecting...', 'success');
                        setTimeout(function () {
                            window.location.reload();
                        }, 1000);
                    } else {
                        registerButton.innerHTML = originalText;
                        registerButton.disabled = false;

                        if (data.message) {
                            showToast('Error', data.message, 'error');
                        } else if (data.errors) {
                            // Display first error message from the errors object
                            const firstErrorKey = Object.keys(data.errors)[0];
                            showToast('Error', data.errors[firstErrorKey][0], 'error');
                        } else {
                            showToast('Error', 'Registration failed', 'error');
                        }
                    }
                })
                .catch(error => {
                    registerButton.innerHTML = originalText;
                    registerButton.disabled = false;
                    showToast('Error', 'An error occurred during registration', 'error');
                    console.error('Registration error:', error);
                });
        });
    }
});

/**
 * Initialize Bootstrap tooltips
 */
function initializeTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl, {
            delay: { show: 50, hide: 50 },
            placement: 'auto'
        });
    });
}

/**
 * Initialize the floating action button
 */
function initFloatingActionButton() {
    // Toggle sub-buttons when FAB is clicked
    const floatingActionButton = document.querySelector('.floating-action-button');
    if (floatingActionButton) {
        floatingActionButton.addEventListener('click', function () {
            document.querySelector('.fab-options').classList.toggle('active');
            this.classList.toggle('active');
        });
    }

    // Hide the options when clicking outside
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.fab-container')) {
            const fabOptions = document.querySelector('.fab-options');
            const floatingActionBtn = document.querySelector('.floating-action-button');
            if (fabOptions) fabOptions.classList.remove('active');
            if (floatingActionBtn) floatingActionBtn.classList.remove('active');
        }
    });

    // Add hover effects
    document.querySelectorAll('.fab-item').forEach(function (item) {
        item.addEventListener('mouseenter', function () {
            const tooltipText = this.dataset.tooltip;
            const tooltip = document.createElement('span');
            tooltip.className = 'fab-tooltip';
            tooltip.textContent = tooltipText;
            this.appendChild(tooltip);
        });

        item.addEventListener('mouseleave', function () {
            const tooltip = this.querySelector('.fab-tooltip');
            if (tooltip) {
                tooltip.remove();
            }
        });
    });
}

/**
 * Show toast notification
 * @param {string} title - Toast title
 * @param {string} message - Toast message
 * @param {string} type - Toast type (success, error, info)
 */
function showToast(title, message, type) {
    // Generate a unique ID for the toast
    const toastId = 'toast-' + new Date().getTime();

    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toastHtml = `
        <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true" data-bs-autohide="true" data-bs-delay="5000">
            <div class="toast-header ${type === 'error' ? 'text-white bg-danger' : (type === 'success' ? 'bg-success text-white' : (type === 'info' ? 'bg-info text-white' : ''))}">
                <i class="bi ${type === 'error' ? 'bi-exclamation-circle' : (type === 'success' ? 'bi-check-circle' : 'bi-info-circle')} me-2"></i>
                <strong class="me-auto">${title}</strong>
                <small>Just now</small>
                <button type="button" class="btn-close ${type === 'error' || type === 'success' || type === 'info' ? 'btn-close-white' : ''}" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    const toastElement = document.getElementById(toastId);
    const bsToast = new bootstrap.Toast(toastElement);
    bsToast.show();

    // Remove the toast after it's hidden
    toastElement.addEventListener('hidden.bs.toast', function () {
        toastElement.remove();
    });
}

/**
 * Check if an image exists, and if not, use a fallback
 * @param {string} url - Image URL to check
 * @param {string} fallbackUrl - Fallback URL to use if the image doesn't exist
 */
function checkImageExists(url, fallbackUrl) {
    const img = new Image();
    img.src = url;
    img.onerror = function () {
        document.querySelectorAll(`img[src="${url}"]`).forEach(function (imgElement) {
            imgElement.src = fallbackUrl;
        });
    };
}

/**
 * Show the last document access time in a toast notification
 */
function showLastDocumentAccess() {
    const lastDocumentAccess = getCookie('lastDocumentAccess');

    if (lastDocumentAccess) {
        const formattedDate = formatDate(decodeURIComponent(lastDocumentAccess));
        showToast('Document Access', 'Lần cuối truy cập trang quản lý document: ' + formattedDate, 'info');
    } else {
        showToast('Document Access', 'Bạn chưa truy cập trang quản lý document', 'info');
    }
}

/**
 * Get a cookie value by name
 * @param {string} name - Cookie name
 * @returns {string|null} Cookie value or null if not found
 */
function getCookie(name) {
    const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith(`${name}=`));

    if (cookieValue) {
        return cookieValue.split('=')[1];
    }
    return null;
}

/**
 * Format a date string for display
 * @param {string} dateStr - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateStr) {
    if (!dateStr) return '';

    try {
        const date = new Date(dateStr);
        return date.toLocaleString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return '';
    }
}