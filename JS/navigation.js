// HealSync Navigation Manager
// Handles routing and navigation between different sections

// Prevent multiple initialization
if (!window.NavigationManagerInitialized) {
    window.NavigationManagerInitialized = true;

class NavigationManager {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.userRole = this.getUserRole();
        this.initializeNavigation();
    }

    // Get current page from URL
    getCurrentPage() {
        const path = window.location.pathname;
        const page = path.split('/').pop().replace('.html', '') || 'index';
        return page;
    }

    // Determine user role from session data
    getUserRole() {
        const patientData = localStorage.getItem('healSync_patient_data');
        const doctorData = localStorage.getItem('healSync_doctor_data');
        const adminData = localStorage.getItem('healSync_adminSession');

        if (adminData) return 'admin';
        if (doctorData) return 'doctor';
        if (patientData) return 'patient';
        return 'guest';
    }

    // Initialize navigation event listeners
    initializeNavigation() {
        // Handle navigation clicks
        document.addEventListener('click', this.handleNavigationClick.bind(this));
        
        // Handle back/forward browser navigation
        window.addEventListener('popstate', this.handlePopState.bind(this));
        
        // Update navigation states
        this.updateNavigationStates();
    }

    // Handle navigation link clicks
    handleNavigationClick(event) {
        const link = event.target.closest('a[href]');
        if (!link) return;

        const href = link.getAttribute('href');
        
        // Skip external links and anchors
        if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) {
            return;
        }

        // Check if navigation is allowed
        if (!this.isNavigationAllowed(href)) {
            event.preventDefault();
            this.handleUnauthorizedNavigation(href);
            return;
        }

        // Add visual feedback for navigation
        this.addNavigationFeedback(link);
    }

    // Check if navigation to a specific route is allowed
    isNavigationAllowed(href) {
        const userRole = this.getUserRole();
        
        // Admin routes
        if (href.includes('/admin/')) {
            return userRole === 'admin';
        }

        // Doctor-specific routes
        if (href.includes('doctor-') || href.includes('appointments-doctor')) {
            return userRole === 'doctor' || userRole === 'admin';
        }

        // Patient-specific routes
        if (href.includes('patient-') || href.includes('appointments-patient')) {
            return userRole === 'patient' || userRole === 'admin';
        }

        // Treatment dashboards
        if (href.includes('treatment-dashboard')) {
            if (href.includes('doctor-treatment-dashboard')) {
                return userRole === 'doctor' || userRole === 'admin';
            }
            if (href.includes('patient-treatment-dashboard')) {
                return userRole === 'patient' || userRole === 'admin';
            }
        }

        // Public routes (accessible to all)
        const publicRoutes = [
            'index', 'login', 'register', 'forgot-password', 
            'reset-password', 'verify-otp', 'doctors', 'tracker'
        ];
        
        const page = href.split('/').pop().replace('.html', '');
        return publicRoutes.includes(page);
    }

    // Handle unauthorized navigation attempts
    handleUnauthorizedNavigation(href) {
        const userRole = this.getUserRole();
        
        if (userRole === 'guest') {
            // Redirect to login
            if (typeof showSnackbar === 'function') {
                showSnackbar('Please log in to access this page', 'warning');
            }
            setTimeout(() => {
                window.location.href = '/HTML/login.html';
            }, 1000);
        } else {
            // Show access denied message
            if (typeof showSnackbar === 'function') {
                showSnackbar('Access denied. You do not have permission to view this page.', 'error');
            }
        }
    }

    // Add visual feedback for navigation
    addNavigationFeedback(link) {
        link.style.opacity = '0.7';
        link.style.transform = 'scale(0.98)';
        
        setTimeout(() => {
            link.style.opacity = '';
            link.style.transform = '';
        }, 150);
    }

    // Handle browser back/forward navigation
    handlePopState(event) {
        this.currentPage = this.getCurrentPage();
        this.updateNavigationStates();
    }

    // Update navigation states (active links, user-specific menus)
    updateNavigationStates() {
        this.updateActiveNavLinks();
        this.updateUserSpecificMenus();
        this.updateUserInfo();
    }

    // Update active navigation links
    updateActiveNavLinks() {
        const navLinks = document.querySelectorAll('nav a[href*=".html"]');
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            const page = href.split('/').pop().replace('.html', '');
            
            if (page === this.currentPage) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    // Update user-specific menus
    updateUserSpecificMenus() {
        const userRole = this.getUserRole();
        
        // Hide/show menu items based on user role
        const doctorItems = document.querySelectorAll('[data-role="doctor"]');
        const patientItems = document.querySelectorAll('[data-role="patient"]');
        const adminItems = document.querySelectorAll('[data-role="admin"]');
        const guestItems = document.querySelectorAll('[data-role="guest"]');

        // Show/hide based on role
        this.toggleElementsByRole(doctorItems, userRole === 'doctor');
        this.toggleElementsByRole(patientItems, userRole === 'patient');
        this.toggleElementsByRole(adminItems, userRole === 'admin');
        this.toggleElementsByRole(guestItems, userRole === 'guest');
    }

    // Toggle elements visibility based on role
    toggleElementsByRole(elements, shouldShow) {
        elements.forEach(element => {
            element.style.display = shouldShow ? '' : 'none';
        });
    }

    // Update user info display
    updateUserInfo() {
        const userRole = this.getUserRole();
        const userInfoElements = document.querySelectorAll('[data-user-info]');

        userInfoElements.forEach(element => {
            const infoType = element.dataset.userInfo;
            let userData = null;

            if (userRole === 'patient') {
                userData = JSON.parse(localStorage.getItem('healSync_patient_data') || '{}');
            } else if (userRole === 'doctor') {
                userData = JSON.parse(localStorage.getItem('healSync_doctor_data') || '{}');
            } else if (userRole === 'admin') {
                userData = JSON.parse(localStorage.getItem('healSync_adminSession') || '{}');
            }

            if (userData) {
                switch (infoType) {
                    case 'name':
                        element.textContent = userData.patientName || userData.name || userData.doctorName || 'User';
                        break;
                    case 'email':
                        element.textContent = userData.email || '';
                        break;
                    case 'role':
                        element.textContent = userRole.charAt(0).toUpperCase() + userRole.slice(1);
                        break;
                }
            }
        });
    }

    // Navigation helpers
    navigateTo(page) {
        if (this.isNavigationAllowed(page)) {
            window.location.href = page;
        } else {
            this.handleUnauthorizedNavigation(page);
        }
    }

    // Go back to previous page
    goBack() {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            this.navigateTo('/HTML/index.html');
        }
    }

    // Logout function
    logout() {
        const userRole = this.getUserRole();
        
        // Clear session data
        localStorage.removeItem('healSync_patient_data');
        localStorage.removeItem('healSync_doctor_data');
        localStorage.removeItem('healSync_adminSession');
        localStorage.removeItem('healSync_adminLoginTime');
        localStorage.removeItem('healSync_auth_token');

        // Show logout message
        if (typeof showSnackbar === 'function') {
            showSnackbar('Logged out successfully', 'success');
        }

        // Redirect to appropriate page
        setTimeout(() => {
            if (userRole === 'admin') {
                window.location.href = '/admin/login.html';
            } else {
                window.location.href = '/HTML/index.html';
            }
        }, 1000);
    }

    // Quick access to common pages
    quickAccess = {
        dashboard: () => {
            const userRole = this.getUserRole();
            if (userRole === 'patient') {
                this.navigateTo('/HTML/patient-treatment-dashboard.html');
            } else if (userRole === 'doctor') {
                this.navigateTo('/HTML/doctor-treatment-dashboard.html');
            } else if (userRole === 'admin') {
                this.navigateTo('/admin/admin.html');
            } else {
                this.navigateTo('/HTML/login.html');
            }
        },
        
        appointments: () => {
            const userRole = this.getUserRole();
            if (userRole === 'patient') {
                this.navigateTo('/HTML/appointments-patient.html');
            } else if (userRole === 'doctor') {
                this.navigateTo('/HTML/appointments-doctor.html');
            } else {
                this.navigateTo('/HTML/login.html');
            }
        },
        
        profile: () => {
            const userRole = this.getUserRole();
            if (userRole === 'patient') {
                this.navigateTo('/HTML/patient-profile.html');
            } else if (userRole === 'doctor') {
                this.navigateTo('/HTML/doctor-profile.html');
            } else {
                this.navigateTo('/HTML/login.html');
            }
        }
    };
}

// Global instance
const navigationManager = new NavigationManager();

// Export for global use
if (typeof window !== 'undefined') {
    window.NavigationManager = NavigationManager;
    window.navigationManager = navigationManager;
    
    // Global navigation functions
    window.navigateTo = (page) => navigationManager.navigateTo(page);
    window.goBack = () => navigationManager.goBack();
    window.logout = () => navigationManager.logout();
}

} // End of NavigationManagerInitialized check
