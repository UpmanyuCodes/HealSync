import { PatientApiService } from './patient-api-service.js';
import { showSnackbar } from './snackbar.js';

class MoodTracker {
    constructor() {
        this.apiService = new PatientApiService();
        this.selectedMood = null;
        
        this.initializeElements();
        this.addEventListeners();
        if (this.painSlider) {
            this.updatePainDisplay(); // Initial display update
        }
    }

    initializeElements() {
        this.form = document.getElementById('tracker-form');
        this.emojiOptions = document.querySelectorAll('.emoji-option');
        this.painSlider = document.getElementById('pain-slider');
        this.painValueDisplay = document.querySelector('.pain-value');
        this.painDescription = document.querySelector('.pain-description');
        this.notesInput = document.getElementById('notes');
        this.submitBtn = document.getElementById('submit-btn');
        this.logoutBtn = document.querySelector('.logout-btn');
    }

    addEventListeners() {
        if (this.form) {
            this.form.addEventListener('submit', this.handleSubmit.bind(this));
        }
        this.emojiOptions.forEach(option => {
            option.addEventListener('click', () => this.selectMood(option));
        });
        if (this.painSlider) {
            this.painSlider.addEventListener('input', this.updatePainDisplay.bind(this));
        }
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', this.handleLogout.bind(this));
        }
    }

    selectMood(selectedOption) {
        this.emojiOptions.forEach(option => option.classList.remove('selected'));
        selectedOption.classList.add('selected');
        this.selectedMood = selectedOption.dataset.mood;
    }

    updatePainDisplay() {
        if (!this.painSlider || !this.painValueDisplay || !this.painDescription) return;

        const painLevel = parseInt(this.painSlider.value, 10);
        this.painValueDisplay.textContent = painLevel;

        const descriptions = [
            "No Pain", "Very Mild", "Discomforting", "Tolerable", "Distressing",
            "Intense", "Severe", "Very Severe", "Unbearable", "Excruciating", "Agonizing"
        ];
        this.painDescription.textContent = descriptions[painLevel];

        // Update gradient
        const percentage = painLevel * 10;
        // A simple linear interpolation from green (HSL 120) to red (HSL 0)
        const hue = 120 - (120 * (percentage / 100));
        this.painSlider.style.background = `linear-gradient(to right, hsl(${hue}, 70%, 50%) ${percentage}%, #d3d3d3 ${percentage}%)`;
    }

    async handleSubmit(event) {
        event.preventDefault();
        const patientId = localStorage.getItem('patientId');

        if (!patientId) {
            showSnackbar("Patient ID not found. Please log in again.", "error");
            return;
        }

        if (!this.selectedMood) {
            showSnackbar("Please select a mood.", "error");
            return;
        }

        const data = {
            patientId: patientId,
            date: new Date().toISOString(),
            mood: this.selectedMood,
            painLevel: parseInt(this.painSlider.value, 10),
            notes: this.notesInput.value.trim()
        };

        this.submitBtn.disabled = true;
        this.submitBtn.textContent = 'Saving...';

        try {
            const response = await this.apiService.trackEmotion(data);
            showSnackbar("Health data saved successfully!", "success");
            // Optionally redirect or clear form
            // window.location.href = '/HTML/patient-health-tracker.html'; // Go to calendar view
            this.form.reset();
            this.emojiOptions.forEach(option => option.classList.remove('selected'));
            this.selectedMood = null;
            this.painSlider.value = 0;
            this.updatePainDisplay();

        } catch (error) {
            console.error("Error saving health data:", error);
            showSnackbar("Failed to save data. Please try again.", "error");
        } finally {
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = 'Save Today\'s Data';
        }
    }

    handleLogout() {
        localStorage.clear();
        window.location.href = '/HTML/login.html';
    }
}

// Initialize the tracker when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if we are on the tracker page by looking for a specific element
    if (document.getElementById('tracker-form')) {
        new MoodTracker();
    }
});

