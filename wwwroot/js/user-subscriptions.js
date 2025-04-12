/**
 * User Subscriptions JavaScript
 * Handles functionalities for user subscription management in WeChat application
 */
$(document).ready(function () {
    // Handle subscription details view
    window.viewSubscriptionDetails = function (id) {
        // Clear previous content
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

                    // Calculate remaining days
                    let remainingDays = 0;
                    if (!isExpired) {
                        const today = new Date();
                        const end = new Date(data.endDate);
                        remainingDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
                    }

                    // Render details
                    $('#subscriptionDetailsBody').html(`
                        <div class="row">
                            <div class="col-md-6">
                                <h5 class="mb-4">Thông tin gói đăng ký</h5>
                                <div class="mb-3">
                                    <label class="fw-bold">Gói:</label>
                                    <div>${data.planName}</div>
                                </div>
                                <div class="mb-3">
                                    <label class="fw-bold">Ngày đăng ký:</label>
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
                                <div class="mb-3">
                                    <label class="fw-bold">Thời gian còn lại:</label>
                                    <div>${isExpired ? 'Đã hết hạn' : remainingDays + ' ngày'}</div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <h5 class="mb-4">Chi tiết thanh toán</h5>
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
                        <hr>
                        <div class="row">
                            <div class="col-12">
                                <h5 class="mb-3">Quyền lợi gói đăng ký</h5>
                                <ul class="list-group">
                                    ${getPlanFeatures(data.planName)}
                                </ul>
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
    };

    // Helper function to get plan features based on plan name
    function getPlanFeatures(planName) {
        let features = [];

        // Basic features
        const basicFeatures = [
            'Nhắn tin không giới hạn',
            'Tối đa 5 sự kiện mỗi tháng',
            'Lưu trữ 1GB'
        ];

        // Standard features
        const standardFeatures = [
            'Tất cả tính năng của gói Cơ bản',
            'Tạo nhóm chat với 20 thành viên',
            'Tối đa 15 sự kiện mỗi tháng',
            'Lưu trữ 5GB'
        ];

        // Premium features
        const premiumFeatures = [
            'Tất cả tính năng của gói Tiêu chuẩn',
            'Tạo nhóm chat không giới hạn thành viên',
            'Sự kiện và lịch không giới hạn',
            'Lưu trữ 20GB',
            'Hỗ trợ 24/7'
        ];

        // Enterprise features
        const enterpriseFeatures = [
            'Tất cả tính năng của gói Cao cấp',
            'Tích hợp API tùy chỉnh',
            'Quản lý người dùng nâng cao',
            'Lưu trữ không giới hạn',
            'Bảo mật nâng cao và kiểm soát quyền truy cập',
            'Quản lý đội ngũ chuyên dụng'
        ];

        // Select features based on plan name
        switch (planName) {
            case 'Basic':
                features = basicFeatures;
                break;
            case 'Standard':
                features = standardFeatures;
                break;
            case 'Premium':
                features = premiumFeatures;
                break;
            case 'Enterprise':
                features = enterpriseFeatures;
                break;
            default:
                features = ['Thông tin quyền lợi không khả dụng'];
        }

        // Generate HTML for features
        return features.map(feature =>
            `<li class="list-group-item"><i class="bi bi-check-circle-fill text-success me-2"></i>${feature}</li>`
        ).join('');
    }
});
