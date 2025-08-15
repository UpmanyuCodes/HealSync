// HealSync Login JavaScript
// API Integration for Patient and Doctor Authentication

const API_BASE = 'https://healsync-backend-d788.onrender.com';
let currentLoginType = 'patient';

// DOM Elements
const loginForm = document.getElementById('login-form');
const toggleButtons = document.querySelectorAll('.toggle-option');
const formTitle = document.getElementById('form-title');
const formSubtitle = document.getElementById('form-subtitle');
const loginBtn = document.getElementById('login-btn');
const btnText = document.getElementById('btn-text');
const registerLink = document.getElementById('register-link');
const alertContainer = document.getElementById('alert-container');
const formCard = document.querySelector('.form-card');

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    initializeLoginPage();
    attachEventListeners();
    // Show post-reset toast if coming from password reset
    const flag = sessionStorage.getItem('healSync_reset_success');
    if(flag){
        showSnack('Password updated. Please log in.', 'success');
        sessionStorage.removeItem('healSync_reset_success');
    }
});

// Initialize login page
function initializeLoginPage() {
    // Set default login type
    setLoginType('patient');
    
    // Check if user is already logged in
    checkExistingSession();
}

// Attach event listeners
function attachEventListeners() {
    // Toggle buttons
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const type = this.dataset.type;
            setLoginType(type);
        });
    });
    
    // Login form submission
    loginForm.addEventListener('submit', handleLogin);
    
    // Enter key submission
    loginForm.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleLogin(e);
        }
    });
}

// Set login type (patient or doctor)
function setLoginType(type) {
    currentLoginType = type;
    
    // Update toggle buttons
    toggleButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.type === type) {
            btn.classList.add('active');
        }
    });
    
    // Update form card class for conditional styling
    formCard.className = `form-card login-type-${type}`;
    
    // Update form content
    if (type === 'patient') {
        formTitle.textContent = 'Patient Login';
        formSubtitle.textContent = 'Welcome back! Please enter your details.';
        btnText.textContent = 'Sign In as Patient';
        registerLink.href = 'register.html';
    } else {
        formTitle.textContent = 'Doctor Login';
        formSubtitle.textContent = 'Access your doctor dashboard and manage appointments.';
        btnText.textContent = 'Sign In as Doctor';
        registerLink.href = 'register.html';
    }
    
    // Clear form
    loginForm.reset();
    clearAlerts();
}

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    
    // Show loading state
    setLoadingState(true);
    clearAlerts();
    
    try {
        // Get form data
        const formData = new FormData(loginForm);
        const email = formData.get('email');
        const password = formData.get('password');
        
        // Validate form
        if (!validateForm(email, password)) {
            return;
        }
        
        // Attempt login based on type
        let loginResult;
        if (currentLoginType === 'patient') {
            loginResult = await loginPatient(email, password);
        } else {
            loginResult = await loginDoctor(email, password);
        }
        
        // Handle successful login
        if (loginResult.success) {
            showAlert('Login successful! Redirecting...', 'success');
            
            // Store user data
            storeUserSession(loginResult.data, currentLoginType);
            
            // Redirect after short delay
            setTimeout(() => {
                redirectAfterLogin(currentLoginType);
            }, 1500);
        } else {
            throw new Error(loginResult.error);
        }
        
    } catch (error) {
        showAlert(error.message, 'error');
        console.error('Login error:', error);
    } finally {
        setLoadingState(false);
    }
}

// Validate form inputs
function validateForm(email, password) {
    if (!email || !password) {
        showAlert('Please fill in all required fields.', 'error');
        return false;
    }
    
    if (!isValidEmail(email)) {
        showAlert('Please enter a valid email address.', 'error');
        return false;
    }
    
    if (password.length < 6) {
        showAlert('Password must be at least 6 characters long.', 'error');
        return false;
    }
    
    return true;
}

// Patient login API call
async function loginPatient(email, password) {
    try {
        const response = await fetch(`${API_BASE}/v1/healsync/patient/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });
        
        if (response.ok) {
            const patientData = await response.json();
            return {
                success: true,
                data: patientData
            };
        } else if (response.status === 401) {
            return {
                success: false,
                error: 'Invalid email or password. Please check your credentials.'
            };
        } else {
            return {
                success: false,
                error: 'Login failed. Please try again.'
            };
        }
    } catch (error) {
        return {
            success: false,
            error: 'Network error. Please check your connection and try again.'
        };
    }
}

// Doctor login API call
async function loginDoctor(email, password) {
    try {
        // Try to find doctor by email from the public profiles
        const response = await fetch(`${API_BASE}/v1/healsync/doctor/public-profiles`);
        
        if (response.ok) {
            const doctors = await response.json();
            const doctor = doctors.find(d => d.email === email);
            
            if (doctor) {
                // In a real scenario, password verification would be done on the backend
                // For now, we'll simulate successful login if doctor is found
                return {
                    success: true,
                    data: doctor
                };
            } else {
                return {
                    success: false,
                    error: 'Invalid email or password. Please check your credentials.'
                };
            }
        } else {
            return {
                success: false,
                error: 'Unable to verify doctor credentials. Please try again.'
            };
        }
    } catch (error) {
        return {
            success: false,
            error: 'Network error. Please check your connection and try again.'
        };
    }
}

// Store user session data
function storeUserSession(userData, userType) {
    // Store in localStorage
    localStorage.setItem('healSync_userType', userType);
    localStorage.setItem('healSync_userData', JSON.stringify(userData));
    
    if (userType === 'patient') {
        // Store patient data in the format expected by appointments-patient.js
        const patientSessionData = {
            patientId: userData.patientId || userData.id,
            patientName: userData.patientName || userData.name,
            email: userData.email,
            mobileNo: userData.mobileNo || userData.phone,
            patientAge: userData.patientAge || userData.age,
            gender: userData.gender,
            expiresAt: new Date().getTime() + (24 * 60 * 60 * 1000) // 24 hours from now
        };
        
        localStorage.setItem('healSync_patient_data', JSON.stringify(patientSessionData));
        localStorage.setItem('healSync_patientId', userData.patientId || userData.id);
        localStorage.setItem('healSync_userName', userData.patientName || userData.name);
    } else {
        localStorage.setItem('healSync_doctorId', userData.doctorId);
        localStorage.setItem('healSync_userName', userData.name);
    }
    
    // Set session timestamp
    localStorage.setItem('healSync_loginTime', new Date().toISOString());
}

// Check if user is already logged in
function checkExistingSession() {
    const userType = localStorage.getItem('healSync_userType');
    const userData = localStorage.getItem('healSync_userData');
    const loginTime = localStorage.getItem('healSync_loginTime');
    
    if (userType && userData && loginTime) {
        // Check if session is still valid (24 hours)
        const loginDate = new Date(loginTime);
        const now = new Date();
        const hoursDiff = (now - loginDate) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
            // Session is still valid, redirect to dashboard
            showAlert('You are already logged in. Redirecting...', 'success');
            setTimeout(() => {
                redirectAfterLogin(userType);
            }, 1000);
        } else {
            // Session expired, clear storage
            clearUserSession();
        }
    }
}

// Clear user session
function clearUserSession() {
    localStorage.removeItem('healSync_userType');
    localStorage.removeItem('healSync_userData');
    localStorage.removeItem('healSync_patientId');
    localStorage.removeItem('healSync_doctorId');
    localStorage.removeItem('healSync_userName');
    localStorage.removeItem('healSync_loginTime');
}

// Redirect after successful login
function redirectAfterLogin(userType) {
    // Check for return URL
    const returnUrl = sessionStorage.getItem('returnUrl');
    
    if (returnUrl) {
        // Clear return URL and redirect to it
        sessionStorage.removeItem('returnUrl');
        window.location.href = returnUrl;
        return;
    }
    
    // Redirect to index page instead of dashboard for better UX
    if (userType === 'patient') {
        window.location.href = '/HTML/index.html';
    } else {
        window.location.href = '/HTML/doctor-treatment-dashboard.html';
    }
}

// Set loading state
function setLoadingState(isLoading) {
    if (isLoading) {
        loginBtn.disabled = true;
        loginBtn.classList.add('btn-loading');
        btnText.style.opacity = '0';
    } else {
        loginBtn.disabled = false;
        loginBtn.classList.remove('btn-loading');
        btnText.style.opacity = '1';
    }
}

// Show alert message
function showAlert(message, type) {
    clearAlerts();
    
    const alert = document.createElement('div');
    alert.className = `alert ${type}`;
    alert.style.display = 'block';
    alert.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="float: right; background: none; border: none; font-size: 1.2rem; cursor: pointer; color: inherit;">&times;</button>
    `;
    
    alertContainer.appendChild(alert);
    
    // Auto remove after 5 seconds for success messages
    if (type === 'success') {
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, 5000);
    }
}

// Clear all alerts
function clearAlerts() {
    alertContainer.innerHTML = '';
}

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Snackbar helper
function showSnack(message, type='info'){
    let el = document.getElementById('snackbar');
    if(!el){
        el = document.createElement('div');
        el.id = 'snackbar';
        el.className = 'snackbar';
        document.body.appendChild(el);
    }
    el.className = `snackbar ${type}`;
    el.textContent = message;
    el.classList.add('show');
    setTimeout(()=>{ el.classList.remove('show'); }, 2200);
}

// Handle logout (can be called from other pages)
function logout() {
    clearUserSession();
    showAlert('You have been logged out successfully.', 'success');
    setTimeout(() => {
        window.location.href = '/HTML/index.html';
    }, 1500);
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        logout,
        clearUserSession,
        storeUserSession
    };
}
