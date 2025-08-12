// API Health Check System for HealSync
// Monitors backend connectivity and API status

class APIHealthChecker {
    constructor() {
        this.apiBase = 'https://healsync-backend-d788.onrender.com';
        this.isDevelopmentMode = true; // Set to false in production
        this.healthStatus = {
            isOnline: false,
            lastChecked: null,
            services: {
                patient: false,
                doctor: false,
                admin: false,
                diseases: false,
                medicines: false
            }
        };
        this.checkInterval = null;
    }

    // Initialize health checking
    init() {
        this.performHealthCheck();
        // Check health every 30 seconds
        this.checkInterval = setInterval(() => {
            this.performHealthCheck();
        }, 30000);
    }

    // Stop health checking
    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    // Perform comprehensive health check
    async performHealthCheck() {
        const checks = [
            { name: 'patient', endpoint: '/v1/healsync/patient/1' },
            { name: 'doctor', endpoint: '/v1/healsync/doctor/public-profiles' },
            { name: 'admin', endpoint: '/v1/healsync/disease/all' },
            { name: 'diseases', endpoint: '/v1/healsync/disease/all' },
            { name: 'medicines', endpoint: '/v1/healsync/medicine/all' }
        ];

        let onlineServices = 0;

        for (const check of checks) {
            try {
                const response = await fetch(`${this.apiBase}${check.endpoint}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    timeout: 5000
                });

                this.healthStatus.services[check.name] = response.ok;
                if (response.ok) onlineServices++;
            } catch (error) {
                this.healthStatus.services[check.name] = false;
                if (!this.isDevelopmentMode) {
                    console.warn(`Health check failed for ${check.name}:`, error.message);
                }
            }
        }

        this.healthStatus.isOnline = onlineServices > 0;
        this.healthStatus.lastChecked = new Date().toISOString();

        // Update UI if health status indicator exists
        this.updateHealthIndicator();
        
        // Show notification if all services are down
        if (onlineServices === 0) {
            this.showConnectivityWarning();
        }
    }

    // Update health status indicator in UI
    updateHealthIndicator() {
        const indicator = document.getElementById('api-health-indicator');
        if (!indicator) return;

        const { isOnline, services } = this.healthStatus;
        const serviceCount = Object.values(services).filter(Boolean).length;
        const totalServices = Object.keys(services).length;

        if (isOnline) {
            indicator.className = `health-indicator ${serviceCount === totalServices ? 'healthy' : 'degraded'}`;
            indicator.innerHTML = `
                <div class="health-dot"></div>
                <span>API: ${serviceCount}/${totalServices} services</span>
            `;
        } else {
            indicator.className = 'health-indicator offline';
            indicator.innerHTML = `
                <div class="health-dot"></div>
                <span>API: Offline</span>
            `;
        }
    }

    // Show connectivity warning
    showConnectivityWarning() {
        // Only show once per session
        if (sessionStorage.getItem('healsync_connectivity_warned')) return;

        if (typeof showSnackbar === 'function') {
            showSnackbar('Backend services are currently unavailable. Some features may not work properly.', 'warning');
        }

        sessionStorage.setItem('healsync_connectivity_warned', 'true');
    }

    // Get current health status
    getHealthStatus() {
        return { ...this.healthStatus };
    }

    // Check if specific service is available
    isServiceHealthy(serviceName) {
        return this.healthStatus.services[serviceName] || false;
    }

    // Manual health check trigger
    async checkNow() {
        await this.performHealthCheck();
        return this.getHealthStatus();
    }
}

// Global instance
const apiHealthChecker = new APIHealthChecker();

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    apiHealthChecker.init();
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    apiHealthChecker.stop();
});

// Export for global use
if (typeof window !== 'undefined') {
    window.APIHealthChecker = APIHealthChecker;
    window.apiHealthChecker = apiHealthChecker;
}
