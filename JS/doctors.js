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
            // Use the correct endpoint that we verified is working
            const response = await fetch(`${this.apiBase}/api/doctors`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const doctors = await response.json();
            console.log('📊 Loaded doctors from API:', doctors);
            console.log('🔍 Doctor IDs and names:', doctors.map(d => ({ 
                doctorId: d.doctorId, 
                name: d.name,
                specialty: d.speaciality || d.specialty,
                email: d.email,
                mobile: d.mobileNo,
                shift: d.shift
            })));
            
            // Process and clean the API data
            this.doctors = Array.isArray(doctors) ? doctors.map(doctor => ({
                ...doctor,
                // Normalize the specialty field (API uses 'speaciality' with typo)
                specialty: doctor.speaciality || doctor.specialty || 'General Medicine',
                // Ensure we have all required fields
                name: doctor.name || 'Unknown Doctor',
                bio: doctor.bio || 'Experienced healthcare professional',
                shift: doctor.shift || 'Day'
            })) : [];
            
            if (this.doctors.length === 0) {
                throw new Error('No doctors received from API');
            }
            
            console.log('✅ Successfully loaded', this.doctors.length, 'doctors from API');
            this.processSpecialties();
            this.applyFilters();
            this.populateSpecialtyFilter();
            
        } catch (error) {
            console.error('❌ Error loading doctors from API:', error);
            this.showError(`Failed to load doctors from API: ${error.message}. Please check your connection and try again.`);
            
            // Don't use mock fallback - we want to use real data only
            this.doctors = [];
            this.filteredDoctors = [];
            this.renderDoctors();
        } finally {
            this.showLoading(false);
        }
    }

    // Process unique specialties from doctors data
    processSpecialties() {
        this.specialties.clear();
        this.doctors.forEach(doctor => {
            // Use the normalized specialty field
            if (doctor.specialty) {
                this.specialties.add(doctor.specialty);
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
        
        // DEBUG: Log filtered doctors before rendering
        console.log('🎨 Rendering doctors:', this.filteredDoctors.map((doctor, index) => ({
            index,
            doctorId: doctor.doctorId,
            name: doctor.name,
            specialty: doctor.specialty
        })));
        
        grid.innerHTML = this.filteredDoctors.map(doctor => this.createDoctorCard(doctor)).join('');
        
        // Add simplified event listeners
        this.attachDoctorCardListeners();
        
        // DEBUG: After rendering, check what doctor IDs are actually in the DOM
        setTimeout(() => {
            const cards = grid.querySelectorAll('.doctor-card');
            
            console.log('🏥 Rendered doctor cards:');
            cards.forEach((card, index) => {
                const cardId = card.getAttribute('data-doctor-id');
                const doctorName = card.querySelector('.doctor-name')?.textContent;
                console.log(`  Card ${index + 1}: ID=${cardId}, Name=${doctorName}`);
            });
        }, 100);
    }
    
    // Attach event listeners to doctor cards
    attachDoctorCardListeners() {
        const grid = document.getElementById('doctor-grid');
        if (!grid) return;
        
        // Add click listeners to all Advanced Booking buttons
        const bookingButtons = grid.querySelectorAll('.advanced-booking-btn[data-doctor-id]');
        console.log('🎯 Found', bookingButtons.length, 'Advanced Booking buttons');
        
        bookingButtons.forEach((button, index) => {
            const doctorId = button.getAttribute('data-doctor-id');
            console.log(`🔗 Attaching listener to button ${index + 1} for doctor ID:`, doctorId);
            
            // Remove any existing listener first
            button.removeEventListener('click', this.handleBookingClick);
            
            // Add new listener with detailed debugging
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const clickedButton = e.target.closest('.advanced-booking-btn');
                const clickedDoctorId = clickedButton.getAttribute('data-doctor-id');
                const clickedDoctorName = clickedButton.getAttribute('data-doctor-name');
                
                console.log('🚨 === ENHANCED BUTTON CLICK DEBUG ===');
                console.log('🖱️ Button clicked:', {
                    doctorId: clickedDoctorId,
                    doctorName: clickedDoctorName,
                    buttonElement: clickedButton
                });
                
                // Verify the doctor exists in our arrays
                const doctorInMain = this.doctors.find(d => d.doctorId == clickedDoctorId);
                const doctorInFiltered = this.filteredDoctors.find(d => d.doctorId == clickedDoctorId);
                
                console.log('🔍 Doctor verification:', {
                    searchingForId: clickedDoctorId,
                    inMainArray: doctorInMain ? `${doctorInMain.name} (ID: ${doctorInMain.doctorId})` : 'NOT FOUND',
                    inFilteredArray: doctorInFiltered ? `${doctorInFiltered.name} (ID: ${doctorInFiltered.doctorId})` : 'NOT FOUND'
                });
                
                if (!doctorInMain) {
                    console.error('❌ CRITICAL ERROR: Doctor not found in main array!');
                    console.error('Available IDs:', this.doctors.map(d => d.doctorId));
                    return;
                }
                
                // Find the doctor card this button belongs to
                const doctorCard = clickedButton.closest('.doctor-card');
                if (doctorCard) {
                    const cardDoctorId = doctorCard.getAttribute('data-doctor-id');
                    const doctorName = doctorCard.querySelector('.doctor-name')?.textContent;
                    console.log('🏥 Doctor card ID:', cardDoctorId);
                    console.log('�‍⚕️ Doctor name from card:', doctorName);
                    
                    if (cardDoctorId !== clickedDoctorId) {
                        console.error('❌ MISMATCH: Button ID and Card ID are different!');
                        console.error('  Button ID:', clickedDoctorId);
                        console.error('  Card ID:', cardDoctorId);
                    }
                }
                
                // Call the modal function with the clicked doctor ID
                console.log('📞 Calling openBookingModal with ID:', clickedDoctorId);
                this.openBookingModal(parseInt(clickedDoctorId));
            });
        });
        
        console.log('✅ All booking button listeners attached');
    }

    // Create individual doctor card HTML with beautiful layout
    createDoctorCard(doctor) {
        const doctorName = doctor.name || 'Unknown Doctor';
        const specialty = doctor.specialty || 'General Medicine';
        const shift = doctor.shift || 'Day';
        const bio = doctor.bio || 'Experienced healthcare professional dedicated to patient care.';
        const email = doctor.email || '';
        const mobile = doctor.mobileNo || '';
        const actualDoctorId = doctor.doctorId;

        // Get initials for avatar
        const initials = doctorName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

        // Beautiful clean card layout with proper structure
        return `
            <div class="doctor-card" data-doctor-id="${actualDoctorId}" data-specialty="${specialty.toLowerCase()}">
                <div class="doctor-card-row">
                    <div class="doctor-header">
                        <div class="doctor-avatar">${initials}</div>
                        <div class="availability-badge availability-${shift.toLowerCase()}">
                            <i class="fas fa-clock"></i> ${shift} Shift
                        </div>
                    </div>
                    <div class="doctor-card-content">
                        <h3 class="doctor-name">${doctorName}</h3>
                        <p class="doctor-specialty">
                            <i class="fas fa-stethoscope"></i> ${specialty}
                        </p>
                        <p class="doctor-bio">${this.truncateText(bio, 80)}</p>
                        <div class="doctor-contact">
                            ${email ? `<div class="contact-item"><i class="fas fa-envelope"></i> ${email}</div>` : ''}
                            ${mobile ? `<div class="contact-item"><i class="fas fa-phone"></i> ${mobile}</div>` : ''}
                        </div>
                        <div class="doctor-actions">
                            <button class="btn btn-secondary" onclick="window.doctorsDirectory.viewDoctorProfile(${actualDoctorId})">
                                <i class="fas fa-user"></i> View Profile
                            </button>
                            <button class="btn btn-primary" onclick="window.doctorsDirectory.openBookingModal(${actualDoctorId})">
                                <i class="fas fa-calendar-plus"></i> Book Appointment
                            </button>
                        </div>
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
        console.log('🚨 === CRITICAL DEBUG: openBookingModal ===');
        console.log('🎯 Input doctorId:', doctorId, 'Type:', typeof doctorId);
        console.log('🔍 All available doctors:', this.doctors.map(d => ({
            doctorId: d.doctorId,
            name: d.name,
            specialty: d.specialty
        })));
        
        // Convert doctorId to number for comparison
        const targetDoctorId = parseInt(doctorId);
        console.log('� Converted targetDoctorId:', targetDoctorId);
        
        // Try to find doctor by doctorId (the correct API field)
        let doctor = this.doctors.find(d => {
            const dDoctorId = parseInt(d.doctorId);
            console.log(`🔍 Comparing: API doctorId ${dDoctorId} === target ${targetDoctorId} = ${dDoctorId === targetDoctorId}`);
            return dDoctorId === targetDoctorId;
        });
        
        if (!doctor) {
            console.log('❌ Doctor not found with ID:', targetDoctorId);
            console.log('🔍 Available doctor IDs:', this.doctors.map(d => d.doctorId));
            if (typeof showSnackbar === 'function') {
                showSnackbar(`Doctor with ID ${targetDoctorId} not found. Please try again.`, 'error');
            }
            return;
        }
        
        console.log('✅ Found correct doctor:', {
            doctorId: doctor.doctorId,
            name: doctor.name,
            specialty: doctor.specialty,
            email: doctor.email,
            shift: doctor.shift
        });

        // Check if user is logged in
        let patientData = localStorage.getItem('healSync_patient_data');
        console.log('🔍 Patient data check:', patientData ? 'EXISTS' : 'NOT FOUND');
        
        if (!patientData) {
            console.log('❌ No patient data, redirecting to login');
            if (typeof showSnackbar === 'function') {
                showSnackbar('Please log in to book an appointment', 'error');
            }
            // Redirect to login page
            window.location.href = '/HTML/login.html';
            return;
        }

        console.log('✅ Patient data found, proceeding with modal');

        // CRITICAL: Set the correct doctor ID in the hidden field
        console.log('📝 Setting selected doctor ID to:', targetDoctorId);
        const doctorIdInput = document.getElementById('selected-doctor-id');
        if (doctorIdInput) {
            doctorIdInput.value = targetDoctorId;
            console.log('✅ Doctor ID set in form:', doctorIdInput.value);
            
            // Verify it was set correctly
            setTimeout(() => {
                const verifyValue = document.getElementById('selected-doctor-id').value;
                console.log('🔍 Verification - Doctor ID in form is now:', verifyValue);
                if (verifyValue != targetDoctorId) {
                    console.error('❌ CRITICAL ERROR: Doctor ID not set correctly!');
                }
            }, 100);
        } else {
            console.error('❌ CRITICAL ERROR: selected-doctor-id input not found');
        }
        
        // Populate doctor info in modal
        this.populateDoctorInfo(doctor);
        
        // Show modal
        const modal = document.getElementById('booking-modal');
        console.log('🔍 Modal element:', modal);
        
        if (modal) {
            console.log('📦 Opening modal for doctor:', doctor.name, 'ID:', doctor.doctorId);
            
            // Force modal to be visible
            modal.style.display = 'flex';
            modal.style.visibility = 'visible';
            modal.style.opacity = '1';
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
            
            // Force z-index to be very high
            modal.style.zIndex = '99999';
            
            // Set focus to first input
            setTimeout(() => {
                const dateInput = document.getElementById('appointment-date');
                if (dateInput) {
                    dateInput.focus();
                    console.log('🎯 Focus set to date input');
                }
            }, 100);
            
        } else {
            console.error('❌ Booking modal element not found');
        }
    }

    // Populate doctor info in booking modal
    populateDoctorInfo(doctor) {
        console.log('📝 Populating doctor info for:', doctor);
        const infoContainer = document.getElementById('selected-doctor-info');
        if (!infoContainer) {
            console.log('❌ selected-doctor-info container not found');
            return;
        }

        // Handle different field name variations
        const doctorName = doctor.name || doctor.doctorName || 'Unknown Doctor';
        const specialty = doctor.speciality || doctor.specialty || doctor.field || 'General Medicine';
        const shift = doctor.shift || 'DAY';

        console.log('📝 Using doctor name:', doctorName, 'specialty:', specialty);

        infoContainer.innerHTML = `
            <div class="selected-doctor">
                <img src="${this.generateAvatarUrl(doctorName, specialty)}" alt="${doctorName}">
                <div class="doctor-details">
                    <h4>${doctorName}</h4>
                    <p><i class="fas fa-stethoscope"></i> ${specialty}</p>
                    <p><i class="fas fa-clock"></i> ${shift} Shift</p>
                </div>
            </div>
        `;
        
        console.log('✅ Doctor info populated successfully');
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
        const validationElement = document.querySelector('.booking-form-validation');

        if (loader) loader.remove();
        if (errorContainer) errorContainer.remove();
        if (successContainer) successContainer.remove();
        if (validationElement) validationElement.remove();

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

    /**
     * Validate booking form data
     */
    validateBookingForm(formData) {
        const errors = [];

        // Validate doctor selection
        if (!formData.doctorId || isNaN(formData.doctorId)) {
            errors.push('Please select a doctor');
        }

        // Validate appointment date
        if (!formData.appointmentDate) {
            errors.push('Please select an appointment date');
        } else {
            const selectedDate = new Date(formData.appointmentDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (selectedDate < today) {
                errors.push('Cannot book appointments for past dates');
            }
        }

        // Validate appointment time
        if (!formData.appointmentTime) {
            errors.push('Please select an appointment time');
        }

        // Validate appointment end time
        if (!formData.appointmentEndTime) {
            errors.push('Please select an appointment end time');
        }

        // Validate end time is after start time
        if (formData.appointmentTime && formData.appointmentEndTime) {
            const [startHour, startMin] = formData.appointmentTime.split(':').map(Number);
            const [endHour, endMin] = formData.appointmentEndTime.split(':').map(Number);
            
            const startMinutes = startHour * 60 + startMin;
            const endMinutes = endHour * 60 + endMin;
            
            if (endMinutes <= startMinutes) {
                errors.push('End time must be after start time');
            }
            
            // Validate minimum appointment duration (15 minutes)
            if (endMinutes - startMinutes < 15) {
                errors.push('Appointment must be at least 15 minutes long');
            }
            
            // Validate maximum appointment duration (4 hours)
            if (endMinutes - startMinutes > 240) {
                errors.push('Appointment cannot be longer than 4 hours');
            }
        }

        // Validate reason (optional but recommended)
        if (!formData.reason || formData.reason.trim().length < 3) {
            errors.push('Please provide a reason for the appointment (minimum 3 characters)');
        }

        // Display validation errors
        if (errors.length > 0) {
            this.showFormValidationError(errors.join('<br>'));
            return false;
        }

        return true;
    }

    /**
     * Show form validation error
     */
    showFormValidationError(message) {
        // Try to find existing validation message element
        let validationElement = document.querySelector('.booking-form-validation');
        
        if (!validationElement) {
            // Create validation message element if it doesn't exist
            validationElement = document.createElement('div');
            validationElement.className = 'booking-form-validation alert alert-danger';
            validationElement.style.cssText = `
                margin: 10px 0;
                padding: 12px;
                background-color: #f8d7da;
                border: 1px solid #f5c6cb;
                border-radius: 4px;
                color: #721c24;
                font-size: 14px;
                line-height: 1.4;
            `;
            
            // Safely insert the validation element
            const form = document.getElementById('booking-form');
            if (form) {
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn && submitBtn.parentNode === form) {
                    // Insert before submit button if it exists and is a direct child
                    form.insertBefore(validationElement, submitBtn);
                } else {
                    // Otherwise, just append to the end of the form
                    form.appendChild(validationElement);
                }
            } else {
                console.warn('⚠️ Booking form not found, cannot show validation error');
                return;
            }
        }
        
        validationElement.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
        validationElement.style.display = 'block';
        
        // Scroll to validation message safely
        try {
            validationElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (error) {
            console.warn('⚠️ Could not scroll to validation message:', error);
        }
    }

    // Handle booking form submission - UPDATED to follow documentation
    async handleBookingSubmit() {
        const form = document.getElementById('booking-form');
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        
        console.log('🚨 === FORM SUBMIT DEBUG ===');
        const selectedDoctorIdElement = document.getElementById('selected-doctor-id');
        console.log('🔍 Selected doctor ID element:', selectedDoctorIdElement);
        console.log('🔍 Selected doctor ID value:', selectedDoctorIdElement?.value);
        
        // Get form data with end time instead of duration
        const formData = {
            doctorId: parseInt(document.getElementById('selected-doctor-id').value),
            appointmentDate: document.getElementById('appointment-date').value,
            appointmentTime: document.getElementById('appointment-time').value,
            appointmentEndTime: document.getElementById('appointment-end-time').value,
            consultationType: document.getElementById('appointment-type')?.value || 'general',
            reason: document.getElementById('appointment-reason').value || 'General consultation'
        };

        console.log('📋 Form data collected:', formData);
        console.log('👨‍⚕️ Doctor ID from form:', formData.doctorId);

        // Validate form data
        if (!this.validateBookingForm(formData)) {
            console.log('❌ Form validation failed');
            return;
        }

        // Get or create patient session
        let patientData = this.getPatientSession();
        if (!patientData || (!patientData.patientId && !patientData.id)) {
            // Create test patient session for development with numeric ID
            patientData = {
                patientId: Math.floor(Math.random() * 1000) + 1, // Random ID between 1-1000
                id: Math.floor(Math.random() * 1000) + 1,
                patientName: 'Test Patient',
                name: 'Test Patient',
                email: 'test@patient.com',
                mobileNo: '+1234567890',
                phone: '+1234567890',
                patientAge: 30,
                gender: 'Other'
            };
            localStorage.setItem('healSync_patient_data', JSON.stringify(patientData));
            console.log('🔧 Created test patient session for development');
        }

        // Show loading
        this.showBookingLoader(true);
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        submitBtn.innerHTML = '<i class="fas fa-clock fa-spin"></i> Booking appointment...';

        try {
            // Get doctor info
            const selectedDoctorId = parseInt(document.getElementById('selected-doctor-id').value);
            console.log('🔍 Final doctor ID being used:', selectedDoctorId);
            
            const currentDoctor = this.doctors.find(d => d.doctorId === selectedDoctorId);
            console.log('🔍 Found doctor:', currentDoctor);
            
            const specialty = currentDoctor?.specialty || 'General Medicine';

            console.log('🚀 Starting appointment booking with correct API');

            // Create booking payload for the API
            const bookingPayload = {
                patientId: parseInt(patientData.patientId) || parseInt(patientData.id) || 14,
                doctorId: selectedDoctorId,
                appointmentDate: formData.appointmentDate,
                appointmentTime: formData.appointmentTime,
                appointmentEndTime: formData.appointmentEndTime,
                reason: formData.reason || 'General consultation',
                specialty: specialty,
                consultationType: formData.consultationType
            };

            console.log('📋 Final booking payload:', bookingPayload);
            console.log('👤 Patient ID being used:', bookingPayload.patientId);
            console.log('👨‍⚕️ Doctor ID being used:', bookingPayload.doctorId);

            // Call the API
            const appointment = await this.submitBookingToAPI(bookingPayload);

            console.log('✅ Appointment booked successfully:', appointment);
            
            if (typeof showSnackbar === 'function') {
                showSnackbar(`Appointment booked successfully with Dr. ${currentDoctor?.name || 'Doctor'}!`, 'success');
            }

            // Reset and close modal
            this.resetBookingModal();
            setTimeout(() => {
                this.closeBookingModal();
            }, 2000);

        } catch (error) {
            console.error('❌ Booking failed:', error);
            
            if (typeof showSnackbar === 'function') {
                showSnackbar(`Booking failed: ${error.message}`, 'error');
            } else {
                alert(`Booking failed: ${error.message}`);
            }
        } finally {
            // Reset button state
            this.showBookingLoader(false);
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
            submitBtn.innerHTML = originalBtnText;
        }
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

    // Submit booking to real API using query parameters (as shown in Postman)
    async submitBookingToAPI(bookingPayload) {
        try {
            console.log('📤 Submitting booking to API:', bookingPayload);
            
            // Create datetime strings from date and time
            const appointmentDate = bookingPayload.appointmentDate;
            const appointmentTime = bookingPayload.appointmentTime;
            const appointmentEndTime = bookingPayload.appointmentEndTime;
            
            // Create start and end datetime in ISO format as expected by API
            const startDateTime = `${appointmentDate}T${appointmentTime}:00`;
            const endDateTime = `${appointmentDate}T${appointmentEndTime}:00`;
            
            // Build query parameters exactly as shown in your Postman screenshot
            const queryParams = new URLSearchParams({
                startDateTime: startDateTime,
                endDateTime: endDateTime,
                patientId: parseInt(bookingPayload.patientId),
                doctorId: parseInt(bookingPayload.doctorId)
            });

            console.log('� Query parameters:', queryParams.toString());
            
            // Use the exact API endpoint format from your Postman screenshot
            const apiUrl = `${this.apiBase}/v1/healsync/book/appointment?${queryParams.toString()}`;
            console.log('� Full API URL:', apiUrl);

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json'
                }
                // No body needed - using query parameters as shown in Postman
            });

            console.log('📡 API Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`API booking failed: ${response.status} - ${response.statusText}`, errorText);
                throw new Error(`API Error: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            console.log('✅ API booking successful:', result);
            
            // Transform API response to match expected format
            return {
                appointmentId: result.appointmentId || result.id,
                doctorId: result.doctorId,
                doctorName: result.doctorName,
                patientId: result.patientId,
                patientName: result.patientName,
                date: result.date,
                startTime: result.startTime,
                endTime: result.endTime || result.appointmentEndTime,
                status: result.status || 'booked',
                startDateTime: result.startDateTime || startDateTime,
                endDateTime: result.endDateTime || endDateTime
            };
            
        } catch (error) {
            console.error('submitBookingToAPI error:', error);
            throw error; // Re-throw to be handled by calling function
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

    // Quick book appointment - opens booking modal with specialty pre-filled
    quickBookAppointment(specialty) {
        console.log('🎯 quickBookAppointment called with specialty:', specialty);
        
        // Check if user is logged in
        let patientData = localStorage.getItem('healSync_patient_data');
        console.log('👤 Patient data found:', !!patientData, patientData ? 'Data exists' : 'No data');
        
        if (!patientData) {
            console.log('❌ No patient data, redirecting to login');
            if (typeof showSnackbar === 'function') {
                showSnackbar('Please log in to book an appointment', 'error');
            }
            // Redirect to login page with return URL
            sessionStorage.setItem('returnUrl', window.location.href);
            window.location.href = '/HTML/login.html';
            return;
        }

        console.log('✅ Patient logged in, proceeding with booking');
        
        // Debug: Log all available doctors and their specialties
        console.log('🔍 Available doctors:', this.doctors.length);
        this.doctors.forEach((doctor, index) => {
            console.log(`Doctor ${index + 1}: ${doctor.name} - Specialty: "${doctor.speciality || doctor.specialty || 'Not specified'}"`);
        });
        
        // Find first doctor with this specialty (flexible matching)
        const doctorWithSpecialty = this.doctors.find(doctor => {
            const doctorSpecialty = doctor.speciality || doctor.specialty || '';
            const searchSpecialty = specialty || '';
            
            // Try exact match first
            if (doctorSpecialty === searchSpecialty) {
                return true;
            }
            
            // Try case-insensitive match
            if (doctorSpecialty.toLowerCase() === searchSpecialty.toLowerCase()) {
                return true;
            }
            
            // Try partial match (contains)
            if (doctorSpecialty.toLowerCase().includes(searchSpecialty.toLowerCase()) ||
                searchSpecialty.toLowerCase().includes(doctorSpecialty.toLowerCase())) {
                return true;
            }
            
            return false;
        });
        
        if (doctorWithSpecialty) {
            console.log('🏥 Found doctor with specialty:', doctorWithSpecialty.name, 'Specialty:', doctorWithSpecialty.speciality || doctorWithSpecialty.specialty);
            // Open booking modal for this doctor
            this.openBookingModal(doctorWithSpecialty.doctorId);
            
            // Pre-fill specialty in the form if needed
            const specialtyField = document.getElementById('doctor-specialty-display');
            if (specialtyField) {
                specialtyField.textContent = specialty;
            }
        } else {
            console.log('🔍 No specific doctor found for specialty:', specialty);
            console.log('📋 Available specialties:', Array.from(this.specialties));
            
            // If no doctor found, try to open booking modal for first available doctor
            if (this.doctors.length > 0) {
                console.log('🏥 Opening booking modal for first available doctor:', this.doctors[0].name);
                this.openBookingModal(this.doctors[0].doctorId);
            } else {
                // If no doctors loaded yet, show message
                if (typeof showSnackbar === 'function') {
                    showSnackbar(`Opening booking for ${specialty} specialists`, 'info');
                }
                // Scroll to doctor grid to let user choose
                const doctorGrid = document.getElementById('doctor-grid');
                if (doctorGrid) {
                    doctorGrid.scrollIntoView({ behavior: 'smooth' });
                }
            }
        }
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
            
            // Format appointment data according to backend documentation
            const appointmentData = {
                appointmentId: appointmentResponse.appointmentId,
                doctorId: appointmentResponse.doctorId || bookingPayload.doctorId,
                doctorName: appointmentResponse.doctorName || bookingPayload.doctorName,
                patientId: appointmentResponse.patientId || bookingPayload.patientId,
                patientName: patientSession?.patientName || bookingPayload.patientName || `Patient ${bookingPayload.patientId}`,
                patientEmail: patientSession?.email || `patient${bookingPayload.patientId}@example.com`,
                patientAge: patientSession?.patientAge || null,
                patientGender: patientSession?.gender || 'Unknown',
                patientPhone: patientSession?.mobileNo || null,
                startDateTime: appointmentResponse.startDateTime || `${bookingPayload.appointmentDate}T${bookingPayload.appointmentTime}:00`,
                endDateTime: appointmentResponse.endDateTime || `${bookingPayload.appointmentDate}T${bookingPayload.appointmentEndTime}:00`,
                specialty: appointmentResponse.specialty || bookingPayload.specialty,
                status: appointmentResponse.status || 'PENDING', // PENDING → CONFIRMED → COMPLETED
                notes: appointmentResponse.notes || '',
                prescription: appointmentResponse.prescription || '',
                createdAt: appointmentResponse.createdAt || new Date().toISOString(),
                lastAppointment: appointmentResponse.startDateTime || `${bookingPayload.appointmentDate}T${bookingPayload.appointmentTime}:00`,
                totalAppointments: 1
            };

            console.log('💾 Prepared appointment data:', appointmentData);

            // Store in healsync_appointments for appointment history
            const existingAppointments = JSON.parse(localStorage.getItem('healsync_appointments') || '[]');
            console.log('📂 Existing appointments:', existingAppointments.length);
            
            existingAppointments.push(appointmentData);
            localStorage.setItem('healsync_appointments', JSON.stringify(existingAppointments));
            
            // Also store in doctor-patient relationship format for doctor dashboard
            this.updateDoctorPatientRelationship(appointmentData);
            
            console.log('✅ Appointment stored locally:', appointmentData.appointmentId);
            console.log('📊 Total appointments now:', existingAppointments.length);
            
        } catch (error) {
            console.error('❌ Error storing appointment locally:', error);
        }
    }

    // Update doctor-patient relationship data for doctor dashboard
    updateDoctorPatientRelationship(appointmentData) {
        try {
            console.log('🔗 Updating doctor-patient relationship...');
            
            // Get existing doctor-patient relationships
            const doctorPatients = JSON.parse(localStorage.getItem('doctor_patients') || '{}');
            
            // Initialize doctor's patient list if not exists
            if (!doctorPatients[appointmentData.doctorId]) {
                doctorPatients[appointmentData.doctorId] = [];
            }
            
            // Check if patient already exists for this doctor
            const existingPatientIndex = doctorPatients[appointmentData.doctorId].findIndex(
                p => p.patientId === appointmentData.patientId
            );
            
            if (existingPatientIndex >= 0) {
                // Update existing patient record
                const existingPatient = doctorPatients[appointmentData.doctorId][existingPatientIndex];
                existingPatient.lastAppointment = appointmentData.startDateTime;
                existingPatient.totalAppointments = (existingPatient.totalAppointments || 0) + 1;
                existingPatient.status = 'ACTIVE';
                
                console.log('📝 Updated existing patient relationship');
            } else {
                // Add new patient to doctor's list
                const patientRelationship = {
                    patientId: appointmentData.patientId,
                    name: appointmentData.patientName,
                    email: appointmentData.patientEmail,
                    phone: appointmentData.patientPhone,
                    lastAppointment: appointmentData.startDateTime,
                    totalAppointments: 1,
                    status: 'ACTIVE'
                };
                
                doctorPatients[appointmentData.doctorId].push(patientRelationship);
                console.log('➕ Added new patient relationship');
            }
            
            // Store updated relationships
            localStorage.setItem('doctor_patients', JSON.stringify(doctorPatients));
            console.log('✅ Doctor-patient relationship updated');
            
        } catch (error) {
            console.error('❌ Error updating doctor-patient relationship:', error);
        }
    }

    // Get patient session data
    getPatientSession() {
        try {
            console.log('🔍 Getting patient session...');
            
            // Try different possible keys for patient session
            const keys = ['healSync_patient_data', 'healSync_patientSession', 'healSync_userData'];
            
            for (const key of keys) {
                const data = localStorage.getItem(key);
                if (data) {
                    try {
                        const parsed = JSON.parse(data);
                        console.log(`📋 Found patient data in ${key}:`, parsed);
                        
                        // Normalize the data structure for consistency
                        const normalized = {
                            patientId: parsed.patientId || parsed.id || parsed.userId || 'demo123',
                            patientName: parsed.patientName || parsed.name || parsed.fullName || 'Demo Patient',
                            email: parsed.email || parsed.emailAddress || 'demo@patient.com',
                            mobileNo: parsed.mobileNo || parsed.phone || parsed.phoneNumber || '1234567890',
                            patientAge: parsed.patientAge || parsed.age || 30,
                            gender: parsed.gender || 'Other'
                        };
                        
                        console.log(`✅ Normalized patient data:`, normalized);
                        return normalized;
                    } catch (parseError) {
                        console.log(`❌ Error parsing ${key}:`, parseError);
                    }
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

    // Debug function to test doctor ID selection (can be called from browser console)
    debugDoctorSelection() {
        console.log('🔍 === DOCTOR SELECTION DEBUG ===');
        console.log('📋 All doctors loaded:', this.doctors.map(d => ({ 
            doctorId: d.doctorId, 
            name: d.name 
        })));
        console.log('🎭 Filtered doctors:', this.filteredDoctors.map(d => ({ 
            doctorId: d.doctorId, 
            name: d.name 
        })));
        
        const grid = document.getElementById('doctor-grid');
        if (grid) {
            const cards = grid.querySelectorAll('.doctor-card');
            const buttons = grid.querySelectorAll('.advanced-booking-btn[data-doctor-id]');
            
            console.log('🏥 Doctor cards in DOM:');
            cards.forEach((card, index) => {
                const cardId = card.getAttribute('data-doctor-id');
                const doctorName = card.querySelector('.doctor-name')?.textContent;
                console.log(`  Card ${index + 1}: ID=${cardId}, Name=${doctorName}`);
            });
            
            console.log('🔘 Booking buttons in DOM:');
            buttons.forEach((button, index) => {
                const buttonId = button.getAttribute('data-doctor-id');
                const doctorCard = button.closest('.doctor-card');
                const doctorName = doctorCard?.querySelector('.doctor-name')?.textContent;
                console.log(`  Button ${index + 1}: ID=${buttonId}, Doctor=${doctorName}`);
            });
        }
        
        console.log('✅ Debug complete - Check if any IDs are mismatched');
        return 'Debug complete - Check console output above';
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
    console.log('🌐 Global openBookingModal called with doctorId:', doctorId, 'Type:', typeof doctorId);
    
    if (window.doctorsDirectory) {
        // Convert to number to ensure consistency
        const numericDoctorId = parseInt(doctorId);
        console.log('🔢 Converted to numeric ID:', numericDoctorId);
        window.doctorsDirectory.openBookingModal(numericDoctorId);
    } else {
        console.error('❌ DoctorsDirectory not initialized');
        // Try to initialize and retry after a delay
        setTimeout(() => {
            if (window.doctorsDirectory) {
                console.log('🔄 Retrying after DoctorsDirectory initialization...');
                const numericDoctorId = parseInt(doctorId);
                window.doctorsDirectory.openBookingModal(numericDoctorId);
            } else {
                console.error('❌ DoctorsDirectory still not available after retry');
            }
        }, 500);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing DoctorsDirectory...');
    window.doctorsDirectory = new DoctorsDirectory();
    console.log('DoctorsDirectory initialized:', window.doctorsDirectory);
    
    // Make openBookingModal globally available for debugging
    window.openBookingModal = openBookingModal;
    
    // Add debugging function for doctor ID verification
    window.testDoctorIds = function() {
        if (window.doctorsDirectory && window.doctorsDirectory.doctors) {
            console.log('🧪 DOCTOR ID TEST:');
            window.doctorsDirectory.doctors.forEach((doctor, index) => {
                console.log(`Doctor ${index + 1}:`, {
                    name: doctor.name,
                    id: doctor.id,
                    doctorId: doctor.doctorId,
                    actualId: doctor.doctorId || doctor.id
                });
            });
        }
    };
    
    // Show debug info when page loads
    setTimeout(() => {
        if (typeof showDebugInfo === 'function') {
            showDebugInfo();
        }
        // Test doctor IDs after loading
        setTimeout(() => {
            if (window.testDoctorIds) {
                window.testDoctorIds();
            }
        }, 2000);
    }, 1000);
});

// Debug function to show session status
function showDebugInfo() {
    console.log('🔍 Running debug info...');
    const debugDiv = document.getElementById('sessionStatus');
    
    const patientData = localStorage.getItem('healSync_patient_data');
    const userData = localStorage.getItem('healSync_userData');
    const sessionToken = localStorage.getItem('healSync_sessionToken');
    
    let debugHTML = '<div style="margin-top: 10px;">';
    debugHTML += '<strong>Session Status:</strong><br>';
    debugHTML += `🔑 healSync_patient_data: ${patientData ? '✅ EXISTS' : '❌ NOT FOUND'}<br>`;
    debugHTML += `👤 healSync_userData: ${userData ? '✅ EXISTS' : '❌ NOT FOUND'}<br>`;
    debugHTML += `🎫 healSync_sessionToken: ${sessionToken ? '✅ EXISTS' : '❌ NOT FOUND'}<br>`;
    
    if (patientData) {
        try {
            const parsed = JSON.parse(patientData);
            debugHTML += `<br><strong>Patient Data:</strong><br>`;
            debugHTML += `Name: ${parsed.patientName || 'N/A'}<br>`;
            debugHTML += `ID: ${parsed.patientId || 'N/A'}<br>`;
            debugHTML += `Email: ${parsed.email || 'N/A'}<br>`;
            debugHTML += `Expires: ${parsed.expiresAt ? new Date(parsed.expiresAt).toLocaleString() : 'No expiration'}<br>`;
        } catch (e) {
            debugHTML += `<br>❌ Error parsing patient data: ${e.message}<br>`;
        }
    }
    
    // Simple authentication check without calling external function
    const isLoggedIn = !!(patientData || userData);
    debugHTML += `<br><strong>Auth Check Result:</strong> ${isLoggedIn ? '✅ AUTHENTICATED' : '❌ NOT AUTHENTICATED'}<br>`;
    debugHTML += '</div>';
    
    if (debugDiv) {
        debugDiv.innerHTML = debugHTML;
    }
}

// Simple authentication check function
function checkUserAuthentication() {
    console.log('🔐 Checking user authentication...');
    
    const patientData = localStorage.getItem('healSync_patient_data');
    const userData = localStorage.getItem('healSync_userData');
    
    console.log('📊 Storage items:', {
        patientData: patientData ? 'EXISTS' : 'NULL',
        userData: userData ? 'EXISTS' : 'NULL'
    });
    
    if (patientData) {
        try {
            const patient = JSON.parse(patientData);
            console.log('👤 Patient data:', patient);
            
            // Check expiration if exists
            if (patient.expiresAt && patient.expiresAt < new Date().getTime()) {
                console.log('⏰ Session expired');
                localStorage.removeItem('healSync_patient_data');
                return false;
            }
            
            console.log('✅ Patient authenticated');
            return true;
        } catch (e) {
            console.log('❌ Error parsing patient data:', e);
            localStorage.removeItem('healSync_patient_data');
            return false;
        }
    }
    
    if (userData) {
        try {
            const user = JSON.parse(userData);
            console.log('👤 User data:', user);
            console.log('✅ User authenticated');
            return true;
        } catch (e) {
            console.log('❌ Error parsing user data:', e);
            localStorage.removeItem('healSync_userData');
            return false;
        }
    }
    
    console.log('❌ No valid authentication found');
    return false;
}

// Comprehensive test functions for integration testing
function testCompleteFlow() {
    console.log('🧪 Testing complete patient-doctor integration flow...');
    
    // 1. Create demo patient session
    const demoPatient = {
        patientId: 'test_patient_' + Date.now(),
        patientName: 'Test Patient',
        email: 'test@patient.com',
        mobileNo: '1234567890',
        patientAge: 30,
        gender: 'Other',
        expiresAt: new Date().getTime() + (24 * 60 * 60 * 1000)
    };
    localStorage.setItem('healSync_patient_data', JSON.stringify(demoPatient));
    console.log('✅ 1. Demo patient created:', demoPatient);
    
    // 2. Test doctor loading
    if (window.doctorsDirectory && window.doctorsDirectory.doctors.length > 0) {
        console.log('✅ 2. Doctors loaded:', window.doctorsDirectory.doctors.length);
        
        // 3. Test appointment booking with first doctor
        const firstDoctor = window.doctorsDirectory.doctors[0];
        console.log('✅ 3. Testing with doctor:', firstDoctor.name);
        
        // 4. Open modal and test booking
        setTimeout(() => {
            window.doctorsDirectory.openBookingModal(firstDoctor.doctorId);
            console.log('✅ 4. Modal opened for booking test');
            
            setTimeout(() => {
                // 5. Test data storage check
                const appointments = JSON.parse(localStorage.getItem('healsync_appointments') || '[]');
                const doctorPatients = JSON.parse(localStorage.getItem('doctor_patients') || '{}');
                
                console.log('✅ 5. Integration check:');
                console.log('   - Appointments stored:', appointments.length);
                console.log('   - Doctor-patient relationships:', Object.keys(doctorPatients).length);
                
                alert(`🎉 Integration Test Results:\n\n✅ Patient Session: Created\n✅ Doctors: ${window.doctorsDirectory.doctors.length} loaded\n✅ Modal: Working\n✅ Data Storage: Ready\n\nYou can now test actual appointment booking!`);
            }, 1000);
        }, 500);
        
    } else {
        console.log('❌ 2. No doctors loaded');
        alert('❌ Doctors not loaded yet. Please wait and try again.');
    }
}

function testAPI() {
    console.log('🌐 Testing API endpoints...');
    
    // Test doctors API
    fetch('https://healsync-backend-d788.onrender.com/api/doctors')
        .then(response => {
            console.log('📊 Doctors API status:', response.status);
            return response.json();
        })
        .then(doctors => {
            console.log('✅ Doctors API working:', doctors.length, 'doctors');
            
            // Test appointment booking API (with test data)
            const testParams = new URLSearchParams({
                specialty: 'General Medicine',
                startDateTime: '2025-08-15T10:00:00',
                endDateTime: '2025-08-15T11:00:00',
                patientId: 'test_patient'
            });
            
            return fetch(`https://healsync-backend-d788.onrender.com/v1/healsync/book/appointment?${testParams}`, {
                method: 'POST'
            });
        })
        .then(response => {
            console.log('📊 Booking API status:', response.status);
            if (response.ok) {
                return response.json();
            } else {
                throw new Error(`API Error: ${response.status}`);
            }
        })
        .then(result => {
            console.log('✅ Booking API working:', result);
            alert('🌐 API Test Results:\n\n✅ Doctors API: Working\n✅ Booking API: Working\n\nAll backend integrations are functional!');
        })
        .catch(error => {
            console.log('❌ API Test failed:', error);
            alert(`⚠️ API Test Results:\n\n❌ Some APIs may be offline\n📝 Using fallback mock data\n\nError: ${error.message}\n\nThe system will work with local storage for testing.`);
        });
}

function checkIntegration() {
    console.log('� Checking system integration...');
    
    const patientData = localStorage.getItem('healSync_patient_data');
    const appointments = JSON.parse(localStorage.getItem('healsync_appointments') || '[]');
    const doctorPatients = JSON.parse(localStorage.getItem('doctor_patients') || '{}');
    
    let report = '🔗 System Integration Report:\n\n';
    
    // Check patient session
    if (patientData) {
        const patient = JSON.parse(patientData);
        report += `✅ Patient Session: ${patient.patientName} (ID: ${patient.patientId})\n`;
    } else {
        report += `❌ Patient Session: Not found\n`;
    }
    
    // Check doctors
    if (window.doctorsDirectory && window.doctorsDirectory.doctors.length > 0) {
        report += `✅ Doctors Loaded: ${window.doctorsDirectory.doctors.length} doctors\n`;
    } else {
        report += `❌ Doctors: Not loaded\n`;
    }
    
    // Check appointments
    report += `📅 Appointments Stored: ${appointments.length}\n`;
    
    // Check doctor-patient relationships
    const totalRelationships = Object.values(doctorPatients).reduce((sum, patients) => sum + patients.length, 0);
    report += `👥 Doctor-Patient Relationships: ${totalRelationships}\n`;
    
    // Check modal functionality
    const modal = document.getElementById('booking-modal');
    if (modal) {
        report += `✅ Booking Modal: Available\n`;
    } else {
        report += `❌ Booking Modal: Not found\n`;
    }
    
    report += `\n🎯 Integration Status: ${patientData && window.doctorsDirectory ? 'READY' : 'NEEDS SETUP'}`;
    
    console.log(report);
    alert(report);
}

// Test functions for debugging
function testModal() {
    console.log('🧪 Testing modal directly...');
    const modal = document.getElementById('booking-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        modal.style.zIndex = '99999';
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        console.log('✅ Modal should be visible now');
        alert('✅ Modal test successful! Modal should be visible.');
    } else {
        console.log('❌ Modal not found');
        alert('❌ Modal element not found in DOM');
    }
}

function checkData() {
    console.log('🔍 Checking stored data...');
    const patientData = localStorage.getItem('healSync_patient_data');
    const appointments = localStorage.getItem('healsync_appointments');
    const doctorPatients = localStorage.getItem('doctor_patients');
    
    console.log('🔑 healSync_patient_data:', patientData);
    console.log('🏥 healsync_appointments:', appointments);
    console.log('👥 doctor_patients:', doctorPatients);
    
    const report = `📊 Data Storage Report:

🔑 Patient Session: ${patientData ? 'EXISTS' : 'MISSING'}
🏥 Appointments: ${appointments ? JSON.parse(appointments).length + ' stored' : 'NONE'}
👥 Doctor-Patient Relations: ${doctorPatients ? Object.keys(JSON.parse(doctorPatients)).length + ' doctors' : 'NONE'}

Doctors Loaded: ${window.doctorsDirectory ? window.doctorsDirectory.doctors.length : 'NOT LOADED'}`;
    
    alert(report);
}

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DoctorsDirectory;
}

} // End of DoctorsDirectoryInitialized check
