
document.addEventListener("DOMContentLoaded", function () {
    // Set a cookie to store the last document management page access time
    const now = new Date();
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30); // Cookie expires in 30 days

    document.cookie = `lastDocumentAccess=${now.toISOString()}; expires=${expirationDate.toUTCString()}; path=/`;
    // Store the selected document ID
    let selectedDocumentId = null;
    let selectedDocument = null;

    // Load documents on page load
    loadDocuments();

    // Refresh button
    $("#refreshDocumentList").click(function () {
        loadDocuments();
    });

    // Add document button (sidebar)
    $("#btnAddDocumentSidebar").click(function () {
        resetDocumentForm();
        $("#documentModal").modal('show');
    });

    // Save document
    $("#saveDocument").click(function () {
        saveDocument();
    });

    // View document button
    $("#btnViewDocument").click(function () {
        if (selectedDocument) {
            showDocumentDetails(selectedDocument);
        }
    });

    // Edit document button
    $("#btnEditDocument").click(function () {
        if (selectedDocument) {
            showEditForm(selectedDocument);
        }
    });

    // Delete document button
    $("#btnDeleteDocument").click(function () {
        if (selectedDocument) {
            showDeleteConfirmation(selectedDocument);
        }
    });

    // View to Edit button in view modal
    $("#viewDocumentEdit").click(function () {
        $("#viewDocumentModal").modal('hide');
        showEditForm(selectedDocument);
    });

    // Delete document confirmation
    $("#confirmDeleteDocument").click(function () {
        deleteDocument();
    });

    // Function to load documents
    function loadDocuments() {
        $("#documentTableBody").html(`
            <tr>
                <td colspan="7" class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2 mb-0 text-muted">Đang tải dữ liệu...</p>
                </td>
            </tr>
        `);

        $.ajax({
            url: '/Document/GetDocuments',
            type: 'GET',
            success: function (response) {
                displayDocumentsTable(response);
            },
            error: function (error) {
                showToast('Lỗi', error.responseJSON?.message || 'Không thể tải danh sách documents', 'danger');
                $("#documentTableBody").html(`
                    <tr>
                        <td colspan="7" class="text-center py-5">
                            <i class="bi bi-exclamation-triangle text-warning" style="font-size: 3rem;"></i>
                            <p class="mt-2 mb-0">Không thể tải danh sách documents. Vui lòng thử lại.</p>
                            <button class="btn btn-outline-primary mt-3" id="retryLoading">
                                <i class="bi bi-arrow-repeat me-1"></i>Thử lại
                            </button>
                        </p>
                    </tr>
                `);

                $("#retryLoading").click(function () {
                    loadDocuments();
                });
            }
        });
    }

    // Display documents in table format
    function displayDocumentsTable(documents) {
        if (!documents || documents.length === 0) {
            $("#documentTableBody").html(`
                <tr>
                    <td colspan="7" class="text-center py-5">
                        <i class="bi bi-file-earmark-text" style="font-size: 3rem; color: #ccc;"></i>
                        <p class="mt-2 mb-0">Không tìm thấy document nào</p>
                        ${isAdmin() ? `
                        <button class="btn btn-primary mt-3" id="btnAddDocumentEmpty">
                            <i class="bi bi-file-earmark-plus me-1"></i>Thêm document đầu tiên
                        </button>
                        ` : ''}
                    </td>
                </tr>
            `);

            $("#documentsCount").text("0 document");
            $("#btnAddDocumentEmpty").click(function () {
                resetDocumentForm();
                $("#documentModal").modal('show');
            });
            return;
        }

        $("#documentsCount").text(`${documents.length} document${documents.length > 1 ? 's' : ''}`);

        let html = '';
        documents.forEach(function (doc, index) {
            const dateFormatted = new Date(doc.uploadDate).toLocaleDateString('vi-VN');
            html += `
                <tr data-id="${doc.documentId}" class="document-row">
                    <td>${index + 1}</td>
                    <td><strong>${doc.title}</strong></td>
                    <td><span class="document-category-badge">${doc.category}</span></td>
                    <td>${doc.description ? doc.description.substring(0, 50) + (doc.description.length > 50 ? '...' : '') : 'Không có mô tả'}</td>
                    <td>${doc.uploadedBy}</td>
                    <td>${dateFormatted}</td>
                    <td>
                        <span class="badge ${doc.isPublic ? 'bg-success' : 'bg-secondary'}">
                            <i class="bi ${doc.isPublic ? 'bi-globe' : 'bi-lock'}"></i>
                            ${doc.isPublic ? 'Public' : 'Private'}
                        </span>
                    </td>
                </tr>
            `;
        });

        $("#documentTableBody").html(html);

        // Add row selection functionality
        $(".document-row").click(function () {
            const id = $(this).data('id');
            selectedDocumentId = id;
            selectedDocument = documents.find(d => d.documentId === id);

            // Update UI for selection
            $(".document-row").removeClass('selected');
            $(this).addClass('selected');

            // Enable action buttons
            $("#btnViewDocument").removeClass('disabled');
            if (isAdmin()) {
                $("#btnEditDocument").removeClass('disabled');
                $("#btnDeleteDocument").removeClass('disabled');
            }
        });

        // Double click for view
        $(".document-row").dblclick(function () {
            const id = $(this).data('id');
            selectedDocument = documents.find(d => d.documentId === id);
            showDocumentDetails(selectedDocument);
        });
    }

    // Show document details in modal
    function showDocumentDetails(document) {
        $("#viewDocumentTitle").text(document.title);
        $("#viewDocumentCategory").text(document.category);
        $("#viewDocumentDescription").text(document.description || 'Không có mô tả');
        $("#viewDocumentCreator").text(document.uploadedBy);
        $("#viewDocumentDate").text(new Date(document.uploadDate).toLocaleString('vi-VN'));

        if (document.isPublic) {
            $("#viewDocumentVisibility")
                .removeClass('bg-secondary')
                .addClass('bg-success')
                .html('<i class="bi bi-globe me-1"></i> Public');
        } else {
            $("#viewDocumentVisibility")
                .removeClass('bg-success')
                .addClass('bg-secondary')
                .html('<i class="bi bi-lock me-1"></i> Private');
        }

        $("#viewDocumentModal").modal('show');
    }

    // Show edit form with document data
    function showEditForm(document) {
        $("#documentModalLabel").text("Chỉnh sửa Document");
        $("#documentId").val(document.documentId);
        $("#title").val(document.title);
        $("#description").val(document.description || '');
        $("#category").val(document.category);
        $("#isPublic").prop('checked', document.isPublic);

        $("#documentModal").modal('show');
    }

    // Show delete confirmation
    function showDeleteConfirmation(document) {
        $("#deleteDocumentId").val(document.documentId);
        $("#deleteDocumentTitle").text(document.title);
        $("#deleteDocumentModal").modal('show');
    }

    // Save document function
    function saveDocument() {
        $("#documentFormErrors").addClass('d-none');

        const id = $("#documentId").val();
        const isNew = id === "0";

        // Validate form
        if (!$("#title").val()) {
            showFormError("Vui lòng nhập tiêu đề document");
            return;
        }

        if (!$("#category").val()) {
            showFormError("Vui lòng chọn thể loại document");
            return;
        }

        $("#saveDocumentSpinner").removeClass('d-none');
        $("#saveDocument").attr('disabled', true);

        const documentData = {
            title: $("#title").val(),
            description: $("#description").val(),
            category: $("#category").val(),
            isPublic: $("#isPublic").is(":checked")
        };

        $.ajax({
            url: isNew ? '/Document/Create' : `/Document/Edit/${id}`,
            type: isNew ? 'POST' : 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(documentData),
            headers: {
                'RequestVerificationToken': $('input:hidden[name="__RequestVerificationToken"]').val()
            },
            success: function (response) {
                $("#documentModal").modal('hide');
                showToast(
                    isNew ? 'Thêm thành công' : 'Cập nhật thành công',
                    isNew ? 'Document mới đã được tạo thành công' : 'Document đã được cập nhật thành công',
                    'success'
                );
                loadDocuments();

                // Reset selection
                selectedDocumentId = null;
                selectedDocument = null;
                $("#btnViewDocument").addClass('disabled');
                $("#btnEditDocument").addClass('disabled');
                $("#btnDeleteDocument").addClass('disabled');
            },
            error: function (error) {
                let errorMsg = error.responseJSON?.message || 'Không thể lưu document';

                if (error.responseJSON?.errors) {
                    errorMsg += ": " + error.responseJSON.errors.join(", ");
                }

                showFormError(errorMsg);
            },
            complete: function () {
                $("#saveDocumentSpinner").addClass('d-none');
                $("#saveDocument").attr('disabled', false);
            }
        });
    }

    // Delete document function
    function deleteDocument() {
        const id = $("#deleteDocumentId").val();

        $("#deleteDocumentSpinner").removeClass('d-none');
        $("#confirmDeleteDocument").attr('disabled', true);

        $.ajax({
            url: `/Document/Delete/${id}`,
            type: 'DELETE',
            headers: {
                'RequestVerificationToken': $('input:hidden[name="__RequestVerificationToken"]').val()
            },
            success: function (response) {
                $("#deleteDocumentModal").modal('hide');
                showToast('Xóa thành công', 'Document đã được xóa thành công', 'success');
                loadDocuments();

                // Reset selection
                selectedDocumentId = null;
                selectedDocument = null;
                $("#btnViewDocument").addClass('disabled');
                $("#btnEditDocument").addClass('disabled');
                $("#btnDeleteDocument").addClass('disabled');
            },
            error: function (error) {
                showToast('Lỗi', error.responseJSON?.message || 'Không thể xóa document', 'danger');
            },
            complete: function () {
                $("#deleteDocumentSpinner").addClass('d-none');
                $("#confirmDeleteDocument").attr('disabled', false);
            }
        });
    }

    // Reset document form
    function resetDocumentForm() {
        $("#documentModalLabel").text("Thêm Document mới");
        $("#documentId").val("0");
        $("#documentForm")[0].reset();
        $("#documentFormErrors").addClass('d-none');
    }

    // Show form error
    function showFormError(message) {
        $("#documentFormErrors").removeClass('d-none').text(message);
    }

    // Show toast notification
    function showToast(title, message, type) {
        const id = 'toast-' + Math.random().toString(36).substr(2, 9);

        const html = `
            <div id="${id}" class="toast align-items-center text-white bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">
                        <strong>${title}</strong>
                        <br>${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;

        $('.toast-container').append(html);
        const toastElement = document.getElementById(id);
        const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 5000 });
        toast.show();

        $(toastElement).on('hidden.bs.toast', function () {
            $(this).remove();
        });
    }

    // Check if user is admin
    function isAdmin() {
        return ADMIN_STATUS;
    }
});
