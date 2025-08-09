// Doctor Treatment Dashboard Authentication & Session Management
// Handles user authentication, session management, and logout functionality

// Initialize authentication when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    initializeAuthentication();
    attachAuthEventListeners();
});

// Initialize authentication system
function initializeAuthentication() {
    checkDoctorAuthentication();
    displayUserInfo();
}

// Check if doctor is authenticated
function checkDoctorAuthentication() {
    const userType = localStorage.getItem('healSync_userType');
    const userData = localStorage.getItem('healSync_userData');
    const loginTime = localStorage.getItem('healSync_loginTime');
    
    // Check if user is logged in and is a doctor
    if (!userType || userType !== 'doctor' || !userData) {
        showAuthError('Please login as a doctor to access this page.');
        redirectToLogin();
        return false;
    }
    
    // Check if session is still valid (24 hours)
    if (loginTime) {
        const loginDate = new Date(loginTime);
        const now = new Date();
        const hoursDiff = (now - loginDate) / (1000 * 60 * 60);
        
        if (hoursDiff >= 24) {
            showAuthError('Your session has expired. Please login again.');
            clearUserSession();
            redirectToLogin();
            return false;
        }
    }
    
    return true;
}

// Display user information on the dashboard
function displayUserInfo() {
    try {
        const userData = localStorage.getItem('healSync_userData');
        if (!userData) return;
        
        const user = JSON.parse(userData);
        const userName = user.name || 'Doctor';
        const doctorId = user.doctorId;
        const speciality = user.speaciality || user.speciality;
        
        // Update user name displays
        const userNameElements = document.querySelectorAll('.user-name');
        userNameElements.forEach(el => {
            el.textContent = userName;
        });
        
        // Update dashboard title
        const titleElement = document.querySelector('.dashboard-title');
        if (titleElement) {
            const cleanName = userName.replace('Dr. ', '');
            titleElement.textContent = `Dr. ${cleanName}'s Treatment Management`;
        }
        
        // Update dashboard subtitle with speciality
        const subtitleElement = document.querySelector('.dashboard-subtitle');
        if (subtitleElement && speciality) {
            subtitleElement.textContent = `${speciality} Specialist - Create and manage treatment plans for your patients`;
        }
        
        // Store doctor ID for API calls
        if (doctorId) {
            localStorage.setItem('currentDoctorId', doctorId);
        }
        
        console.log('User info loaded:', { userName, doctorId, speciality });
        
    } catch (error) {
        console.error('Error parsing user data:', error);
        showAuthError('Error loading user information. Please login again.');
    }
}

// Attach authentication event listeners
function attachAuthEventListeners() {
    // Add logout handler to all logout buttons
    const logoutButtons = document.querySelectorAll('a[href="/HTML/index.html"]');
    logoutButtons.forEach(button => {
        if (button.textContent.includes('Logout')) {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                handleLogout();
            });
        }
    });
    
    // Add session check on page visibility change
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            // Page became visible, check session
            checkDoctorAuthentication();
        }
    });
    
    // Periodic session check (every 5 minutes)
    setInterval(checkDoctorAuthentication, 5 * 60 * 1000);
}

// Handle user logout
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        performLogout();
    }
}

// Perform logout operation
function performLogout() {
    try {
        // Clear user session
        clearUserSession();
        
        // Show logout message
        showAlert('You have been logged out successfully.', 'success');
        
        // Redirect after short delay
        setTimeout(() => {
            window.location.href = '/HTML/index.html';
        }, 1500);
        
    } catch (error) {
        console.error('Error during logout:', error);
        // Force redirect even if there's an error
        window.location.href = '/HTML/index.html';
    }
}

// Clear user session data
function clearUserSession() {
    // Remove all HealSync related data
    const keysToRemove = [
        'healSync_userType',
        'healSync_userData',
        'healSync_patientId',
        'healSync_doctorId',
        'healSync_userName',
        'healSync_loginTime',
        'currentDoctorId'
    ];
    
    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
    });
    
    console.log('User session cleared');
}

// Show authentication error
function showAuthError(message) {
    alert(message);
    console.error('Auth Error:', message);
}

// Redirect to login page
function redirectToLogin() {
    window.location.href = '/HTML/login.html';
}

// Show alert message (reuse from main dashboard if available)
function showAlert(message, type) {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) {
        // If no alert container, use browser alert
        alert(message);
        return;
    }
    
    // Clear existing alerts
    alertContainer.innerHTML = '';
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <span>${message}</span>
        <button class="alert-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    alertContainer.appendChild(alert);
    
    // Auto remove success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, 5000);
    }
}

// Get current doctor information
function getCurrentDoctor() {
    try {
        const userData = localStorage.getItem('healSync_userData');
        if (userData) {
            return JSON.parse(userData);
        }
    } catch (error) {
        console.error('Error getting current doctor:', error);
    }
    return null;
}

// Check if user has permission for specific actions
function hasPermission(action) {
    const doctor = getCurrentDoctor();
    if (!doctor) return false;
    
    // For now, all authenticated doctors have all permissions
    // This can be extended for role-based permissions
    return true;
}

// Export functions for use in other scripts
window.DoctorAuth = {
    getCurrentDoctor,
    hasPermission,
    handleLogout,
    clearUserSession,
    showAlert,
    checkDoctorAuthentication
};
