/**
 * Home Page JavaScript
 * Handles homepage-specific interactions for WeChat application
 */
document.addEventListener('DOMContentLoaded', function () {
    // Preloader
    setTimeout(function () {
        document.querySelector('.preloader').style.display = 'none';
    }, 800);

    // Register button click handler (for non-authenticated users)
    document.getElementById('btnRegister')?.addEventListener('click', function () {
        const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
        registerModal.show();
    });

    // Login button click handler (for non-authenticated users)
    document.getElementById('btnLogin')?.addEventListener('click', function () {
        const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
        loginModal.show();
    });

    if (document.getElementById('upcomingEventsSection')) {
        loadUpcomingEvents();
    }

    // Floating action button behaviors
    initFloatingActionButton();

    // Contact form submission
    document.getElementById('btnSendMessage')?.addEventListener('click', function () {
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const message = document.getElementById('message').value.trim();

        // Basic validation
        if (!name || !email || !message) {
            showToast('Lỗi', 'Vui lòng điền đầy đủ thông tin', 'error');
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showToast('Lỗi', 'Địa chỉ email không hợp lệ', 'error');
            return;
        }

        // Show processing state
        const btn = this;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang xử lý...';
        btn.disabled = true;

        // Simulate form submission (replace with actual AJAX call in production)
        setTimeout(function () {
            // Reset form
            document.getElementById('name').value = '';
            document.getElementById('email').value = '';
            document.getElementById('message').value = '';

            // Reset button
            btn.innerHTML = originalText;
            btn.disabled = false;

            // Show success message
            showToast('Thành công', 'Tin nhắn của bạn đã được gửi thành công. Chúng tôi sẽ phản hồi sớm nhất có thể.', 'success');
        }, 1500);
    });

    // Load upcoming events for authenticated users
    if (document.getElementById('upcomingEvents')) {
        loadUpcomingEvents();
    }

    // Load user subscription details
    if (document.getElementById('userSubscription')) {
        loadUserSubscription();
    }

    // Initialize animations
    initScrollAnimation();
    animateElements();
    initializeCounters();

    // Initialize tooltips
    initTooltips();

    // Event card click handler
    document.addEventListener('click', function (e) {
        if (e.target.closest('.event-card')) {
            const eventCard = e.target.closest('.event-card');
            const eventId = eventCard.dataset.eventId;
            if (eventId) {
                window.location.href = `/Event/Details/${eventId}`;
            }
        }
    });

    // Subscription card click handler
    document.addEventListener('click', function (e) {
        if (e.target.closest('.subscription-card')) {
            window.location.href = '/User/MySubscriptions';
        }
    });
});

/**
 * Initialize Bootstrap tooltips
 */
function initTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl, {
            delay: { show: 50, hide: 50 },
            placement: 'auto'
        });
    });
}

/**
 * Initialize the floating action button and its sub-buttons
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
 * Function to load upcoming events in the home page
 */
function loadUpcomingEvents() {
    const eventsContainer = document.getElementById('upcomingEvents');
    if (!eventsContainer) return;

    // Show loading state
    eventsContainer.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2 mb-0 text-muted">Loading events...</p>
        </div>
    `;

    // AJAX request to get upcoming events
    fetch('/Event/GetUpcomingEvents')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(events => {
            // Check if we have events
            if (events && events.length > 0) {
                let eventsHtml = '';

                // Generate HTML for each event
                events.forEach(function (event) {
                    // Format dates
                    const startDate = new Date(event.start);
                    const endDate = new Date(event.end);

                    const day = startDate.getDate();
                    const month = startDate.toLocaleString('default', { month: 'short' });

                    const startTimeStr = event.allDay ? 'All day' :
                        startDate.toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit' });
                    const endTimeStr = event.allDay ? '' :
                        endDate.toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit' });

                    const timeDisplay = event.allDay ? 'All day' :
                        `${startTimeStr} - ${endTimeStr}`;

                    eventsHtml += `
                        <div class="col-md-6 mb-3">
                            <div class="event-card card h-100 border-0 shadow-sm" data-event-id="${event.id}">
                                <div class="card-body">
                                    <div class="d-flex">
                                        <div class="event-date text-center me-3">
                                            <div class="event-date-month">${month}</div>
                                            <div class="event-date-day">${day}</div>
                                        </div>
                                        <div>
                                            <h5 class="card-title event-title">${event.title}</h5>
                                            <p class="card-text text-muted mb-1">
                                                <i class="bi bi-clock me-1"></i>${timeDisplay}
                                            </p>
                                            ${event.location ? `<p class="card-text text-muted mb-0"><i class="bi bi-geo-alt me-1"></i>${event.location}</p>` : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                });

                // Show the events
                eventsContainer.innerHTML = `
                    <div class="row">
                        ${eventsHtml}
                    </div>
                    <div class="text-center mt-2">
                        <a href="/Event/Index" class="btn btn-outline-primary btn-sm">
                            <i class="bi bi-calendar-week me-1"></i>View all events
                        </a>
                    </div>
                `;

            } else {
                // Show no events message
                eventsContainer.innerHTML = `
                    <div class="text-center py-4">
                        <i class="bi bi-calendar3 text-muted" style="font-size: 2.5rem;"></i>
                        <p class="mt-3 mb-0 text-muted">No upcoming events</p>
                        <a href="/Event/Index" class="btn btn-outline-primary btn-sm mt-3">
                            <i class="bi bi-calendar-plus me-1"></i>Create an event
                        </a>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error("Error loading upcoming events:", error);
            // Show error message
            eventsContainer.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <i class="bi bi-exclamation-circle me-2"></i>
                    Failed to load upcoming events. Please try again later.
                </div>
            `;
        });

    // Set default images for all images if they fail to load
    document.querySelectorAll('img').forEach(function (img) {
        if (!img.hasAttribute('onerror')) {
            img.onerror = function () {
                // Use a specific default image for avatars
                if (img.classList.contains('rounded-circle') || img.classList.contains('avatar-img')) {
                    this.src = '/images/avatars/default-avatar.png';
                } else {
                    this.src = '/images/default-image.png';
                }
            };
        }
    });
}

/**
 * Load and display the user's subscription details
 */
function loadUserSubscription() {
    const subscriptionContainer = document.getElementById('userSubscription');
    if (!subscriptionContainer) return;

    // Show loading state
    subscriptionContainer.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Đang tải...</span>
            </div>
            <p class="mt-2 mb-0 text-muted">Đang tải thông tin gói đăng ký...</p>
        </div>
    `;

    // AJAX request to get subscription information
    fetch('/Subscription/GetMySubscriptionStatus')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data && data.success) {
                if (data.hasActiveSubscription) {
                    // User has an active subscription
                    const daysRemaining = data.subscription.daysRemaining;
                    let statusClass, statusText;

                    if (daysRemaining > 30) {
                        statusClass = 'bg-success';
                        statusText = 'Hoạt động';
                    } else if (daysRemaining > 7) {
                        statusClass = 'bg-warning';
                        statusText = 'Sắp hết hạn';
                    } else {
                        statusClass = 'bg-danger';
                        statusText = 'Sắp hết hạn';
                    }

                    // Format the end date
                    const endDate = new Date(data.subscription.endDate);
                    const formattedEndDate = endDate.toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    });

                    // Generate HTML for the subscription card
                    subscriptionContainer.innerHTML = `
                        <div class="subscription-card card border-0 shadow-sm h-100">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start">
                                    <div>
                                        <span class="badge ${statusClass} mb-2">${statusText}</span>
                                        <h5 class="card-title mb-2">Gói ${data.subscription.planName}</h5>
                                        <p class="card-text text-muted mb-0">Hết hạn: ${formattedEndDate}</p>
                                    </div>
                                    <div class="subscription-days-left">
                                        <span class="days">${daysRemaining}</span>
                                        <span class="text">ngày</span>
                                    </div>
                                </div>
                            </div>
                            <div class="card-footer bg-white border-0">
                                <small class="text-muted">Nhấp để xem chi tiết gói đăng ký</small>
                            </div>
                        </div>
                    `;
                } else {
                    // User doesn't have an active subscription
                    subscriptionContainer.innerHTML = `
                        <div class="card border-0 shadow-sm h-100">
                            <div class="card-body text-center">
                                <i class="bi bi-star text-warning" style="font-size: 2.5rem;"></i>
                                <h5 class="card-title mt-3 mb-2">Nâng cấp ngay</h5>
                                <p class="card-text text-muted mb-3">Bạn chưa có gói đăng ký nào. Nâng cấp để mở khóa tất cả tính năng.</p>
                                <a href="/User/Plans" class="btn btn-primary btn-sm">
                                    <i class="bi bi-arrow-up-circle me-1"></i>Khám phá các gói đăng ký
                                </a>
                            </div>
                        </div>
                    `;
                }
            } else {
                // Error loading subscription data
                subscriptionContainer.innerHTML = `
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-body text-center">
                            <i class="bi bi-exclamation-circle text-danger" style="font-size: 2rem;"></i>
                            <p class="mt-2 mb-0 text-danger">Không thể tải thông tin gói đăng ký.</p>
                        </div>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error("Error loading subscription data:", error);
            // Show error message
            subscriptionContainer.innerHTML = `
                <div class="card border-0 shadow-sm h-100">
                    <div class="card-body text-center">
                        <i class="bi bi-exclamation-circle text-danger" style="font-size: 2rem;"></i>
                        <p class="mt-2 mb-0 text-danger">Không thể tải thông tin gói đăng ký. Vui lòng thử lại sau.</p>
                    </div>
                </div>
            `;
        });
}

/**
 * Animate elements on page load
 */
function animateElements() {
    // Animate features
    document.querySelectorAll('.features-item').forEach(function (item, index) {
        setTimeout(function () {
            item.classList.add('fade-in');
        }, 300 * index);
    });

    // Animate testimonial cards
    document.querySelectorAll('.testimonial-card').forEach(function (card, index) {
        setTimeout(function () {
            card.classList.add('slide-up');
        }, 200 * index);
    });

    // Add floating effect to hero image
    setInterval(function () {
        const heroImageWrapper = document.querySelector('.hero-image-wrapper');
        if (heroImageWrapper) {
            heroImageWrapper.classList.toggle('floating');
        }
    }, 3000);

    // Animate the quick access cards
    document.querySelectorAll('.quick-access-card').forEach(function (card, index) {
        setTimeout(function () {
            card.classList.add('appear');
        }, 150 * index);
    });
}

/**
 * Initialize scroll animations for elements
 */
function initScrollAnimation() {
    // Check if element is in viewport
    function isElementInView(element) {
        const rect = element.getBoundingClientRect();
        const windowTop = window.scrollY || document.documentElement.scrollTop;
        const windowBottom = windowTop + window.innerHeight;
        const elementTop = rect.top + windowTop;
        const elementBottom = elementTop + rect.height;

        return ((elementBottom <= windowBottom) && (elementTop >= windowTop - 100));
    }

    // Handle scroll animation
    function handleScrollAnimation() {
        document.querySelectorAll('.animate-on-scroll').forEach(function (element) {
            if (isElementInView(element)) {
                element.classList.add('in-view');
            }
        });
    }

    // Initial check
    handleScrollAnimation();

    // Check on scroll
    window.addEventListener('scroll', handleScrollAnimation);
}

/**
 * Initialize counter animations
 */
function initializeCounters() {
    // Only start counter when element is in view
    function isCounterInView(el) {
        const rect = el.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    // Counter animation
    function animateCounter() {
        document.querySelectorAll('.counter').forEach(function (counter) {
            if (!counter.classList.contains('animated') && isCounterInView(counter)) {
                counter.classList.add('animated');

                const countTo = parseInt(counter.getAttribute('data-count'));
                let count = 0;

                const interval = setInterval(function () {
                    const increment = countTo / 100;
                    count += increment;

                    if (count >= countTo) {
                        counter.textContent = countTo.toLocaleString();
                        clearInterval(interval);
                    } else {
                        counter.textContent = Math.floor(count).toLocaleString();
                    }
                }, 20);
            }
        });
    }

    // Check counters on scroll
    window.addEventListener('scroll', animateCounter);

    // Check counters on page load
    animateCounter();
}

/**
 * Smooth scroll to section when clicking navigation links
 */
document.addEventListener('click', function (e) {
    if (e.target.matches('a.nav-link, a.smooth-scroll') || e.target.closest('a.nav-link, a.smooth-scroll')) {
        const link = e.target.matches('a.nav-link, a.smooth-scroll') ? e.target : e.target.closest('a.nav-link, a.smooth-scroll');
        const hash = link.hash;

        // Check if the link has a hash and is on the same page
        if (hash && document.querySelector(hash)) {
            e.preventDefault();

            const targetElement = document.querySelector(hash);
            // Replace deprecated window.pageYOffset with window.scrollY
            const targetPosition = targetElement.getBoundingClientRect().top + window.scrollY - 70;

            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });

            // Add hash to URL after scroll
            setTimeout(() => {
                window.location.hash = hash;
            }, 800);
        }
    }
});


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
            <div class="toast-header ${type === 'error' ? 'text-white bg-danger' : (type === 'success' ? 'bg-success text-white' : '')}">
                <i class="bi ${type === 'error' ? 'bi-exclamation-circle' : (type === 'success' ? 'bi-check-circle' : 'bi-info-circle')} me-2"></i>
                <strong class="me-auto">${title}</strong>
                <small>Vừa xong</small>
                <button type="button" class="btn-close ${type === 'error' || type === 'success' ? 'btn-close-white' : ''}" data-bs-dismiss="toast" aria-label="Close"></button>
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

document.addEventListener('click', function (e) {
    if (e.target.closest('.back-to-top')) {
        e.preventDefault();
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
});

// Newsletter subscription
document.getElementById('btnSubscribeNewsletter')?.addEventListener('click', function () {
    const emailInput = this.previousElementSibling;
    const email = emailInput.value;
    const privacyCheck = document.getElementById('privacyCheck');
    const isChecked = privacyCheck?.checked;

    if (!email) {
        showToast('Lỗi', 'Vui lòng nhập địa chỉ email', 'error');
        return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showToast('Lỗi', 'Địa chỉ email không hợp lệ', 'error');
        return;
    }

    if (!isChecked) {
        showToast('Lỗi', 'Vui lòng đồng ý với Chính sách bảo mật', 'error');
        return;
    }

    // Show processing
    const btn = this;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang xử lý...';
    btn.disabled = true;

    // Simulate form submission (replace with actual fetch call)
    setTimeout(function () {
        btn.innerHTML = originalText;
        btn.disabled = false;
        emailInput.value = '';
        if (privacyCheck) privacyCheck.checked = false;
        showToast('Thành công', 'Cảm ơn bạn đã đăng ký nhận bản tin của chúng tôi!', 'success');
    }, 1500);
});
