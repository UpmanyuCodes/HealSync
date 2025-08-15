/**
 * Snackbar Notification System
 * Provides toast-style notifications for user feedback
 */

class SnackbarSystem {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Create snackbar container if it doesn't exist
        if (!document.getElementById('snackbar-container')) {
            this.container = document.createElement('div');
            this.container.id = 'snackbar-container';
            this.container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
            `;
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('snackbar-container');
        }
    }

    show(message, type = 'info', duration = 3000) {
        const snackbar = document.createElement('div');
        snackbar.className = `snackbar snackbar-${type}`;
        snackbar.textContent = message;
        
        // Snackbar styling
        snackbar.style.cssText = `
            background: ${this.getBackgroundColor(type)};
            color: white;
            padding: 12px 16px;
            margin-bottom: 10px;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            pointer-events: auto;
            cursor: pointer;
            max-width: 300px;
            word-wrap: break-word;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            font-family: Arial, sans-serif;
            font-size: 14px;
            line-height: 1.4;
        `;

        this.container.appendChild(snackbar);

        // Animate in
        setTimeout(() => {
            snackbar.style.opacity = '1';
            snackbar.style.transform = 'translateX(0)';
        }, 10);

        // Auto remove
        setTimeout(() => {
            this.remove(snackbar);
        }, duration);

        // Click to remove
        snackbar.addEventListener('click', () => {
            this.remove(snackbar);
        });

        return snackbar;
    }

    remove(snackbar) {
        if (snackbar && snackbar.parentNode) {
            snackbar.style.opacity = '0';
            snackbar.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (snackbar.parentNode) {
                    snackbar.parentNode.removeChild(snackbar);
                }
            }, 300);
        }
    }

    getBackgroundColor(type) {
        const colors = {
            success: '#4CAF50',
            error: '#F44336',
            warning: '#FF9800',
            info: '#2196F3'
        };
        return colors[type] || colors.info;
    }

    // Convenience methods
    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    error(message, duration) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration) {
        return this.show(message, 'info', duration);
    }
}

// Global snackbar instance
const snackbar = new SnackbarSystem();

// Global function for easy access
function showSnackbar(message, type, duration) {
    return snackbar.show(message, type, duration);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SnackbarSystem;
}
