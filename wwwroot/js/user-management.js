/**
 * User Management JavaScript
 * Handles all user management interactions
 */

// Global variables
let userListData = [];
let toast;

// Document ready
document.addEventListener('DOMContentLoaded', function () {
    // Initialize toast - with proper error handling
    const toastEl = document.getElementById('userToast');
    if (toastEl && typeof bootstrap !== 'undefined') {
        try {
            toast = new bootstrap.Toast(toastEl);
        } catch (error) {
            console.error('Error initializing toast:', error);
        }
    } else if (!toastEl) {
        console.warn('Toast element not found');
    } else {
        console.error('Bootstrap library not loaded');
    }

    // Continue with other initialization
    try {
        initializeEventListeners();
        loadUsers();
    } catch (error) {
        console.error('Error during initialization:', error);
        // Show a basic alert if toast isn't available
        alert('There was an error initializing the application. Please check the console for details.');
    }
});


// Initialize all event listeners
function initializeEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('refreshUserList');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
            loadUsers();
        });
    }

    // Add User button
    const addUserBtn = document.getElementById('btnAddUser');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', function () {
            resetForm();
            document.getElementById('userModalLabel').textContent = 'Thêm người dùng mới';

            const passwordFields = document.querySelectorAll('.password-field');
            passwordFields.forEach(field => field.style.display = 'block');

            const passwordRequired = document.querySelectorAll('.password-required');
            passwordRequired.forEach(item => item.style.display = 'block');

            document.getElementById('password').required = true;

            const userModal = new bootstrap.Modal(document.getElementById('userModal'));
            userModal.show();
        });
    }

    // Save User button
    const saveUserBtn = document.getElementById('saveUser');
    if (saveUserBtn) {
        saveUserBtn.addEventListener('click', function () {
            saveUser();
        });
    }

    // Delete confirmation button
    const confirmDeleteBtn = document.getElementById('confirmDelete');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', function () {
            const userId = document.getElementById('deleteUserId').value;
            deleteUser(userId);
        });
    }

    // Toggle password visibility
    const togglePasswordBtns = document.querySelectorAll('.toggle-password');
    togglePasswordBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            const passwordInput = this.previousElementSibling;
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);

            // Toggle eye/eye-slash icon
            const icon = this.querySelector('i');
            icon.classList.toggle('bi-eye');
            icon.classList.toggle('bi-eye-slash');
        });
    });

    // View User Edit button
    const viewUserEditBtn = document.getElementById('viewUserEdit');
    if (viewUserEditBtn) {
        viewUserEditBtn.addEventListener('click', function () {
            const userId = document.getElementById('viewUserId').textContent;
            const viewUserModal = bootstrap.Modal.getInstance(document.getElementById('viewUserModal'));
            viewUserModal.hide();

            setTimeout(() => {
                editUser(userId);
            }, 500);
        });
    }

    // Set up CSRF token for all fetch requests
    const token = document.querySelector('input[name="__RequestVerificationToken"]');
    if (token) {
        const csrfToken = token.value;
        // We'll use this token in our fetch calls
    }
}

/**
 * Load users list from API
 */
function loadUsers() {
    // Show loading state
    const usersTableBody = document.getElementById('usersTableBody');
    const usersCount = document.getElementById('usersCount');

    if (!usersTableBody || !usersCount) return;

    usersTableBody.innerHTML = `
        <tr>
            <td colspan="10" class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Đang tải...</span>
                </div>
                <p class="mt-2 mb-0 text-muted">Đang tải danh sách người dùng...</p>
            </td>
        </tr>
    `;
    usersCount.textContent = 'Đang tải dữ liệu...';

    // Get CSRF token
    const tokenEl = document.querySelector('input[name="__RequestVerificationToken"]');
    const csrfToken = tokenEl ? tokenEl.value : '';

    fetch('/User/GetUsers', {
        headers: {
            'RequestVerificationToken': csrfToken
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            userListData = data; // Store the data for reference

            if (!usersTableBody) return;
            usersTableBody.innerHTML = '';

            if (data.length === 0) {
                usersTableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center py-5">
                        <i class="bi bi-people text-muted" style="font-size: 3rem;"></i>
                        <p class="mt-3 mb-0">Không tìm thấy người dùng nào</p>
                        <p class="text-muted">Hãy tạo người dùng mới bằng cách nhấn nút "Thêm người dùng mới"</p>
                    </td>
                </tr>
                `;
                usersCount.textContent = '0 người dùng';
                return;
            }

            data.forEach(user => {
                const lastLoginText = user.lastLogin
                    ? new Date(user.lastLogin).toLocaleString('vi-VN')
                    : 'Chưa đăng nhập';

                const createdDateText = user.createdDate
                    ? new Date(user.createdDate).toLocaleDateString('vi-VN')
                    : 'N/A';

                // Ensure we have a default avatar if profilePicture is null
                const profilePic = user.profilePicture || '/images/avatars/default-avatar.png';

                const row = document.createElement('tr');
                row.innerHTML = `
                <td class="ps-3">${user.userId}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="avatar me-2">
                            <img src="${profilePic}" class="rounded-circle" width="32" height="32" alt="${user.username}" style="object-fit: cover;" onerror="this.src='/images/avatars/default-avatar.png';">
                        </div>
                        ${user.username}
                    </div>
                </td>
                <td>${user.email}</td>
                <td>${user.fullName}</td>
                <td>${user.department || '-'}</td>
                <td>${user.jobTitle || '-'}</td>
                <td>${createdDateText}</td>
                <td>${lastLoginText}</td>
                <td>${user.isActive
                        ? '<span class="badge bg-success">Hoạt động</span>'
                        : '<span class="badge bg-danger">Vô hiệu</span>'}
                </td>
                <td class="text-end pe-3">
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-secondary view-user" data-id="${user.userId}" title="Xem chi tiết">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-primary edit-user" data-id="${user.userId}" title="Chỉnh sửa">
                            <i class="bi bi-pencil"></i>
                        </button>
                        ${user.isActive ?
                        `<button class="btn btn-sm btn-outline-danger delete-user" data-id="${user.userId}" title="Vô hiệu hóa">
                                <i class="bi bi-slash-circle"></i>
                            </button>` :
                        `<button class="btn btn-sm btn-outline-success activate-user" data-id="${user.userId}" title="Kích hoạt">
                                <i class="bi bi-check-circle"></i>
                            </button>`
                    }
                    </div>
                </td>
                `;
                usersTableBody.appendChild(row);
            });

            if (usersCount) {
                usersCount.textContent = `${data.length} người dùng`;
            }

            // Attach event handlers to the buttons
            attachEventHandlers();
        })
        .catch(error => {
            console.error('Error loading users:', error);
            if (usersTableBody) {
                usersTableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center py-5 text-danger">
                        <i class="bi bi-exclamation-circle" style="font-size: 3rem;"></i>
                        <p class="mt-3 mb-0">Không thể tải danh sách người dùng</p>
                        <p class="text-muted">Vui lòng thử lại sau hoặc liên hệ quản trị viên</p>
                        <button id="retryLoadUsers" class="btn btn-outline-primary mt-3">Thử lại</button>
                    </td>
                </tr>
                `;
            }

            if (usersCount) {
                usersCount.textContent = 'Lỗi tải dữ liệu';
            }

            const retryBtn = document.getElementById('retryLoadUsers');
            if (retryBtn) {
                retryBtn.addEventListener('click', function () {
                    loadUsers();
                });
            }
        });
}

/**
 * Attach event handlers to dynamically created elements
 */
function attachEventHandlers() {
    // View user buttons
    document.querySelectorAll('.view-user').forEach(button => {
        button.addEventListener('click', function () {
            const userId = this.getAttribute('data-id');
            viewUser(userId);
        });
    });

    // Edit user buttons
    document.querySelectorAll('.edit-user').forEach(button => {
        button.addEventListener('click', function () {
            const userId = this.getAttribute('data-id');
            editUser(userId);
        });
    });

    // Delete user buttons
    document.querySelectorAll('.delete-user').forEach(button => {
        button.addEventListener('click', function () {
            const userId = this.getAttribute('data-id');
            const user = userListData.find(u => u.userId == userId);

            const deleteUserIdInput = document.getElementById('deleteUserId');
            const deleteUserNameEl = document.getElementById('deleteUserName');
            const deleteUserEmailEl = document.getElementById('deleteUserEmail');

            if (deleteUserIdInput) deleteUserIdInput.value = userId;
            if (deleteUserNameEl) deleteUserNameEl.textContent = user.fullName;
            if (deleteUserEmailEl) deleteUserEmailEl.textContent = user.email;

            const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
            deleteModal.show();
        });
    });

    // Activate user buttons
    document.querySelectorAll('.activate-user').forEach(button => {
        button.addEventListener('click', function () {
            const userId = this.getAttribute('data-id');
            activateUser(userId);
        });
    });
}

/**
 * View user details in modal
 */
function viewUser(userId) {
    const user = userListData.find(u => u.userId == userId);
    if (!user) return;

    // Format dates
    const createdDate = user.createdDate
        ? new Date(user.createdDate).toLocaleString('vi-VN')
        : 'N/A';
    const lastLogin = user.lastLogin
        ? new Date(user.lastLogin).toLocaleString('vi-VN')
        : 'Chưa đăng nhập';

    // Ensure we have a default avatar
    const profilePic = user.profilePicture || '/images/avatars/default-avatar.png';

    // Set user details in the modal
    const viewUserAvatar = document.getElementById('viewUserAvatar');
    if (viewUserAvatar) {
        viewUserAvatar.src = profilePic;
        viewUserAvatar.addEventListener('error', function () {
            this.src = '/images/avatars/default-avatar.png';
        });
    }

    // Set the text content for various elements
    const elements = {
        'viewUserFullName': user.fullName,
        'viewUserTitle': user.jobTitle || 'Người dùng',
        'viewUserId': user.userId,
        'viewUserUsername': user.username,
        'viewUserDepartment': user.department || 'Chưa cập nhật',
        'viewUserCreated': createdDate,
        'viewUserLastLogin': lastLogin
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });

    // Set email with href
    const viewUserEmail = document.getElementById('viewUserEmail');
    if (viewUserEmail) {
        viewUserEmail.textContent = user.email;
        viewUserEmail.href = `mailto:${user.email}`;
    }

    // Set status badge
    const viewUserStatus = document.getElementById('viewUserStatus');
    if (viewUserStatus) {
        viewUserStatus.innerHTML = user.isActive
            ? '<span class="badge bg-success">Hoạt động</span>'
            : '<span class="badge bg-danger">Vô hiệu</span>';
    }

    // Show the modal
    const viewUserModal = new bootstrap.Modal(document.getElementById('viewUserModal'));
    viewUserModal.show();
}

/**
 * Edit user in modal
 */
function editUser(userId) {
    // Get references
    const userFormErrors = document.getElementById('userFormErrors');
    const userModalLabel = document.getElementById('userModalLabel');

    if (userFormErrors) userFormErrors.classList.add('d-none');
    if (userModalLabel) userModalLabel.textContent = 'Đang tải thông tin người dùng...';

    // Get CSRF token
    const tokenEl = document.querySelector('input[name="__RequestVerificationToken"]');
    const csrfToken = tokenEl ? tokenEl.value : '';

    fetch(`/User/GetUserDetails/${userId}`, {
        headers: {
            'RequestVerificationToken': csrfToken
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(user => {
            if (user.success === false) {
                showToast('Lỗi', user.message || 'Không thể tải thông tin người dùng', 'error');
                return;
            }

            // Get form elements
            const elements = {
                'userId': user.userId,
                'username': user.username,
                'email': user.email,
                'fullName': user.fullName,
                'department': user.department || '',
                'jobTitle': user.jobTitle || '',
            };

            // Set form values
            Object.entries(elements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) element.value = value;
            });

            // Handle password separately
            const passwordInput = document.getElementById('password');
            if (passwordInput) {
                passwordInput.value = '';
                passwordInput.required = false;
            }

            // Handle password field display
            const passwordFields = document.querySelectorAll('.password-field');
            passwordFields.forEach(field => field.style.display = 'block');

            const passwordRequired = document.querySelectorAll('.password-required');
            passwordRequired.forEach(item => item.style.display = 'none');

            // Handle active status
            const isActiveCheckbox = document.getElementById('isActive');
            if (isActiveCheckbox) isActiveCheckbox.checked = user.isActive;

            // Update modal title and show
            if (userModalLabel) userModalLabel.textContent = 'Chỉnh sửa người dùng';

            const userModal = new bootstrap.Modal(document.getElementById('userModal'));
            userModal.show();
        })
        .catch(error => {
            console.error('Error fetching user details:', error);
            showToast('Lỗi', 'Không thể tải thông tin người dùng. Vui lòng thử lại sau.', 'error');
        });
}

/**
 * Save user (create or update)
 */
function saveUser() {
    // Validate the form
    const form = document.getElementById('userForm');
    if (!form || !form.checkValidity()) {
        form?.reportValidity();
        return;
    }

    // Get UI elements
    const saveUserSpinner = document.getElementById('saveUserSpinner');
    const saveUserButton = document.getElementById('saveUser');
    const userFormErrors = document.getElementById('userFormErrors');

    // Show spinner & disable button
    if (saveUserSpinner) saveUserSpinner.classList.remove('d-none');
    if (saveUserButton) saveUserButton.disabled = true;
    if (userFormErrors) {
        userFormErrors.classList.add('d-none');
        userFormErrors.innerHTML = '';
    }

    // Get form data
    const userIdInput = document.getElementById('userId');
    const userId = userIdInput ? userIdInput.value : "0";
    const isNewUser = userId === "0";

    // Get form values
    const formElements = {
        'username': document.getElementById('username')?.value.trim() || '',
        'email': document.getElementById('email')?.value.trim() || '',
        'password': document.getElementById('password')?.value || null,
        'fullName': document.getElementById('fullName')?.value.trim() || '',
        'department': document.getElementById('department')?.value.trim() || null,
        'jobTitle': document.getElementById('jobTitle')?.value.trim() || null,
    };

    const isActiveCheckbox = document.getElementById('isActive');
    const isActive = isActiveCheckbox ? isActiveCheckbox.checked : true;

    const userData = {
        userId: isNewUser ? 0 : parseInt(userId),
        ...formElements,
        role: 0, // Always set to User role (0)
        isActive: isActive
    };

    // API endpoint and HTTP method
    const url = isNewUser ? '/User/Create' : '/User/Update/' + userId;
    const method = isNewUser ? 'POST' : 'PUT';

    // Get CSRF token
    const tokenEl = document.querySelector('input[name="__RequestVerificationToken"]');
    const csrfToken = tokenEl ? tokenEl.value : '';

    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'RequestVerificationToken': csrfToken
        },
        body: JSON.stringify(userData)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                const userModal = bootstrap.Modal.getInstance(document.getElementById('userModal'));
                if (userModal) userModal.hide();

                loadUsers();
                showToast(
                    'Thành công',
                    isNewUser ? 'Đã tạo người dùng mới thành công.' : 'Đã cập nhật thông tin người dùng thành công.',
                    'success'
                );
            } else {
                // Display validation errors
                let errorContent = '';

                if (data.message) {
                    errorContent = `<p>${data.message}</p>`;
                } else if (data.errors) {
                    errorContent = '<ul class="mb-0">';
                    if (Array.isArray(data.errors)) {
                        data.errors.forEach(error => {
                            errorContent += `<li>${error}</li>`;
                        });
                    } else {
                        Object.keys(data.errors).forEach(key => {
                            errorContent += `<li>${data.errors[key]}</li>`;
                        });
                    }
                    errorContent += '</ul>';
                } else {
                    errorContent = '<p>Đã xảy ra lỗi khi lưu người dùng.</p>';
                }

                if (userFormErrors) {
                    userFormErrors.innerHTML = errorContent;
                    userFormErrors.classList.remove('d-none');
                }
            }
        })
        .catch(error => {
            console.error('Error saving user:', error);
            if (userFormErrors) {
                userFormErrors.innerHTML = '<p>Không thể lưu thông tin người dùng. Vui lòng thử lại sau.</p>';
                userFormErrors.classList.remove('d-none');
            }
        })
        .finally(() => {
            // Hide spinner & enable button
            if (saveUserSpinner) saveUserSpinner.classList.add('d-none');
            if (saveUserButton) saveUserButton.disabled = false;
        });
}

/**
 * Deactivate user
 */
function deleteUser(userId) {
    // Get UI elements
    const deleteUserSpinner = document.getElementById('deleteUserSpinner');
    const confirmDeleteButton = document.getElementById('confirmDelete');

    // Show spinner & disable button
    if (deleteUserSpinner) deleteUserSpinner.classList.remove('d-none');
    if (confirmDeleteButton) confirmDeleteButton.disabled = true;

    // Get CSRF token
    const tokenEl = document.querySelector('input[name="__RequestVerificationToken"]');
    const csrfToken = tokenEl ? tokenEl.value : '';

    fetch('/User/Delete/' + userId, {
        method: 'DELETE',
        headers: {
            'RequestVerificationToken': csrfToken
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
                if (deleteModal) deleteModal.hide();

                loadUsers();
                showToast('Thành công', 'Đã vô hiệu hóa tài khoản người dùng thành công.', 'success');
            } else {
                showToast('Lỗi', data.message || 'Không thể vô hiệu hóa tài khoản người dùng.', 'error');
            }
        })
        .catch(error => {
            console.error('Error deactivating user:', error);
            showToast('Lỗi', 'Không thể vô hiệu hóa tài khoản người dùng. Vui lòng thử lại sau.', 'error');
        })
        .finally(() => {
            // Hide spinner & enable button
            if (deleteUserSpinner) deleteUserSpinner.classList.add('d-none');
            if (confirmDeleteButton) confirmDeleteButton.disabled = false;

            const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
            if (deleteModal) deleteModal.hide();
        });
}

function activateUser(userId) {
    const user = userListData.find(u => u.userId == userId);
    if (!user) {
        console.error("User not found in data");
        showToast('Lỗi', 'Không thể tìm thấy thông tin người dùng.', 'error');
        return;
    }

    // Show confirmation dialog
    if (!confirm(`Bạn có chắc chắn muốn kích hoạt lại tài khoản của ${user.fullName}?`)) {
        return;
    }

    // Show a loading toast
    showToast('Đang xử lý', 'Đang kích hoạt tài khoản...', 'info');

    // Get CSRF token
    const tokenEl = document.querySelector('input[name="__RequestVerificationToken"]');
    if (!tokenEl) {
        console.error("CSRF token element not found");
        showToast('Lỗi', 'Không thể xác thực yêu cầu. Vui lòng làm mới trang và thử lại.', 'error');
        return;
    }
    const csrfToken = tokenEl.value;

    // Create a complete user object with all required fields
    const userData = {
        userId: parseInt(userId),
        username: user.username,
        email: user.email,
        password: null,
        fullName: user.fullName || "",
        department: user.department || null,
        jobTitle: user.jobTitle || null,
        role: user.role === "Admin" ? 1 : 0, // Preserve the user's role
        isActive: true // Set to active
    };

    console.log("Sending user data:", userData);

    // Use the update endpoint to activate the user
    fetch('/User/Update/' + userId, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'RequestVerificationToken': csrfToken
        },
        body: JSON.stringify(userData)
    })
        .then(response => {
            console.log("Response status:", response.status);
            if (!response.ok) {
                return response.text().then(text => {
                    console.error("Error response:", text);
                    throw new Error('Network response was not ok');
                });
            }
            return response.json();
        })
        .then(data => {
            console.log("Response data:", data);
            if (data.success) {
                loadUsers();
                showToast('Thành công', 'Đã kích hoạt tài khoản người dùng thành công.', 'success');
            } else {
                showToast('Lỗi', data.message || 'Không thể kích hoạt tài khoản.', 'error');
            }
        })
        .catch(error => {
            console.error('Error activating user:', error);
            showToast('Lỗi', 'Không thể kích hoạt tài khoản. Vui lòng thử lại sau.', 'error');
        });
}



/**
 * Reset form for adding a new user
 */
function resetForm() {
    // Get form elements and reset them
    const formElements = ['userId', 'username', 'email', 'password', 'fullName', 'department', 'jobTitle'];

    formElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = id === 'userId' ? '0' : '';
    });

    // Reset isActive checkbox
    const isActiveCheckbox = document.getElementById('isActive');
    if (isActiveCheckbox) isActiveCheckbox.checked = true;

    // Clear any error messages
    const userFormErrors = document.getElementById('userFormErrors');
    if (userFormErrors) {
        userFormErrors.classList.add('d-none');
        userFormErrors.innerHTML = '';
    }
}

/**
 * Show toast notification
 */
/**
 * Show toast notification with better error handling
 */
function showToast(title, message, type = 'success') {
    // Get toast elements
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    const toastTime = document.getElementById('toastTime');
    const toastHeader = document.getElementById('toastHeader');
    const toastIcon = document.getElementById('toastIcon');
    
    // Handle case when elements are not found
    if (!toastTitle || !toastMessage || !toast) {
        console.warn('Toast elements not found, using alert instead');
        alert(`${title}: ${message}`);
        return;
    }

    // Set toast content
    toastTitle.textContent = title;
    toastMessage.textContent = message;
    if (toastTime) toastTime.textContent = 'Vừa xong';

    // Set toast appearance based on type
    if (toastHeader && toastIcon) {
        // Reset classes first
        toastHeader.classList.remove('bg-danger', 'bg-info', 'bg-light', 'text-white');
        toastIcon.classList.remove('bi-exclamation-circle-fill', 'text-danger', 'bi-info-circle-fill', 'text-info', 'bi-check-circle-fill', 'text-success');

        // Apply appropriate classes based on type
        if (type === 'success') {
            toastHeader.classList.add('bg-light');
            toastIcon.classList.add('bi-check-circle-fill', 'text-success');
        } else if (type === 'error') {
            toastHeader.classList.add('bg-danger', 'text-white');
            toastIcon.classList.add('bi-exclamation-circle-fill', 'text-white');
        } else if (type === 'info') {
            toastHeader.classList.add('bg-info', 'text-white');
            toastIcon.classList.add('bi-info-circle-fill', 'text-white');
        }
    }

    // Show the toast with error handling
    try {
        if (toast) toast.show();
    } catch (error) {
        console.error('Error showing toast:', error);
        alert(`${title}: ${message}`);
    }
}

