const baseUrl = 'https://healsync-backend-d788.onrender.com/v1/healsync';
let currentDoctorId = null;
let allAppointments = [];
let filteredAppointments = [];

// Initialize app on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    setDefaultDate();
});

function initializeApp() {
    const doctorData = getDoctorSession();
    if (!doctorData) {
        window.location.href = '/doctor login/login.html';
        return;
    }
    
    currentDoctorId = doctorData.id;
    loadDoctorAppointments();
    updateAppointmentStats();
}

function setupEventListeners() {
    // Availability form
    document.getElementById('availability-form').addEventListener('submit', handleSetAvailability);
    
    // Close modals when clicking outside
    document.getElementById('availability-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeAvailabilityModal();
        }
    });
    
    document.getElementById('analytics-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeAnalyticsModal();
        }
    });
}

function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('availability-date').value = today;
    document.getElementById('date-filter').value = today;
}

async function loadDoctorAppointments() {
    if (!currentDoctorId) return;
    
    showLoading();
    
    try {
        const response = await fetch(`${baseUrl}/appointment/doctor/${currentDoctorId}`);
        const result = await response.json();
        
        if (response.ok) {
            allAppointments = result.data || [];
            filteredAppointments = [...allAppointments];
            displayAppointments();
            updateAppointmentStats();
        } else {
            throw new Error(result.message || 'Failed to load appointments');
        }
    } catch (error) {
        console.error('Error loading appointments:', error);
        displayAppointments([]);
        showSnackbar('Failed to load appointments', 'error');
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
        const response = await fetch(`${baseUrl}/appointments/${appointmentId}/cancel`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showSnackbar('Appointment cancelled successfully', 'success');
            loadDoctorAppointments();
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

async function updateAppointmentStatus(appointmentId, status, successMessage) {
    showLoading();
    
    try {
        const response = await fetch(`${baseUrl}/appointments/${appointmentId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showSnackbar(successMessage, 'success');
            loadDoctorAppointments();
        } else {
            throw new Error(result.message || `Failed to update appointment status`);
        }
    } catch (error) {
        console.error('Error updating appointment status:', error);
        showSnackbar(error.message || 'Failed to update appointment status', 'error');
    } finally {
        hideLoading();
    }
}

async function addNotes(appointmentId) {
    const notes = prompt('Add notes for this appointment:');
    if (notes === null) return;
    
    showLoading();
    
    try {
        const response = await fetch(`${baseUrl}/appointments/${appointmentId}/notes`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ notes })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showSnackbar('Notes added successfully', 'success');
            loadDoctorAppointments();
        } else {
            throw new Error(result.message || 'Failed to add notes');
        }
    } catch (error) {
        console.error('Error adding notes:', error);
        showSnackbar(error.message || 'Failed to add notes', 'error');
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
        const response = await fetch(`${baseUrl}/appointments/bulk-confirm`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                doctorId: currentDoctorId,
                appointmentIds: pendingAppointments.map(apt => apt.id)
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showSnackbar(`${pendingAppointments.length} appointments confirmed successfully`, 'success');
            loadDoctorAppointments();
        } else {
            throw new Error(result.message || 'Failed to confirm appointments');
        }
    } catch (error) {
        console.error('Error confirming appointments:', error);
        showSnackbar(error.message || 'Failed to confirm appointments', 'error');
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
    
    const availabilityData = {
        doctorId: currentDoctorId,
        date: date,
        startTime: startTime,
        endTime: endTime,
        slotDuration: duration
    };
    
    showLoading();
    
    try {
        const response = await fetch(`${baseUrl}/availability`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(availabilityData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showSnackbar('Availability set successfully', 'success');
            closeAvailabilityModal();
        } else {
            throw new Error(result.message || 'Failed to set availability');
        }
    } catch (error) {
        console.error('Error setting availability:', error);
        showSnackbar(error.message || 'Failed to set availability', 'error');
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
    container.innerHTML = '<div class="loading-spinner"></div>';
    
    try {
        const response = await fetch(`${baseUrl}/analytics/doctor/${currentDoctorId}`);
        const result = await response.json();
        
        if (response.ok) {
            displayAnalytics(result.data);
        } else {
            throw new Error(result.message || 'Failed to load analytics');
        }
    } catch (error) {
        console.error('Error loading analytics:', error);
        container.innerHTML = '<p class="error">Failed to load analytics</p>';
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

function apptCard(a) {
    const wrapper = document.createElement('div');
    wrapper.className = 'card appointment-card';
    
    const title = document.createElement('h4');
    title.textContent = a.patientName || 'Unknown Patient';
    
    const sub = document.createElement('div');
    sub.className = 'appointment-time';
    sub.textContent = `${a.appointmentDate} at ${a.appointmentTime}`;
    
    const meta = document.createElement('div');
    meta.className = 'appointment-meta';
    meta.textContent = a.appointmentType || 'General Consultation';
    
    const badge = document.createElement('span');
    badge.className = `status-badge status-${a.status?.toLowerCase() || 'pending'}`;
    badge.textContent = a.status || 'Pending';
    
    const toggleRes = document.createElement('button');
    toggleRes.className = 'btn btn-primary';
    toggleRes.textContent = a.status === 'confirmed' ? 'Mark Complete' : 'Confirm';
    toggleRes.addEventListener('click', async () => {
        const newStatus = a.status === 'confirmed' ? 'completed' : 'confirmed';
        try {
            const url = `${baseUrl}/appointments/${a.scheduleId}/status`;
            const res = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (!res.ok) throw new Error(await res.text());
            a.status = newStatus;
            badge.textContent = newStatus;
            badge.className = `status-badge status-${newStatus}`;
            setSuccess(`Appointment ${newStatus}`);
        } catch (err) {
            setError(err.message || 'Failed to update appointment');
        }
    });
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-danger';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', async () => {
        if (!confirm('Cancel this appointment?')) return;
        try {
            const url = `${baseUrl}/appointments/${a.scheduleId}`;
            const res = await fetch(url, { method: 'DELETE' });
            if (!res.ok) throw new Error(await res.text());
            wrapper.remove();
            setSuccess('Appointment cancelled');
        } catch (err) {
            setError(err.message || 'Failed to cancel appointment');
        }
    });
    
    const inline = document.createElement('div');
    inline.style.marginTop = '0.5rem';
    
    const notesWrap = document.createElement('div');
    notesWrap.style.marginTop = '0.5rem';
    
    const notesInput = document.createElement('textarea');
    notesInput.placeholder = 'Add/update doctor notes...';
    notesInput.rows = 2;
    notesInput.className = 'form-input';
    
    const notesBtn = document.createElement('button');
    notesBtn.className = 'btn btn-secondary';
    notesBtn.textContent = 'Save Notes';
    notesBtn.addEventListener('click', async () => {
        const notes = notesInput.value || '';
        try {
            const url = `${baseUrl}/notes?appointmentId=${a.scheduleId}&doctorId=${a.doctorId}&notes=${encodeURIComponent(notes)}`;
            const res = await fetch(url, { method: 'POST' });
            const txt = await res.text();
            if (!res.ok) throw new Error(txt);
            setSuccess(txt || 'Notes updated.');
        } catch (err) {
            setError(err.message || 'Failed to update notes');
        }
    });
    
    notesWrap.append(notesInput, notesBtn);
    
    const actions = document.createElement('div');
    actions.className = 'actions';
    actions.append(toggleRes, cancelBtn);
    
    const footer = document.createElement('div');
    footer.className = 'appt-footer';
    footer.append(badge, actions);
    
    wrapper.append(title, sub, meta, footer, inline, notesWrap);
    return wrapper;
}

async function loadDoctorAppointments() {
    clearAlert();
    const did = document.getElementById('doctorIdList').value;
    if (!did) {
        setError('Enter your Doctor ID to load appointments.');
        return;
    }
    
    const container = document.getElementById('doctorApptList');
    container.innerHTML = '';
    container.appendChild(document.createTextNode('Loading...'));
    
    try {
        const res = await fetch(`${baseUrl}/doctor/appointments?doctorId=${encodeURIComponent(did)}`);
        if (!res.ok) throw new Error(await res.text());
        
        const list = await res.json();
        container.innerHTML = '';
        
        if (!list || list.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'card';
            empty.innerHTML = '<div class="muted">No appointments found.</div>';
            container.appendChild(empty);
            return;
        }
        
        list.forEach(a => container.appendChild(apptCard(a)));
    } catch (err) {
        container.innerHTML = '';
        setError(err.message || 'Failed to load appointments');
    }
}

// Event listeners
document.getElementById('loadDoctorAppts').addEventListener('click', loadDoctorAppointments);

// Initialize doctor ID if present
try {
    const did = new URLSearchParams(location.search).get('doctorId') || localStorage.getItem('doctorId');
    if (did) {
        const input = document.getElementById('doctorIdList');
        if (input) input.value = did;
    }
} catch (e) {
    console.warn('Failed to initialize doctor ID:', e);
}
