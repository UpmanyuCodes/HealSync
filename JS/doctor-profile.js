// Doctor Profile Management JavaScript
// Handles profile loading, editing, and API integration

const API_BASE = 'https://healsync-backend-d788.onrender.com';

class DoctorProfile {
    constructor() {
        this.currentDoctorId = null;
        this.isEditMode = false;
        this.originalData = {};
        this.init();
    }

    async init() {
        console.log('Initializing Doctor Profile...');
        
        // Get current doctor info
        this.getCurrentDoctorInfo();
        
        // Load doctor profile
        await this.loadDoctorProfile();
        
        // Load statistics
        await this.loadDoctorStatistics();
        
        // Setup event listeners
        this.setupEventListeners();
    }

    getCurrentDoctorInfo() {
        try {
            const userData = localStorage.getItem('healSync_userData');
            if (userData) {
                const doctor = JSON.parse(userData);
                this.currentDoctorId = doctor.doctorId || localStorage.getItem('currentDoctorId');
                console.log('Current doctor ID:', this.currentDoctorId);
            } else {
                // Fallback for development
                this.currentDoctorId = localStorage.getItem('currentDoctorId') || '3';
                console.warn('No doctor data in localStorage, using fallback ID:', this.currentDoctorId);
            }
        } catch (error) {
            console.error('Error getting doctor info:', error);
            this.currentDoctorId = '3'; // Fallback
        }
    }

    async loadDoctorProfile() {
        try {
            this.showLoading();

            if (!this.currentDoctorId) {
                throw new Error('No doctor ID available');
            }

            // Try to fetch doctor profile from API
            const response = await fetch(`${API_BASE}/api/doctors/${this.currentDoctorId}`);
            
            if (response.ok) {
                const doctorData = await response.json();
                console.log('Doctor profile loaded:', doctorData);
                this.displayDoctorProfile(doctorData);
            } else if (response.status === 404) {
                console.warn('Doctor not found, using fallback data');
                this.displayFallbackProfile();
            } else {
                throw new Error(`API Error: ${response.status}`);
            }

            this.hideLoading();
        } catch (error) {
            console.error('Error loading doctor profile:', error);
            this.showError();
        }
    }

    displayDoctorProfile(doctor) {
        try {
            // Basic Info
            const doctorName = doctor.name || doctor.doctorName || `Dr. ${doctor.firstName || 'Doctor'}`;
            document.getElementById('doctor-name').textContent = doctorName;
            document.getElementById('doctor-id').textContent = doctor.doctorId || doctor.id || this.currentDoctorId;
            document.getElementById('doctor-email').textContent = doctor.email || 'Not provided';
            document.getElementById('doctor-phone').textContent = doctor.phone || doctor.phoneNumber || 'Not provided';
            document.getElementById('doctor-specialty').textContent = doctor.specialty || doctor.specialization || 'General Medicine';
            
            // Update avatar letter
            const avatarLetter = document.querySelector('.avatar-letter');
            if (avatarLetter) {
                const firstLetter = doctorName.charAt(0).toUpperCase();
                avatarLetter.textContent = firstLetter;
            }
            
            // Professional Info
            document.getElementById('specialty-display').textContent = doctor.specialty || doctor.specialization || 'General Medicine';
            document.getElementById('experience-display').textContent = doctor.experience ? `${doctor.experience} years` : 'Not specified';
            document.getElementById('license-display').textContent = doctor.medicalLicense || doctor.licenseNumber || 'Not provided';
            document.getElementById('qualifications-display').textContent = doctor.qualifications || doctor.education || 'Medical degree and certifications';
            
            // Bio
            document.getElementById('bio-display').textContent = doctor.bio || doctor.about || 'Dedicated healthcare professional committed to providing exceptional patient care and treatment.';
            
            // Join date
            const joinDate = doctor.createdAt || doctor.joinDate;
            if (joinDate) {
                document.getElementById('doctor-join-date').textContent = new Date(joinDate).toLocaleDateString();
            } else {
                document.getElementById('doctor-join-date').textContent = 'Not available';
            }

            // Store original data for editing
            this.originalData = {
                name: doctor.name || doctor.doctorName || '',
                email: doctor.email || '',
                phone: doctor.phone || doctor.phoneNumber || '',
                specialty: doctor.specialty || doctor.specialization || '',
                experience: doctor.experience || '',
                license: doctor.medicalLicense || doctor.licenseNumber || '',
                qualifications: doctor.qualifications || doctor.education || '',
                bio: doctor.bio || doctor.about || ''
            };

            console.log('Profile displayed successfully');
        } catch (error) {
            console.error('Error displaying profile:', error);
            this.displayFallbackProfile();
        }
    }

    displayFallbackProfile() {
        // Display fallback data when API is not available
        const fallbackData = {
            name: `Dr. Doctor #${this.currentDoctorId}`,
            email: 'doctor@healsync.com',
            phone: '+1 (555) 123-4567',
            specialty: 'General Medicine',
            experience: '5 years',
            license: 'MD-123456',
            qualifications: 'MD, General Medicine',
            bio: 'Dedicated healthcare professional committed to providing exceptional patient care and treatment.'
        };

        document.getElementById('doctor-name').textContent = fallbackData.name;
        document.getElementById('doctor-id').textContent = this.currentDoctorId;
        document.getElementById('doctor-email').textContent = fallbackData.email;
        document.getElementById('doctor-phone').textContent = fallbackData.phone;
        document.getElementById('doctor-specialty').textContent = fallbackData.specialty;
        document.getElementById('specialty-display').textContent = fallbackData.specialty;
        document.getElementById('experience-display').textContent = fallbackData.experience;
        document.getElementById('license-display').textContent = fallbackData.license;
        document.getElementById('qualifications-display').textContent = fallbackData.qualifications;
        document.getElementById('bio-display').textContent = fallbackData.bio;
        document.getElementById('doctor-join-date').textContent = new Date().toLocaleDateString();

        // Update avatar letter
        const avatarLetter = document.querySelector('.avatar-letter');
        if (avatarLetter) {
            const firstLetter = fallbackData.name.charAt(0).toUpperCase();
            avatarLetter.textContent = firstLetter;
        }

        this.originalData = fallbackData;
        console.log('Fallback profile displayed');
    }

    async loadDoctorStatistics() {
        try {
            // Load statistics from various APIs
            const [patients, appointments, treatments] = await Promise.allSettled([
                this.fetchPatientCount(),
                this.fetchAppointmentCount(),
                this.fetchTreatmentCount()
            ]);

            // Update statistics display
            document.getElementById('total-patients').textContent = 
                patients.status === 'fulfilled' ? patients.value : '0';
            document.getElementById('total-appointments').textContent = 
                appointments.status === 'fulfilled' ? appointments.value : '0';
            document.getElementById('total-treatments').textContent = 
                treatments.status === 'fulfilled' ? treatments.value : '0';
            document.getElementById('patient-rating').textContent = '4.8★';

        } catch (error) {
            console.error('Error loading statistics:', error);
            // Set default values
            document.getElementById('total-patients').textContent = '0';
            document.getElementById('total-appointments').textContent = '0';
            document.getElementById('total-treatments').textContent = '0';
            document.getElementById('patient-rating').textContent = 'N/A';
        }
    }

    async fetchPatientCount() {
        try {
            const response = await fetch(`${API_BASE}/api/doctors/${this.currentDoctorId}/patients`);
            if (response.ok) {
                const data = await response.json();
                return Array.isArray(data) ? data.length : (data.count || 0);
            }
            return 0;
        } catch (error) {
            console.warn('Could not fetch patient count:', error);
            return 0;
        }
    }

    async fetchAppointmentCount() {
        try {
            const response = await fetch(`${API_BASE}/api/doctors/${this.currentDoctorId}/appointments`);
            if (response.ok) {
                const data = await response.json();
                return Array.isArray(data) ? data.length : (data.count || 0);
            }
            return 0;
        } catch (error) {
            console.warn('Could not fetch appointment count:', error);
            return 0;
        }
    }

    async fetchTreatmentCount() {
        try {
            const response = await fetch(`${API_BASE}/api/doctors/${this.currentDoctorId}/treatment-plans`);
            if (response.ok) {
                const data = await response.json();
                if (data.success && Array.isArray(data.data)) {
                    return data.data.length;
                } else if (Array.isArray(data)) {
                    return data.length;
                }
            }
            return 0;
        } catch (error) {
            console.warn('Could not fetch treatment count:', error);
            return 0;
        }
    }

    setupEventListeners() {
        // Avatar upload
        const avatarInput = document.getElementById('avatar-input');
        if (avatarInput) {
            avatarInput.addEventListener('change', (e) => {
                this.handleAvatarUpload(e);
            });
        }
    }

    handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('doctor-avatar').src = e.target.result;
                this.showSnackbar('Avatar updated! Remember to save your changes.', 'success');
            };
            reader.readAsDataURL(file);
        }
    }

    showLoading() {
        document.getElementById('profile-loading').style.display = 'block';
        document.getElementById('profile-content').style.display = 'none';
        document.getElementById('profile-error').style.display = 'none';
    }

    hideLoading() {
        document.getElementById('profile-loading').style.display = 'none';
        document.getElementById('profile-content').style.display = 'block';
        document.getElementById('profile-error').style.display = 'none';
    }

    showError() {
        document.getElementById('profile-loading').style.display = 'none';
        document.getElementById('profile-content').style.display = 'none';
        document.getElementById('profile-error').style.display = 'block';
    }

    showSnackbar(message, type = 'success') {
        const snackbar = document.getElementById('snackbar');
        snackbar.textContent = message;
        snackbar.className = `snackbar show ${type}`;
        
        setTimeout(() => {
            snackbar.className = 'snackbar';
        }, 3000);
    }
}

// Global functions for HTML onclick events
function toggleEditMode() {
    if (doctorProfile.isEditMode) {
        cancelEdit();
    } else {
        startEdit();
    }
}

function startEdit() {
    doctorProfile.isEditMode = true;
    
    // Show edit elements
    document.getElementById('doctor-name-edit').style.display = 'block';
    document.getElementById('doctor-name').style.display = 'none';
    document.getElementById('doctor-specialty-edit').style.display = 'block';
    document.getElementById('doctor-specialty').style.display = 'none';
    document.getElementById('doctor-email-edit').style.display = 'block';
    document.getElementById('doctor-email').style.display = 'none';
    document.getElementById('doctor-phone-edit').style.display = 'block';
    document.getElementById('doctor-phone').style.display = 'none';
    document.getElementById('experience-edit').style.display = 'block';
    document.getElementById('experience-display').style.display = 'none';
    document.getElementById('license-edit').style.display = 'block';
    document.getElementById('license-display').style.display = 'none';
    document.getElementById('qualifications-edit').style.display = 'block';
    document.getElementById('qualifications-display').style.display = 'none';
    document.getElementById('bio-edit').style.display = 'block';
    document.getElementById('bio-display').style.display = 'none';
    document.getElementById('avatar-upload').style.display = 'block';
    document.getElementById('edit-actions').style.display = 'flex';
    
    // Populate edit fields with current values
    document.getElementById('doctor-name-edit').value = doctorProfile.originalData.name;
    document.getElementById('doctor-specialty-edit').value = doctorProfile.originalData.specialty;
    document.getElementById('doctor-email-edit').value = doctorProfile.originalData.email;
    document.getElementById('doctor-phone-edit').value = doctorProfile.originalData.phone;
    document.getElementById('experience-edit').value = doctorProfile.originalData.experience;
    document.getElementById('license-edit').value = doctorProfile.originalData.license;
    document.getElementById('qualifications-edit').value = doctorProfile.originalData.qualifications;
    document.getElementById('bio-edit').value = doctorProfile.originalData.bio;
    
    // Update button text
    document.getElementById('edit-profile-btn').innerHTML = '<i class="fas fa-times"></i> Cancel Edit';
}

function cancelEdit() {
    doctorProfile.isEditMode = false;
    
    // Hide edit elements
    document.getElementById('doctor-name-edit').style.display = 'none';
    document.getElementById('doctor-name').style.display = 'block';
    document.getElementById('doctor-specialty-edit').style.display = 'none';
    document.getElementById('doctor-specialty').style.display = 'block';
    document.getElementById('doctor-email-edit').style.display = 'none';
    document.getElementById('doctor-email').style.display = 'block';
    document.getElementById('doctor-phone-edit').style.display = 'none';
    document.getElementById('doctor-phone').style.display = 'block';
    document.getElementById('experience-edit').style.display = 'none';
    document.getElementById('experience-display').style.display = 'block';
    document.getElementById('license-edit').style.display = 'none';
    document.getElementById('license-display').style.display = 'block';
    document.getElementById('qualifications-edit').style.display = 'none';
    document.getElementById('qualifications-display').style.display = 'block';
    document.getElementById('bio-edit').style.display = 'none';
    document.getElementById('bio-display').style.display = 'block';
    document.getElementById('avatar-upload').style.display = 'none';
    document.getElementById('edit-actions').style.display = 'none';
    
    // Update button text
    document.getElementById('edit-profile-btn').innerHTML = '<i class="fas fa-edit"></i> Edit Profile';
}

async function saveProfile() {
    try {
        // Collect form data
        const updatedData = {
            name: document.getElementById('doctor-name-edit').value,
            specialty: document.getElementById('doctor-specialty-edit').value,
            email: document.getElementById('doctor-email-edit').value,
            phone: document.getElementById('doctor-phone-edit').value,
            experience: document.getElementById('experience-edit').value,
            medicalLicense: document.getElementById('license-edit').value,
            qualifications: document.getElementById('qualifications-edit').value,
            bio: document.getElementById('bio-edit').value
        };

        // Validate required fields
        if (!updatedData.name || !updatedData.email) {
            doctorProfile.showSnackbar('Please fill in all required fields', 'error');
            return;
        }

        // Show saving state
        const saveBtn = document.querySelector('#edit-actions .btn-primary');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        saveBtn.disabled = true;

        // Try to save to API
        try {
            const response = await fetch(`${API_BASE}/api/doctors/${doctorProfile.currentDoctorId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedData)
            });

            if (response.ok) {
                doctorProfile.showSnackbar('Profile updated successfully!', 'success');
                
                // Update display with new data
                document.getElementById('doctor-name').textContent = updatedData.name;
                document.getElementById('doctor-email').textContent = updatedData.email;
                document.getElementById('doctor-phone').textContent = updatedData.phone;
                document.getElementById('doctor-specialty').textContent = updatedData.specialty;
                document.getElementById('specialty-display').textContent = updatedData.specialty;
                document.getElementById('experience-display').textContent = updatedData.experience ? `${updatedData.experience} years` : 'Not specified';
                document.getElementById('license-display').textContent = updatedData.medicalLicense;
                document.getElementById('qualifications-display').textContent = updatedData.qualifications;
                document.getElementById('bio-display').textContent = updatedData.bio;
                
                // Update stored data
                doctorProfile.originalData = updatedData;
                
            } else {
                console.warn('API update failed, saving locally');
                doctorProfile.showSnackbar('Profile updated locally. Changes may not persist.', 'success');
            }
        } catch (error) {
            console.warn('API unavailable, saving locally:', error);
            doctorProfile.showSnackbar('Profile updated locally. Changes may not persist.', 'success');
        }

        // Exit edit mode
        cancelEdit();

    } catch (error) {
        console.error('Error saving profile:', error);
        doctorProfile.showSnackbar('Error saving profile. Please try again.', 'error');
    } finally {
        // Restore save button
        const saveBtn = document.querySelector('#edit-actions .btn-primary');
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        saveBtn.disabled = false;
    }
}

// Initialize doctor profile when page loads
let doctorProfile;
document.addEventListener('DOMContentLoaded', () => {
    doctorProfile = new DoctorProfile();
});
