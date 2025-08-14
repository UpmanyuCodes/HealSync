// Patient Profile Management
// Handles patient profile display and data loading

const API_BASE = 'https://healsync-backend-d788.onrender.com';

// Initialize profile when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    initializeProfile();
});

// Initialize profile system
async function initializeProfile() {
    try {
        showLoadingOverlay(true);
        await loadPatientProfile();
        await loadPatientStats();
    } catch (error) {
        console.error('Error initializing profile:', error);
        showSnackbar('Failed to load profile data. Please refresh the page.', 'error');
    } finally {
        showLoadingOverlay(false);
    }
}

// Load patient profile data
async function loadPatientProfile() {
    try {
        const userData = localStorage.getItem('healSync_userData');
        if (!userData) {
            throw new Error('No user data found');
        }

        const user = JSON.parse(userData);
        displayPatientProfile(user);

    } catch (error) {
        console.error('Error loading patient profile:', error);
        throw error;
    }
}

// Display patient profile information
function displayPatientProfile(user) {
    // Update all patient name elements
    const nameElements = document.querySelectorAll('.patient-name, .patient-name-detail');
    nameElements.forEach(el => {
        el.textContent = user.patientName || 'Unknown Patient';
    });

    // Update age
    const ageElements = document.querySelectorAll('.patient-age, .patient-age-detail');
    ageElements.forEach(el => {
        el.textContent = user.patientAge ? `${user.patientAge} years` : '-- years';
    });

    // Update gender
    const genderElements = document.querySelectorAll('.patient-gender, .patient-gender-detail');
    genderElements.forEach(el => {
        el.textContent = user.gender || '--';
    });

    // Update patient ID
    const idElement = document.querySelector('.patient-id');
    if (idElement) {
        idElement.textContent = user.patientId ? `ID: ${user.patientId}` : 'ID: --';
    }

    // Update email
    const emailElement = document.querySelector('.patient-email-detail');
    if (emailElement) {
        emailElement.textContent = user.email || 'Not provided';
    }

    // Update mobile number
    const mobileElement = document.querySelector('.patient-mobile-detail');
    if (mobileElement) {
        mobileElement.textContent = user.mobileNo || 'Not provided';
    }

    // Update member since date (simulate registration date)
    const memberSinceElement = document.querySelector('.member-since');
    if (memberSinceElement) {
        const loginTime = localStorage.getItem('healSync_loginTime');
        if (loginTime) {
            const date = new Date(loginTime);
            memberSinceElement.textContent = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long'
            });
        } else {
            memberSinceElement.textContent = new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long'
            });
        }
    }

    // Update password last updated (simulate)
    const passwordUpdatedElement = document.querySelector('.password-updated');
    if (passwordUpdatedElement) {
        passwordUpdatedElement.textContent = 'Recently';
    }
}

// Load patient statistics
async function loadPatientStats() {
    try {
        const patientId = localStorage.getItem('currentPatientId');
        if (!patientId) {
            console.log('No patient ID found for stats');
            return;
        }

        // For now, we'll use mock data since the API endpoints aren't fully specified
        // In a real implementation, you would fetch from actual endpoints
        displayPatientStats({
            treatmentCount: Math.floor(Math.random() * 5) + 1,
            appointmentCount: Math.floor(Math.random() * 10) + 1
        });

    } catch (error) {
        console.error('Error loading patient stats:', error);
        // Display default values on error
        displayPatientStats({
            treatmentCount: 0,
            appointmentCount: 0
        });
    }
}

// Display patient statistics
function displayPatientStats(stats) {
    const treatmentCountElement = document.getElementById('treatment-count');
    if (treatmentCountElement) {
        treatmentCountElement.textContent = stats.treatmentCount || '0';
    }

    const appointmentCountElement = document.getElementById('appointment-count');
    if (appointmentCountElement) {
        appointmentCountElement.textContent = stats.appointmentCount || '0';
    }
}

// Handle change password action
function changePassword() {
    window.location.href = '/HTML/patient-profile-edit.html';
}

// Show/hide loading overlay
function showLoadingOverlay(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

// Snackbar notification function
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
    switch (type) {
        case 'success': return '✅';
        case 'error': return '❌';
        case 'warning': return '⚠️';
        default: return 'ℹ️';
    }
}
