// HealSync Unified Authentication System
// Centralized auth handling for all user types

class HealSyncAuth {
    constructor() {
        this.apiBase = 'https://healsync-backend-d788.onrender.com';
        this.localStorageKeys = {
            patient: 'healSync_patient_data',
            doctor: 'healSync_doctor_data',
            admin: 'healSync_admin_data',
            authToken: 'healSync_auth_token'
        };
        this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
    }

    // Login methods for different user types
    async loginPatient(email, password) {
        try {
            const response = await fetch(`${this.apiBase}/auth/patient/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.setPatientSession(data.patient, data.token);
                return { success: true, patient: data.patient };
            } else {
                return { success: false, message: data.message || 'Login failed' };
            }
        } catch (error) {
            console.error('Patient login error:', error);
            return { success: false, message: 'Network error. Please try again.' };
        }
    }

    async loginDoctor(email, password) {
        try {
            const response = await fetch(`${this.apiBase}/auth/doctor/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.setDoctorSession(data.doctor, data.token);
                return { success: true, doctor: data.doctor };
            } else {
                return { success: false, message: data.message || 'Login failed' };
            }
        } catch (error) {
            console.error('Doctor login error:', error);
            return { success: false, message: 'Network error. Please try again.' };
        }
    }

    async loginAdmin(email, password) {
        try {
            // For admin, we'll use a simple check for now
            if (email === 'admin@healsync.com' && password === 'admin123') {
                const adminData = {
                    id: 'admin',
                    email: 'admin@healsync.com',
                    name: 'System Administrator',
                    role: 'admin'
                };
                this.setAdminSession(adminData);
                return { success: true, admin: adminData };
            } else {
                return { success: false, message: 'Invalid admin credentials' };
            }
        } catch (error) {
            console.error('Admin login error:', error);
            return { success: false, message: 'Network error. Please try again.' };
        }
    }

    // Session management
    setPatientSession(patientData, token = null) {
        const sessionData = {
            ...patientData,
            loginTime: Date.now(),
            role: 'patient'
        };
        localStorage.setItem(this.localStorageKeys.patient, JSON.stringify(sessionData));
        if (token) {
            localStorage.setItem(this.localStorageKeys.authToken, token);
        }
        this.clearOtherSessions('patient');
    }

    setDoctorSession(doctorData, token = null) {
        const sessionData = {
            ...doctorData,
            loginTime: Date.now(),
            role: 'doctor'
        };
        localStorage.setItem(this.localStorageKeys.doctor, JSON.stringify(sessionData));
        if (token) {
            localStorage.setItem(this.localStorageKeys.authToken, token);
        }
        this.clearOtherSessions('doctor');
    }

    setAdminSession(adminData) {
        const sessionData = {
            ...adminData,
            loginTime: Date.now(),
            role: 'admin'
        };
        localStorage.setItem(this.localStorageKeys.admin, JSON.stringify(sessionData));
        this.clearOtherSessions('admin');
    }

    clearOtherSessions(currentRole) {
        if (currentRole !== 'patient') {
            localStorage.removeItem(this.localStorageKeys.patient);
        }
        if (currentRole !== 'doctor') {
            localStorage.removeItem(this.localStorageKeys.doctor);
        }
        if (currentRole !== 'admin') {
            localStorage.removeItem(this.localStorageKeys.admin);
        }
    }

    // Get current session
    getPatientSession() {
        return this.getSession('patient');
    }

    getDoctorSession() {
        return this.getSession('doctor');
    }

    getAdminSession() {
        return this.getSession('admin');
    }

    getSession(role) {
        try {
            const sessionData = localStorage.getItem(this.localStorageKeys[role]);
            if (!sessionData) return null;

            const session = JSON.parse(sessionData);
            
            // Check if session has expired
            if (Date.now() - session.loginTime > this.sessionTimeout) {
                this.logout(role);
                return null;
            }

            return session;
        } catch (error) {
            console.error('Session retrieval error:', error);
            return null;
        }
    }

    // Get auth token
    getAuthToken() {
        return localStorage.getItem(this.localStorageKeys.authToken);
    }

    // Logout methods
    logout(role = null) {
        if (role) {
            localStorage.removeItem(this.localStorageKeys[role]);
        } else {
            // Clear all sessions
            Object.values(this.localStorageKeys).forEach(key => {
                localStorage.removeItem(key);
            });
        }
    }

    // Check authentication for page access
    requireAuth(requiredRole, redirectUrl = '/HTML/login.html') {
        const session = this.getSession(requiredRole);
        if (!session) {
            window.location.href = redirectUrl;
            return false;
        }
        return true;
    }

    // Get current authenticated user (any role)
    getCurrentUser() {
        const patient = this.getPatientSession();
        if (patient) return { ...patient, role: 'patient' };

        const doctor = this.getDoctorSession();
        if (doctor) return { ...doctor, role: 'doctor' };

        const admin = this.getAdminSession();
        if (admin) return { ...admin, role: 'admin' };

        return null;
    }

    // API request helper with auth token
    async apiRequest(endpoint, options = {}) {
        const token = this.getAuthToken();
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return fetch(`${this.apiBase}${endpoint}`, {
            ...options,
            headers
        });
    }

    // Registration methods
    async registerPatient(patientData) {
        try {
            const response = await fetch(`${this.apiBase}/auth/patient/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(patientData)
            });

            const data = await response.json();
            return { success: response.ok, data, message: data.message };
        } catch (error) {
            console.error('Patient registration error:', error);
            return { success: false, message: 'Registration failed. Please try again.' };
        }
    }

    async registerDoctor(doctorData) {
        try {
            const response = await fetch(`${this.apiBase}/auth/doctor/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(doctorData)
            });

            const data = await response.json();
            return { success: response.ok, data, message: data.message };
        } catch (error) {
            console.error('Doctor registration error:', error);
            return { success: false, message: 'Registration failed. Please try again.' };
        }
    }

    // Password reset methods
    async forgotPassword(email, userType) {
        try {
            const response = await fetch(`${this.apiBase}/auth/forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, userType })
            });

            const data = await response.json();
            return { success: response.ok, message: data.message };
        } catch (error) {
            console.error('Forgot password error:', error);
            return { success: false, message: 'Password reset failed. Please try again.' };
        }
    }

    async resetPassword(token, newPassword) {
        try {
            const response = await fetch(`${this.apiBase}/auth/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token, newPassword })
            });

            const data = await response.json();
            return { success: response.ok, message: data.message };
        } catch (error) {
            console.error('Reset password error:', error);
            return { success: false, message: 'Password reset failed. Please try again.' };
        }
    }

    // OTP verification
    async verifyOTP(email, otp, userType) {
        try {
            const response = await fetch(`${this.apiBase}/auth/verify-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, otp, userType })
            });

            const data = await response.json();
            return { success: response.ok, data, message: data.message };
        } catch (error) {
            console.error('OTP verification error:', error);
            return { success: false, message: 'OTP verification failed. Please try again.' };
        }
    }
}

// Create global auth instance
window.healSyncAuth = new HealSyncAuth();

// Utility functions for backward compatibility
function getPatientSession() {
    return window.healSyncAuth.getPatientSession();
}

function getDoctorSession() {
    return window.healSyncAuth.getDoctorSession();
}

function getAdminSession() {
    return window.healSyncAuth.getAdminSession();
}

function handlePatientLogout() {
    window.healSyncAuth.logout('patient');
    window.location.href = '/HTML/index.html';
}

function handleDoctorLogout() {
    window.healSyncAuth.logout('doctor');
    window.location.href = '/HTML/index.html';
}

function handleAdminLogout() {
    window.healSyncAuth.logout('admin');
    window.location.href = '/HTML/index.html';
}

// Auto-logout on tab close
window.addEventListener('beforeunload', function() {
    // Optional: Clear session on tab close
    // window.healSyncAuth.logout();
});

// Export for module use if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HealSyncAuth;
}
