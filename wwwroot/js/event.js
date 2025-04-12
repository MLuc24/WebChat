/**
 * Event Management JavaScript for WeChat application
 * Handles calendar events, AJAX calls, and UI interactions
 */
document.addEventListener('DOMContentLoaded', function () {
    // Initialize variables
    let calendar;
    let eventDetailsModal;
    let eventFormModal;
    let deleteConfirmModal;
    let antiForgeryToken;

    // Initialize the application
    init();

    /**
     * Initialize the event management application
     */
    function init() {
        // Get anti-forgery token
        antiForgeryToken = document.querySelector('input[name="__RequestVerificationToken"]').value;

        // Initialize modals
        eventDetailsModal = new bootstrap.Modal(document.getElementById('eventDetailsModal'));
        eventFormModal = new bootstrap.Modal(document.getElementById('eventFormModal'));
        deleteConfirmModal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));

        // Initialize FullCalendar
        initializeCalendar();

        // Attach event listeners
        attachEventListeners();

        // Check for direct event navigation from URL parameter
        checkForDirectEventNavigation();
    }

    /**
     * Initialize the FullCalendar component
     */
    function initializeCalendar() {
        const calendarEl = document.getElementById('calendar');
        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: window.innerWidth < 768 ? 'listMonth' : 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth'
            },
            themeSystem: 'bootstrap5',
            events: '/Event/GetEvents',
            eventTimeFormat: {
                hour: '2-digit',
                minute: '2-digit',
                meridiem: 'short'
            },
            eventDidMount: function (info) {
                // Add tooltip to events
                new bootstrap.Tooltip(info.el, {
                    title: info.event.title,
                    placement: 'top',
                    trigger: 'hover',
                    container: 'body'
                });
            },
            eventClick: function (info) {
                showEventDetails(info.event);
            },
            dateClick: function (info) {
                openCreateEventModal(info.date);
            },
            windowResize: function (view) {
                // Change view based on screen size
                if (window.innerWidth < 768) {
                    calendar.changeView('listMonth');
                }
            },
            loading: function (isLoading) {
                // Show/hide loading indicator
                const loadingIndicator = document.getElementById('calendarLoading');
                if (isLoading) {
                    loadingIndicator.classList.remove('d-none');
                } else {
                    loadingIndicator.classList.add('d-none');
                }
            },
            datesSet: function () {
                // Refresh events when date range changes
                calendar.refetchEvents();
            }
        });

        calendar.render();
    }

    /**
     * Attach event listeners to buttons and forms
     */
    function attachEventListeners() {
        // Create Event button click
        document.getElementById('createEventBtn').addEventListener('click', function () {
            openCreateEventModal();
        });

        // Edit Event button click
        document.getElementById('editEventBtn').addEventListener('click', function () {
            const eventId = this.dataset.id;
            openEditEventModal(eventId);
        });

        // Delete Event button click
        document.getElementById('deleteEventBtn').addEventListener('click', function () {
            const eventId = this.dataset.id;
            showDeleteConfirmation(eventId);
        });

        // Confirm Delete button click
        document.getElementById('confirmDeleteBtn').addEventListener('click', function () {
            const eventId = this.dataset.id;
            deleteEvent(eventId);
        });

        // Save Event button click
        document.getElementById('saveEventBtn').addEventListener('click', saveEvent);

        // Form input change handlers to clear validation errors
        ['title', 'startTime', 'endTime', 'location', 'description'].forEach(field => {
            const element = document.getElementById(field);
            if (element) {
                element.addEventListener('input', function () {
                    this.classList.remove('is-invalid');
                    const feedback = this.parentNode.querySelector('.custom-invalid-feedback');
                    if (feedback) feedback.remove();
                });
            }
        });

        // All-day checkbox handler to adjust time fields
        document.getElementById('isAllDay').addEventListener('change', function () {
            const timeInputs = document.querySelectorAll('#startTime, #endTime');
            const isAllDay = this.checked;

            if (isAllDay) {
                // Store current values before switching to date
                timeInputs.forEach(input => {
                    input.dataset.timeValue = input.value;

                    // Set to start of day/end of day
                    const date = new Date(input.value);
                    date.setHours(input.id === 'startTime' ? 0 : 23);
                    date.setMinutes(input.id === 'startTime' ? 0 : 59);
                    input.value = formatDateTimeForInput(date);
                });

                // Hide time pickers
                document.getElementById('timeFieldsContainer').classList.add('opacity-50');
            } else {
                // Restore previous values if available
                timeInputs.forEach(input => {
                    if (input.dataset.timeValue) {
                        input.value = input.dataset.timeValue;
                    }
                });

                // Show time pickers
                document.getElementById('timeFieldsContainer').classList.remove('opacity-50');
            }
        });

        // Handle form submission on Enter key
        document.getElementById('eventForm').addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('saveEventBtn').click();
            }
        });
    }

    /**
     * Check if there's an event ID in the URL parameters and show that event
     */
    function checkForDirectEventNavigation() {
        const urlParams = new URLSearchParams(window.location.search);
        const eventId = urlParams.get('eventId');

        if (eventId) {
            loadEventById(eventId)
                .then(eventData => {
                    // Create a fake FullCalendar event object
                    const fakeEvent = {
                        id: eventData.eventId,
                        title: eventData.title,
                        start: new Date(eventData.startTime),
                        end: new Date(eventData.endTime),
                        allDay: eventData.isAllDay,
                        extendedProps: {
                            description: eventData.description,
                            location: eventData.location
                        }
                    };

                    showEventDetails(fakeEvent);
                })
                .catch(error => {
                    showToast('Error', 'Could not load event details.', 'error');
                });
        }
    }

    /**
     * Open the create event modal with optional default date
     */
    function openCreateEventModal(defaultDate = null) {
        // Reset form
        document.getElementById('eventForm').reset();
        document.getElementById('eventId').value = '0';
        document.getElementById('eventFormModalLabel').textContent = 'Create Event';

        // Clear any validation messages
        clearValidationErrors();

        // Set default date/time values
        const now = defaultDate || new Date();
        const startTime = new Date(now);
        startTime.setMinutes(0); // Round to nearest hour
        startTime.setSeconds(0);

        const endTime = new Date(startTime);
        endTime.setHours(endTime.getHours() + 1); // Default duration: 1 hour

        document.getElementById('startTime').value = formatDateTimeForInput(startTime);
        document.getElementById('endTime').value = formatDateTimeForInput(endTime);

        // Reset all-day checkbox
        document.getElementById('isAllDay').checked = false;
        document.getElementById('timeFieldsContainer').classList.remove('opacity-50');

        // Show modal
        eventFormModal.show();

        // Set focus on title field
        setTimeout(() => {
            document.getElementById('title').focus();
        }, 500);
    }

    /**
     * Open the edit event modal for a specific event
     */
    function openEditEventModal(eventId) {
        // Hide details modal
        eventDetailsModal.hide();

        // Load event data and populate form
        loadEventById(eventId)
            .then(data => {
                // Clear validation errors
                clearValidationErrors();

                // Populate form
                document.getElementById('eventId').value = data.eventId;
                document.getElementById('title').value = data.title;
                document.getElementById('description').value = data.description || '';
                document.getElementById('startTime').value = formatDateTimeForInput(new Date(data.startTime));
                document.getElementById('endTime').value = formatDateTimeForInput(new Date(data.endTime));
                document.getElementById('location').value = data.location || '';

                // Set all-day flag and adjust UI
                const isAllDay = data.isAllDay;
                document.getElementById('isAllDay').checked = isAllDay;
                if (isAllDay) {
                    document.getElementById('timeFieldsContainer').classList.add('opacity-50');
                } else {
                    document.getElementById('timeFieldsContainer').classList.remove('opacity-50');
                }

                // Update modal title
                document.getElementById('eventFormModalLabel').textContent = 'Edit Event';

                // Show modal
                eventFormModal.show();

                // Set focus on title field
                setTimeout(() => {
                    document.getElementById('title').focus();
                }, 500);
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('Error', 'Could not load event data.', 'error');
            });
    }

    /**
     * Show the event details modal for a specific event
     */
    function showEventDetails(event) {
        // Set event title
        document.getElementById('eventTitle').textContent = event.title;

        // Format date and time display
        let startDate = new Date(event.start);
        let endDate = event.end ? new Date(event.end) : null;
        let dateTimeStr = '';

        if (event.allDay) {
            // Format for all-day event
            dateTimeStr = formatDateRange(startDate, endDate, true);
        } else {
            // Format for timed event
            dateTimeStr = formatDateRange(startDate, endDate, false);
        }

        // Set other event details
        document.getElementById('eventDateTime').innerHTML = `<strong>${dateTimeStr}</strong>`;
        document.getElementById('eventLocation').innerHTML = event.extendedProps.location ?
            `<strong>${event.extendedProps.location}</strong>` :
            '<em class="text-muted">No location specified</em>';
        document.getElementById('eventDescription').innerHTML = event.extendedProps.description ?
            `<p>${event.extendedProps.description}</p>` :
            '<em class="text-muted">No description provided</em>';

        // Set event ID for edit and delete buttons
        document.getElementById('editEventBtn').dataset.id = event.id;
        document.getElementById('deleteEventBtn').dataset.id = event.id;

        // Show modal
        eventDetailsModal.show();
    }

    /**
     * Show delete confirmation modal for a specific event
     */
    function showDeleteConfirmation(eventId) {
        document.getElementById('confirmDeleteBtn').dataset.id = eventId;

        // Hide details modal and show delete confirmation
        eventDetailsModal.hide();
        deleteConfirmModal.show();
    }

    /**
     * Save event (create or update)
     */
    function saveEvent() {
        const form = document.getElementById('eventForm');
        const eventId = parseInt(document.getElementById('eventId').value);
        const startTime = new Date(document.getElementById('startTime').value);
        const endTime = new Date(document.getElementById('endTime').value);
        const now = new Date();

        // Clear previous validation errors
        clearValidationErrors();

        // Basic form validation
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }

        // Custom validations
        let hasError = false;

        // Validate title
        const title = document.getElementById('title').value.trim();
        if (!title) {
            addValidationError('title', 'Event title is required');
            hasError = true;
        }

        // Validate end time is after start time
        if (endTime <= startTime) {
            addValidationError('endTime', 'End time must be after start time');
            hasError = true;
        }

        // For new events only: validate start time is not in past
        if (eventId === 0 && startTime < now && !document.getElementById('isAllDay').checked) {
            addValidationError('startTime', 'Start time cannot be in the past for new events');
            hasError = true;
        }

        // Return if validation failed
        if (hasError) {
            return;
        }

        // Show loading state
        const saveBtn = document.getElementById('saveEventBtn');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
        saveBtn.disabled = true;

        // Gather form data
        const eventData = {
            eventId: eventId,
            title: title,
            description: document.getElementById('description').value.trim(),
            startTime: document.getElementById('startTime').value,
            endTime: document.getElementById('endTime').value,
            location: document.getElementById('location').value.trim(),
            isAllDay: document.getElementById('isAllDay').checked
        };

        // Determine if it's a create or update operation
        const url = eventId === 0 ? '/Event/CreateEvent' : '/Event/UpdateEvent';
        const method = eventId === 0 ? 'POST' : 'PUT';

        // Send request
        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'RequestVerificationToken': antiForgeryToken
            },
            body: JSON.stringify(eventData)
        })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.message || 'Failed to save event');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Hide modal
                    eventFormModal.hide();

                    // Show success message
                    const action = eventId === 0 ? 'created' : 'updated';
                    showToast('Success', `Event ${action} successfully!`, 'success');

                    // Refresh calendar
                    calendar.refetchEvents();
                } else {
                    // Show error from server
                    showToast('Error', data.message || 'Error saving event', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('Error', error.message || 'Error saving event', 'error');
            })
            .finally(() => {
                // Restore button state
                saveBtn.innerHTML = originalText;
                saveBtn.disabled = false;
            });
    }

    /**
     * Delete an event
     */
    function deleteEvent(eventId) {
        // Show loading state
        const deleteBtn = document.getElementById('confirmDeleteBtn');
        const originalText = deleteBtn.innerHTML;
        deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Deleting...';
        deleteBtn.disabled = true;

        // Send delete request
        fetch(`/Event/DeleteEvent/${eventId}`, {
            method: 'DELETE',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'RequestVerificationToken': antiForgeryToken
            }
        })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.message || 'Failed to delete event');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Hide modal
                    deleteConfirmModal.hide();

                    // Show success message
                    showToast('Success', 'Event deleted successfully!', 'success');

                    // Refresh calendar
                    calendar.refetchEvents();
                } else {
                    showToast('Error', data.message || 'Error deleting event', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('Error', error.message || 'Error deleting event', 'error');
            })
            .finally(() => {
                // Restore button state
                deleteBtn.innerHTML = originalText;
                deleteBtn.disabled = false;
            });
    }

    /**
     * Load event data by ID
     */
    function loadEventById(eventId) {
        return fetch(`/Event/GetEventById/${eventId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch event');
                }
                return response.json();
            });
    }

    /**
     * Add validation error to form field
     */
    function addValidationError(fieldId, message) {
        const input = document.getElementById(fieldId);
        input.classList.add('is-invalid');

        // Create feedback element if not exists
        let feedback = input.parentNode.querySelector('.custom-invalid-feedback');
        if (!feedback) {
            feedback = document.createElement('div');
            feedback.className = 'invalid-feedback custom-invalid-feedback';
            input.parentNode.appendChild(feedback);
        }

        feedback.textContent = message;
    }

    /**
     * Clear all validation errors
     */
    function clearValidationErrors() {
        // Remove was-validated class
        document.getElementById('eventForm').classList.remove('was-validated');

        // Remove is-invalid class from all inputs
        document.querySelectorAll('.is-invalid').forEach(el => {
            el.classList.remove('is-invalid');
        });

        // Remove all custom feedback messages
        document.querySelectorAll('.custom-invalid-feedback').forEach(el => {
            el.remove();
        });
    }

    /**
     * Format date range for display
     */
    function formatDateRange(startDate, endDate, isAllDay) {
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };

        const timeOptions = {
            hour: '2-digit',
            minute: '2-digit'
        };

        if (isAllDay) {
            if (!endDate || isSameDay(startDate, endDate)) {
                // Single day event
                return `${startDate.toLocaleDateString(undefined, options)} <span class="badge bg-info ms-2">All Day</span>`;
            } else {
                // Multi-day event
                return `${startDate.toLocaleDateString(undefined, options)} - ${endDate.toLocaleDateString(undefined, options)} <span class="badge bg-info ms-2">All Day</span>`;
            }
        } else {
            if (!endDate || isSameDay(startDate, endDate)) {
                // Same day event with time
                return `${startDate.toLocaleDateString(undefined, options)}, ${startDate.toLocaleTimeString(undefined, timeOptions)} - ${endDate.toLocaleTimeString(undefined, timeOptions)}`;
            } else {
                // Multi-day event with time
                return `${startDate.toLocaleDateString(undefined, options)}, ${startDate.toLocaleTimeString(undefined, timeOptions)} - ${endDate.toLocaleDateString(undefined, options)}, ${endDate.toLocaleTimeString(undefined, timeOptions)}`;
            }
        }
    }

    /**
     * Check if two dates are the same day
     */
    function isSameDay(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate();
    }

    /**
     * Format date for datetime-local input
     */
    function formatDateTimeForInput(date) {
        const yyyy = date.getFullYear();
        const MM = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');

        return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
    }

    /**
     * Show toast notification
     */
    function showToast(title, message, type) {
        // Use the global showToast function if available
        if (typeof window.showToast === 'function') {
            window.showToast(title, message, type);
            return;
        }

        // Fallback implementation
        const toastContainer = document.getElementById('toast-container') || createToastContainer();
        const toastId = 'toast-' + new Date().getTime();

        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = `toast align-items-center border-0 ${type === 'error' ? 'bg-danger' : type === 'success' ? 'bg-success' : 'bg-info'} text-white`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');

        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <strong>${title}:</strong> ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;

        toastContainer.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast, {
            autohide: true,
            delay: 5000
        });

        bsToast.show();

        toast.addEventListener('hidden.bs.toast', function () {
            toast.remove();
        });
    }

    /**
     * Create toast container if it doesn't exist
     */
    function createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(container);
        return container;
    }
});
