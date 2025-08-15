// Available Slots Checker - Following Documentation
// Implements slot availability check before booking

class AvailableSlotChecker {
    constructor() {
        this.apiBase = 'https://healsync-backend-d788.onrender.com';
    }

    // Check available slots for booking modal
    async checkSlotsForBookingModal(specialty, date) {
        try {
            console.log('🔍 Checking available slots for booking modal');
            
            const params = new URLSearchParams({
                specialty: specialty,
                date: date,
                durationMinutes: 60
            });

            const response = await fetch(`${this.apiBase}/v1/healsync/book/available-slots?${params}`);
            
            if (response.ok) {
                const slots = await response.json();
                console.log('✅ Available slots from API:', slots);
                
                // Validate the response
                if (Array.isArray(slots)) {
                    this.displaySlotsInBookingModal(slots);
                    return slots;
                } else {
                    console.warn('⚠️ Invalid slots response format:', slots);
                    this.showDefaultTimeSlots();
                    return [];
                }
            } else {
                console.log('⚠️ API slots unavailable (HTTP', response.status, '), showing default time options');
                this.showDefaultTimeSlots();
                return [];
            }
        } catch (error) {
            console.log('⚠️ Slots API error, showing default time options');
            this.showDefaultTimeSlots();
            return [];
        }
    }

    // Display available slots in the booking modal
    displaySlotsInBookingModal(slots) {
        const timeSelect = document.getElementById('appointment-time');
        if (!timeSelect) return;

        // Clear existing options
        timeSelect.innerHTML = '<option value="">Select available time</option>';

        // Ensure slots is an array
        if (!Array.isArray(slots) || slots.length === 0) {
            timeSelect.innerHTML += '<option value="" disabled>No slots available for this date</option>';
            return;
        }

        // Add available slots with error handling
        slots.forEach(slot => {
            try {
                if (slot && slot.startTime) {
                    const option = document.createElement('option');
                    option.value = slot.startTime;
                    option.textContent = `${slot.startTime} - ${slot.endTime || 'N/A'} (${slot.doctorName || 'Doctor'})`;
                    if (slot.doctorId) option.dataset.doctorId = slot.doctorId;
                    if (slot.endTime) option.dataset.endTime = slot.endTime;
                    timeSelect.appendChild(option);
                }
            } catch (error) {
                console.warn('⚠️ Error processing slot:', slot, error);
            }
        });

        // Add change listener to update doctor selection
        timeSelect.addEventListener('change', (e) => {
            const selectedOptions = e.target.selectedOptions;
            if (selectedOptions && selectedOptions.length > 0) {
                const selectedOption = selectedOptions[0];
                if (selectedOption && selectedOption.dataset.doctorId) {
                    const doctorIdField = document.getElementById('selected-doctor-id');
                    if (doctorIdField) {
                        doctorIdField.value = selectedOption.dataset.doctorId;
                    }
                }
            }
        });
    }

    // Show default time slots when API is unavailable
    showDefaultTimeSlots() {
        const timeSelect = document.getElementById('appointment-time');
        if (!timeSelect) return;

        timeSelect.innerHTML = `
            <option value="">Select time</option>
            <option value="09:00">09:00 AM - 10:00 AM</option>
            <option value="10:00">10:00 AM - 11:00 AM</option>
            <option value="11:00">11:00 AM - 12:00 PM</option>
            <option value="14:00">02:00 PM - 03:00 PM</option>
            <option value="15:00">03:00 PM - 04:00 PM</option>
            <option value="16:00">04:00 PM - 05:00 PM</option>
        `;
    }

    // Add date change listener to booking modal
    initializeDateChangeListener() {
        const dateInput = document.getElementById('appointment-date');
        const specialtyInfo = document.querySelector('.booking-modal h3');
        
        if (dateInput && specialtyInfo) {
            dateInput.addEventListener('change', (e) => {
                const selectedDate = e.target.value;
                const specialty = this.extractSpecialtyFromModal();
                
                if (selectedDate && specialty) {
                    this.checkSlotsForBookingModal(specialty, selectedDate);
                }
            });
        }
    }

    // Extract specialty from booking modal
    extractSpecialtyFromModal() {
        const modalTitle = document.querySelector('.booking-modal h3');
        if (modalTitle && modalTitle.textContent.includes('Book Appointment with')) {
            // Try to extract specialty from doctor info
            const doctorId = document.getElementById('selected-doctor-id')?.value;
            if (doctorId && window.doctorsDirectory?.doctors) {
                const doctor = window.doctorsDirectory.doctors.find(d => 
                    d.doctorId == doctorId || d.id == doctorId
                );
                return doctor?.specialty || doctor?.speciality || 'General Medicine';
            }
        }
        return 'General Medicine';
    }
}

// Initialize slot checker
window.slotChecker = new AvailableSlotChecker();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (window.slotChecker) {
        window.slotChecker.initializeDateChangeListener();
    }
});
