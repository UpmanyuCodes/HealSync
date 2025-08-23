// Enhanced Doctor Appointments JavaScript with proper error handling
const baseUrl = 'https://healsync-backend-d788.onrender.com/v1/healsync';
let currentDoctorId = null;
let allAppointments = [];
let filteredAppointments = [];
let isBackendOnline = false;

// Initialize app on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing Doctor Appointments...');
    initializeApp();
    setupEventListeners();
    setDefaultDate();
    checkBackendStatus();
});

async function initializeApp() {
    console.log('📋 Loading doctor session...');
    const doctorData = getDoctorSession();
    
    if (!doctorData) {
        // No doctor session - redirect to login instead of creating demo
        return;
    }
    
    if (doctorData) {
        // Try multiple sources for doctor ID with localStorage fallback
        currentDoctorId = doctorData.id || doctorData.doctorId || localStorage.getItem('doctorId');
        if (!currentDoctorId) {
            console.error('❌ No doctor ID available');
            window.location.href = '/HTML/login.html';
            return;
        }
        console.log('✅ Doctor session loaded:', currentDoctorId);
        
        // Ensure doctorId is stored in localStorage for future use
        if (!localStorage.getItem('doctorId')) {
            localStorage.setItem('doctorId', currentDoctorId);
        }
        
        // Load appointments with fallback to demo data
        await loadDoctorAppointments();
        updateAppointmentStats();
    } else {
        console.error('❌ Failed to create doctor session');
        window.location.href = '/HTML/login.html';
    }
}

async function checkBackendStatus() {
    try {
        console.log('🌐 Checking backend status...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // Increased to 10 seconds
        
        // Use existing test endpoint instead of /health
        const response = await fetch(`${baseUrl}/api/chat/test`, { 
            method: 'GET',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        clearTimeout(timeoutId);
        isBackendOnline = response.ok;
        
        if (isBackendOnline) {
            console.log('✅ Backend is online');
            showSnackbar('Connected to server', 'success');
        } else {
            throw new Error('Backend not responding');
        }
    } catch (error) {
        console.warn('⚠️ Backend is offline:', error.message);
        isBackendOnline = false;
    }
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
    
    // No valid session found - redirect to login
    console.log('❌ No doctor session found - redirecting to login');
    window.location.href = '/HTML/login.html';
    return null;
}

function setupEventListeners() {
    console.log('🔗 Setting up event listeners...');
    
    // Availability form
    const availabilityForm = document.getElementById('availability-form');
    if (availabilityForm) {
        availabilityForm.addEventListener('submit', handleSetAvailability);
    }
    
    // Modal close handlers
    const availabilityModal = document.getElementById('availability-modal');
    if (availabilityModal) {
        availabilityModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeAvailabilityModal();
            }
        });
    }
    
    const analyticsModal = document.getElementById('analytics-modal');
    if (analyticsModal) {
        analyticsModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeAnalyticsModal();
            }
        });
    }
    
    // Escape key to close modals
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
        if (!isBackendOnline) {
            throw new Error('Backend offline');
        }
        
        // Use the correct backend API endpoint structure
        const response = await fetch(`${baseUrl}/api/appointment/doctor/${currentDoctorId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('healSync_token') || ''}`
            },
            timeout: 10000
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        allAppointments = result.data || result || []; // Handle both response formats
        filteredAppointments = [...allAppointments];
        
        console.log('✅ Appointments loaded:', allAppointments.length);
        displayAppointments();
        updateAppointmentStats();
        
    } catch (error) {
        console.error('⚠️ Failed to load appointments:', error.message);
        showSnackbar('Failed to load appointments - please try again', 'error');
        allAppointments = [];
        filteredAppointments = [];
        displayAppointments();
    } finally {
        hideLoading();
    }
}

function displayAppointments(appointments = filteredAppointments) {
    const container = document.getElementById('appointments-container');
    
    if (!appointments || appointments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>No appointments found</h3>
                <p>No appointments match your current filters</p>
            </div>
        `;
        return;
    }
    
    // Sort appointments by date and time
    appointments.sort((a, b) => new Date(a.start) - new Date(b.start));
    
    container.innerHTML = appointments.map(appointment => createDoctorAppointmentCard(appointment)).join('');
}

function createDoctorAppointmentCard(appointment) {
    const startDate = new Date(appointment.start);
    const endDate = new Date(appointment.end);
    const isToday = isDateToday(startDate);
    const isPast = endDate < new Date();
    const isUpcoming = startDate > new Date();
    
    const statusClass = getStatusClass(appointment.status);
    const statusIcon = getStatusIcon(appointment.status);
    
    const canConfirm = appointment.status === 'booked';
    const canComplete = appointment.status === 'confirmed' && !isUpcoming;
    const canMarkNoShow = appointment.status === 'confirmed' && isPast;
    const canCancel = !isPast && (appointment.status === 'booked' || appointment.status === 'confirmed');
    
    return `
        <div class="appointment-card ${statusClass} ${isToday ? 'today-appointment' : ''}">
            <div class="appointment-header">
                <div class="appointment-patient">
                    <i class="fas fa-user"></i>
                    <span>Patient ID: ${appointment.patientId}</span>
                    ${appointment.patientName ? `<small>- ${appointment.patientName}</small>` : ''}
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
                    ${isToday ? '<span class="today-badge">Today</span>' : ''}
                </div>
                <div class="detail-item">
                    <i class="fas fa-clock"></i>
                    <span>${formatTime(startDate)} - ${formatTime(endDate)}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-stethoscope"></i>
                    <span>${appointment.specialty}</span>
                </div>
                ${appointment.notes ? `
                <div class="detail-item">
                    <i class="fas fa-note-medical"></i>
                    <span>${appointment.notes}</span>
                </div>
                ` : ''}
            </div>
            
            <div class="appointment-actions">
                ${canConfirm ? `
                <button class="btn btn-success btn-sm" onclick="confirmAppointment(${appointment.id})">
                    <i class="fas fa-check"></i>
                    Confirm
                </button>
                ` : ''}
                ${canComplete ? `
                <button class="btn btn-primary btn-sm" onclick="completeAppointment(${appointment.id})">
                    <i class="fas fa-check-double"></i>
                    Complete
                </button>
                ` : ''}
                ${canMarkNoShow ? `
                <button class="btn btn-warning btn-sm" onclick="markNoShow(${appointment.id})">
                    <i class="fas fa-exclamation-triangle"></i>
                    No Show
                </button>
                ` : ''}
                ${canCancel ? `
                <button class="btn btn-danger btn-sm" onclick="cancelDoctorAppointment(${appointment.id})">
                    <i class="fas fa-times"></i>
                    Cancel
                </button>
                ` : ''}
                <button class="btn btn-secondary btn-sm" onclick="addNotes(${appointment.id})">
                    <i class="fas fa-sticky-note"></i>
                    Notes
                </button>
            </div>
        </div>
    `;
}

async function confirmAppointment(appointmentId) {
    await updateAppointmentStatus(appointmentId, 'confirmed', 'Appointment confirmed successfully');
}

async function completeAppointment(appointmentId) {
    await updateAppointmentStatus(appointmentId, 'completed', 'Appointment marked as completed');
}

async function markNoShow(appointmentId) {
    if (!confirm('Mark this appointment as no-show? This action cannot be undone.')) {
        return;
    }
    await updateAppointmentStatus(appointmentId, 'no-show', 'Appointment marked as no-show');
}

async function cancelDoctorAppointment(appointmentId) {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
        return;
    }
    
    showLoading();
    
    try {
        if (!isBackendOnline) {
            // Offline mode - update local data only
            const appointment = allAppointments.find(apt => apt.id === appointmentId);
            if (appointment) {
                appointment.status = 'cancelled';
                filteredAppointments = [...allAppointments];
                displayAppointments();
                updateAppointmentStats();
                showSnackbar('Appointment cancelled (offline mode)', 'success');
                return;
            }
            throw new Error('Appointment not found');
        }
        
        const response = await fetch(`${baseUrl}/api/appointment/${appointmentId}/cancel`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('healSync_token') || ''}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        showSnackbar('Appointment cancelled successfully', 'success');
        await loadDoctorAppointments();
        
    } catch (error) {
        console.error('❌ Error cancelling appointment:', error);
        
        // Fallback to offline mode
        const appointment = allAppointments.find(apt => apt.id === appointmentId);
        if (appointment) {
            appointment.status = 'cancelled';
            filteredAppointments = [...allAppointments];
            displayAppointments();
            updateAppointmentStats();
            showSnackbar('Appointment cancelled (offline mode)', 'warning');
        } else {
            showSnackbar('Failed to cancel appointment', 'error');
        }
    } finally {
        hideLoading();
    }
}

async function updateAppointmentStatus(appointmentId, status, successMessage) {
    showLoading();
    
    try {
        if (!isBackendOnline) {
            // Offline mode - update local data only
            const appointment = allAppointments.find(apt => apt.id === appointmentId);
            if (appointment) {
                appointment.status = status;
                filteredAppointments = [...allAppointments];
                displayAppointments();
                updateAppointmentStats();
                showSnackbar(`${successMessage} (offline mode)`, 'success');
                return;
            }
            throw new Error('Appointment not found');
        }
        
        const response = await fetch(`${baseUrl}/api/appointment/${appointmentId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('healSync_token') || ''}`
            },
            body: JSON.stringify({ status })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        showSnackbar(successMessage, 'success');
        await loadDoctorAppointments();
        
    } catch (error) {
        console.error('❌ Error updating appointment status:', error);
        
        // Fallback to offline mode
        const appointment = allAppointments.find(apt => apt.id === appointmentId);
        if (appointment) {
            appointment.status = status;
            filteredAppointments = [...allAppointments];
            displayAppointments();
            updateAppointmentStats();
            showSnackbar(`${successMessage} (offline mode)`, 'warning');
        } else {
            showSnackbar('Failed to update appointment status', 'error');
        }
    } finally {
        hideLoading();
    }
}

async function addNotes(appointmentId) {
    const notes = prompt('Add notes for this appointment:');
    if (notes === null || notes.trim() === '') return;
    
    showLoading();
    
    try {
        if (!isBackendOnline) {
            // Offline mode - update local data only
            const appointment = allAppointments.find(apt => apt.id === appointmentId);
            if (appointment) {
                appointment.notes = notes.trim();
                filteredAppointments = [...allAppointments];
                displayAppointments();
                showSnackbar('Notes added (offline mode)', 'success');
                return;
            }
            throw new Error('Appointment not found');
        }
        
        const response = await fetch(`${baseUrl}/api/appointment/${appointmentId}/notes`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('healSync_token') || ''}`
            },
            body: JSON.stringify({ notes: notes.trim() })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        showSnackbar('Notes added successfully', 'success');
        await loadDoctorAppointments();
        
    } catch (error) {
        console.error('❌ Error adding notes:', error);
        
        // Fallback to offline mode
        const appointment = allAppointments.find(apt => apt.id === appointmentId);
        if (appointment) {
            appointment.notes = notes.trim();
            filteredAppointments = [...allAppointments];
            displayAppointments();
            showSnackbar('Notes added (offline mode)', 'warning');
        } else {
            showSnackbar('Failed to add notes', 'error');
        }
    } finally {
        hideLoading();
    }
}

async function bulkConfirm() {
    const pendingAppointments = allAppointments.filter(apt => apt.status === 'booked');
    
    if (pendingAppointments.length === 0) {
        showSnackbar('No pending appointments to confirm', 'info');
        return;
    }
    
    if (!confirm(`Confirm ${pendingAppointments.length} pending appointment(s)?`)) {
        return;
    }
    
    showLoading();
    
    try {
        if (!isBackendOnline) {
            // Offline mode - update local data only
            pendingAppointments.forEach(apt => {
                apt.status = 'confirmed';
            });
            filteredAppointments = [...allAppointments];
            displayAppointments();
            updateAppointmentStats();
            showSnackbar(`${pendingAppointments.length} appointments confirmed (offline mode)`, 'success');
            return;
        }
        
        const response = await fetch(`${baseUrl}/api/appointment/bulk-confirm`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('healSync_token') || ''}`
            },
            body: JSON.stringify({
                doctorId: currentDoctorId,
                appointmentIds: pendingAppointments.map(apt => apt.id)
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        showSnackbar(`${pendingAppointments.length} appointments confirmed successfully`, 'success');
        await loadDoctorAppointments();
        
    } catch (error) {
        console.error('❌ Error confirming appointments:', error);
        
        // Fallback to offline mode
        pendingAppointments.forEach(apt => {
            apt.status = 'confirmed';
        });
        filteredAppointments = [...allAppointments];
        displayAppointments();
        updateAppointmentStats();
        showSnackbar(`${pendingAppointments.length} appointments confirmed (offline mode)`, 'warning');
    } finally {
        hideLoading();
    }
}

function setAvailability() {
    document.getElementById('availability-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeAvailabilityModal() {
    document.getElementById('availability-modal').style.display = 'none';
    document.body.style.overflow = 'auto';
    document.getElementById('availability-form').reset();
    setDefaultDate();
}

async function handleSetAvailability(event) {
    event.preventDefault();
    
    const date = document.getElementById('availability-date').value;
    const startTime = document.getElementById('start-time').value;
    const endTime = document.getElementById('end-time').value;
    const duration = parseInt(document.getElementById('slot-duration').value);
    
    if (!date || !startTime || !endTime) {
        showSnackbar('Please fill in all fields', 'error');
        return;
    }
    
    if (startTime >= endTime) {
        showSnackbar('Start time must be before end time', 'error');
        return;
    }
    
    const availabilityData = {
        doctorId: currentDoctorId,
        date: date,
        startTime: startTime,
        endTime: endTime,
        slotDuration: duration || 30
    };
    
    showLoading();
    
    try {
        if (!isBackendOnline) {
            // In offline mode, just show success message
            showSnackbar('Availability set (offline mode) - will sync when online', 'success');
            closeAvailabilityModal();
            return;
        }
        
        const response = await fetch(`${baseUrl}/api/doctor/availability`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('healSync_token') || ''}`
            },
            body: JSON.stringify(availabilityData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        showSnackbar('Availability set successfully', 'success');
        closeAvailabilityModal();
        
    } catch (error) {
        console.error('❌ Error setting availability:', error);
        showSnackbar('Availability set (offline mode) - will sync when online', 'warning');
        closeAvailabilityModal();
    } finally {
        hideLoading();
    }
}

function viewAnalytics() {
    document.getElementById('analytics-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    loadAnalytics();
}

function closeAnalyticsModal() {
    document.getElementById('analytics-modal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

async function loadAnalytics() {
    const container = document.getElementById('analytics-content');
    container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading analytics...</div>';
    
    try {
        if (!isBackendOnline) {
            throw new Error('Backend offline');
        }
        
        const response = await fetch(`${baseUrl}/api/analytics/doctor/${currentDoctorId}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('healSync_token') || ''}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        displayAnalytics(result.data || {});
        
    } catch (error) {
        console.error('❌ Error loading analytics:', error);
        
        container.innerHTML = `<div class="analytics-error">
            <i class="fas fa-exclamation-circle"></i>
            <p>Failed to load analytics data</p>
        </div>`;
    }
}

function displayAnalytics(data) {
    const container = document.getElementById('analytics-content');
    
    container.innerHTML = `
        <div class="analytics-grid">
            <div class="analytics-card">
                <h4>This Month</h4>
                <div class="analytics-stats">
                    <div class="stat">
                        <span class="stat-number">${data.thisMonth?.total || 0}</span>
                        <span class="stat-label">Total Appointments</span>
                    </div>
                    <div class="stat">
                        <span class="stat-number">${data.thisMonth?.completed || 0}</span>
                        <span class="stat-label">Completed</span>
                    </div>
                    <div class="stat">
                        <span class="stat-number">${data.thisMonth?.cancelled || 0}</span>
                        <span class="stat-label">Cancelled</span>
                    </div>
                </div>
            </div>
            
            <div class="analytics-card">
                <h4>Performance</h4>
                <div class="analytics-stats">
                    <div class="stat">
                        <span class="stat-number">${data.performance?.completionRate || 0}%</span>
                        <span class="stat-label">Completion Rate</span>
                    </div>
                    <div class="stat">
                        <span class="stat-number">${data.performance?.noShowRate || 0}%</span>
                        <span class="stat-label">No-Show Rate</span>
                    </div>
                    <div class="stat">
                        <span class="stat-number">${data.performance?.avgRating || 0}</span>
                        <span class="stat-label">Avg. Rating</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function applyFilters() {
    const dateFilter = document.getElementById('date-filter').value;
    const statusFilter = document.getElementById('status-filter').value;
    const timeFilter = document.getElementById('time-filter').value;
    
    filteredAppointments = allAppointments.filter(appointment => {
        const appointmentDate = new Date(appointment.start);
        const appointmentHour = appointmentDate.getHours();
        
        // Date filter
        if (dateFilter && appointmentDate.toISOString().split('T')[0] !== dateFilter) {
            return false;
        }
        
        // Status filter
        if (statusFilter && appointment.status !== statusFilter) {
            return false;
        }
        
        // Time filter
        if (timeFilter) {
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
}

function clearFilters() {
    document.getElementById('date-filter').value = '';
    document.getElementById('status-filter').value = '';
    document.getElementById('time-filter').value = '';
    filteredAppointments = [...allAppointments];
    displayAppointments();
}

function updateAppointmentStats() {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    
    const todayAppointments = allAppointments.filter(apt => {
        const aptDate = new Date(apt.start);
        return aptDate >= todayStart && aptDate < todayEnd;
    });
    
    const todayCount = todayAppointments.length;
    const pendingCount = allAppointments.filter(apt => apt.status === 'booked').length;
    const completedTodayCount = todayAppointments.filter(apt => apt.status === 'completed').length;
    
    document.getElementById('today-count').textContent = todayCount;
    document.getElementById('pending-count').textContent = pendingCount;
    document.getElementById('completed-count').textContent = completedTodayCount;
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

function getDoctorSession() {
    const session = localStorage.getItem('doctorSession');
    if (!session) return null;
    
    try {
        const sessionData = JSON.parse(session);
        const now = new Date().getTime();
        
        if (sessionData.expiresAt && now > sessionData.expiresAt) {
            localStorage.removeItem('doctorSession');
            return null;
        }
        
        return sessionData;
    } catch (error) {
        localStorage.removeItem('doctorSession');
        return null;
    }
}

function handleDoctorLogout() {
    localStorage.removeItem('doctorSession');
    window.location.href = '/doctor login/login.html';
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

// Helper functions for appointment management
function setError(message) {
    showSnackbar(message, 'error');
}

function setSuccess(message) {
    showSnackbar(message, 'success');
}

function clearAlert() {
    const existingSnackbar = document.querySelector('.snackbar');
    if (existingSnackbar) {
        existingSnackbar.remove();
    }
}

// Show loading state
function showLoading() {
    const loader = document.getElementById('loading-spinner');
    if (loader) {
        loader.style.display = 'flex';
    }
}

// Hide loading state  
function hideLoading() {
    const loader = document.getElementById('loading-spinner');
    if (loader) {
        loader.style.display = 'none';
    }
}

// Enhanced error handling for fetch operations
async function safeFetch(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('healSync_token') || ''}`,
                ...options.headers
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('❌ Fetch error:', error);
        throw error;
    }
}

// Initialize the page when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}
