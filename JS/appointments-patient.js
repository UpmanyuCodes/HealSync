const baseUrl = 'https://healsync-backend-d788.onrender.com/v1/healsync';
let currentRescheduleId = null;

// Initialize app on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    setMinDate();
});

function initializeApp() {
    const patientData = getPatientSession();
    if (!patientData) {
        window.location.href = '/patient login/register page/login.html';
        return;
    }
    
    loadAppointments();
    updateAppointmentStats();
}

function setupEventListeners() {
    // Book appointment form
    document.getElementById('book-appointment-form').addEventListener('submit', handleBookAppointment);
    
    // Reschedule modal form
    document.getElementById('reschedule-form').addEventListener('submit', handleRescheduleSubmit);
    
    // Filter appointments
    document.getElementById('appointment-filter').addEventListener('change', filterAppointments);
    
    // Close modal when clicking outside
    document.getElementById('reschedule-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeRescheduleModal();
        }
    });
}

function setMinDate() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const minDate = tomorrow.toISOString().split('T')[0];
    document.getElementById('appointment-date').min = minDate;
    document.getElementById('new-date').min = minDate;
}

async function handleBookAppointment(event) {
    event.preventDefault();
    
    const patientData = getPatientSession();
    if (!patientData) {
        showSnackbar('Please log in to book an appointment', 'error');
        return;
    }
    
    const specialty = document.getElementById('specialty').value;
    const date = document.getElementById('appointment-date').value;
    const time = document.getElementById('appointment-time').value;
    const duration = parseInt(document.getElementById('duration').value);
    const notes = document.getElementById('appointment-notes').value;
    
    if (!specialty || !date || !time) {
        showSnackbar('Please fill in all required fields', 'error');
        return;
    }
    
    // Create start and end datetime
    const startDateTime = new Date(`${date}T${time}:00`);
    const endDateTime = new Date(startDateTime.getTime() + duration * 60000);
    
    const appointmentData = {
        patientId: patientData.id,
        specialty: specialty,
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
        notes: notes || undefined
    };
    
    showLoading();
    
    try {
        const response = await fetch(`${baseUrl}/appointments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(appointmentData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showSnackbar('Appointment booked successfully!', 'success');
            document.getElementById('book-appointment-form').reset();
            setMinDate();
            loadAppointments();
            updateAppointmentStats();
        } else {
            throw new Error(result.message || 'Failed to book appointment');
        }
    } catch (error) {
        console.error('Error booking appointment:', error);
        showSnackbar(error.message || 'Failed to book appointment. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

async function loadAppointments() {
    const patientData = getPatientSession();
    if (!patientData) return;
    
    try {
        const response = await fetch(`${baseUrl}/appointments/patient/${patientData.id}`);
        const result = await response.json();
        
        if (response.ok) {
            displayAppointments(result.data || []);
        } else {
            throw new Error(result.message || 'Failed to load appointments');
        }
    } catch (error) {
        console.error('Error loading appointments:', error);
        displayAppointments([]);
        showSnackbar('Failed to load appointments', 'error');
    }
}

function displayAppointments(appointments) {
    const container = document.getElementById('appointments-container');
    
    if (!appointments || appointments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>No appointments found</h3>
                <p>Book your first appointment to get started</p>
            </div>
        `;
        return;
    }
    
    // Sort appointments by date (newest first)
    appointments.sort((a, b) => new Date(b.start) - new Date(a.start));
    
    container.innerHTML = appointments.map(appointment => createAppointmentCard(appointment)).join('');
}

function createAppointmentCard(appointment) {
    const startDate = new Date(appointment.start);
    const endDate = new Date(appointment.end);
    const isUpcoming = startDate > new Date();
    const isPast = endDate < new Date();
    
    const statusClass = getStatusClass(appointment.status);
    const statusIcon = getStatusIcon(appointment.status);
    
    const canCancel = isUpcoming && (appointment.status === 'booked' || appointment.status === 'confirmed');
    const canReschedule = isUpcoming && (appointment.status === 'booked' || appointment.status === 'confirmed');
    
    return `
        <div class="appointment-card ${statusClass}">
            <div class="appointment-header">
                <div class="appointment-specialty">
                    <i class="fas fa-stethoscope"></i>
                    <span>${appointment.specialty}</span>
                </div>
                <div class="appointment-status">
                    <i class="${statusIcon}"></i>
                    <span>${appointment.status}</span>
                </div>
            </div>
            
            <div class="appointment-details">
                <div class="detail-item">
                    <i class="fas fa-calendar"></i>
                    <span>${formatDate(startDate)}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-clock"></i>
                    <span>${formatTime(startDate)} - ${formatTime(endDate)}</span>
                </div>
                ${appointment.doctorName ? `
                <div class="detail-item">
                    <i class="fas fa-user-md"></i>
                    <span>Dr. ${appointment.doctorName}</span>
                </div>
                ` : ''}
                ${appointment.notes ? `
                <div class="detail-item">
                    <i class="fas fa-note-medical"></i>
                    <span>${appointment.notes}</span>
                </div>
                ` : ''}
            </div>
            
            <div class="appointment-actions">
                ${canReschedule ? `
                <button class="btn btn-secondary btn-sm" onclick="openRescheduleModal(${appointment.id})">
                    <i class="fas fa-calendar-alt"></i>
                    Reschedule
                </button>
                ` : ''}
                ${canCancel ? `
                <button class="btn btn-danger btn-sm" onclick="cancelAppointment(${appointment.id})">
                    <i class="fas fa-times"></i>
                    Cancel
                </button>
                ` : ''}
            </div>
        </div>
    `;
}

function getStatusClass(status) {
    const statusClasses = {
        'booked': 'status-booked',
        'confirmed': 'status-confirmed',
        'completed': 'status-completed',
        'cancelled': 'status-cancelled',
        'no-show': 'status-no-show'
    };
    return statusClasses[status] || 'status-default';
}

function getStatusIcon(status) {
    const statusIcons = {
        'booked': 'fas fa-clock',
        'confirmed': 'fas fa-check-circle',
        'completed': 'fas fa-check-double',
        'cancelled': 'fas fa-times-circle',
        'no-show': 'fas fa-exclamation-triangle'
    };
    return statusIcons[status] || 'fas fa-question-circle';
}

async function cancelAppointment(appointmentId) {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`${baseUrl}/appointments/${appointmentId}/cancel`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showSnackbar('Appointment cancelled successfully', 'success');
            loadAppointments();
            updateAppointmentStats();
        } else {
            throw new Error(result.message || 'Failed to cancel appointment');
        }
    } catch (error) {
        console.error('Error cancelling appointment:', error);
        showSnackbar(error.message || 'Failed to cancel appointment', 'error');
    } finally {
        hideLoading();
    }
}

function openRescheduleModal(appointmentId) {
    currentRescheduleId = appointmentId;
    document.getElementById('reschedule-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeRescheduleModal() {
    currentRescheduleId = null;
    document.getElementById('reschedule-modal').style.display = 'none';
    document.body.style.overflow = 'auto';
    document.getElementById('reschedule-form').reset();
}

async function handleRescheduleSubmit(event) {
    event.preventDefault();
    
    if (!currentRescheduleId) return;
    
    const newDate = document.getElementById('new-date').value;
    const newTime = document.getElementById('new-time').value;
    
    if (!newDate || !newTime) {
        showSnackbar('Please select both date and time', 'error');
        return;
    }
    
    const newStartDateTime = new Date(`${newDate}T${newTime}:00`);
    const newEndDateTime = new Date(newStartDateTime.getTime() + 60 * 60000); // Default 1 hour
    
    const rescheduleData = {
        start: newStartDateTime.toISOString(),
        end: newEndDateTime.toISOString()
    };
    
    showLoading();
    
    try {
        const response = await fetch(`${baseUrl}/appointments/${currentRescheduleId}/reschedule`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(rescheduleData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showSnackbar('Appointment rescheduled successfully', 'success');
            closeRescheduleModal();
            loadAppointments();
            updateAppointmentStats();
        } else {
            throw new Error(result.message || 'Failed to reschedule appointment');
        }
    } catch (error) {
        console.error('Error rescheduling appointment:', error);
        showSnackbar(error.message || 'Failed to reschedule appointment', 'error');
    } finally {
        hideLoading();
    }
}

async function checkAvailability() {
    const specialty = document.getElementById('specialty').value;
    const date = document.getElementById('appointment-date').value;
    
    if (!specialty || !date) {
        showSnackbar('Please select specialty and date first', 'error');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`${baseUrl}/availability?specialty=${specialty}&date=${date}`);
        const result = await response.json();
        
        if (response.ok) {
            displayAvailableSlots(result.data || []);
        } else {
            throw new Error(result.message || 'Failed to check availability');
        }
    } catch (error) {
        console.error('Error checking availability:', error);
        showSnackbar('Failed to check availability', 'error');
    } finally {
        hideLoading();
    }
}

function displayAvailableSlots(slots) {
    const card = document.getElementById('available-slots-card');
    const container = document.getElementById('available-slots-container');
    
    if (!slots || slots.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <p>No available slots for the selected date and specialty</p>
            </div>
        `;
    } else {
        container.innerHTML = slots.map(slot => `
            <div class="time-slot" onclick="selectTimeSlot('${slot.time}')">
                <i class="fas fa-clock"></i>
                <span>${formatTime(new Date(`2000-01-01T${slot.time}:00`))}</span>
                ${slot.doctorName ? `<small>Dr. ${slot.doctorName}</small>` : ''}
            </div>
        `).join('');
    }
    
    card.style.display = 'block';
}

function selectTimeSlot(time) {
    document.getElementById('appointment-time').value = time;
    document.getElementById('available-slots-card').style.display = 'none';
    showSnackbar('Time slot selected', 'success');
}

function filterAppointments() {
    const filter = document.getElementById('appointment-filter').value;
    const cards = document.querySelectorAll('.appointment-card');
    
    cards.forEach(card => {
        const status = card.querySelector('.appointment-status span').textContent.toLowerCase();
        
        if (filter === 'all' || status === filter) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

async function updateAppointmentStats() {
    const patientData = getPatientSession();
    if (!patientData) return;
    
    try {
        const response = await fetch(`${baseUrl}/appointments/patient/${patientData.id}`);
        const result = await response.json();
        
        if (response.ok) {
            const appointments = result.data || [];
            const now = new Date();
            
            const upcoming = appointments.filter(apt => 
                new Date(apt.start) > now && 
                (apt.status === 'booked' || apt.status === 'confirmed')
            ).length;
            
            const pending = appointments.filter(apt => apt.status === 'booked').length;
            const completed = appointments.filter(apt => apt.status === 'completed').length;
            
            document.getElementById('upcoming-count').textContent = upcoming;
            document.getElementById('pending-count').textContent = pending;
            document.getElementById('completed-count').textContent = completed;
        }
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// Utility functions
function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getPatientSession() {
    const session = localStorage.getItem('patientSession');
    if (!session) return null;
    
    try {
        const sessionData = JSON.parse(session);
        const now = new Date().getTime();
        
        if (sessionData.expiresAt && now > sessionData.expiresAt) {
            localStorage.removeItem('patientSession');
            return null;
        }
        
        return sessionData;
    } catch (error) {
        localStorage.removeItem('patientSession');
        return null;
    }
}

function handlePatientLogout() {
    localStorage.removeItem('patientSession');
    window.location.href = '/patient login/register page/login.html';
}

function showLoading() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

function showSnackbar(message, type = 'info') {
    // Remove existing snackbar
    const existingSnackbar = document.querySelector('.snackbar');
    if (existingSnackbar) {
        existingSnackbar.remove();
    }
    
    // Create new snackbar
    const snackbar = document.createElement('div');
    snackbar.className = `snackbar snackbar-${type}`;
    snackbar.innerHTML = `
        <div class="snackbar-content">
            <i class="fas ${getSnackbarIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(snackbar);
    
    // Show snackbar
    setTimeout(() => snackbar.classList.add('show'), 100);
    
    // Hide snackbar after 4 seconds
    setTimeout(() => {
        snackbar.classList.remove('show');
        setTimeout(() => snackbar.remove(), 300);
    }, 4000);
}

function getSnackbarIcon(type) {
    const icons = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-circle',
        'warning': 'fa-exclamation-triangle',
        'info': 'fa-info-circle'
    };
    return icons[type] || 'fa-info-circle';
}
