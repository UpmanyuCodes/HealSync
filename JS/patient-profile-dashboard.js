// Patient Profile Dashboard JavaScript
// Comprehensive API integration for patient profile and appointments management

// Configuration
const CONFIG = {
    API_BASE: 'https://healsync-backend-d788.onrender.com',
    STORAGE_KEYS: {
        USER_DATA: 'healSync_userData',
        PATIENT_DATA: 'healSync_patientData'
    },
    ENDPOINTS: {
        PATIENT_APPOINTMENTS: '/v1/healsync/book/patient/appointments',
        PATIENT_LOGIN: '/v1/healsync/patient/login',
        BOOK_APPOINTMENT: '/v1/healsync/book/appointment',
        CANCEL_APPOINTMENT: '/v1/healsync/book/cancel/patient',
        RESCHEDULE_APPOINTMENT: '/v1/healsync/book/reschedule'
    }
};

// Global state
let currentUser = null;
let allAppointments = [];
let filteredAppointments = [];

// Initialize dashboard when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

// Initialize the dashboard
async function initializeDashboard() {
    try {
        window.loaderActive = true; // Keep loader active
        showLoader('Initializing dashboard...');
        
        // Check authentication
        if (!checkAuthentication()) {
            redirectToLogin();
            return;
        }
        
        // Load user data
        currentUser = getCurrentUser();
        
        // Initialize dashboard components
        showLoader('Loading your profile...');
        await loadPatientProfile();
        
        showLoader('Fetching your appointments...');
        await loadPatientAppointments();
        
        showLoader('Loading health summary...');
        await loadHealthSummary();
        
        setupEventListeners();
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showSnackbar('Failed to load dashboard data. Please refresh the page.', 'error');
    } finally {
        window.loaderActive = false; // Allow loader to be hidden
        hideLoader();
    }
}

// Check if user is authenticated
function checkAuthentication() {
    const userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA);
    return userData && JSON.parse(userData);
}

// Get current user data
function getCurrentUser() {
    const userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA);
    return userData ? JSON.parse(userData) : null;
}

// Redirect to login page
function redirectToLogin() {
    window.location.href = '/HTML/login.html';
}

// Load patient profile data
async function loadPatientProfile() {
    try {
        if (!currentUser) {
            throw new Error('No user data available');
        }

        // Display basic profile information
        displayPatientProfile(currentUser);
        
        // Update header information
        updateHeaderInfo(currentUser);
        
    } catch (error) {
        console.error('Error loading patient profile:', error);
        showSnackbar('Failed to load profile information', 'error');
    }
}

// Display patient profile information
function displayPatientProfile(user) {
    // Update profile header
    const patientNameEl = document.getElementById('patientName');
    const patientIdEl = document.getElementById('patientId');
    
    if (patientNameEl) {
        patientNameEl.textContent = user.patientName || user.name || 'Unknown Patient';
    }
    
    if (patientIdEl) {
        patientIdEl.textContent = user.patientId || user.id || '---';
    }

    // Update personal information grid
    const personalInfoGrid = document.getElementById('personalInfoGrid');
    if (personalInfoGrid) {
        personalInfoGrid.innerHTML = generatePersonalInfoHTML(user);
    }
}

// Generate personal information HTML
function generatePersonalInfoHTML(user) {
    const infoFields = [
        { label: 'Full Name', value: user.patientName || user.name || 'Not specified', icon: 'user' },
        { label: 'Email', value: user.email || 'Not specified', icon: 'envelope' },
        { label: 'Phone', value: user.phoneNumber || user.phone || 'Not specified', icon: 'phone' },
        { label: 'Age', value: user.age || 'Not specified', icon: 'calendar' },
        { label: 'Gender', value: user.gender || 'Not specified', icon: 'mars-and-venus' },
        { label: 'Address', value: user.address || 'Not specified', icon: 'map-marker-alt' },
        { label: 'Emergency Contact', value: user.emergencyContact || 'Not specified', icon: 'phone-alt' },
        { label: 'Blood Type', value: user.bloodType || 'Not specified', icon: 'tint' }
    ];

    return infoFields.map(field => `
        <div class="info-item">
            <div class="info-label">
                <i class="fas fa-${field.icon}"></i>
                ${field.label}
            </div>
            <div class="info-value">${field.value}</div>
        </div>
    `).join('');
}

// Update header information
function updateHeaderInfo(user) {
    const headerUserName = document.getElementById('headerUserName');
    if (headerUserName) {
        headerUserName.textContent = user.patientName || user.name || 'Patient';
    }
}

// Load patient appointments using API service
async function loadPatientAppointments() {
    try {
        if (!currentUser || (!currentUser.patientId && !currentUser.id)) {
            console.warn('No patient ID available for loading appointments');
            displayEmptyAppointments();
            updateAppointmentStats([]);
            return;
        }

        const patientId = currentUser.patientId || currentUser.id;
        
        // Use the API service
        const appointmentsData = await patientAPI.getPatientAppointments(patientId);
        
        // Check if the response indicates an error
        if (appointmentsData.success === false) {
            throw new Error(appointmentsData.userMessage || 'Failed to load appointments');
        }
        
        // Handle successful response
        allAppointments = Array.isArray(appointmentsData) ? appointmentsData : [];
        filteredAppointments = [...allAppointments];
        displayAppointments(filteredAppointments);
        updateAppointmentStats(allAppointments);
        
        console.log(`Loaded ${allAppointments.length} appointments for patient ${patientId}`);
        
    } catch (error) {
        console.error('Error loading patient appointments:', error);
        allAppointments = [];
        filteredAppointments = [];
        displayEmptyAppointments();
        updateAppointmentStats([]);
        
        // Only show error message if it's not a "no appointments found" scenario
        if (!error.message.includes('404')) {
            showSnackbar(error.message || 'Failed to load appointments', 'error');
        }
    }
}

// Update appointment statistics
function updateAppointmentStats(appointments) {
    const totalEl = document.getElementById('totalAppointments');
    const upcomingEl = document.getElementById('upcomingAppointments');
    const completedEl = document.getElementById('completedAppointments');

    const stats = calculateAppointmentStats(appointments);

    if (totalEl) totalEl.textContent = stats.total;
    if (upcomingEl) upcomingEl.textContent = stats.upcoming;
    if (completedEl) completedEl.textContent = stats.completed;
}

// Calculate appointment statistics
function calculateAppointmentStats(appointments) {
    const now = new Date();
    const stats = {
        total: appointments.length,
        upcoming: 0,
        completed: 0,
        cancelled: 0
    };

    appointments.forEach(appointment => {
        const appointmentDate = new Date(appointment.startDateTime);
        const status = appointment.status?.toLowerCase();

        if (status === 'completed') {
            stats.completed++;
        } else if (status === 'cancelled') {
            stats.cancelled++;
        } else if (appointmentDate > now) {
            stats.upcoming++;
        }
    });

    return stats;
}

// Display appointments
function displayAppointments(appointments) {
    const appointmentsList = document.getElementById('appointmentsList');
    const appointmentsEmpty = document.getElementById('appointmentsEmpty');

    if (!appointments || appointments.length === 0) {
        displayEmptyAppointments();
        return;
    }

    // Hide empty state and show list
    if (appointmentsEmpty) appointmentsEmpty.classList.remove('show');
    
    if (appointmentsList) {
        appointmentsList.innerHTML = appointments.slice(0, 5).map(appointment => 
            generateAppointmentHTML(appointment)
        ).join('');
    }
}

// Display empty appointments state
function displayEmptyAppointments() {
    const appointmentsList = document.getElementById('appointmentsList');
    const appointmentsEmpty = document.getElementById('appointmentsEmpty');

    if (appointmentsList) appointmentsList.innerHTML = '';
    if (appointmentsEmpty) appointmentsEmpty.classList.add('show');
}

// Generate appointment HTML
function generateAppointmentHTML(appointment) {
    const appointmentDate = new Date(appointment.startDateTime);
    const endDate = new Date(appointment.endDateTime);
    const status = appointment.status?.toLowerCase() || 'pending';
    const statusClass = `status-${status}`;

    return `
        <div class="appointment-item">
            <div class="appointment-header">
                <div class="appointment-info">
                    <h4>${appointment.doctorName || 'Doctor'}</h4>
                    <div class="appointment-meta">
                        <span>
                            <i class="fas fa-calendar"></i>
                            ${appointmentDate.toLocaleDateString()}
                        </span>
                        <span>
                            <i class="fas fa-clock"></i>
                            ${appointmentDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                            ${endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        <span>
                            <i class="fas fa-stethoscope"></i>
                            ${appointment.specialty || 'General'}
                        </span>
                    </div>
                </div>
                <div class="appointment-status ${statusClass}">
                    ${status}
                </div>
            </div>
            ${appointment.notes ? `<p class="appointment-notes">${appointment.notes}</p>` : ''}
            <div class="appointment-actions">
                ${generateAppointmentActions(appointment)}
            </div>
        </div>
    `;
}

// Generate appointment action buttons
function generateAppointmentActions(appointment) {
    const status = appointment.status?.toLowerCase();
    const appointmentDate = new Date(appointment.startDateTime);
    const now = new Date();
    const isUpcoming = appointmentDate > now;

    let actions = [];

    if (status === 'pending' && isUpcoming) {
        actions.push(`<button class="btn" onclick="cancelAppointment(${appointment.appointmentId})">Cancel</button>`);
        actions.push(`<button class="btn" onclick="rescheduleAppointment(${appointment.appointmentId})">Reschedule</button>`);
    }

    if (status === 'completed') {
        actions.push(`<button class="btn" onclick="viewAppointmentDetails(${appointment.appointmentId})">View Details</button>`);
    }

    return actions.join('');
}

// Load health summary data
async function loadHealthSummary() {
    try {
        if (!currentUser || !currentUser.patientId) {
            console.warn('No patient ID available for loading health summary.');
            displayHealthSummary(null); // Display default state
            return;
        }

        const patientId = currentUser.patientId || currentUser.id;
        const endpoint = `/v1/healsync/emotion/patient/${patientId}`;
        
        // Use the API service to get the emotion history
        const emotionHistory = await patientAPI.makeRequest(endpoint, { method: 'GET' });

        if (emotionHistory.success === false) {
            // It's okay if no data is found (404), just show default
            if (emotionHistory.error.includes('404')) {
                console.log('No health tracker data found for this patient.');
                displayHealthSummary(null);
                return;
            }
            throw new Error(emotionHistory.userMessage || 'Failed to fetch health data');
        }
        
        // Assuming the API returns an array of entries, get the latest one
        const latestEntry = Array.isArray(emotionHistory) && emotionHistory.length > 0 
            ? emotionHistory.sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate))[0]
            : null;

        displayHealthSummary(latestEntry);

    } catch (error) {
        console.error('Error loading health summary:', error);
        displayHealthSummary(null); // Display default state on error
    }
}

// Display health summary
function displayHealthSummary(data) {
    // This is placeholder data - can be enhanced with real health tracking
    const vitalsData = [
        { label: 'Mood', value: data?.emotion || 'Not tracked', icon: 'smile' },
        { label: 'Blood Pressure', value: '120/80 mmHg', icon: 'heartbeat' },
        { label: 'Heart Rate', value: '72 bpm', icon: 'heart' },
        { label: 'Weight', value: '70 kg', icon: 'weight' },
        { label: 'Last Updated', value: data?.entryDate ? new Date(data.entryDate).toLocaleDateString() : 'N/A', icon: 'clock' }
    ];

    const vitalsList = document.getElementById('vitalsList');
    if (vitalsList) {
        vitalsList.innerHTML = vitalsData.map(vital => `
            <div class="vital-item">
                <span class="vital-label">
                    <i class="fas fa-${vital.icon}"></i>
                    ${vital.label}
                </span>
                <span class="vital-value">${vital.value}</span>
            </div>
        `).join('');
    }
}

// Filter appointments
function filterAppointments() {
    const filter = document.getElementById('appointmentFilter')?.value || 'all';
    
    if (filter === 'all') {
        filteredAppointments = [...allAppointments];
    } else {
        const now = new Date();
        filteredAppointments = allAppointments.filter(appointment => {
            const appointmentDate = new Date(appointment.startDateTime);
            const status = appointment.status?.toLowerCase();
            
            switch (filter) {
                case 'upcoming':
                    return appointmentDate > now && status !== 'cancelled';
                case 'completed':
                    return status === 'completed';
                case 'cancelled':
                    return status === 'cancelled';
                default:
                    return true;
            }
        });
    }
    
    displayAppointments(filteredAppointments);
}

// Quick action functions
function bookNewAppointment() {
    window.location.href = '/HTML/appointments-patient.html';
}

function viewMedicalHistory() {
    window.location.href = '/HTML/patient-treatment-dashboard.html';
}

function updateProfile() {
    showEditProfileModal();
}

function emergencyContact() {
    // This would typically open emergency contact functionality
    showSnackbar('Emergency contact feature coming soon!', 'info');
}

function viewAllAppointments() {
    window.location.href = '/HTML/appointments-patient.html';
}

// Appointment actions using API service
async function cancelAppointment(appointmentId) {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
        return;
    }

    try {
        const patientId = currentUser.patientId || currentUser.id;
        if (!patientId) {
            throw new Error('Patient ID not found');
        }

        showLoadingOverlay(true);
        
        // Use the API service
        const result = await patientAPI.cancelAppointment(appointmentId, patientId);
        
        // Check if the response indicates an error
        if (result.success === false) {
            throw new Error(result.userMessage || 'Failed to cancel appointment');
        }

        showSnackbar('Appointment cancelled successfully', 'success');
        await loadPatientAppointments(); // Refresh appointments
        
    } catch (error) {
        console.error('Error cancelling appointment:', error);
        showSnackbar(error.message || 'Failed to cancel appointment. Please try again.', 'error');
    } finally {
        showLoadingOverlay(false);
    }
}

async function rescheduleAppointment(appointmentId) {
    try {
        // Get appointment details first
        const appointmentDetails = await patientAPI.getAppointmentDetails(appointmentId);
        
        if (appointmentDetails.success === false) {
            throw new Error(appointmentDetails.userMessage || 'Failed to get appointment details');
        }
        
        // For now, redirect to appointments page for rescheduling
        // In a full implementation, you would show a date/time picker modal
        localStorage.setItem('rescheduleAppointmentId', appointmentId);
        window.location.href = '/HTML/appointments-patient.html?action=reschedule';
        
    } catch (error) {
        console.error('Error preparing reschedule:', error);
        showSnackbar('Unable to reschedule appointment. Please try again.', 'error');
    }
}

async function viewAppointmentDetails(appointmentId) {
    try {
        showLoadingOverlay(true);
        
        // Get detailed appointment information
        const appointmentDetails = await patientAPI.getAppointmentDetails(appointmentId);
        
        if (appointmentDetails.success === false) {
            throw new Error(appointmentDetails.userMessage || 'Failed to get appointment details');
        }
        
        // Show appointment details modal (this would be implemented)
        showAppointmentDetailsModal(appointmentDetails);
        
    } catch (error) {
        console.error('Error loading appointment details:', error);
        showSnackbar(error.message || 'Failed to load appointment details', 'error');
    } finally {
        showLoadingOverlay(false);
    }
}

// Show appointment details in a modal
function showAppointmentDetailsModal(appointment) {
    const modal = document.getElementById('appointmentDetailsModal');
    const modalBody = document.getElementById('appointmentDetailsBody');
    
    if (!modal || !modalBody) {
        console.error('Appointment details modal not found');
        // Fallback to alert if modal is missing
        alert(JSON.stringify(appointment, null, 2));
        return;
    }
    
    modalBody.innerHTML = `
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label"><i class="fas fa-user-md"></i> Doctor</div>
                <div class="info-value">${appointment.doctorName || 'N/A'}</div>
            </div>
            <div class="info-item">
                <div class="info-label"><i class="fas fa-stethoscope"></i> Specialty</div>
                <div class="info-value">${appointment.specialty || 'N/A'}</div>
            </div>
            <div class="info-item">
                <div class="info-label"><i class="fas fa-calendar"></i> Date</div>
                <div class="info-value">${new Date(appointment.startDateTime).toLocaleDateString()}</div>
            </div>
            <div class="info-item">
                <div class="info-label"><i class="fas fa-clock"></i> Time</div>
                <div class="info-value">
                    ${new Date(appointment.startDateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                    ${new Date(appointment.endDateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
            </div>
            <div class="info-item">
                <div class="info-label"><i class="fas fa-info-circle"></i> Status</div>
                <div class="info-value">
                    <span class="appointment-status status-${appointment.status?.toLowerCase()}">
                        ${appointment.status || 'N/A'}
                    </span>
                </div>
            </div>
        </div>
        ${appointment.notes ? `
            <div class="info-item full-width">
                <div class="info-label"><i class="fas fa-notes-medical"></i> Doctor's Notes</div>
                <div class="info-value">${appointment.notes}</div>
            </div>` : ''}
        ${appointment.prescription ? `
            <div class="info-item full-width">
                <div class="info-label"><i class="fas fa-pills"></i> Prescription</div>
                <div class="info-value">${appointment.prescription}</div>
            </div>` : ''}
    `;
    
    modal.classList.add('show');
}

// Close appointment details modal
function closeAppointmentDetailsModal() {
    const modal = document.getElementById('appointmentDetailsModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Modal functions
function showEditProfileModal() {
    const modal = document.getElementById('editProfileModal');
    if (modal) {
        // Populate form with current user data
        populateEditForm(currentUser);
        modal.classList.add('show');
    }
}

function closeEditModal() {
    const modal = document.getElementById('editProfileModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function populateEditForm(user) {
    const fields = {
        'editName': user.patientName || user.name,
        'editEmail': user.email,
        'editPhone': user.phoneNumber || user.phone,
        'editAge': user.age,
        'editGender': user.gender,
        'editAddress': user.address
    };

    Object.entries(fields).forEach(([fieldId, value]) => {
        const field = document.getElementById(fieldId);
        if (field && value) {
            field.value = value;
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Edit profile form submission
    const editProfileForm = document.getElementById('editProfileForm');
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', handleProfileUpdate);
    }

    // Close modal when clicking outside
    const modal = document.getElementById('editProfileModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeEditModal();
            }
        });
    }
}

// Handle profile update
async function handleProfileUpdate(e) {
    e.preventDefault();
    
    try {
        const formData = new FormData(e.target);
        const updatedData = {};
        
        formData.forEach((value, key) => {
            updatedData[key] = value;
        });
        
        // Update local storage (in a real app, this would call an API)
        const currentUserData = getCurrentUser();
        const updatedUserData = { ...currentUserData, ...updatedData };
        
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUserData));
        currentUser = updatedUserData;
        
        // Refresh display
        displayPatientProfile(updatedUserData);
        updateHeaderInfo(updatedUserData);
        
        closeEditModal();
        showSnackbar('Profile updated successfully!', 'success');
        
    } catch (error) {
        console.error('Error updating profile:', error);
        showSnackbar('Failed to update profile. Please try again.', 'error');
    }
}

// Utility functions
function showLoadingOverlay(show) {
    if (show) {
        showLoader();
    } else {
        hideLoader();
    }
}

function showSnackbar(message, type = 'info') {
    // Use existing snackbar functionality
    if (typeof window.showSnackbar === 'function') {
        window.showSnackbar(message, type);
    } else {
        // Fallback alert
        alert(message);
    }
}

// Logout function
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_DATA);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.PATIENT_DATA);
        window.location.href = '/HTML/login.html';
    }
}

// Toggle edit mode for inline editing (if needed)
function toggleEditMode() {
    showEditProfileModal();
}

// Export functions for global access
window.bookNewAppointment = bookNewAppointment;
window.viewMedicalHistory = viewMedicalHistory;
window.updateProfile = updateProfile;
window.emergencyContact = emergencyContact;
window.viewAllAppointments = viewAllAppointments;
window.filterAppointments = filterAppointments;
window.cancelAppointment = cancelAppointment;
window.rescheduleAppointment = rescheduleAppointment;
window.viewAppointmentDetails = viewAppointmentDetails;
window.showEditProfileModal = showEditProfileModal;
window.closeEditModal = closeEditModal;
window.handleLogout = handleLogout;
window.toggleEditMode = toggleEditMode;
