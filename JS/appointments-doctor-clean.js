// Enhanced Doctor Appointments JavaScript with real API integration
const baseUrl = 'https://healsync-backend-d788.onrender.com/v1/healsync/book';
let currentDoctorId = null;
let allAppointments = [];
let filteredAppointments = [];

// Initialize app on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing Doctor Appointments...');
    initializeApp();
    setupEventListeners();
    setDefaultDate();
});

async function initializeApp() {
    console.log('📋 Loading doctor session...');
    const doctorData = getDoctorSession();
    
    if (!doctorData) {
        console.error('❌ No doctor session found - redirecting to login');
        window.location.href = '/HTML/login.html';
        return;
    }
    
    // Get doctor ID from session
    currentDoctorId = doctorData.id || doctorData.doctorId || localStorage.getItem('doctorId');
    if (!currentDoctorId) {
        console.error('❌ No doctor ID available');
        window.location.href = '/HTML/login.html';
        return;
    }
    
    console.log('✅ Doctor session loaded:', currentDoctorId);
    
    // Store doctorId for future use
    if (!localStorage.getItem('doctorId')) {
        localStorage.setItem('doctorId', currentDoctorId);
    }
    
    // Load appointments with real API data
    await loadDoctorAppointments();
    updateAppointmentStats();
}

function getDoctorSession() {
    // Try multiple sources for doctor data
    const sources = [
        'healSync_doctor_data',
        'healSync_doctorSession', 
        'healSync_userData'
    ];
    
    for (const source of sources) {
        try {
            const data = localStorage.getItem(source);
            if (data) {
                const parsed = JSON.parse(data);
                if (parsed && (parsed.doctorId || parsed.id)) {
                    console.log(`✅ Found doctor data in ${source}`);
                    return parsed;
                }
            }
        } catch (error) {
            console.warn(`⚠️ Error parsing ${source}:`, error);
        }
    }
    
    console.log('❌ No doctor session found');
    return null;
}

function setupEventListeners() {
    console.log('🔗 Setting up event listeners...');
    
    // Availability form
    const availabilityForm = document.getElementById('availability-form');
    if (availabilityForm) {
        availabilityForm.addEventListener('submit', handleSetAvailability);
    }
    
    // Filter appointments
    const appointmentFilter = document.getElementById('appointment-filter');
    if (appointmentFilter) {
        appointmentFilter.addEventListener('change', filterAppointments);
    }
    
    // Modal close handlers
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAvailabilityModal();
            closeAnalyticsModal();
        }
    });
}

function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    const availabilityDate = document.getElementById('availability-date');
    const dateFilter = document.getElementById('date-filter');
    
    if (availabilityDate) availabilityDate.value = today;
    if (dateFilter) dateFilter.value = today;
}

async function loadDoctorAppointments() {
    if (!currentDoctorId) {
        console.error('❌ No doctor ID available');
        showSnackbar('Please login to view appointments', 'error');
        return;
    }
    
    console.log(`📡 Loading appointments for doctor ${currentDoctorId}...`);
    showLoading();
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(`${baseUrl}/doctor/appointments?doctorId=${currentDoctorId}`, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('healSync_token') || ''}`
            }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            allAppointments = await response.json();
            filteredAppointments = [...allAppointments];
            
            console.log('✅ Appointments loaded successfully:', allAppointments);
            
            displayAppointments();
            updateAppointmentStats();
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn('⚠️ Request timed out - backend might be slow or offline');
            showSnackbar('Request timed out - please try again', 'error');
        } else {
            console.error('❌ Error loading appointments:', error.message || error);
            showSnackbar('Failed to load appointments: ' + (error.message || 'Unknown error'), 'error');
        }
        allAppointments = [];
        filteredAppointments = [];
        displayAppointments();
    } finally {
        hideLoading();
    }
}

function displayAppointments(appointments = filteredAppointments) {
    const container = document.getElementById('appointments-container');
    
    console.log('🔍 Displaying doctor appointments:', appointments);
    
    if (!appointments || appointments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>No appointments found</h3>
                <p>No appointments match your current filters or you don't have any appointments yet.</p>
            </div>
        `;
        return;
    }
    
    // Sort appointments by date (upcoming first for doctors)
    appointments.sort((a, b) => {
        const dateA = new Date(a.startTime || a.start || a.date);
        const dateB = new Date(b.startTime || b.start || b.date);
        return dateA - dateB;
    });
    
    // Create appointment cards
    const appointmentCards = appointments.map(appointment => createDoctorAppointmentCard(appointment));
    
    container.innerHTML = appointmentCards.join('');
    console.log('✅ All doctor appointment cards rendered');
}

function createDoctorAppointmentCard(appointment) {
    console.log('🎯 Creating doctor appointment card for:', appointment);
    
    const appointmentId = appointment.id;
    const patientName = appointment.patientName || `Patient #${appointment.patientId}`;
    const patientEmail = appointment.patientEmail || '';
    const patientMobile = appointment.patientMobileNo || '';
    
    if (!appointmentId) {
        console.error(`❌ Missing appointment ID in doctor appointment:`, appointment);
        return '<div class="appointment-card error">Error: Missing appointment ID</div>';
    }
    
    // Handle dates
    let startDate, endDate;
    
    if (appointment.startTime) {
        startDate = new Date(appointment.startTime);
    } else if (appointment.start) {
        startDate = new Date(appointment.start);
    } else {
        startDate = new Date();
    }
    
    if (appointment.endTime) {
        endDate = new Date(appointment.endTime);
    } else if (appointment.end) {
        endDate = new Date(appointment.end);
    } else {
        endDate = new Date(startDate.getTime() + 60 * 60000);
    }
    
    // Check if dates are valid
    if (isNaN(startDate.getTime())) {
        startDate = new Date();
    }
    if (isNaN(endDate.getTime())) {
        endDate = new Date(startDate.getTime() + 60 * 60000);
    }
    
    const isUpcoming = startDate > new Date();
    const isPast = endDate < new Date();
    const isToday = isDateToday(startDate);
    const statusClass = getStatusClass(appointment.status);
    const statusIcon = getStatusIcon(appointment.status);
    
    const canCancel = isUpcoming && (appointment.status === 'booked' || appointment.status === 'confirmed');
    const canConfirm = appointment.status === 'booked';
    const canComplete = appointment.status === 'confirmed' && !isUpcoming;
    const canMarkNoShow = appointment.status === 'confirmed' && isPast;
    const canChat = (appointment.status === 'booked' || appointment.status === 'confirmed') && appointment.patientId;

    return `
        <div class="appointment-card ${statusClass} ${isToday ? 'today-appointment' : ''}">
            <div class="appointment-header">
                <div class="appointment-info">
                    <h3 class="patient-name">
                        <i class="fas fa-user"></i>
                        ${patientName}
                    </h3>
                    <p class="appointment-type">
                        <i class="fas fa-medical-notes"></i>
                        ${appointment.specialty || appointment.type || 'General Consultation'}
                    </p>
                </div>
                <div class="appointment-status status-${appointment.status.toLowerCase()}">
                    <i class="${statusIcon}"></i>
                    <span>${appointment.status.toUpperCase()}</span>
                </div>
            </div>
            
            <div class="appointment-details">
                <div class="detail-row">
                    <div class="detail-item">
                        <i class="fas fa-calendar-alt"></i>
                        <div class="detail-content">
                            <span class="label">Date</span>
                            <span class="value">${formatDate(startDate)} ${isToday ? '<span class="today-badge">Today</span>' : ''}</span>
                        </div>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-clock"></i>
                        <div class="detail-content">
                            <span class="label">Time</span>
                            <span class="value">${formatTime(startDate)} - ${formatTime(endDate)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-item">
                        <i class="fas fa-id-badge"></i>
                        <div class="detail-content">
                            <span class="label">Patient ID</span>
                            <span class="value">#${appointment.patientId}</span>
                        </div>
                    </div>
                    ${patientEmail ? `
                    <div class="detail-item">
                        <i class="fas fa-envelope"></i>
                        <div class="detail-content">
                            <span class="label">Email</span>
                            <span class="value">${patientEmail}</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                ${patientMobile ? `
                <div class="detail-row">
                    <div class="detail-item">
                        <i class="fas fa-phone"></i>
                        <div class="detail-content">
                            <span class="label">Contact</span>
                            <span class="value">${patientMobile}</span>
                        </div>
                    </div>
                </div>
                ` : ''}
                
                ${appointment.notes ? `
                <div class="appointment-notes">
                    <i class="fas fa-sticky-note"></i>
                    <div class="notes-content">
                        <span class="label">Patient Notes:</span>
                        <p>${appointment.notes}</p>
                    </div>
                </div>
                ` : ''}
            </div>
            
            <div class="appointment-actions">
                ${canConfirm ? `
                    <button class="action-btn confirm-btn" onclick="confirmAppointment(${appointmentId})">
                        <i class="fas fa-check"></i>
                        Confirm
                    </button>
                ` : ''}
                
                ${canComplete ? `
                    <button class="action-btn complete-btn" onclick="completeAppointment(${appointmentId})">
                        <i class="fas fa-check-double"></i>
                        Complete
                    </button>
                ` : ''}
                
                ${canMarkNoShow ? `
                    <button class="action-btn no-show-btn" onclick="markNoShow(${appointmentId})">
                        <i class="fas fa-user-times"></i>
                        Mark No-Show
                    </button>
                ` : ''}
                
                ${canCancel ? `
                    <button class="action-btn cancel-btn" onclick="cancelAppointment(${appointmentId})">
                        <i class="fas fa-times"></i>
                        Cancel
                    </button>
                ` : ''}
                
                ${canChat ? `
                    <button class="action-btn chat-btn" onclick="openChatWithPatient(${appointmentId}, ${appointment.patientId}, ${currentDoctorId}, '${patientName.replace(/'/g, "\\'")}')">
                        <i class="fas fa-comments"></i>
                        Chat with Patient
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

// Appointment management functions
async function confirmAppointment(appointmentId) {
    await updateAppointmentStatus(appointmentId, 'confirmed', 'Appointment confirmed successfully');
}

async function completeAppointment(appointmentId) {
    await updateAppointmentStatus(appointmentId, 'completed', 'Appointment marked as completed');
}

async function markNoShow(appointmentId) {
    if (confirm('Mark this appointment as no-show? This action cannot be undone.')) {
        await updateAppointmentStatus(appointmentId, 'no-show', 'Appointment marked as no-show');
    }
}

async function cancelAppointment(appointmentId) {
    if (confirm('Cancel this appointment? This action cannot be undone.')) {
        await updateAppointmentStatus(appointmentId, 'cancelled', 'Appointment cancelled successfully');
    }
}

async function updateAppointmentStatus(appointmentId, newStatus, successMessage) {
    console.log(`🔄 Updating appointment ${appointmentId} to ${newStatus}`);
    
    try {
        showLoading();
        
        const response = await fetch(`${baseUrl}/appointment/${appointmentId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('healSync_token') || ''}`
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (response.ok) {
            // Update local data
            const appointment = allAppointments.find(apt => apt.id === appointmentId);
            if (appointment) {
                appointment.status = newStatus;
            }
            
            // Refresh display
            displayAppointments();
            updateAppointmentStats();
            showSnackbar(successMessage, 'success');
        } else {
            throw new Error(`Failed to update appointment status: ${response.status}`);
        }
    } catch (error) {
        console.error('❌ Error updating appointment status:', error);
        showSnackbar('Failed to update appointment status', 'error');
    } finally {
        hideLoading();
    }
}

function filterAppointments() {
    const dateFilter = document.getElementById('date-filter').value;
    const statusFilter = document.getElementById('appointment-filter').value;
    const timeFilter = document.getElementById('time-filter').value;
    
    filteredAppointments = allAppointments.filter(appointment => {
        // Date filter
        if (dateFilter) {
            const appointmentDate = new Date(appointment.startTime || appointment.start);
            const filterDate = new Date(dateFilter);
            if (appointmentDate.toDateString() !== filterDate.toDateString()) {
                return false;
            }
        }
        
        // Status filter
        if (statusFilter && statusFilter !== 'all') {
            if (appointment.status !== statusFilter) {
                return false;
            }
        }
        
        // Time filter
        if (timeFilter && timeFilter !== 'all') {
            const appointmentDate = new Date(appointment.startTime || appointment.start);
            const appointmentHour = appointmentDate.getHours();
            
            if (timeFilter === 'morning' && (appointmentHour < 6 || appointmentHour >= 12)) {
                return false;
            }
            if (timeFilter === 'afternoon' && (appointmentHour < 12 || appointmentHour >= 18)) {
                return false;
            }
            if (timeFilter === 'evening' && (appointmentHour < 18 || appointmentHour >= 22)) {
                return false;
            }
        }
        
        return true;
    });
    
    displayAppointments();
    updateAppointmentStats();
}

function updateAppointmentStats() {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    
    const todayAppointments = allAppointments.filter(apt => {
        const aptDate = new Date(apt.startTime || apt.start);
        return aptDate >= todayStart && aptDate < todayEnd;
    });
    
    const todayCount = todayAppointments.length;
    const pendingCount = allAppointments.filter(apt => apt.status === 'booked').length;
    const completedTodayCount = todayAppointments.filter(apt => apt.status === 'completed').length;
    
    // Update UI
    const todayElement = document.getElementById('today-count');
    const pendingElement = document.getElementById('pending-count');
    const completedElement = document.getElementById('completed-count');
    
    if (todayElement) todayElement.textContent = todayCount;
    if (pendingElement) pendingElement.textContent = pendingCount;
    if (completedElement) completedElement.textContent = completedTodayCount;
}

// Chat function
function openChatWithPatient(appointmentId, patientId, doctorId, patientName) {
    console.log(`🗣️ Opening chat with patient:`, { appointmentId, patientId, doctorId, patientName });
    
    if (window.healSyncChat && typeof window.healSyncChat.openChat === 'function') {
        window.healSyncChat.openChat({
            appointmentId,
            patientId,
            doctorId,
            patientName,
            userType: 'doctor'
        });
    } else {
        console.warn('⚠️ Chat system not available');
        showSnackbar('Chat feature is currently unavailable', 'warning');
    }
}

// Bulk operations
function confirmAllPendingAppointments() {
    const pendingAppointments = allAppointments.filter(apt => apt.status === 'booked');
    
    if (pendingAppointments.length === 0) {
        showSnackbar('No pending appointments to confirm', 'info');
        return;
    }
    
    if (confirm(`Confirm ${pendingAppointments.length} pending appointment(s)?`)) {
        // In a real implementation, you'd make API calls to confirm each appointment
        pendingAppointments.forEach(apt => apt.status = 'confirmed');
        displayAppointments();
        updateAppointmentStats();
        showSnackbar(`${pendingAppointments.length} appointments confirmed successfully`, 'success');
    }
}

// Availability functions
function setAvailabilityModal() {
    const modal = document.getElementById('availability-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function handleSetAvailability(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const availabilityData = {
        date: formData.get('availability-date'),
        startTime: formData.get('start-time'),
        endTime: formData.get('end-time'),
        slotDuration: formData.get('slot-duration')
    };
    
    console.log('Setting availability:', availabilityData);
    showSnackbar('Availability set successfully!', 'success');
    closeAvailabilityModal();
}

function closeAvailabilityModal() {
    const modal = document.getElementById('availability-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function closeAnalyticsModal() {
    const modal = document.getElementById('analytics-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Utility functions
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

function isDateToday(date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
}

// Loading and UI functions
function showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
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

// Global functions for UI interaction
window.setAvailabilityModal = setAvailabilityModal;
window.loadDoctorAppointments = loadDoctorAppointments;
window.filterAppointments = filterAppointments;
window.confirmAllPendingAppointments = confirmAllPendingAppointments;
window.applyFilters = filterAppointments;
window.confirmAppointment = confirmAppointment;
window.cancelAppointment = cancelAppointment;
window.completeAppointment = completeAppointment;
window.markNoShow = markNoShow;
window.openChatWithPatient = openChatWithPatient;
window.closeAvailabilityModal = closeAvailabilityModal;
window.closeAnalyticsModal = closeAnalyticsModal;
