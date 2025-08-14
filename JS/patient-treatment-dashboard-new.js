// Patient Dashboard JavaScript
class PatientDashboard {
    constructor() {
        this.baseUrl = 'https://healsync-backend-d788.onrender.com/v1/healsync';
        this.patientId = null;
        this.currentFilter = 'all';
        this.treatments = [];
        this.init();
    }

    async init() {
        // Get patient ID from session
        const patientData = this.getPatientSession();
        if (!patientData) {
            window.location.href = '/HTML/login.html';
            return;
        }
        
        this.patientId = patientData.id;
        this.setupEventListeners();
        await this.loadTreatmentPlans();
        this.updateStats();
    }

    getPatientSession() {
        try {
            const userData = localStorage.getItem('healSync_userData');
            const userType = localStorage.getItem('healSync_userType');
            
            if (userType !== 'patient' || !userData) {
                return null;
            }
            
            return JSON.parse(userData);
        } catch (error) {
            console.error('Error getting patient session:', error);
            return null;
        }
    }

    setupEventListeners() {
        // Filter tabs
        const filterTabs = document.querySelectorAll('.filter-tab');
        filterTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.setActiveFilter(e.target.dataset.filter);
            });
        });

        // Refresh button
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshTreatments();
            });
        }

        // Modal close buttons
        const closeButtons = document.querySelectorAll('.modal-close-btn, .reminder-close');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModals();
            });
        });

        // Modal overlay clicks
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-overlay')) {
                    this.closeModals();
                }
            });
        });
    }

    async refreshTreatments() {
        const refreshBtn = document.getElementById('refresh-btn');
        const icon = refreshBtn.querySelector('i');
        
        // Add spinning animation
        icon.classList.add('fa-spin');
        refreshBtn.disabled = true;
        
        try {
            await this.loadTreatmentPlans();
            this.showSuccess('Treatment plans refreshed successfully!');
        } catch (error) {
            this.showError('Failed to refresh treatment plans');
        } finally {
            // Remove spinning animation
            icon.classList.remove('fa-spin');
            refreshBtn.disabled = false;
        }
    }

    async loadTreatmentPlans() {
        try {
            this.showLoadingState();
            
            const treatments = await this.fetchPatientTreatments();
            this.treatments = treatments;
            
            this.renderTreatments(treatments);
            this.hideLoadingState();
            this.updateStats();

        } catch (error) {
            console.error('Error loading treatment plans:', error);
            this.hideLoadingState();
            this.showError('Failed to load treatment plans. Please check your connection and try again.');
            this.showEmptyState();
        }
    }

    async fetchPatientTreatments() {
        if (!this.patientId) {
            throw new Error('Patient ID not found');
        }

        const response = await fetch(`${this.baseUrl}/treatment-plans/patient/${this.patientId}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch treatment plans: ${errorText}`);
        }
        
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    }

    renderTreatments(treatments) {
        const container = document.getElementById('treatments-grid');
        
        if (treatments.length === 0) {
            this.showEmptyState();
            return;
        }

        const filteredTreatments = this.filterTreatments(treatments);
        
        if (filteredTreatments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3 class="empty-state-title">No ${this.currentFilter} treatment plans found</h3>
                    <p class="empty-state-description">Try selecting a different filter to view other treatment plans.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredTreatments.map(treatment => this.createTreatmentCard(treatment)).join('');
    }

    filterTreatments(treatments) {
        if (this.currentFilter === 'all') return treatments;
        return treatments.filter(treatment => treatment.status.toLowerCase() === this.currentFilter);
    }

    createTreatmentCard(treatment) {
        const statusClass = `status-${treatment.status.toLowerCase()}`;
        const formattedStartDate = new Date(treatment.startDate).toLocaleDateString();
        const formattedEndDate = treatment.endDate ? new Date(treatment.endDate).toLocaleDateString() : null;

        return `
            <div class="treatment-plan-card">
                <div class="treatment-card-header">
                    <div class="treatment-id">Plan #${treatment.treatmentId}</div>
                    <div class="treatment-status ${statusClass}">${treatment.status}</div>
                </div>
                <div class="treatment-card-body">
                    <div class="treatment-info">
                        <div class="treatment-info-item">
                            <span class="treatment-info-label">Doctor</span>
                            <span class="treatment-info-value">${treatment.doctorName || 'N/A'}</span>
                        </div>
                        <div class="treatment-info-item">
                            <span class="treatment-info-label">Specialty</span>
                            <span class="treatment-info-value">${treatment.doctorSpecialty || 'N/A'}</span>
                        </div>
                        <div class="treatment-info-item">
                            <span class="treatment-info-label">Condition</span>
                            <span class="treatment-info-value">${treatment.diseaseName || 'N/A'}</span>
                        </div>
                        <div class="treatment-info-item">
                            <span class="treatment-info-label">Start Date</span>
                            <span class="treatment-info-value">${formattedStartDate}</span>
                        </div>
                        ${formattedEndDate ? `
                            <div class="treatment-info-item">
                                <span class="treatment-info-label">End Date</span>
                                <span class="treatment-info-value">${formattedEndDate}</span>
                            </div>
                        ` : ''}
                    </div>

                    <div class="medicine-list">
                        <h4 class="medicine-list-title">
                            Medicines (${treatment.medicines ? treatment.medicines.length : 0})
                        </h4>
                        ${treatment.medicines && treatment.medicines.length > 0 ? 
                            treatment.medicines.slice(0, 2).map(medicine => `
                                <div class="medicine-item">
                                    <div class="medicine-name">${medicine.medicineName || 'N/A'}</div>
                                    <div class="medicine-details">
                                        <div class="medicine-dosage">
                                            ${medicine.dosage || 'N/A'}
                                        </div>
                                        <div class="medicine-timing">
                                            ${medicine.timing || 'N/A'}
                                        </div>
                                    </div>
                                </div>
                            `).join('') :
                            '<div class="medicine-item"><div class="medicine-name">No medicines prescribed</div></div>'
                        }
                        ${treatment.medicines && treatment.medicines.length > 2 ? `
                            <div style="color: #6B7280; font-size: 0.875rem; margin-top: 0.5rem;">
                                +${treatment.medicines.length - 2} more medicines
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="treatment-card-actions">
                    <button class="btn btn-small btn-primary" onclick="patientDashboard.viewTreatmentDetails(${treatment.treatmentId})">
                        View Details
                    </button>
                    ${treatment.status === 'Active' ? `
                        <button class="btn btn-small btn-secondary" onclick="patientDashboard.setReminders(${treatment.treatmentId})">
                            Set Reminders
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    async viewTreatmentDetails(treatmentId) {
        const modal = document.getElementById('treatment-modal');
        const modalContent = document.getElementById('modal-content');
        const loader = document.getElementById('modal-loader');
        
        modal.style.display = 'block';
        setTimeout(() => modal.classList.add('visible'), 10);

        loader.style.display = 'block';
        modalContent.innerHTML = '';

        try {
            // Try to fetch detailed treatment data from API
            const response = await fetch(`${this.baseUrl}/treatment-plans/${treatmentId}`);
            
            let treatment;
            if (response.ok) {
                treatment = await response.json();
            } else {
                // Fallback to local data if API fails
                treatment = this.treatments.find(t => t.treatmentId === treatmentId);
                if (!treatment) {
                    throw new Error('Treatment not found');
                }
            }

            this.renderTreatmentDetails(treatment);
        } catch (error) {
            console.error('Error loading treatment details:', error);
            this.showError('Failed to load treatment details. Please try again.');
            this.closeModals();
        }
    }

    renderTreatmentDetails(treatment) {
        const loader = document.getElementById('modal-loader');
        const content = document.getElementById('modal-content');
        
        const formattedStartDate = new Date(treatment.startDate).toLocaleDateString();
        const formattedEndDate = treatment.endDate ? new Date(treatment.endDate).toLocaleDateString() : 'Ongoing';
        
        loader.style.display = 'none';
        content.innerHTML = `
            <div class="treatment-info">
                <h3>Treatment Plan #${treatment.treatmentId}</h3>
                <div class="treatment-info-item">
                    <span class="treatment-info-label">Doctor</span>
                    <span class="treatment-info-value">${treatment.doctorName || 'N/A'} ${treatment.doctorSpecialty ? `(${treatment.doctorSpecialty})` : ''}</span>
                </div>
                <div class="treatment-info-item">
                    <span class="treatment-info-label">Condition</span>
                    <span class="treatment-info-value">${treatment.diseaseName || 'N/A'}</span>
                </div>
                <div class="treatment-info-item">
                    <span class="treatment-info-label">Status</span>
                    <span class="treatment-info-value">
                        <span class="treatment-status status-${treatment.status.toLowerCase()}">${treatment.status}</span>
                    </span>
                </div>
                <div class="treatment-info-item">
                    <span class="treatment-info-label">Duration</span>
                    <span class="treatment-info-value">${formattedStartDate} - ${formattedEndDate}</span>
                </div>
            </div>

            <div class="medicine-list">
                <h4 class="medicine-list-title">Complete Medicine List</h4>
                ${treatment.medicines && treatment.medicines.length > 0 ?
                    treatment.medicines.map(medicine => `
                        <div class="medicine-item">
                            <div class="medicine-name">${medicine.medicineName || 'N/A'}</div>
                            <div class="medicine-details">
                                <div class="medicine-dosage">${medicine.dosage || 'N/A'}</div>
                                <div class="medicine-timing">${medicine.timing || 'N/A'}</div>
                            </div>
                        </div>
                    `).join('') :
                    '<div class="medicine-item"><div class="medicine-name">No medicines prescribed</div></div>'
                }
            </div>

            <div class="treatment-notes">
                <div class="treatment-notes-title">Doctor's Instructions</div>
                <div class="treatment-notes-content">${treatment.notes || 'No specific instructions provided.'}</div>
            </div>
        `;
    }

    setReminders(treatmentId) {
        const modal = document.getElementById('reminder-modal');
        modal.style.display = 'block';
        setTimeout(() => modal.classList.add('visible'), 10);
        
        // Show placeholder functionality
        this.showSuccess('Medicine reminder feature will be available soon!');
    }

    setActiveFilter(filter) {
        this.currentFilter = filter;
        
        // Update tab active state
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        
        // Re-render treatments with new filter
        this.renderTreatments(this.treatments);
    }

    updateStats() {
        const activeCount = this.treatments.filter(t => t.status === 'Active').length;
        const completedCount = this.treatments.filter(t => t.status === 'Completed').length;
        const totalMedicines = this.treatments
            .filter(t => t.status === 'Active')
            .reduce((total, treatment) => total + (treatment.medicines ? treatment.medicines.length : 0), 0);

        document.getElementById('active-count').textContent = activeCount;
        document.getElementById('completed-count').textContent = completedCount;
        document.getElementById('total-medicines').textContent = totalMedicines;
    }

    showLoadingState() {
        document.getElementById('loading-state').classList.add('visible');
        document.getElementById('treatments-grid').style.display = 'none';
        document.getElementById('empty-state').classList.remove('visible');
    }

    hideLoadingState() {
        document.getElementById('loading-state').classList.remove('visible');
        document.getElementById('treatments-grid').style.display = 'grid';
    }

    showEmptyState() {
        document.getElementById('loading-state').classList.remove('visible');
        document.getElementById('treatments-grid').style.display = 'none';
        document.getElementById('empty-state').classList.add('visible');
    }

    closeModals() {
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(modal => {
            modal.classList.remove('visible');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        });
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };
        return icons[type] || 'fa-info-circle';
    }
}

// Initialize patient dashboard when page loads
let patientDashboard;
document.addEventListener('DOMContentLoaded', () => {
    patientDashboard = new PatientDashboard();
});

// Mobile menu functionality
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', function() {
            mobileMenu.classList.toggle('visible');
        });
    }
});
