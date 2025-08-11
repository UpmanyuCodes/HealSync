// Admin Login - HealSync
const API_BASE = 'https://healsync-backend-d788.onrender.com';

const loginForm = document.getElementById('admin-login-form');
const alertContainer = document.getElementById('alert-container');
const loginBtn = document.getElementById('login-btn');
const btnText = document.getElementById('btn-text');

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Check if admin is already logged in
    checkExistingSession();
});

// Check if admin is already logged in
function checkExistingSession() {
    const adminSession = localStorage.getItem('healSync_adminSession');
    const loginTime = localStorage.getItem('healSync_adminLoginTime');
    
    if (adminSession && loginTime) {
        // Check if session is still valid (24 hours)
        const loginDate = new Date(loginTime);
        const now = new Date();
        const hoursDiff = (now - loginDate) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
            // Session is still valid, redirect to admin panel
            showAlert('You are already logged in. Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = '/admin/admin.html';
            }, 1000);
        } else {
            // Session expired, clear storage
            clearAdminSession();
        }
    }
}

// Handle login form submission
loginForm?.addEventListener('submit', async function(event) {
    event.preventDefault();
    
    // Show loading state
    setLoadingState(true);
    clearAlerts();
    
    try {
        // Get form data
        const formData = new FormData(loginForm);
        const email = formData.get('email')?.trim();
        const password = formData.get('password');
        
        // Validate form
        if (!validateForm(email, password)) {
            return;
        }
        
        // Attempt admin login
        const loginResult = await loginAdmin(email, password);
        
        // Handle successful login
        if (loginResult.success) {
            showAlert('Login successful! Redirecting to admin panel...', 'success');
            
            // Store admin session
            storeAdminSession(loginResult.data);
            
            // Redirect after short delay
            setTimeout(() => {
                window.location.href = '/admin/admin.html';
            }, 1500);
        } else {
            throw new Error(loginResult.error);
        }
        
    } catch (error) {
        showAlert(error.message, 'error');
        console.error('Admin login error:', error);
    } finally {
        setLoadingState(false);
    }
});

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

// Admin login API call
async function loginAdmin(email, password) {
    try {
        const response = await fetch(`${API_BASE}/v1/healsync/admin/login`, {
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
            const adminData = await response.json();
            return {
                success: true,
                data: adminData
            };
        } else if (response.status === 401) {
            return {
                success: false,
                error: 'Invalid email or password. Please check your credentials.'
            };
        } else if (response.status === 403) {
            return {
                success: false,
                error: 'Access denied. You do not have admin privileges.'
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

// Store admin session data
function storeAdminSession(adminData) {
    localStorage.setItem('healSync_adminSession', JSON.stringify(adminData));
    localStorage.setItem('healSync_adminLoginTime', new Date().toISOString());
    localStorage.setItem('healSync_adminEmail', adminData.email || '');
    localStorage.setItem('healSync_adminName', adminData.name || 'Admin');
}

// Clear admin session
function clearAdminSession() {
    localStorage.removeItem('healSync_adminSession');
    localStorage.removeItem('healSync_adminLoginTime');
    localStorage.removeItem('healSync_adminEmail');
    localStorage.removeItem('healSync_adminName');
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

// Handle logout (can be called from admin panel)
function adminLogout() {
    clearAdminSession();
    showSnack('You have been logged out successfully.', 'success');
    setTimeout(() => {
        window.location.href = '/admin/login.html';
    }, 1000);
}

// Export for use in admin panel
if (typeof window !== 'undefined') {
    window.adminLogout = adminLogout;
}
