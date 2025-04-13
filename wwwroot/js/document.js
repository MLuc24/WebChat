// Document management script
$(document).ready(function () {
    // Load documents on page load
    loadDocuments();

    // Refresh button
    $("#refreshDocumentList").click(function () {
        loadDocuments();
    });

    // Save document
    $("#saveDocument").click(function () {
        saveDocument();
    });

    // Add document button
    $("#btnAddDocument").click(function () {
        resetDocumentForm();
    });

    // Delete document confirmation
    $("#confirmDeleteDocument").click(function () {
        deleteDocument();
    });

    // Function to load documents
    function loadDocuments() {
        $("#documentsContainer").html(`
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2 mb-0 text-muted">Loading documents...</p>
            </div>
        `);

        $.ajax({
            url: '/Document/GetDocuments',
            type: 'GET',
            success: function (response) {
                displayDocuments(response);
            },
            error: function (error) {
                showToast('Error loading documents', error.responseJSON?.message || 'Failed to load documents', 'danger');
                $("#documentsContainer").html(`
                    <div class="col-12 text-center py-5">
                        <i class="bi bi-exclamation-triangle text-warning" style="font-size: 3rem;"></i>
                        <p class="mt-2 mb-0">Failed to load documents. Please try again.</p>
                        <button class="btn btn-outline-primary mt-3" id="retryLoading">
                            <i class="bi bi-arrow-repeat me-1"></i>Retry
                        </button>
                    </div>
                `);

                $("#retryLoading").click(function () {
                    loadDocuments();
                });
            }
        });
    }

    // Display documents
    function displayDocuments(documents) {
        if (!documents || documents.length === 0) {
            $("#documentsContainer").html(`
                <div class="col-12 text-center py-5">
                    <i class="bi bi-file-earmark-text" style="font-size: 3rem; color: #ccc;"></i>
                    <p class="mt-2 mb-0">No documents found</p>
                    <button class="btn btn-primary mt-3" data-bs-toggle="modal" data-bs-target="#documentModal">
                        <i class="bi bi-file-earmark-plus me-1"></i>Add Your First Document
                    </button>
                </div>
            `);

            $("#documentsCount").text("No documents found");
            return;
        }

        $("#documentsCount").text(`${documents.length} document(s) found`);

        let html = '';
        documents.forEach(function (doc) {
            const dateFormatted = new Date(doc.uploadDate).toLocaleDateString();
            html += `
                <div class="col-md-6 col-lg-4">
                    <div class="card document-card h-100 border-0 shadow-sm">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <span class="badge bg-primary bg-opacity-10 text-primary document-category">${doc.category}</span>
                                <span class="badge bg-${doc.isPublic ? 'success' : 'secondary'} bg-opacity-10 text-${doc.isPublic ? 'success' : 'secondary'}">
                                    <i class="bi bi-${doc.isPublic ? 'globe' : 'lock'}"></i> 
                                    ${doc.isPublic ? 'Public' : 'Private'}
                                </span>
                            </div>
                            <h5 class="card-title mb-2">${doc.title}</h5>
                            <p class="card-text text-muted small mb-3">
                                ${doc.description || 'No description available'}
                            </p>
                        </div>
                        <div class="card-footer bg-transparent border-0">
                            <div class="d-flex justify-content-between align-items-center">
                                <small class="text-muted">
                                    <i class="bi bi-person me-1"></i>${doc.uploadedBy}
                                    <span class="ms-2">
                                        <i class="bi bi-calendar3 me-1"></i>${dateFormatted}
                                    </span>
                                </small>
                                <div class="document-actions">
                                    <button class="btn btn-sm btn-outline-primary me-1 btn-edit-document" 
                                            data-id="${doc.documentId}"
                                            data-title="${doc.title}"
                                            data-description="${doc.description || ''}"
                                            data-category="${doc.category}"
                                            data-public="${doc.isPublic}">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger btn-delete-document"
                                            data-id="${doc.documentId}"
                                            data-title="${doc.title}">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        $("#documentsContainer").html(html);

        // Add click handlers for edit and delete buttons
        $(".btn-edit-document").click(function () {
            const id = $(this).data('id');
            const title = $(this).data('title');
            const description = $(this).data('description');
            const category = $(this).data('category');
            const isPublic = $(this).data('public');

            $("#documentModalLabel").text("Edit Document");
            $("#documentId").val(id);
            $("#title").val(title);
            $("#description").val(description);
            $("#category").val(category);
            $("#isPublic").prop('checked', isPublic === true || isPublic === "true");

            $("#documentModal").modal('show');
        });

        $(".btn-delete-document").click(function () {
            const id = $(this).data('id');
            const title = $(this).data('title');

            $("#deleteDocumentId").val(id);
            $("#deleteDocumentTitle").text(title);

            $("#deleteDocumentModal").modal('show');
        });
    }

    // Save document function
    function saveDocument() {
        $("#documentFormErrors").addClass('d-none');

        const id = $("#documentId").val();
        const isNew = id === "0";

        // Validate form
        if (!$("#title").val()) {
            showFormError("Please enter a document title");
            return;
        }

        if (!$("#category").val()) {
            showFormError("Please select a document category");
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
                    isNew ? 'Document Created' : 'Document Updated',
                    isNew ? 'New document created successfully' : 'Document updated successfully',
                    'success'
                );
                loadDocuments();
            },
            error: function (error) {
                let errorMsg = error.responseJSON?.message || 'Failed to save document';

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
                showToast('Document Deleted', 'Document was successfully deleted', 'success');
                loadDocuments();
            },
            error: function (error) {
                showToast('Error', error.responseJSON?.message || 'Failed to delete document', 'danger');
            },
            complete: function () {
                $("#deleteDocumentSpinner").addClass('d-none');
                $("#confirmDeleteDocument").attr('disabled', false);
            }
        });
    }

    // Reset document form
    function resetDocumentForm() {
        $("#documentModalLabel").text("Add New Document");
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
});
