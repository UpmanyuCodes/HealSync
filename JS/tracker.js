/* ================================
   MOOD & PAIN TRACKER - HealSync
   ================================ */

class MoodTracker {
    constructor() {
        this.selectedMood = null;
        this.selectedIntensity = null;
        this.painLevel = 0;
        this.currentPatientId = this.getPatientId();
        
        this.initializeElements();
        this.setupEventListeners();
        this.updatePainDisplay();
    }
    
    initializeElements() {
        this.form = document.getElementById('tracker-form');
        this.submitBtn = document.getElementById('submit-btn');
        this.btnText = document.getElementById('btn-text');
        this.painSlider = document.getElementById('pain-slider');
        this.painValue = document.querySelector('.pain-value');
        this.painDescription = document.querySelector('.pain-description');
        this.notesTextarea = document.getElementById('notes');
        this.alertContainer = document.getElementById('alert-container');
        this.emojiOptions = document.querySelectorAll('.emoji-option');
    }
    
    setupEventListeners() {
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Emoji selection
        this.emojiOptions.forEach(option => {
            option.addEventListener('click', () => this.selectMood(option));
        });
        
        // Pain slider
        this.painSlider.addEventListener('input', () => this.updatePainDisplay());
    }
    
    selectMood(selectedOption) {
        // Remove previous selection
        this.emojiOptions.forEach(option => {
            option.classList.remove('selected');
        });
        
        // Add selection to clicked option
        selectedOption.classList.add('selected');
        
        // Store selected mood data
        this.selectedMood = selectedOption.dataset.mood;
        this.selectedIntensity = parseInt(selectedOption.dataset.intensity);
    }
    
    updatePainDisplay() {
        this.painLevel = parseInt(this.painSlider.value);
        this.painValue.textContent = this.painLevel;
        
        // Update pain description based on level
        const descriptions = {
            0: 'No Pain',
            1: 'Very Mild',
            2: 'Mild',
            3: 'Mild-Moderate',
            4: 'Moderate',
            5: 'Moderate-Severe',
            6: 'Severe',
            7: 'Very Severe',
            8: 'Extremely Severe',
            9: 'Unbearable',
            10: 'Maximum Pain'
        };
        
        this.painDescription.textContent = descriptions[this.painLevel] || 'Unknown';
        
        // Update slider thumb color based on pain level
        const colors = {
            low: '#22c55e',    // Green for 0-3
            medium: '#eab308', // Yellow for 4-6
            high: '#ef4444'    // Red for 7-10
        };
        
        let color = colors.low;
        if (this.painLevel >= 7) color = colors.high;
        else if (this.painLevel >= 4) color = colors.medium;
        
        this.painSlider.style.setProperty('--thumb-color', color);
    }
    
    getPatientId() {
        // Try to get patient ID from session storage, localStorage, or URL params
        const sessionPatientId = sessionStorage.getItem('patientId');
        const localPatientId = localStorage.getItem('patientId');
        const urlParams = new URLSearchParams(window.location.search);
        const urlPatientId = urlParams.get('patientId');
        
        return sessionPatientId || localPatientId || urlPatientId || null;
    }
    
    validateForm() {
        const errors = [];
        
        if (!this.selectedMood) {
            errors.push('Please select your mood');
        }
        
        if (!this.currentPatientId) {
            errors.push('Patient ID not found. Please log in again');
        }
        
        return errors;
    }
    
    async handleSubmit(e) {
        e.preventDefault();
        
        // Validate form
        const errors = this.validateForm();
        if (errors.length > 0) {
            this.showAlert('error', errors.join('. '));
            return;
        }
        
        // Show loading state
        this.setLoadingState(true);
        
        try {
            // Prepare API data according to HealSync API specification
            const moodData = {
                patientId: parseInt(this.currentPatientId),
                emotion: this.selectedMood,
                intensity: this.selectedIntensity,
                notes: this.notesTextarea.value.trim() || `Pain Level: ${this.painLevel}/10`,
                date: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
            };
            
            console.log('Submitting mood data:', moodData);
            
            // Make API call
            const response = await fetch('https://healsync-backend-d788.onrender.com/v1/healsync/emotion/track', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(moodData)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Error (${response.status}): ${errorText}`);
            }
            
            const result = await response.json();
            console.log('API Response:', result);
            
            // Show success message
            this.showAlert('success', 'Your mood and pain level have been tracked successfully! This information will help your healthcare team provide better care.');
            
            // Reset form after successful submission
            setTimeout(() => {
                this.resetForm();
            }, 2000);
            
        } catch (error) {
            console.error('Submission error:', error);
            this.showAlert('error', `Failed to track your mood: ${error.message}. Please try again or contact support if the problem persists.`);
        } finally {
            this.setLoadingState(false);
        }
    }
    
    setLoadingState(isLoading) {
        if (isLoading) {
            this.submitBtn.classList.add('btn-loading');
            this.submitBtn.disabled = true;
        } else {
            this.submitBtn.classList.remove('btn-loading');
            this.submitBtn.disabled = false;
        }
    }
    
    showAlert(type, message) {
        // Remove existing alerts
        this.alertContainer.innerHTML = '';
        
        // Create new alert
        const alert = document.createElement('div');
        alert.className = `alert ${type}`;
        alert.style.display = 'block';
        alert.textContent = message;
        
        // Add to container
        this.alertContainer.appendChild(alert);
        
        // Auto-hide after 5 seconds for success messages
        if (type === 'success') {
            setTimeout(() => {
                alert.style.display = 'none';
            }, 5000);
        }
    }
    
    resetForm() {
        // Reset mood selection
        this.emojiOptions.forEach(option => {
            option.classList.remove('selected');
        });
        this.selectedMood = null;
        this.selectedIntensity = null;
        
        // Reset pain slider
        this.painSlider.value = 0;
        this.updatePainDisplay();
        
        // Reset notes
        this.notesTextarea.value = '';
        
        // Clear alerts
        this.alertContainer.innerHTML = '';
    }
}

// Initialize the mood tracker when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MoodTracker();
});

// Utility function for session management
function redirectToLogin() {
    const currentPage = encodeURIComponent(window.location.pathname);
    window.location.href = `/HTML/login.html?redirect=${currentPage}`;
}

// Check if user is logged in
function checkAuth() {
    const patientId = sessionStorage.getItem('patientId') || localStorage.getItem('patientId');
    if (!patientId) {
        console.warn('No patient ID found, user may need to log in');
        // Optionally redirect to login or show a warning
        // redirectToLogin();
    }
    return patientId;
}
