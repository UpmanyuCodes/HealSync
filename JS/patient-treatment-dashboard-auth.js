// Patient Treatment Dashboard Authentication & Session Management
// Handles patient authentication, session management, and logout functionality

// Initialize authentication when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    initializePatientAuthentication();
    attachPatientAuthEventListeners();
});

// Initialize patient authentication system
function initializePatientAuthentication() {
    checkPatientAuthentication();
    displayPatientInfo();
}

// Check if patient is authenticated
function checkPatientAuthentication() {
    const userType = localStorage.getItem('healSync_userType');
    const userData = localStorage.getItem('healSync_userData');
    const loginTime = localStorage.getItem('healSync_loginTime');
    
    // Check if user is logged in and is a patient
    if (!userType || userType !== 'patient' || !userData) {
        showPatientAuthError('Please login as a patient to access this page.');
        redirectToLogin();
        return false;
    }
    
    // Check if session is still valid (24 hours)
    if (loginTime) {
        const loginDate = new Date(loginTime);
        const now = new Date();
        const hoursDiff = (now - loginDate) / (1000 * 60 * 60);
        
        if (hoursDiff >= 24) {
            showPatientAuthError('Your session has expired. Please login again.');
            clearPatientUserSession();
            redirectToLogin();
            return false;
        }
    }
    
    return true;
}

// Display patient information on the dashboard
function displayPatientInfo() {
    try {
        const userData = localStorage.getItem('healSync_userData');
        if (!userData) return;
        
        const user = JSON.parse(userData);
        const patientName = user.patientName || 'Patient';
        const patientId = user.patientId;
        const age = user.patientAge;
        const gender = user.gender;
        
        // Update user name displays
        const userNameElements = document.querySelectorAll('.user-name');
        userNameElements.forEach(el => {
            el.textContent = patientName;
        });
        
        // Update dashboard title with personalized greeting
        const titleElement = document.querySelector('.dashboard-title');
        if (titleElement) {
            const firstName = patientName.split(' ')[0];
            titleElement.textContent = `${firstName}'s Treatment Plans`;
        }
        
        // Update dashboard subtitle with patient info
        const subtitleElement = document.querySelector('.dashboard-subtitle');
        if (subtitleElement && age && gender) {
            subtitleElement.textContent = `${age} years old, ${gender} - Track your treatment progress and manage your medications`;
        }
        
        // Store patient ID for API calls
        if (patientId) {
            localStorage.setItem('currentPatientId', patientId);
        }
        
        console.log('Patient info loaded:', { patientName, patientId, age, gender });
        
    } catch (error) {
        console.error('Error parsing patient data:', error);
        showPatientAuthError('Error loading patient information. Please login again.');
    }
}

// Attach patient authentication event listeners
function attachPatientAuthEventListeners() {
    // Add logout handler to all logout buttons
    const logoutButtons = document.querySelectorAll('a[href="/HTML/index.html"]');
    logoutButtons.forEach(button => {
        if (button.textContent.includes('Logout')) {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                handlePatientLogout();
            });
        }
    });
    
    // Add session check on page visibility change
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            // Page became visible, check session
            checkPatientAuthentication();
        }
    });
    
    // Periodic session check (every 5 minutes)
    setInterval(checkPatientAuthentication, 5 * 60 * 1000);
}

// Handle patient logout
function handlePatientLogout() {
    if (confirm('Are you sure you want to logout?')) {
        performPatientLogout();
    }
}

// Perform patient logout operation
function performPatientLogout() {
    try {
        // Clear user session
        clearPatientUserSession();
        
        // Show logout message
        showPatientAlert('You have been logged out successfully.', 'success');
        
        // Redirect after short delay
        setTimeout(() => {
            window.location.href = '/HTML/index.html';
        }, 1500);
        
    } catch (error) {
        console.error('Error during patient logout:', error);
        // Force redirect even if there's an error
        window.location.href = '/HTML/index.html';
    }
}

// Clear patient user session data
function clearPatientUserSession() {
    // Remove all HealSync related data
    const keysToRemove = [
        'healSync_userType',
        'healSync_userData',
        'healSync_patientId',
        'healSync_doctorId',
        'healSync_userName',
        'healSync_loginTime',
        'currentPatientId'
    ];
    
    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
    });
    
    console.log('Patient session cleared');
}

// Show patient authentication error
function showPatientAuthError(message) {
    alert(message);
    console.error('Patient Auth Error:', message);
}

// Redirect to login page
function redirectToLogin() {
    window.location.href = '/HTML/login.html';
}

// Show alert message for patient dashboard
function showPatientAlert(message, type) {
    // Try to use existing alert system if available
    if (window.showAlert && typeof window.showAlert === 'function') {
        window.showAlert(message, type);
        return;
    }
    
    // Fallback to browser alert
    alert(message);
}

// Get current patient information
function getCurrentPatient() {
    try {
        const userData = localStorage.getItem('healSync_userData');
        if (userData) {
            return JSON.parse(userData);
        }
    } catch (error) {
        console.error('Error getting current patient:', error);
    }
    return null;
}

// Check if patient has access to specific features
function hasPatientAccess(feature) {
    const patient = getCurrentPatient();
    if (!patient) return false;
    
    // For now, all authenticated patients have access to all features
    // This can be extended for subscription-based or feature-specific access
    return true;
}

// Get patient's treatment plan IDs
function getPatientTreatmentPlanIds() {
    const patient = getCurrentPatient();
    if (patient && patient.treatmentPlanIds) {
        return patient.treatmentPlanIds;
    }
    return [];
}

// Update patient dashboard stats
function updatePatientStats(stats) {
    try {
        // Update active treatments count
        const activeCountEl = document.getElementById('active-count');
        if (activeCountEl && stats.activeCount !== undefined) {
            activeCountEl.textContent = stats.activeCount;
        }
        
        // Update total medicines count
        const totalMedicinesEl = document.getElementById('total-medicines');
        if (totalMedicinesEl && stats.totalMedicines !== undefined) {
            totalMedicinesEl.textContent = stats.totalMedicines;
        }
        
        // Update completed count
        const completedCountEl = document.getElementById('completed-count');
        if (completedCountEl && stats.completedCount !== undefined) {
            completedCountEl.textContent = stats.completedCount;
        }
        
    } catch (error) {
        console.error('Error updating patient stats:', error);
    }
}

// Export functions for use in other scripts
window.PatientAuth = {
    getCurrentPatient,
    hasPatientAccess,
    getPatientTreatmentPlanIds,
    handlePatientLogout,
    clearPatientUserSession,
    showPatientAlert,
    checkPatientAuthentication,
    updatePatientStats
};
