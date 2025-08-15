/**
 * Doctor Schedule Booking System
 * Handles doctor schedule management and availability booking
 * Backend API: https://healsync-backend-d788.onrender.com
 */

class DoctorScheduleBookingSystem {
    constructor() {
        this.baseUrl = 'https://healsync-backend-d788.onrender.com';
        this.defaultSchedule = {
            monday: { start: '09:00', end: '17:00', available: true },
            tuesday: { start: '09:00', end: '17:00', available: true },
            wednesday: { start: '09:00', end: '17:00', available: true },
            thursday: { start: '09:00', end: '17:00', available: true },
            friday: { start: '09:00', end: '17:00', available: true },
            saturday: { start: '09:00', end: '13:00', available: true },
            sunday: { start: '00:00', end: '00:00', available: false }
        };
        this.init();
    }

    init() {
        console.log('🏥 Doctor Schedule Booking System initialized');
        this.bindEvents();
        this.loadDoctorSchedule();
        this.displayDoctorInfo();
    }

    /**
     * Bind events for schedule management
     */
    bindEvents() {
        // Save schedule button
        const saveScheduleBtn = document.getElementById('save-schedule-btn');
        if (saveScheduleBtn) {
            saveScheduleBtn.addEventListener('click', () => this.saveSchedule());
        }

        // Reset schedule button
        const resetScheduleBtn = document.getElementById('reset-schedule-btn');
        if (resetScheduleBtn) {
            resetScheduleBtn.addEventListener('click', () => this.resetToDefault());
        }

        // Day availability toggles
        document.querySelectorAll('.day-availability-toggle').forEach(toggle => {
            toggle.addEventListener('change', (e) => this.toggleDayAvailability(e));
        });

        // Time change listeners
        document.querySelectorAll('.schedule-time-input').forEach(input => {
            input.addEventListener('change', (e) => this.validateTimeRange(e));
        });
    }

    /**
     * Get current doctor information
     */
    getCurrentDoctor() {
        try {
            // Check multiple possible localStorage keys for doctor data
            const possibleKeys = [
                'healSync_doctor_data',     // Primary auth system
                'healSync_userData',        // Alternative auth
                'currentDoctorData',        // Dashboard system
                'doctorSession',            // Session system
            ];

            let doctorData = null;

            // Try each key in priority order
            for (const key of possibleKeys) {
                const data = localStorage.getItem(key);
                if (data) {
                    try {
                        doctorData = JSON.parse(data);
                        
                        // Skip test data
                        if (doctorData.doctorId === 'TEST_123' || doctorData.name === 'John Smith') {
                            console.log('⚠️ Skipping test doctor data');
                            continue;
                        }
                        
                        console.log(`👨‍⚕️ Found doctor data in localStorage key: ${key}`, doctorData);
                        break;
                    } catch (parseError) {
                        console.warn(`Failed to parse data from ${key}:`, parseError);
                        continue;
                    }
                }
            }

            // If no direct doctor data found, check user data with userType
            if (!doctorData) {
                const userData = localStorage.getItem('healSync_userData');
                const userType = localStorage.getItem('healSync_userType');
                
                if (userData && userType === 'doctor') {
                    try {
                        doctorData = JSON.parse(userData);
                        console.log('👨‍⚕️ Found doctor data in general userData:', doctorData);
                    } catch (parseError) {
                        console.warn('Failed to parse general userData:', parseError);
                    }
                }
            }

            // If still no data but we have doctor IDs, use the ID
            if (!doctorData) {
                const doctorId = localStorage.getItem('healSync_doctorId') || localStorage.getItem('currentDoctorId');
                if (doctorId) {
                    doctorData = { 
                        doctorId: doctorId,
                        id: doctorId,
                        name: `Doctor ${doctorId}`,
                        specialty: 'General Medicine'
                    };
                    console.log('👨‍⚕️ Created doctor data from ID:', doctorData);
                }
            }

            return doctorData;
        } catch (error) {
            console.error('Error getting current doctor:', error);
            return null;
        }
    }

    /**
     * Display doctor information in the header
     */
    displayDoctorInfo() {
        const doctor = this.getCurrentDoctor();
        const doctorNameElement = document.getElementById('doctor-name-display');
        const doctorInfoElement = document.getElementById('doctor-info-display');

        if (doctor && doctorNameElement) {
            // Try multiple possible name fields
            const doctorName = doctor.name || 
                             doctor.doctorName || 
                             doctor.firstName || 
                             doctor.fullName ||
                             doctor.username ||
                             (doctor.firstName && doctor.lastName ? `${doctor.firstName} ${doctor.lastName}` : null) ||
                             'Unknown';
            
            const specialty = doctor.specialty || 
                            doctor.speciality || 
                            doctor.department ||
                            doctor.field ||
                            'General Medicine';
            
            doctorNameElement.textContent = `Dr. ${doctorName}`;
            
            if (doctorInfoElement) {
                doctorInfoElement.textContent = `${specialty} • Schedule Management`;
            }
            
            console.log('✅ Doctor logged in:', { 
                name: doctorName, 
                specialty: specialty,
                doctorId: doctor.doctorId || doctor.id
            });
        } else {
            console.warn('⚠️ No doctor login found');
            
            if (doctorNameElement) {
                doctorNameElement.textContent = 'Dr. Guest (Please Login)';
            }
            if (doctorInfoElement) {
                doctorInfoElement.textContent = 'Schedule Management • Not Logged In';
            }
        }
    }

    /**
     * Load doctor's schedule from API with localStorage fallback
     */
    async loadDoctorSchedule() {
        const doctor = this.getCurrentDoctor();
        if (!doctor) {
            console.warn('No doctor data found');
            this.populateScheduleForm(this.defaultSchedule);
            return;
        }

        try {
            // Try to load from API first
            const apiSchedule = await this.loadScheduleFromAPI(doctor.doctorId || doctor.id);
            if (apiSchedule) {
                this.populateScheduleForm(apiSchedule);
                console.log('✅ Schedule loaded from API successfully');
                if (typeof showSnackbar === 'function') {
                    showSnackbar('📅 Schedule loaded from server', 'success', 2000);
                }
                return;
            }
        } catch (error) {
            console.log('API not available, loading from localStorage:', error.message);
        }

        // Fallback to localStorage
        const localSchedule = this.loadScheduleFromLocalStorage(doctor.doctorId || doctor.id);
        this.populateScheduleForm(localSchedule || this.defaultSchedule);
        
        if (typeof showSnackbar === 'function') {
            showSnackbar('📅 Schedule loaded from local storage', 'info', 3000);
        }
    }

    /**
     * Load schedule from API
     */
    async loadScheduleFromAPI(doctorId) {
        try {
            console.log(`📅 Loading schedule for doctor ${doctorId} from API`);
            console.log(`🔗 API URL: ${this.baseUrl}/v1/healsync/doctor/${doctorId}/schedule`);
            
            const response = await fetch(`${this.baseUrl}/v1/healsync/doctor/${doctorId}/schedule`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            console.log(`📡 API Response Status: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('✅ Schedule loaded from API:', data);
            
            // Convert API response format back to our frontend format
            if (data && Array.isArray(data)) {
                const schedule = {};
                
                // Initialize with default schedule
                Object.assign(schedule, this.defaultSchedule);
                
                // Update with API data
                data.forEach(shift => {
                    if (shift.dayOfWeek) {
                        const dayName = shift.dayOfWeek.toLowerCase();
                        schedule[dayName] = {
                            start: shift.startTime || '09:00',
                            end: shift.endTime || '17:00',
                            available: shift.isActive !== false
                        };
                    }
                });
                
                return schedule;
            }
            
            return data.schedule || data;
        } catch (error) {
            console.log('⚠️ Failed to load schedule from API:', error.message);
            return null;
        }
    }

    /**
     * Load schedule from localStorage
     */
    loadScheduleFromLocalStorage(doctorId) {
        try {
            const scheduleKey = `doctor_schedule_${doctorId}`;
            const schedule = localStorage.getItem(scheduleKey);
            return schedule ? JSON.parse(schedule) : null;
        } catch (error) {
            console.error('Error loading schedule from localStorage:', error);
            return null;
        }
    }

    /**
     * Populate the schedule form with data
     */
    populateScheduleForm(schedule) {
        console.log('📋 Populating schedule form:', schedule);

        Object.keys(schedule).forEach(day => {
            const dayData = schedule[day];
            
            // Set availability toggle
            const availabilityToggle = document.getElementById(`${day}-available`);
            if (availabilityToggle) {
                availabilityToggle.checked = dayData.available;
                this.toggleDayInputs(day, dayData.available);
            }

            // Set start time
            const startTimeInput = document.getElementById(`${day}-start`);
            if (startTimeInput && dayData.start) {
                startTimeInput.value = dayData.start;
            }

            // Set end time
            const endTimeInput = document.getElementById(`${day}-end`);
            if (endTimeInput && dayData.end) {
                endTimeInput.value = dayData.end;
            }
        });
    }

    /**
     * Toggle day availability
     */
    toggleDayAvailability(event) {
        const toggle = event.target;
        const day = toggle.dataset.day;
        const isAvailable = toggle.checked;

        console.log(`📅 Toggling ${day} availability: ${isAvailable}`);
        this.toggleDayInputs(day, isAvailable);
    }

    /**
     * Enable/disable time inputs for a day
     */
    toggleDayInputs(day, isAvailable) {
        const startInput = document.getElementById(`${day}-start`);
        const endInput = document.getElementById(`${day}-end`);

        if (startInput) {
            startInput.disabled = !isAvailable;
            if (!isAvailable) {
                startInput.value = '';
            } else if (!startInput.value) {
                startInput.value = this.defaultSchedule[day]?.start || '09:00';
            }
        }

        if (endInput) {
            endInput.disabled = !isAvailable;
            if (!isAvailable) {
                endInput.value = '';
            } else if (!endInput.value) {
                endInput.value = this.defaultSchedule[day]?.end || '17:00';
            }
        }

        // Update visual styling
        const dayRow = document.querySelector(`[data-day="${day}"]`)?.closest('.schedule-day-row');
        if (dayRow) {
            dayRow.classList.toggle('disabled', !isAvailable);
        }
    }

    /**
     * Validate time range for a day
     */
    validateTimeRange(event) {
        const input = event.target;
        const day = input.dataset.day;
        const type = input.dataset.type; // 'start' or 'end'

        const startInput = document.getElementById(`${day}-start`);
        const endInput = document.getElementById(`${day}-end`);

        if (startInput && endInput && startInput.value && endInput.value) {
            const startTime = new Date(`2024-01-01T${startInput.value}`);
            const endTime = new Date(`2024-01-01T${endInput.value}`);

            if (endTime <= startTime) {
                // Show error
                this.showValidationError(`End time must be after start time for ${day}`);
                
                // Reset to default if invalid
                if (type === 'end') {
                    endInput.value = '';
                } else {
                    startInput.value = '';
                }
                return false;
            } else {
                this.hideValidationError();
            }
        }

        return true;
    }

    /**
     * Collect schedule data from form
     */
    collectScheduleData() {
        const schedule = {};
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

        days.forEach(day => {
            const availabilityToggle = document.getElementById(`${day}-available`);
            const startInput = document.getElementById(`${day}-start`);
            const endInput = document.getElementById(`${day}-end`);

            const isAvailable = availabilityToggle ? availabilityToggle.checked : false;

            schedule[day] = {
                available: isAvailable,
                start: isAvailable && startInput ? startInput.value : '00:00',
                end: isAvailable && endInput ? endInput.value : '00:00'
            };
        });

        return schedule;
    }

    /**
     * Validate complete schedule
     */
    validateSchedule(schedule) {
        const errors = [];

        // Check if at least one day is available
        const hasAvailableDay = Object.values(schedule).some(day => day.available);
        if (!hasAvailableDay) {
            errors.push('At least one day must be available for appointments');
        }

        // Validate time ranges for available days
        Object.keys(schedule).forEach(dayName => {
            const day = schedule[dayName];
            if (day.available) {
                if (!day.start || !day.end) {
                    errors.push(`${dayName}: Start and end times are required for available days`);
                } else {
                    const startTime = new Date(`2024-01-01T${day.start}`);
                    const endTime = new Date(`2024-01-01T${day.end}`);
                    
                    if (endTime <= startTime) {
                        errors.push(`${dayName}: End time must be after start time`);
                    }
                }
            }
        });

        return errors;
    }

    /**
     * Save schedule to API and localStorage
     */
    async saveSchedule() {
        console.log('💾 Saving doctor schedule...');

        const doctor = this.getCurrentDoctor();
        if (!doctor) {
            this.showValidationError('No doctor information found. Please log in again.');
            return;
        }

        // Collect and validate schedule data
        const schedule = this.collectScheduleData();
        const validationErrors = this.validateSchedule(schedule);

        if (validationErrors.length > 0) {
            this.showValidationError(validationErrors.join('<br>'));
            return;
        }

        // Show loading state
        this.showSaveLoader(true);

        try {
            // Try to save to API first
            let apiSuccess = false;
            try {
                await this.saveScheduleToAPI(doctor.doctorId || doctor.id, schedule);
                apiSuccess = true;
                console.log('✅ Schedule saved to API successfully');
            } catch (apiError) {
                console.log('⚠️ API save failed, saving locally:', apiError.message);
            }

            // Always save to localStorage as backup
            this.saveScheduleToLocalStorage(doctor.doctorId || doctor.id, schedule);

            // Show success message
            const message = apiSuccess 
                ? '✅ Schedule saved to server successfully!' 
                : '✅ Schedule saved locally (API temporarily unavailable)';
            
            if (typeof showSnackbar === 'function') {
                showSnackbar(message, apiSuccess ? 'success' : 'warning');
            } else {
                alert(message);
            }

            this.hideValidationError();

        } catch (error) {
            console.error('❌ Failed to save schedule:', error);
            
            const errorMessage = 'Failed to save schedule. Please try again.';
            if (typeof showSnackbar === 'function') {
                showSnackbar(errorMessage, 'error');
            } else {
                alert(errorMessage);
            }
        } finally {
            this.showSaveLoader(false);
        }
    }

    /**
     * Save schedule to API
     */
    async saveScheduleToAPI(doctorId, schedule) {
        // Convert schedule format to match backend expectations
        const shifts = [];
        
        for (const [day, dayData] of Object.entries(schedule)) {
            if (dayData.available) {
                shifts.push({
                    dayOfWeek: day.toUpperCase(),
                    shiftType: "DAY",
                    startTime: dayData.start,
                    endTime: dayData.end,
                    isActive: true
                });
            }
        }

        const requestBody = {
            shifts: shifts
        };

        console.log('📤 Saving schedule to API:', requestBody);
        console.log(`🔗 API URL: ${this.baseUrl}/v1/healsync/doctor/${doctorId}/schedule`);

        const response = await fetch(`${this.baseUrl}/v1/healsync/doctor/${doctorId}/schedule`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        console.log(`📡 API Save Response Status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ Schedule saved to API:', result);
        return result;
    }

    /**
     * Save schedule to localStorage
     */
    saveScheduleToLocalStorage(doctorId, schedule) {
        try {
            const scheduleKey = `doctor_schedule_${doctorId}`;
            const scheduleData = {
                schedule: schedule,
                doctorId: doctorId,
                updatedAt: new Date().toISOString()
            };

            localStorage.setItem(scheduleKey, JSON.stringify(scheduleData));
            console.log('💾 Schedule saved to localStorage');
        } catch (error) {
            console.error('Error saving schedule to localStorage:', error);
            throw error;
        }
    }

    /**
     * Reset schedule to default
     */
    resetToDefault() {
        if (confirm('Are you sure you want to reset your schedule to default settings?')) {
            console.log('🔄 Resetting schedule to default');
            this.populateScheduleForm(this.defaultSchedule);
            this.hideValidationError();
        }
    }

    /**
     * Show validation error
     */
    showValidationError(message) {
        const errorDiv = document.getElementById('schedule-validation-error');
        if (errorDiv) {
            errorDiv.innerHTML = message;
            errorDiv.style.display = 'block';
            errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    /**
     * Hide validation error
     */
    hideValidationError() {
        const errorDiv = document.getElementById('schedule-validation-error');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    /**
     * Show/hide save loading state
     */
    showSaveLoader(show) {
        const saveBtn = document.getElementById('save-schedule-btn');
        const loader = document.getElementById('schedule-save-loader');

        if (saveBtn) {
            saveBtn.disabled = show;
            saveBtn.textContent = show ? 'Saving...' : 'Save Schedule';
        }

        if (loader) {
            loader.style.display = show ? 'block' : 'none';
        }
    }

    /**
     * Get doctor's available slots for a specific date
     */
    async getAvailableSlots(doctorId, date) {
        try {
            console.log(`📅 Getting available slots for doctor ${doctorId} on ${date}`);

            // Get doctor's schedule
            const schedule = await this.loadScheduleFromAPI(doctorId) || 
                            this.loadScheduleFromLocalStorage(doctorId) || 
                            this.defaultSchedule;

            // Get day of week
            const dayName = new Date(date).toLocaleLowerCase(undefined, { weekday: 'long' });
            const daySchedule = schedule[dayName];

            if (!daySchedule || !daySchedule.available) {
                console.log(`Doctor not available on ${dayName}`);
                return [];
            }

            // Generate time slots (30-minute intervals)
            const slots = this.generateTimeSlots(daySchedule.start, daySchedule.end, 30);

            // Filter out booked slots
            const availableSlots = await this.filterBookedSlots(doctorId, date, slots);

            console.log(`✅ Available slots for ${date}:`, availableSlots);
            return availableSlots;

        } catch (error) {
            console.error('Error getting available slots:', error);
            return [];
        }
    }

    /**
     * Generate time slots within a range
     */
    generateTimeSlots(startTime, endTime, intervalMinutes) {
        const slots = [];
        const start = new Date(`2024-01-01T${startTime}`);
        const end = new Date(`2024-01-01T${endTime}`);

        let current = new Date(start);
        while (current < end) {
            slots.push(current.toTimeString().slice(0, 5));
            current.setMinutes(current.getMinutes() + intervalMinutes);
        }

        return slots;
    }

    /**
     * Filter out already booked slots
     */
    async filterBookedSlots(doctorId, date, slots) {
        try {
            // Get booked appointments for the date
            const bookedSlots = await this.getBookedSlots(doctorId, date);
            
            // Filter out booked times
            return slots.filter(slot => !bookedSlots.includes(slot));
        } catch (error) {
            console.error('Error filtering booked slots:', error);
            return slots; // Return all slots if can't check bookings
        }
    }

    /**
     * Get booked appointment slots for a doctor on a specific date
     */
    async getBookedSlots(doctorId, date) {
        try {
            // Check localStorage for appointments
            const appointments = JSON.parse(localStorage.getItem('healsync_appointments') || '[]');
            
            const bookedSlots = appointments
                .filter(apt => 
                    apt.doctorId === doctorId && 
                    apt.appointmentDate === date &&
                    apt.status !== 'cancelled'
                )
                .map(apt => apt.appointmentTime);

            console.log(`📅 Booked slots for ${date}:`, bookedSlots);
            return bookedSlots;
        } catch (error) {
            console.error('Error getting booked slots:', error);
            return [];
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('doctor') && 
        (window.location.pathname.includes('schedule') || window.location.pathname.includes('dashboard'))) {
        window.doctorScheduleSystem = new DoctorScheduleBookingSystem();
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DoctorScheduleBookingSystem;
}
