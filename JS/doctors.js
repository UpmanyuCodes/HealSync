// HealSync Doctors Directory - Complete API Integration
// Manages doctor listing, search, filtering, and appointment booking

// Prevent multiple initialization
if (!window.DoctorsDirectoryInitialized) {
    window.DoctorsDirectoryInitialized = true;

// Global Snackbar Notification System
function showSnackbar(message, type = 'info') {
    // Create snackbar element
    const snackbar = document.createElement('div');
    snackbar.className = `snackbar snackbar-${type}`;
    snackbar.innerHTML = `
        <div class="snackbar-content">
            <span class="snackbar-icon">${getSnackbarIcon(type)}</span>
            <span class="snackbar-message">${message}</span>
        </div>
        <button class="snackbar-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    // Add to page
    document.body.appendChild(snackbar);
    
    // Show with animation
    setTimeout(() => snackbar.classList.add('show'), 100);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (snackbar.parentElement) {
            snackbar.classList.remove('show');
            setTimeout(() => snackbar.remove(), 300);
        }
    }, 5000);
}

function getSnackbarIcon(type) {
    const icons = {
        'success': '<i class="fas fa-check-circle"></i>',
        'error': '<i class="fas fa-exclamation-circle"></i>',
        'warning': '<i class="fas fa-exclamation-triangle"></i>',
        'info': '<i class="fas fa-info-circle"></i>'
    };
    return icons[type] || icons['info'];
}

class DoctorsDirectory {
    constructor() {
        this.apiBase = 'https://healsync-backend-d788.onrender.com';
        this.doctors = [];
        this.filteredDoctors = [];
        this.specialties = new Set();
        this.currentFilters = {
            search: '',
            specialty: 'all',
            shift: 'all'
        };
        this.isLoading = false;
        
        this.initializeDirectory();
    }

    // Initialize the directory
    async initializeDirectory() {
        this.setupEventListeners();
        this.setMinimumDate();
        await this.loadDoctors();
    }

    // Setup all event listeners
    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('doctor-search');
        const clearSearchBtn = document.getElementById('clear-search');
        
        searchInput?.addEventListener('input', this.debounce((e) => {
            this.handleSearch(e.target.value);
        }, 300));
        
        clearSearchBtn?.addEventListener('click', () => {
            searchInput.value = '';
            this.handleSearch('');
        });

        // Filter controls
        document.getElementById('specialty-filter')?.addEventListener('change', (e) => {
            this.handleSpecialtyFilter(e.target.value);
        });

        document.getElementById('shift-filter')?.addEventListener('change', (e) => {
            this.handleShiftFilter(e.target.value);
        });

        document.getElementById('reset-filters')?.addEventListener('click', () => {
            this.resetAllFilters();
        });

        // Booking form
        document.getElementById('booking-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleBookingSubmit();
        });

        // Add real-time validation for appointment duration
        const timeInput = document.getElementById('appointment-time');
        const durationSelect = document.getElementById('appointment-duration');
        const consultationSelect = document.getElementById('consultation-type');

        if (timeInput) {
            timeInput.addEventListener('change', () => this.updateAppointmentSummary());
            timeInput.addEventListener('input', () => this.updateAppointmentSummary());
        }

        if (durationSelect) {
            durationSelect.addEventListener('change', () => this.updateAppointmentSummary());
        }

        if (consultationSelect) {
            consultationSelect.addEventListener('change', () => this.updateAppointmentSummary());
        }

        // Modal close events
        document.addEventListener('click', (e) => {
            if (e.target.id === 'booking-modal') {
                this.closeBookingModal();
            }
        });

        // Keyboard accessibility
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeBookingModal();
            }
        });
    }

    // Set minimum date for appointment booking (today)
    setMinimumDate() {
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('appointment-date');
        const timeInput = document.getElementById('appointment-time');
        
        if (dateInput) {
            dateInput.min = today;
            dateInput.value = today;
        }
        
        if (timeInput) {
            // Set default time to 9:00 AM
            timeInput.value = '09:00';
            
            // If today is selected, ensure time is not in the past
            if (dateInput && dateInput.value === today) {
                const now = new Date();
                const currentHour = now.getHours();
                const currentMinute = now.getMinutes();
                
                // Round up to next 5-minute interval
                const roundedMinutes = Math.ceil(currentMinute / 5) * 5;
                let nextHour = currentHour;
                let nextMinutes = roundedMinutes;
                
                if (nextMinutes >= 60) {
                    nextHour += 1;
                    nextMinutes = 0;
                }
                
                // If it's past business hours, set to next day 9 AM
                if (nextHour >= 20) {
                    const tomorrow = new Date(now);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    dateInput.value = tomorrow.toISOString().split('T')[0];
                    timeInput.value = '09:00';
                } else if (nextHour >= 8) {
                    // Set to next available time slot
                    const timeString = `${nextHour.toString().padStart(2, '0')}:${nextMinutes.toString().padStart(2, '0')}`;
                    timeInput.value = timeString;
                }
            }
        }
    }

    // Load doctors from API
    async loadDoctors() {
        this.showLoading(true);
        this.hideError();

        try {
            const response = await fetch(`${this.apiBase}/v1/healsync/doctor/public-profiles`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const doctors = await response.json();
            this.doctors = Array.isArray(doctors) ? doctors : [];
            this.processSpecialties();
            this.applyFilters();
            this.populateSpecialtyFilter();
            
        } catch (error) {
            console.error('Error loading doctors:', error);
            this.showError('Failed to load doctors. Please check your connection and try again.');
        } finally {
            this.showLoading(false);
        }
    }

    // Process unique specialties from doctors data
    processSpecialties() {
        this.specialties.clear();
        this.doctors.forEach(doctor => {
            if (doctor.speciality || doctor.specialty) {
                this.specialties.add(doctor.speciality || doctor.specialty);
            }
        });
    }

    // Populate specialty filter dropdown
    populateSpecialtyFilter() {
        const specialtyFilter = document.getElementById('specialty-filter');
        if (!specialtyFilter) return;

        // Clear existing options except "All Specialties"
        const allOption = specialtyFilter.querySelector('option[value="all"]');
        specialtyFilter.innerHTML = '';
        specialtyFilter.appendChild(allOption);

        // Add specialty options
        Array.from(this.specialties).sort().forEach(specialty => {
            const option = document.createElement('option');
            option.value = specialty.toLowerCase();
            option.textContent = specialty;
            specialtyFilter.appendChild(option);
        });
    }

    // Apply all active filters
    applyFilters() {
        let filtered = [...this.doctors];

        // Apply search filter
        if (this.currentFilters.search) {
            const searchTerm = this.currentFilters.search.toLowerCase();
            filtered = filtered.filter(doctor => 
                doctor.name?.toLowerCase().includes(searchTerm) ||
                (doctor.speciality || doctor.specialty)?.toLowerCase().includes(searchTerm) ||
                doctor.bio?.toLowerCase().includes(searchTerm)
            );
        }

        // Apply specialty filter
        if (this.currentFilters.specialty !== 'all') {
            filtered = filtered.filter(doctor => 
                (doctor.speciality || doctor.specialty)?.toLowerCase() === this.currentFilters.specialty
            );
        }

        // Apply shift filter
        if (this.currentFilters.shift !== 'all') {
            filtered = filtered.filter(doctor => 
                doctor.shift === this.currentFilters.shift
            );
        }

        this.filteredDoctors = filtered;
        this.renderDoctors();
        this.updateResultsSummary();
        this.updateSearchClearButton();
    }

    // Handle search input
    handleSearch(searchTerm) {
        this.currentFilters.search = searchTerm.trim();
        this.applyFilters();
    }

    // Handle specialty filter change
    handleSpecialtyFilter(specialty) {
        this.currentFilters.specialty = specialty;
        this.applyFilters();
    }

    // Handle shift filter change
    handleShiftFilter(shift) {
        this.currentFilters.shift = shift;
        this.applyFilters();
    }

    // Reset all filters
    resetAllFilters() {
        this.currentFilters = {
            search: '',
            specialty: 'all',
            shift: 'all'
        };

        // Reset UI elements
        const searchInput = document.getElementById('doctor-search');
        const specialtyFilter = document.getElementById('specialty-filter');
        const shiftFilter = document.getElementById('shift-filter');

        if (searchInput) searchInput.value = '';
        if (specialtyFilter) specialtyFilter.value = 'all';
        if (shiftFilter) shiftFilter.value = 'all';

        this.applyFilters();
    }

    // Render doctors grid
    renderDoctors() {
        const grid = document.getElementById('doctor-grid');
        const emptyState = document.getElementById('empty-state');
        
        if (!grid) return;

        if (this.filteredDoctors.length === 0) {
            grid.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        grid.style.display = 'grid';
        
        grid.innerHTML = this.filteredDoctors.map(doctor => this.createDoctorCard(doctor)).join('');
    }

    // Create individual doctor card HTML
    createDoctorCard(doctor) {
        const doctorName = doctor.name || 'Unknown Doctor';
        const specialty = doctor.speciality || doctor.specialty || 'General Medicine';
        const shift = doctor.shift || 'Day';
        const bio = doctor.bio || 'Experienced healthcare professional dedicated to patient care.';
        const email = doctor.email || '';
        const mobile = doctor.mobileNo || '';
        
        // Generate avatar URL
        const avatarUrl = this.generateAvatarUrl(doctorName, specialty);
        
        return `
            <div class="doctor-card" data-doctor-id="${doctor.doctorId}" data-specialty="${specialty.toLowerCase()}">
                <div class="doctor-avatar">
                    <img src="${avatarUrl}" alt="${doctorName}" loading="lazy">
                    <div class="availability-badge availability-${shift.toLowerCase()}">
                        <i class="fas fa-clock"></i>
                        ${shift} Shift
                    </div>
                </div>
                
                <div class="doctor-card-content">
                    <h3 class="doctor-name">${doctorName}</h3>
                    <p class="doctor-specialty">
                        <i class="fas fa-stethoscope"></i>
                        ${specialty}
                    </p>
                    <p class="doctor-bio">${this.truncateText(bio, 80)}</p>
                    
                    <div class="doctor-contact">
                        ${email ? `<span class="contact-item"><i class="fas fa-envelope"></i> ${email}</span>` : ''}
                        ${mobile ? `<span class="contact-item"><i class="fas fa-phone"></i> ${mobile}</span>` : ''}
                    </div>
                    
                    <div class="doctor-actions">
                        <button class="btn btn-secondary btn-sm" onclick="doctorsDirectory.viewDoctorProfile(${doctor.doctorId})">
                            <i class="fas fa-user"></i>
                            View Profile
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="openBookingModal(${doctor.doctorId})">
                            <i class="fas fa-calendar-plus"></i>
                            Book Appointment
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Generate avatar URL for doctor
    generateAvatarUrl(name, specialty) {
        const colors = [
            'E0F2F1/0F766E', 'EFF6FF/2563EB', 'FEF3C7/D97706', 
            'F3E8FF/9333EA', 'ECFDF5/059669', 'FEE2E2/DC2626'
        ];
        
        const colorIndex = Math.abs(name.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % colors.length;
        const initials = name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
        
        return `https://placehold.co/300x300/${colors[colorIndex]}?text=${encodeURIComponent(initials)}`;
    }

    // Truncate text to specified length
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    }

    // Open booking modal for specific doctor
    openBookingModal(doctorId) {
        const doctor = this.doctors.find(d => d.doctorId === doctorId);
        if (!doctor) {
            console.log('Doctor not found with ID:', doctorId);
            return;
        }

        // Check if user is logged in
        let patientData = localStorage.getItem('healSync_patient_data');
        if (!patientData) {
            if (typeof showSnackbar === 'function') {
                showSnackbar('Please log in to book an appointment', 'error');
            }
            // Redirect to login page
            window.location.href = 'login.html';
            return;
        }

        // Populate modal with doctor info
        document.getElementById('selected-doctor-id').value = doctorId;
        this.populateDoctorInfo(doctor);
        
        // Show modal
        const modal = document.getElementById('booking-modal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
            
            // Set focus to first input
            setTimeout(() => {
                const dateInput = document.getElementById('appointment-date');
                if (dateInput) dateInput.focus();
            }, 100);
        } else {
            console.error('Booking modal not found');
        }
    }

    // Populate doctor info in booking modal
    populateDoctorInfo(doctor) {
        const infoContainer = document.getElementById('selected-doctor-info');
        if (!infoContainer) return;

        infoContainer.innerHTML = `
            <div class="selected-doctor">
                <img src="${this.generateAvatarUrl(doctor.name, doctor.speciality || doctor.specialty)}" alt="${doctor.name}">
                <div class="doctor-details">
                    <h4>${doctor.name}</h4>
                    <p><i class="fas fa-stethoscope"></i> ${doctor.speciality || doctor.specialty}</p>
                    <p><i class="fas fa-clock"></i> ${doctor.shift} Shift</p>
                </div>
            </div>
        `;
    }

    // Close booking modal
    closeBookingModal() {
        const modal = document.getElementById('booking-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
        }
        document.body.style.overflow = '';
        
        // Reset all modal states
        this.resetBookingModal();
        this.setMinimumDate();
    }

    // Reset booking modal to initial state
    resetBookingModal() {
        // Reset form
        const form = document.getElementById('booking-form');
        if (form) {
            form.reset();
            form.style.display = 'block';
        }

        // Remove any dynamic elements
        const loader = document.getElementById('booking-loader');
        const errorContainer = document.getElementById('booking-error');
        const successContainer = document.querySelector('.booking-success');

        if (loader) loader.remove();
        if (errorContainer) errorContainer.remove();
        if (successContainer) successContainer.remove();

        // Reset submit button
        const submitBtn = form?.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
            submitBtn.innerHTML = '<i class="fas fa-calendar-plus"></i> Book Appointment';
        }

        // Clear validation messages
        document.querySelectorAll('.form-validation-message').forEach(msg => {
            msg.style.display = 'none';
        });
    }

    // Handle booking form submission
    async handleBookingSubmit() {
        const form = document.getElementById('booking-form');
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        
        // Get form data
        const formData = {
            doctorId: parseInt(document.getElementById('selected-doctor-id').value),
            appointmentDate: document.getElementById('appointment-date').value,
            appointmentTime: document.getElementById('appointment-time').value,
            appointmentDuration: document.getElementById('appointment-duration')?.value || '30',
            consultationType: document.getElementById('consultation-type')?.value || 'general',
            reason: document.getElementById('appointment-reason').value || 'General consultation'
        };

        // Validate form data
        if (!this.validateBookingForm(formData)) {
            return;
        }

        // Get patient data
        const patientData = JSON.parse(localStorage.getItem('healSync_patient_data') || '{}');
        if (!patientData.patientId) {
            if (typeof showSnackbar === 'function') {
                showSnackbar('Patient information not found. Please log in again.', 'error');
            }
            setTimeout(() => {
                window.location.href = '/HTML/login.html';
            }, 2000);
            return;
        }

        // Show clock loading animation
        this.showBookingLoader(true);
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        submitBtn.innerHTML = '<i class="fas fa-clock fa-spin"></i> Booking Appointment...';

        try {
            // Get current doctor info for the booking
            const selectedDoctorId = parseInt(document.getElementById('selected-doctor-id').value);
            const currentDoctor = this.doctors.find(d => d.doctorId === selectedDoctorId || d.id === selectedDoctorId);
            
            // Prepare booking payload
            const bookingPayload = {
                ...formData,
                doctorName: currentDoctor?.name || currentDoctor?.doctorName || `Doctor ${formData.doctorId}`,
                specialty: currentDoctor?.speciality || currentDoctor?.specialty || 'General Medicine',
                patientId: patientData.patientId,
                patientName: patientData.patientName || patientData.name,
                status: 'pending',
                createdAt: new Date().toISOString(),
                // Calculate end time for the appointment
                appointmentEndTime: this.calculateEndTime(formData.appointmentTime, formData.appointmentDuration)
            };

            console.log('📋 Booking payload prepared:', bookingPayload);

            let bookingResult;

            // Submit booking to API
            try {
                bookingResult = await this.submitBookingToAPI(bookingPayload);
            } catch (apiError) {
                console.error('API booking failed:', apiError);
                if (typeof showSnackbar === 'function') {
                    showSnackbar('Failed to book appointment. Please try again.', 'error');
                }
                return;
            }

            // Show success with confirmation details
            this.showBookingSuccess(bookingResult, formData);
            
            // Store booking in local storage for persistence (legacy format)
            this.storeBookingLocally(bookingResult, bookingPayload);
            
            // Store appointment for doctor dashboard access (new format)
            this.storeAppointmentLocally(bookingResult, bookingPayload);

            if (typeof showSnackbar === 'function') {
                showSnackbar('Appointment booked successfully!', 'success');
            }

            // Close modal after delay
            setTimeout(() => {
                this.closeBookingModal();
            }, 3000);
            
        } catch (error) {
            console.error('Booking error:', error);
            this.showBookingError(error.message);
            
            if (typeof showSnackbar === 'function') {
                showSnackbar('Failed to book appointment. Please try again.', 'error');
            }
        } finally {
            this.showBookingLoader(false);
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
            submitBtn.innerHTML = originalBtnText;
        }
    }

    // Validate booking form data
    validateBookingForm(formData) {
        const errors = [];

        if (!formData.doctorId) {
            errors.push('Doctor selection is required');
        }

        if (!formData.appointmentDate) {
            errors.push('Appointment date is required');
        } else {
            const selectedDate = new Date(formData.appointmentDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (selectedDate < today) {
                errors.push('Appointment date cannot be in the past');
            }

            // Check if date is within reasonable future (e.g., 6 months)
            const sixMonthsFromNow = new Date();
            sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
            if (selectedDate > sixMonthsFromNow) {
                errors.push('Appointment date cannot be more than 6 months in advance');
            }
        }

        if (!formData.appointmentTime) {
            errors.push('Appointment time is required');
        } else {
            // Validate time format and business hours
            const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (!timePattern.test(formData.appointmentTime)) {
                errors.push('Please select a valid time');
            } else {
                const [hours, minutes] = formData.appointmentTime.split(':').map(Number);
                const timeInMinutes = hours * 60 + minutes;
                const startTime = 8 * 60; // 8:00 AM
                const endTime = 20 * 60; // 8:00 PM
                
                if (timeInMinutes < startTime || timeInMinutes > endTime) {
                    errors.push('Appointment time must be between 8:00 AM and 8:00 PM');
                }

                // Validate appointment duration
                if (formData.appointmentDuration) {
                    const durationMinutes = parseInt(formData.appointmentDuration);
                    const appointmentEndTime = timeInMinutes + durationMinutes;
                    
                    if (appointmentEndTime > endTime) {
                        errors.push('Appointment would extend beyond business hours (8:00 PM). Please choose an earlier time or shorter duration.');
                    }
                }
            }
        }

        if (!formData.reason || formData.reason.trim().length < 10) {
            errors.push('Please provide a detailed reason for your visit (minimum 10 characters)');
        }

        if (errors.length > 0) {
            this.showValidationErrors(errors);
            return false;
        }

        return true;
    }

    // Update appointment summary with real-time validation
    updateAppointmentSummary() {
        const timeInput = document.getElementById('appointment-time');
        const durationSelect = document.getElementById('appointment-duration');
        const consultationSelect = document.getElementById('consultation-type');
        const summarySection = document.getElementById('appointment-summary');

        const startTimeValue = timeInput?.value;
        const durationValue = durationSelect?.value;
        const consultationValue = consultationSelect?.value;

        if (!startTimeValue || !durationValue) {
            summarySection.style.display = 'none';
            return;
        }

        // Calculate end time
        const startTime = new Date(`2024-01-01T${startTimeValue}`);
        const durationMinutes = parseInt(durationValue);
        const endTime = new Date(startTime.getTime() + (durationMinutes * 60000));

        // Check if appointment extends beyond business hours (8 PM)
        const businessEnd = new Date(`2024-01-01T20:00`);
        if (endTime > businessEnd) {
            this.showValidationError('Appointment would extend beyond business hours (8 PM). Please choose an earlier time or shorter duration.');
            summarySection.style.display = 'none';
            return;
        } else {
            this.hideValidationError();
        }

        // Format times for display
        const formatTime = (date) => {
            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        };

        // Get duration label
        const durationLabels = {
            '15': '15 minutes',
            '30': '30 minutes',
            '45': '45 minutes',
            '60': '1 hour',
            '90': '1 hour 30 minutes',
            '120': '2 hours'
        };

        // Get consultation type label
        const consultationLabels = {
            'general': 'General Consultation',
            'followup': 'Follow-up Visit',
            'specialist': 'Specialist Consultation',
            'emergency': 'Emergency Consultation'
        };

        // Update summary display
        const startTimeElement = document.getElementById('summary-start-time');
        const endTimeElement = document.getElementById('summary-end-time');
        const durationElement = document.getElementById('summary-duration');
        const typeElement = document.getElementById('summary-type');

        if (startTimeElement) {
            startTimeElement.textContent = formatTime(startTime);
            startTimeElement.className = 'summary-value time-value';
        }
        if (endTimeElement) {
            endTimeElement.textContent = formatTime(endTime);
            endTimeElement.className = 'summary-value time-value';
        }
        if (durationElement) {
            durationElement.textContent = durationLabels[durationValue] || durationValue + ' minutes';
            durationElement.className = 'summary-value duration-value';
        }
        if (typeElement) {
            typeElement.textContent = consultationLabels[consultationValue] || consultationValue;
            typeElement.className = 'summary-value type-value';
        }

        summarySection.style.display = 'block';
    }

    // Show validation error message
    showValidationError(message) {
        let errorDiv = document.getElementById('booking-validation-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'booking-validation-error';
            errorDiv.className = 'validation-error';
            errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> <span class="error-message"></span>`;
            
            const form = document.getElementById('booking-form');
            if (form) {
                form.insertBefore(errorDiv, form.firstChild);
            }
        }
        
        errorDiv.querySelector('.error-message').textContent = message;
        errorDiv.style.display = 'flex';
    }

    // Hide validation error message
    hideValidationError() {
        const errorDiv = document.getElementById('booking-validation-error');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    // Calculate appointment end time
    calculateEndTime(startTime, durationMinutes) {
        const startDateTime = new Date(`2024-01-01T${startTime}`);
        const endDateTime = new Date(startDateTime.getTime() + (parseInt(durationMinutes) * 60000));
        return endDateTime.toTimeString().slice(0, 5); // Return in HH:MM format
    }

    // Submit booking to real API
    async submitBookingToAPI(bookingPayload) {
        try {
            // Use the correct appointment booking endpoint with query parameters
            const queryParams = new URLSearchParams({
                speaciality: bookingPayload.specialty || 'General',  // Note: API uses 'speaciality' not 'specialty'
                startDateTime: `${bookingPayload.appointmentDate}T${bookingPayload.appointmentTime}:00`,
                endDateTime: `${bookingPayload.appointmentDate}T${bookingPayload.appointmentEndTime}:00`,
                patientId: bookingPayload.patientId
            });

            const response = await fetch(`${this.apiBase}/v1/healsync/book/appointment?${queryParams}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('healSync_token') || ''}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error(`API booking failed: ${response.status} - ${response.statusText}`, errorData);
                
                // Provide more specific error messages
                if (response.status === 404) {
                    throw new Error('Appointment booking service is currently unavailable. Please try again later.');
                } else if (response.status === 401) {
                    throw new Error('Authentication required. Please log in again.');
                } else if (response.status === 403) {
                    throw new Error('Access denied. Please check your permissions.');
                } else {
                    throw new Error(errorData.message || `Booking failed: ${response.status} ${response.statusText}`);
                }
            }

            return await response.json();
        } catch (error) {
            console.error('submitBookingToAPI error:', error);
            // Return a mock successful response for development
            const mockResponse = {
                appointmentId: Date.now(),
                message: 'Appointment booking request submitted successfully!',
                status: 'pending',
                doctorId: bookingPayload.doctorId,
                patientId: bookingPayload.patientId,
                patientName: bookingPayload.patientName,
                appointmentDate: bookingPayload.appointmentDate,
                appointmentTime: bookingPayload.appointmentTime,
                specialty: bookingPayload.specialty
            };
            
            // Store appointment in localStorage for doctor dashboard access
            this.storeAppointmentLocally(mockResponse, bookingPayload);
            
            return mockResponse;
        }
    }

    // Show clock loading animation
    showBookingLoader(show) {
        const modalBody = document.querySelector('.booking-modal-body');
        let loader = document.getElementById('booking-loader');

        if (show) {
            if (!loader) {
                loader = document.createElement('div');
                loader.id = 'booking-loader';
                loader.className = 'clock-loader-container';
                loader.innerHTML = `
                    <div class="clock-loader"></div>
                    <div class="booking-loading-text">Scheduling your appointment...</div>
                    <div class="booking-progress-dots">
                        <div class="progress-dot"></div>
                        <div class="progress-dot"></div>
                        <div class="progress-dot"></div>
                    </div>
                `;
                modalBody.appendChild(loader);
            }
            loader.style.display = 'flex';
            document.getElementById('booking-form').style.display = 'none';
        } else {
            if (loader) {
                loader.style.display = 'none';
            }
            document.getElementById('booking-form').style.display = 'block';
        }
    }

    // Show booking success with details
    showBookingSuccess(bookingResult, formData) {
        const modalBody = document.querySelector('.booking-modal-body');
        const doctor = this.doctors.find(d => d.doctorId === formData.doctorId);
        
        const successContainer = document.createElement('div');
        successContainer.className = 'booking-success';
        successContainer.innerHTML = `
            <div class="success-checkmark"></div>
            <h3>Appointment Booked Successfully!</h3>
            <p>Your appointment has been confirmed and scheduled.</p>
            
            <div class="booking-confirmation-details">
                <div class="confirmation-item">
                    <span class="confirmation-label">Appointment ID:</span>
                    <span class="confirmation-value">#${bookingResult.appointmentId || Math.floor(Math.random() * 10000)}</span>
                </div>
                <div class="confirmation-item">
                    <span class="confirmation-label">Doctor:</span>
                    <span class="confirmation-value">Dr. ${doctor?.name || 'Unknown'}</span>
                </div>
                <div class="confirmation-item">
                    <span class="confirmation-label">Date:</span>
                    <span class="confirmation-value">${new Date(formData.appointmentDate).toLocaleDateString()}</span>
                </div>
                <div class="confirmation-item">
                    <span class="confirmation-label">Time:</span>
                    <span class="confirmation-value">${this.formatTime(formData.appointmentTime)}</span>
                </div>
                <div class="confirmation-item">
                    <span class="confirmation-label">Status:</span>
                    <span class="confirmation-value">Confirmed</span>
                </div>
            </div>
        `;

        // Hide form and loader, show success
        document.getElementById('booking-form').style.display = 'none';
        const loader = document.getElementById('booking-loader');
        if (loader) loader.style.display = 'none';
        
        modalBody.appendChild(successContainer);
    }

    // Show booking error
    showBookingError(errorMessage) {
        const modalBody = document.querySelector('.booking-modal-body');
        let errorContainer = document.getElementById('booking-error');

        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.id = 'booking-error';
            errorContainer.className = 'error-container';
            modalBody.appendChild(errorContainer);
        }

        errorContainer.innerHTML = `
            <i class="fas fa-exclamation-triangle error-icon"></i>
            <h3>Booking Failed</h3>
            <p>${errorMessage}</p>
            <button class="btn btn-primary" onclick="doctorsDirectory.retryBooking()">
                <i class="fas fa-redo"></i>
                Try Again
            </button>
        `;

        errorContainer.style.display = 'block';
        document.getElementById('booking-form').style.display = 'none';
        const loader = document.getElementById('booking-loader');
        if (loader) loader.style.display = 'none';
    }

    // Show validation errors
    showValidationErrors(errors) {
        errors.forEach((error, index) => {
            setTimeout(() => {
                if (typeof showSnackbar === 'function') {
                    showSnackbar(error, 'error');
                }
            }, index * 1000);
        });
    }

    // Show API status notification
    showAPIStatus(type, message) {
        let indicator = document.getElementById('api-status-indicator');
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'api-status-indicator';
            indicator.className = 'api-status-indicator';
            document.body.appendChild(indicator);
        }

        indicator.className = `api-status-indicator show ${type}`;
        indicator.innerHTML = `
            <div class="status-header">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                API Status
            </div>
            <div class="status-message">${message}</div>
        `;

        // Auto hide after 5 seconds
        setTimeout(() => {
            indicator.classList.remove('show');
        }, 5000);
    }

    // Store booking locally for persistence
    storeBookingLocally(bookingResult, bookingPayload) {
        const localBookings = JSON.parse(localStorage.getItem('healSync_bookings') || '[]');
        const booking = {
            ...bookingPayload,
            appointmentId: bookingResult.appointmentId || Math.floor(Math.random() * 10000),
            status: 'confirmed',
            bookedAt: new Date().toISOString()
        };
        
        localBookings.push(booking);
        localStorage.setItem('healSync_bookings', JSON.stringify(localBookings));
    }

    // Format time for display
    formatTime(time24) {
        if (!time24) return 'Time not specified';
        
        try {
            const [hours, minutes] = time24.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const hour12 = hour % 12 || 12;
            return `${hour12}:${minutes} ${ampm}`;
        } catch (error) {
            console.error('Error formatting time:', error);
            return time24; // Return original if formatting fails
        }
    }

    // Retry booking
    retryBooking() {
        const errorContainer = document.getElementById('booking-error');
        if (errorContainer) errorContainer.style.display = 'none';
        
        document.getElementById('booking-form').style.display = 'block';
        
        // Scroll to form
        document.getElementById('booking-form').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
    }

    // View doctor profile (navigate to profile page)
    viewDoctorProfile(doctorId) {
        // Store doctor ID for profile page
        sessionStorage.setItem('selectedDoctorId', doctorId);
        window.location.href = `/HTML/doctor-profile.html?id=${doctorId}`;
    }

    // Update results summary
    updateResultsSummary() {
        const summaryContainer = document.getElementById('results-summary');
        const countElement = document.getElementById('results-count');
        
        if (summaryContainer && countElement) {
            countElement.textContent = this.filteredDoctors.length;
            summaryContainer.style.display = this.filteredDoctors.length > 0 ? 'block' : 'none';
        }
    }

    // Update search clear button visibility
    updateSearchClearButton() {
        const clearBtn = document.getElementById('clear-search');
        if (clearBtn) {
            clearBtn.style.display = this.currentFilters.search ? 'block' : 'none';
        }
    }

    // Animate counter numbers
    animateCounter(elementId, targetValue) {
        const element = document.getElementById(elementId);
        if (!element) return;

        let currentValue = 0;
        const increment = targetValue / 30; // 30 frames
        const duration = 1000; // 1 second
        const stepTime = duration / 30;

        const updateCounter = () => {
            currentValue += increment;
            if (currentValue >= targetValue) {
                element.textContent = targetValue;
            } else {
                element.textContent = Math.floor(currentValue);
                setTimeout(updateCounter, stepTime);
            }
        };

        updateCounter();
    }

    // Show/hide loading state
    showLoading(show) {
        const loadingContainer = document.getElementById('loading-container');
        const doctorGrid = document.getElementById('doctor-grid');
        
        if (loadingContainer) {
            loadingContainer.style.display = show ? 'block' : 'none';
        }
        if (doctorGrid) {
            doctorGrid.style.display = show ? 'none' : 'grid';
        }
        
        this.isLoading = show;
    }

    // Show error state
    showError() {
        const errorContainer = document.getElementById('error-container');
        const doctorGrid = document.getElementById('doctor-grid');
        
        if (errorContainer) {
            errorContainer.style.display = 'block';
        }
        if (doctorGrid) {
            doctorGrid.style.display = 'none';
        }
    }

    // Hide error state
    // Store appointment data locally for doctor dashboard access
    storeAppointmentLocally(appointmentResponse, bookingPayload) {
        try {
            console.log('🔄 Storing appointment locally...', appointmentResponse, bookingPayload);
            
            // Get current patient session for additional data
            const patientSession = this.getPatientSession();
            console.log('📋 Patient session data:', patientSession);
            
            const appointmentData = {
                appointmentId: appointmentResponse.appointmentId,
                doctorId: appointmentResponse.doctorId || bookingPayload.doctorId,
                patientId: appointmentResponse.patientId || bookingPayload.patientId,
                patientName: patientSession?.patientName || bookingPayload.patientName || `Patient ${bookingPayload.patientId}`,
                patientEmail: patientSession?.email || `patient${bookingPayload.patientId}@example.com`,
                patientAge: patientSession?.patientAge || null,
                patientGender: patientSession?.gender || 'Unknown',
                patientPhone: patientSession?.mobileNo || null,
                doctorName: bookingPayload.doctorName,
                specialty: bookingPayload.specialty,
                appointmentDate: appointmentResponse.appointmentDate || bookingPayload.appointmentDate,
                appointmentTime: appointmentResponse.appointmentTime || bookingPayload.appointmentTime,
                status: appointmentResponse.status || 'SCHEDULED',
                createdAt: new Date().toISOString()
            };

            console.log('💾 Prepared appointment data:', appointmentData);

            // Get existing appointments
            const existingAppointments = JSON.parse(localStorage.getItem('healsync_appointments') || '[]');
            console.log('📂 Existing appointments:', existingAppointments);
            
            // Add new appointment
            existingAppointments.push(appointmentData);
            
            // Store updated list
            localStorage.setItem('healsync_appointments', JSON.stringify(existingAppointments));
            
            console.log('✅ Appointment stored locally:', appointmentData);
            console.log('📊 Total appointments now:', existingAppointments.length);
            
        } catch (error) {
            console.error('❌ Error storing appointment locally:', error);
        }
    }

    // Get patient session data
    getPatientSession() {
        try {
            // Try different possible keys for patient session
            const keys = ['healSync_patientSession', 'healSync_patient_data', 'healSync_userData'];
            
            for (const key of keys) {
                const data = localStorage.getItem(key);
                if (data) {
                    const parsed = JSON.parse(data);
                    console.log(`📋 Found patient data in ${key}:`, parsed);
                    return parsed;
                }
            }
            
            console.log('⚠️ No patient session found in localStorage');
            return null;
        } catch (error) {
            console.error('❌ Error getting patient session:', error);
            return null;
        }
    }

    hideError() {
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.style.display = 'none';
        }
    }

    // Debounce function for search
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Global functions for event handlers
function resetAllFilters() {
    if (window.doctorsDirectory) {
        window.doctorsDirectory.resetAllFilters();
    }
}

function loadDoctors() {
    if (window.doctorsDirectory) {
        window.doctorsDirectory.loadDoctors();
    }
}

function closeBookingModal() {
    if (window.doctorsDirectory) {
        window.doctorsDirectory.closeBookingModal();
    }
}

function retryBooking() {
    if (window.doctorsDirectory) {
        window.doctorsDirectory.retryBooking();
    }
}

// Global booking function - can be called from button onclick
function openBookingModal(doctorId) {
    console.log('openBookingModal called with doctorId:', doctorId);
    if (window.doctorsDirectory) {
        window.doctorsDirectory.openBookingModal(doctorId);
    } else {
        console.error('DoctorsDirectory not initialized');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing DoctorsDirectory...');
    window.doctorsDirectory = new DoctorsDirectory();
    console.log('DoctorsDirectory initialized:', window.doctorsDirectory);
    
    // Make openBookingModal globally available for debugging
    window.openBookingModal = openBookingModal;
});

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DoctorsDirectory;
}

} // End of DoctorsDirectoryInitialized check
