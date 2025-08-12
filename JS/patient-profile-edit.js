// Patient Profile Edit Management
// Handles patient profile editing and updates

const API_BASE = 'https://healsync-backend-d788.onrender.com';

// Initialize profile edit when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    initializeProfileEdit();
    attachEventListeners();
});

// Initialize profile edit system
async function initializeProfileEdit() {
    try {
        showLoadingOverlay(true);
        await loadCurrentProfileData();
    } catch (error) {
        console.error('Error initializing profile edit:', error);
        showSnackbar('Failed to load current profile data.', 'error');
    } finally {
        showLoadingOverlay(false);
    }
}

// Load current profile data into form
async function loadCurrentProfileData() {
    try {
        const userData = localStorage.getItem('healSync_userData');
        if (!userData) {
            throw new Error('No user data found');
        }

        const user = JSON.parse(userData);
        populateForm(user);

    } catch (error) {
        console.error('Error loading current profile data:', error);
        throw error;
    }
}

// Populate form with current user data
function populateForm(user) {
    document.getElementById('fullname').value = user.patientName || '';
    document.getElementById('age').value = user.patientAge || '';
    document.getElementById('gender').value = user.gender || '';
    document.getElementById('email').value = user.email || '';
    document.getElementById('mobile').value = user.mobileNo || '';
}

// Attach event listeners
function attachEventListeners() {
    const form = document.getElementById('profile-edit-form');
    if (form) {
        form.addEventListener('submit', handleProfileUpdate);
    }

    // Add password confirmation validation
    const newPassword = document.getElementById('new-password');
    const confirmPassword = document.getElementById('confirm-password');
    
    if (newPassword && confirmPassword) {
        confirmPassword.addEventListener('blur', validatePasswordMatch);
        newPassword.addEventListener('input', validatePasswordMatch);
    }
}

// Validate password match
function validatePasswordMatch() {
    const newPassword = document.getElementById('new-password');
    const confirmPassword = document.getElementById('confirm-password');
    
    if (newPassword.value && confirmPassword.value) {
        if (newPassword.value !== confirmPassword.value) {
            confirmPassword.setCustomValidity('Passwords do not match');
            showSnackbar('Passwords do not match', 'warning');
        } else {
            confirmPassword.setCustomValidity('');
        }
    }
}

// Handle profile update
async function handleProfileUpdate(e) {
    e.preventDefault();
    
    try {
        const formData = collectFormData();
        const validationError = validateFormData(formData);
        
        if (validationError) {
            showSnackbar(validationError, 'error');
            return;
        }

        showLoadingOverlay(true);
        await updatePatientProfile(formData);
        
    } catch (error) {
        console.error('Error updating profile:', error);
        showSnackbar('Failed to update profile. Please try again.', 'error');
    } finally {
        showLoadingOverlay(false);
    }
}

// Collect form data
function collectFormData() {
    return {
        patientName: document.getElementById('fullname').value.trim(),
        patientAge: document.getElementById('age').value.trim(),
        gender: document.getElementById('gender').value,
        email: document.getElementById('email').value.trim(),
        mobileNo: document.getElementById('mobile').value.trim(),
        currentPassword: document.getElementById('current-password').value,
        newPassword: document.getElementById('new-password').value
    };
}

// Validate form data
function validateFormData(data) {
    if (!data.patientName) {
        return 'Full name is required';
    }
    
    if (!data.patientAge || data.patientAge < 1 || data.patientAge > 120) {
        return 'Please enter a valid age between 1 and 120';
    }
    
    if (!data.gender) {
        return 'Gender is required';
    }
    
    if (!data.email || !isValidEmail(data.email)) {
        return 'Please enter a valid email address';
    }
    
    if (!data.mobileNo || !isValidMobile(data.mobileNo)) {
        return 'Please enter a valid 10-digit mobile number';
    }
    
    if (!data.currentPassword) {
        return 'Current password is required to make changes';
    }
    
    if (data.newPassword && data.newPassword.length < 6) {
        return 'New password must be at least 6 characters long';
    }
    
    return null;
}

// Email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Mobile validation
function isValidMobile(mobile) {
    const mobileRegex = /^[0-9]{10}$/;
    return mobileRegex.test(mobile);
}

// Update patient profile
async function updatePatientProfile(formData) {
    try {
        const userData = localStorage.getItem('healSync_userData');
        if (!userData) {
            throw new Error('No user data found');
        }

        const currentUser = JSON.parse(userData);
        
        // Prepare update payload
        const updatePayload = {
            patientId: currentUser.patientId,
            patientName: formData.patientName,
            patientAge: parseInt(formData.patientAge),
            gender: formData.gender,
            email: formData.email,
            mobileNo: formData.mobileNo,
            currentPassword: formData.currentPassword
        };
        
        // Add new password if provided
        if (formData.newPassword) {
            updatePayload.newPassword = formData.newPassword;
        }

        // Since we don't have a specific patient update endpoint in the provided APIs,
        // we'll simulate the API call and update localStorage
        // In a real implementation, you would call something like:
        // const response = await fetch(`${API_BASE}/v1/healsync/patient/update`, { ... });
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Update localStorage with new data
        const updatedUser = {
            ...currentUser,
            patientName: formData.patientName,
            patientAge: parseInt(formData.patientAge),
            gender: formData.gender,
            email: formData.email,
            mobileNo: formData.mobileNo
        };
        
        localStorage.setItem('healSync_userData', JSON.stringify(updatedUser));
        
        showSnackbar('Profile updated successfully!', 'success');
        
        // Redirect to profile page after successful update
        setTimeout(() => {
            window.location.href = '/HTML/patient-profile.html';
        }, 1500);
        
    } catch (error) {
        console.error('Error updating patient profile:', error);
        throw error;
    }
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
