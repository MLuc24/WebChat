/**
 * Subscription Management JavaScript
 * Handles admin subscription management features for WeChat application
 */
$(document).ready(function () {
    // Load subscriptions table on page load
    loadSubscriptions();

    // Handle form submission for create/edit
    $(document).on('submit', '#subscriptionForm', function (e) {
        e.preventDefault();
        const form = $(this);
        const isCreate = $('#subscriptionId').val() === '0';

        // Validate the form
        if (!form[0].checkValidity()) {
            form[0].reportValidity();
            return;
        }

        // Show loader
        const submitBtn = form.find('button[type="submit"]');
        const originalBtnText = submitBtn.html();
        submitBtn.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang xử lý...');
        submitBtn.prop('disabled', true);

        // Get form data and clear errors
        $('#subscriptionFormErrors').addClass('d-none').empty();

        // Create a plain object with form data
        const formData = {};
        form.serializeArray().forEach(item => {
            formData[item.name] = item.value;
        });

        // Handle checkbox special case for IsActive
        formData.IsActive = $('#isActive').is(':checked');

        // Convert to JSON for sending
        const jsonData = JSON.stringify(formData);

        // API endpoint
        const url = isCreate ? '/Subscription/Create' : '/Subscription/Edit/' + $('#subscriptionId').val();

        // Use jQuery AJAX with proper content type
        $.ajax({
            url: url,
            type: 'POST',
            contentType: 'application/json',
            data: jsonData,
            headers: {
                "RequestVerificationToken": $('input[name="__RequestVerificationToken"]').val()
            },
            success: function (response) {
                if (response.success) {
                    // Close modal and refresh data
                    $('#subscriptionModal').modal('hide');
                    loadSubscriptions();
                    showToast('Thành công', isCreate ? 'Đã tạo gói đăng ký mới thành công' : 'Đã cập nhật gói đăng ký thành công', 'success');
                } else {
                    // Show error message
                    const errorDiv = form.find('.alert-danger');
                    let errorMessage = response.message || 'Có lỗi xảy ra. Vui lòng thử lại.';

                    if (response.errors) {
                        errorMessage = '<ul class="mb-0">';
                        Object.keys(response.errors).forEach(key => {
                            if (Array.isArray(response.errors[key])) {
                                response.errors[key].forEach(error => {
                                    errorMessage += `<li>${error}</li>`;
                                });
                            } else {
                                errorMessage += `<li>${response.errors[key]}</li>`;
                            }
                        });
                        errorMessage += '</ul>';
                    }

                    errorDiv.html(errorMessage).removeClass('d-none');
                    errorDiv[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            },
            error: function (xhr, status, error) {
                console.error("Form submission failed:", {
                    status: xhr.status,
                    statusText: xhr.statusText,
                    responseText: xhr.responseText,
                    error: error
                });

                const errorDiv = form.find('.alert-danger');
                let errorMessage = `Có lỗi xảy ra khi lưu. Vui lòng thử lại sau. (${xhr.status})`;

                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.message) {
                        errorMessage += `: ${response.message}`;
                    }
                } catch (e) {
                    // In case response is not JSON
                    if (xhr.responseText) {
                        errorMessage += `: ${xhr.responseText}`;
                    }
                }

                errorDiv.html(errorMessage).removeClass('d-none');
                errorDiv[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            },
            complete: function () {
                // Reset button state
                submitBtn.html(originalBtnText);
                submitBtn.prop('disabled', false);
            }
        });
    });


    // Handle delete subscription
    $(document).on('click', '.delete-subscription', function () {
        const id = $(this).data('id');
        const name = $(this).data('name');
        const user = $(this).data('user');

        $('#deleteSubscriptionId').val(id);
        $('#deleteSubscriptionName').text(name);
        $('#deleteSubscriptionUser').text(user);
        $('#deleteSubscriptionModal').modal('show');
    });

    // Confirm delete
    $('#confirmDeleteSubscription').click(function () {
        const id = $('#deleteSubscriptionId').val();
        const btn = $(this);
        const btnText = btn.html();

        // Show loader
        btn.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang xử lý...');
        btn.prop('disabled', true);

        // Get anti-forgery token
        const token = $('input[name="__RequestVerificationToken"]').val();

        $.ajax({
            url: `/Subscription/Delete/${id}`,
            type: 'POST',
            data: { "__RequestVerificationToken": token },
            success: function (response) {
                if (response.success) {
                    $('#deleteSubscriptionModal').modal('hide');
                    loadSubscriptions();
                    showToast('Thành công', 'Đã xóa gói đăng ký thành công', 'success');
                } else {
                    showToast('Lỗi', response.message || 'Không thể xóa gói đăng ký', 'error');
                }
            },
            error: function (xhr) {
                let errorMessage = 'Không thể xóa gói đăng ký. Vui lòng thử lại sau.';
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.message) errorMessage = response.message;
                } catch (e) {
                    console.error('Error parsing delete response:', e);
                }
                showToast('Lỗi', errorMessage, 'error');
            },
            complete: function () {
                btn.html(btnText);
                btn.prop('disabled', false);
            }
        });
    });

    // Add new subscription
    $('#btnAddSubscription').click(function () {
        resetSubscriptionForm();
        $('#subscriptionModalLabel').text('Thêm gói đăng ký mới');
        $('#subscriptionModal').modal('show');
    });

    // Edit subscription
    $(document).on('click', '.edit-subscription', function () {
        const id = $(this).data('id');
        loadSubscriptionDetails(id);
    });

    // View subscription details - Fixed to use modal instead of navigating
    $(document).on('click', '.view-subscription', function () {
        const id = $(this).data('id');

        // Store ID in hidden field
        $('#detailsSubscriptionId').val(id);

        // Clear and load subscription details into a modal
        $('#subscriptionDetailsModalTitle').text('Chi tiết gói đăng ký');
        $('#subscriptionDetailsBody').html(`
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Đang tải...</span>
                </div>
                <p class="mt-2 mb-0">Đang tải chi tiết gói đăng ký...</p>
            </div>
        `);

        // Show modal
        $('#subscriptionDetailsModal').modal('show');

        // Fetch subscription details
        $.ajax({
            url: `/Subscription/GetSubscription/${id}`,
            type: 'GET',
            success: function (data) {
                if (data) {
                    // Format dates
                    const startDate = new Date(data.startDate).toLocaleDateString('vi-VN');
                    const endDate = new Date(data.endDate).toLocaleDateString('vi-VN');
                    const createdDate = new Date(data.createdDate).toLocaleDateString('vi-VN');
                    const isExpired = new Date(data.endDate) < new Date();

                    // Determine status display
                    let statusDisplay = '';
                    if (isExpired) {
                        statusDisplay = '<span class="badge bg-danger">Hết hạn</span>';
                    } else if (data.isActive) {
                        statusDisplay = '<span class="badge bg-success">Hoạt động</span>';
                    } else {
                        statusDisplay = '<span class="badge bg-warning text-dark">Tạm dừng</span>';
                    }

                    // Render details
                    $('#subscriptionDetailsBody').html(`
                        <input type="hidden" id="detailsSubscriptionId" value="${data.subscriptionId}">
                        <div class="row">
                            <div class="col-md-6">
                                <h5 class="mb-4">Thông tin gói đăng ký</h5>
                                <div class="mb-3">
                                    <label class="fw-bold">ID:</label>
                                    <div>${data.subscriptionId}</div>
                                </div>
                                <div class="mb-3">
                                    <label class="fw-bold">Gói:</label>
                                    <div>${data.planName}</div>
                                </div>
                                <div class="mb-3">
                                    <label class="fw-bold">Ngày tạo:</label>
                                    <div>${createdDate}</div>
                                </div>
                                <div class="mb-3">
                                    <label class="fw-bold">Ngày bắt đầu:</label>
                                    <div>${startDate}</div>
                                </div>
                                <div class="mb-3">
                                    <label class="fw-bold">Ngày kết thúc:</label>
                                    <div>${endDate}</div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <h5 class="mb-4">Thông tin người dùng</h5>
                                <div class="mb-3">
                                    <label class="fw-bold">Người dùng:</label>
                                    <div>${data.user.fullName} (${data.user.username})</div>
                                </div>
                                <div class="mb-3">
                                    <label class="fw-bold">Email:</label>
                                    <div>${data.user.email}</div>
                                </div>
                                <div class="mb-3">
                                    <label class="fw-bold">Giá:</label>
                                    <div>$${data.price.toFixed(2)}</div>
                                </div>
                                <div class="mb-3">
                                    <label class="fw-bold">Trạng thái thanh toán:</label>
                                    <div>
                                        <span class="badge ${data.paymentStatus === 'Paid' ? 'bg-success' : 'bg-warning text-dark'}">
                                            ${data.paymentStatus === 'Paid' ? 'Đã thanh toán' : data.paymentStatus}
                                        </span>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label class="fw-bold">Trạng thái gói:</label>
                                    <div>${statusDisplay}</div>
                                </div>
                            </div>
                        </div>
                    `);
                } else {
                    $('#subscriptionDetailsBody').html(`
                        <div class="alert alert-danger">
                            Không thể tải thông tin chi tiết gói đăng ký. Vui lòng thử lại sau.
                        </div>
                    `);
                }
            },
            error: function () {
                $('#subscriptionDetailsBody').html(`
                    <div class="alert alert-danger">
                        Có lỗi xảy ra khi tải thông tin chi tiết. Vui lòng thử lại sau.
                    </div>
                `);
            }
        });
    });

    // Edit from details button
    $(document).on('click', '.edit-from-details', function () {
        const id = $('#detailsSubscriptionId').val();

        if (id) {
            $('#subscriptionDetailsModal').modal('hide');
            setTimeout(() => loadSubscriptionDetails(id), 500); // After modal hidden
        } else {
            showToast('Lỗi', 'Không thể xác định ID gói đăng ký', 'error');
        }
    });

    // Toggle active status
    $(document).on('change', '.toggle-active', function () {
        const checkbox = $(this);
        const id = checkbox.data('id');
        const isActive = checkbox.prop('checked');
        const label = checkbox.next('label');

        $.ajax({
            url: `/Subscription/ToggleActive/${id}`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ isActive: isActive }),
            success: function (response) {
                if (response.success) {
                    if (isActive) {
                        label.html('<span class="text-success">Hoạt động</span>');
                    } else {
                        label.html('<span class="text-danger">Không hoạt động</span>');
                    }
                    showToast('Thành công', 'Cập nhật trạng thái thành công', 'success');
                } else {
                    // Revert the toggle if unsuccessful
                    checkbox.prop('checked', !isActive);
                    showToast('Lỗi', response.message || 'Có lỗi xảy ra khi cập nhật trạng thái.', 'error');
                }
            },
            error: function (xhr) {
                // Revert the toggle if there's an error
                checkbox.prop('checked', !isActive);

                let errorMessage = 'Có lỗi xảy ra. Vui lòng thử lại.';
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.error) errorMessage = response.error;
                } catch (e) {
                    console.error('Error parsing toggle response:', e);
                }

                showToast('Lỗi', errorMessage, 'error');
            }
        });
    });

    // Export subscriptions to Excel
    $('#btnExportExcel').click(function () {
        window.location.href = '/Subscription/ExportToExcel';
    });
});

/**
 * Load all subscriptions and display in table
 */
function loadSubscriptions() {
    $('#subscriptionsTable').html(`
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Đang tải...</span>
            </div>
            <p class="mt-3 mb-0">Đang tải dữ liệu...</p>
        </div>
    `);

    $.ajax({
        url: '/Subscription/GetAllSubscriptions',
        type: 'GET',
        success: function (data) {
            if (!data || data.length === 0) {
                $('#subscriptionsTable').html(`
                    <div class="text-center py-5">
                        <i class="bi bi-credit-card text-muted" style="font-size: 3rem;"></i>
                        <p class="mt-3 mb-0">Chưa có gói đăng ký nào</p>
                    </div>
                `);
                return;
            }

            if (data.error) {
                $('#subscriptionsTable').html(`
                    <div class="text-center py-5 text-danger">
                        <i class="bi bi-exclamation-circle" style="font-size: 2rem;"></i>
                        <p class="mt-3">${data.error}</p>
                    </div>
                `);
                return;
            }

            renderSubscriptionsTable(data);
        },
        error: function (xhr) {
            let errorMessage = 'Không thể tải dữ liệu. Vui lòng thử lại sau.';
            try {
                const response = JSON.parse(xhr.responseText);
                if (response.message) errorMessage = response.message;
            } catch (e) { }

            $('#subscriptionsTable').html(`
                <div class="text-center py-5 text-danger">
                    <i class="bi bi-exclamation-circle" style="font-size: 2rem;"></i>
                    <p class="mt-3">${errorMessage}</p>
                </div>
            `);
        }
    });
}

/**
 * Render subscriptions table with data
 * @param {Array} data - Subscription data from API
 */
function renderSubscriptionsTable(data) {
    let tableHtml = `
        <div class="table-responsive">
            <table class="table table-hover mb-0">
                <thead class="table-light">
                    <tr>
                        <th>ID</th>
                        <th>Người dùng</th>
                        <th>Gói</th>
                        <th>Ngày bắt đầu</th>
                        <th>Ngày kết thúc</th>
                        <th>Giá ($)</th>
                        <th>Trạng thái</th>
                        <th class="text-end">Thao tác</th>
                    </tr>
                </thead>
                <tbody>`;

    data.forEach(item => {
        const startDate = new Date(item.startDate).toLocaleDateString('vi-VN');
        const endDate = new Date(item.endDate).toLocaleDateString('vi-VN');
        const isExpired = new Date(item.endDate) < new Date();
        const statusClass = isExpired ? 'text-danger' : 'text-success';

        tableHtml += `
            <tr>
                <td>${item.subscriptionId}</td>
                <td>${item.user.fullName} (${item.user.username})</td>
                <td>${item.planName}</td>
                <td>${startDate}</td>
                <td>${endDate}</td>
                <td>$${item.price.toFixed(2)}</td>
                <td>
                    <div class="form-check form-switch">
                        <input class="form-check-input toggle-active" type="checkbox" 
                               data-id="${item.subscriptionId}"
                               ${item.isActive === true ? "checked" : ""}>
                        <label class="form-check-label">
                            ${item.isActive === true
                ? '<span class="text-success">Hoạt động</span>'
                : '<span class="text-danger">Không hoạt động</span>'}
                        </label>
                    </div>
                </td>
                <td class="text-end">
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary edit-subscription" data-id="${item.subscriptionId}" title="Chỉnh sửa">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-info view-subscription" data-id="${item.subscriptionId}" title="Xem chi tiết">
                            <i class="bi bi-info-circle"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-subscription" 
                                data-id="${item.subscriptionId}" 
                                data-name="${item.planName}" 
                                data-user="${item.user.fullName}"
                                title="Xóa">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tableHtml += `
                </tbody>
            </table>
        </div>
        <div class="d-flex justify-content-between align-items-center p-3">
            <div>
                <span class="text-muted">Hiển thị ${data.length} gói đăng ký</span>
            </div>
            <button id="btnExportExcel" class="btn btn-sm btn-outline-success">
                <i class="bi bi-file-excel me-1"></i>Xuất Excel
            </button>
        </div>
    `;

    $('#subscriptionsTable').html(tableHtml);
}

/**
 * Load subscription details for editing
 * @param {number} id - Subscription ID
 */
function loadSubscriptionDetails(id) {
    $('#subscriptionFormErrors').addClass('d-none');
    $('#subscriptionModalLabel').text('Đang tải...');

    $.ajax({
        url: `/Subscription/GetSubscription/${id}`,
        type: 'GET',
        success: function (data) {
            if (data) {
                $('#subscriptionId').val(data.subscriptionId);
                $('#userId').val(data.userId);
                $('#planName').val(data.planName);
                $('#startDate').val(data.startDate.split('T')[0]);  // Format date for input
                $('#endDate').val(data.endDate.split('T')[0]);      // Format date for input
                $('#price').val(data.price);
                $('#paymentStatus').val(data.paymentStatus || 'Pending');

                // Set active status checkbox
                $('#isActive').prop('checked', data.isActive === true);

                $('#subscriptionModalLabel').text('Chỉnh sửa gói đăng ký');
                $('#subscriptionModal').modal('show');
            } else {
                showToast('Lỗi', 'Không tìm thấy thông tin gói đăng ký', 'error');
            }
        },
        error: function (xhr) {
            let errorMessage = 'Không thể tải thông tin gói đăng ký. Vui lòng thử lại sau.';

            try {
                const response = JSON.parse(xhr.responseText);
                if (response.message) errorMessage = response.message;
            } catch (e) {
                console.error('Error parsing subscription details response:', e);
            }

            showToast('Lỗi', errorMessage, 'error');
        }
    });
}

/**
 * Reset form for creating a new subscription
 */
function resetSubscriptionForm() {
    $('#subscriptionId').val('0');
    $('#subscriptionForm')[0].reset();
    $('#subscriptionFormErrors').addClass('d-none').empty();

    // Set default dates
    const today = new Date();
    const todayFormatted = today.toISOString().split('T')[0];

    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextMonthFormatted = nextMonth.toISOString().split('T')[0];

    $('#startDate').val(todayFormatted);
    $('#endDate').val(nextMonthFormatted);

    // Default active status to true
    $('#isActive').prop('checked', true);

    // Default payment status
    $('#paymentStatus').val('Paid');  // Changed from 'Pending' to 'Paid' for admin creations

    // Ensure the user dropdown is reset and visible
    if ($('#userId').length) {
        $('#userId')[0].selectedIndex = 0;
    }

    // Set default price based on selected plan
    const selectedPlan = $('#planName').val();
    setDefaultPrice(selectedPlan);
}

/**
 * Set default price based on selected plan
 * @param {string} plan - Plan name
 */
function setDefaultPrice(plan) {
    let price = 0;
    switch (plan) {
        case 'Basic':
            price = 9.99;
            break;
        case 'Standard':
            price = 19.99;
            break;
        case 'Premium':
            price = 29.99;
            break;
        case 'Enterprise':
            price = 99.99;
            break;
    }
    $('#price').val(price);
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

    const toast = $(`
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
    `);

    $('.toast-container').append(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();

    // Remove the toast after it's hidden
    toast.on('hidden.bs.toast', function () {
        toast.remove();
    });
}

// Add event handler for plan selection to update price
$(document).on('change', '#planName', function () {
    const selectedPlan = $(this).val();
    setDefaultPrice(selectedPlan);
});
