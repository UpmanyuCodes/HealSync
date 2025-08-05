// Patient Dashboard JavaScript
class PatientDashboard {
    constructor() {
        this.patientId = 1; // Default patient ID for demo
        this.currentFilter = 'all';
        this.treatments = [];
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadTreatmentPlans();
        this.updateStats();
    }

    setupEventListeners() {
        // Filter tabs
        const filterTabs = document.querySelectorAll('.filter-tab');
        filterTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.setActiveFilter(e.target.dataset.filter);
            });
        });

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

    async loadTreatmentPlans() {
        try {
            this.showLoadingState();
            
            // Mock treatment plans data - replace with actual API call
            const treatments = await this.fetchPatientTreatments();
            this.treatments = treatments;
            
            // Simulate loading delay
            setTimeout(() => {
                this.renderTreatments(treatments);
                this.hideLoadingState();
            }, 1000);

        } catch (error) {
            console.error('Error loading treatment plans:', error);
            this.hideLoadingState();
            this.showEmptyState();
        }
    }

    async fetchPatientTreatments() {
        // Mock data for demo - replace with actual API call
        return [
            {
                treatmentId: 1,
                patientId: 1,
                doctorId: 1,
                doctorName: 'Dr. Sarah Johnson',
                doctorSpecialty: 'Endocrinologist',
                diseaseId: 1,
                diseaseName: 'Type 2 Diabetes',
                status: 'Active',
                startDate: '2025-08-01',
                endDate: null,
                notes: 'Monitor blood glucose levels daily. Take medications as prescribed. Follow up in 2 weeks for progress evaluation. Maintain a healthy diet and regular exercise routine.',
                medicines: [
                    {
                        treatmentMedID: 1,
                        medicineName: 'Metformin',
                        dosage: '500mg',
                        timing: 'Twice daily with meals'
                    },
                    {
                        treatmentMedID: 2,
                        medicineName: 'Insulin',
                        dosage: '10 units',
                        timing: 'Before breakfast'
                    }
                ]
            },
            {
                treatmentId: 2,
                patientId: 1,
                doctorId: 2,
                doctorName: 'Dr. Michael Chen',
                doctorSpecialty: 'Cardiologist',
                diseaseId: 2,
                diseaseName: 'Hypertension',
                status: 'Active',
                startDate: '2025-07-28',
                endDate: null,
                notes: 'Monitor blood pressure regularly. Reduce sodium intake. Take medications consistently at the same time each day.',
                medicines: [
                    {
                        treatmentMedID: 3,
                        medicineName: 'Lisinopril',
                        dosage: '10mg',
                        timing: 'Once daily in the morning'
                    },
                    {
                        treatmentMedID: 4,
                        medicineName: 'Amlodipine',
                        dosage: '5mg',
                        timing: 'Once daily in the evening'
                    }
                ]
            },
            {
                treatmentId: 3,
                patientId: 1,
                doctorId: 3,
                doctorName: 'Dr. Emily Rodriguez',
                doctorSpecialty: 'General Practitioner',
                diseaseId: 3,
                diseaseName: 'Seasonal Allergies',
                status: 'Completed',
                startDate: '2025-07-01',
                endDate: '2025-07-21',
                notes: 'Treatment completed successfully. Symptoms have resolved. Continue antihistamine as needed during allergy season.',
                medicines: [
                    {
                        treatmentMedID: 5,
                        medicineName: 'Loratadine',
                        dosage: '10mg',
                        timing: 'Once daily in the morning'
                    }
                ]
            },
            {
                treatmentId: 4,
                patientId: 1,
                doctorId: 1,
                doctorName: 'Dr. Sarah Johnson',
                doctorSpecialty: 'Endocrinologist',
                diseaseId: 4,
                diseaseName: 'Vitamin D Deficiency',
                status: 'Paused',
                startDate: '2025-06-15',
                endDate: null,
                notes: 'Treatment paused pending lab results. Resume after vitamin D levels are rechecked.',
                medicines: [
                    {
                        treatmentMedID: 6,
                        medicineName: 'Vitamin D3',
                        dosage: '2000 IU',
                        timing: 'Once daily with food'
                    }
                ]
            }
        ];

        // Uncomment below for actual API integration:
        /*
        const response = await fetch(`https://healsync-backend-d788.onrender.com/api/patients/${this.patientId}/treatment-plans`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
        */
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
                            <span class="treatment-info-value">${treatment.doctorName}</span>
                        </div>
                        <div class="treatment-info-item">
                            <span class="treatment-info-label">Specialty</span>
                            <span class="treatment-info-value">${treatment.doctorSpecialty}</span>
                        </div>
                        <div class="treatment-info-item">
                            <span class="treatment-info-label">Condition</span>
                            <span class="treatment-info-value">${treatment.diseaseName}</span>
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
                            Medicines (${treatment.medicines.length})
                        </h4>
                        ${treatment.medicines.slice(0, 2).map(medicine => `
                            <div class="medicine-item">
                                <div class="medicine-name">${medicine.medicineName}</div>
                                <div class="medicine-details">
                                    <div class="medicine-dosage">
                                        ${medicine.dosage}
                                    </div>
                                    <div class="medicine-timing">
                                        ${medicine.timing}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                        ${treatment.medicines.length > 2 ? `
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

    viewTreatmentDetails(treatmentId) {
        const treatment = this.treatments.find(t => t.treatmentId === treatmentId);
        if (!treatment) return;

        const modal = document.getElementById('treatment-modal');
        const modalContent = document.getElementById('modal-content');
        
        modal.style.display = 'block';
        setTimeout(() => modal.classList.add('visible'), 10);

        const loader = document.getElementById('modal-loader');
        const content = document.getElementById('modal-content');
        loader.style.display = 'block';
        content.innerHTML = '';

        const showContent = () => {
            const formattedStartDate = new Date(treatment.startDate).toLocaleDateString();
            const formattedEndDate = treatment.endDate ? new Date(treatment.endDate).toLocaleDateString() : 'Ongoing';
            loader.style.display = 'none';
            content.innerHTML = `
            <div class="treatment-info">
                <h3>Treatment Plan #${treatment.treatmentId}</h3>
                <div class="treatment-info-item">
                    <span class="treatment-info-label">Doctor</span>
                    <span class="treatment-info-value">${treatment.doctorName} (${treatment.doctorSpecialty})</span>
                </div>
                <div class="treatment-info-item">
                    <span class="treatment-info-label">Condition</span>
                    <span class="treatment-info-value">${treatment.diseaseName}</span>
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
                ${treatment.medicines.map(medicine => `
                    <div class="medicine-item">
                        <div class="medicine-name">${medicine.medicineName}</div>
                        <div class="medicine-details">
                            <div class="medicine-dosage">${medicine.dosage}</div>
                            <div class="medicine-timing">${medicine.timing}</div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="treatment-notes">
                <div class="treatment-notes-title">Doctor's Instructions</div>
                <div class="treatment-notes-content">${treatment.notes}</div>
            </div>
            `;        
        };
        modal.style.display = 'block';
        setTimeout(() => modal.classList.add('visible'), 10);
        setTimeout(showContent, 300);
    }

    setReminders(treatmentId) {
        const modal = document.getElementById('reminder-modal');
        modal.style.display = 'block';
        setTimeout(() => modal.classList.add('visible'), 10);
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
            .reduce((total, treatment) => total + treatment.medicines.length, 0);

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
