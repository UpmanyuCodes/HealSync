// Doctor Dashboard JavaScript
class DoctorDashboard {
    constructor() {
        this.patientId = 1; // Default patient ID for demo
        this.doctorId = 1; // Default doctor ID for demo
        this.medicines = [];
        this.patients = [];
        this.diseases = [];
        this.medicineCounter = 0;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadDropdownData();
        this.addInitialMedicineRow();
        this.loadRecentTreatments();
    }

    setupEventListeners() {
        // Form submission
        document.getElementById('treatment-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });

        // Add medicine button
        document.getElementById('add-medicine').addEventListener('click', () => {
            this.addMedicineRow();
        });

        // Reset form button
        document.getElementById('reset-form').addEventListener('click', () => {
            this.resetForm();
        });

        // Modal close buttons
        document.getElementById('close-modal-btn').addEventListener('click', () => {
            this.closeModal();
        });

        // Modal overlay click
        document.getElementById('treatment-modal').addEventListener('click', (e) => {
            if (e.target.id === 'treatment-modal') {
                this.closeModal();
            }
        });

        // Set today's date as default
        document.getElementById('start-date').value = new Date().toISOString().split('T')[0];
    }

    async loadDropdownData() {
        try {
            console.log('Loading dropdown data...');
            
            // Show loading states
            this.showDropdownLoading();

            // Load patients
            console.log('Fetching patients...');
            const patients = await this.fetchPatients();
            this.populatePatientDropdown(patients);
            console.log(`Loaded ${patients.length} patients`);

            // Load diseases  
            console.log('Fetching diseases...');
            const diseases = await this.fetchDiseases();
            this.populateDiseaseDropdown(diseases);
            console.log(`Loaded ${diseases.length} diseases`);

            // Load medicines
            console.log('Fetching medicines...');
            this.medicines = await this.fetchMedicines();
            console.log(`Loaded ${this.medicines.length} medicines`);

            // Hide loading states
            this.hideDropdownLoading();
            console.log('Dropdown data loading completed successfully');

        } catch (error) {
            console.error('Error loading dropdown data:', error);
            this.hideDropdownLoading();
            this.showAlert('Error loading form data. Please refresh the page.', 'error');
        }
    }

    async fetchPatients() {
        // Mock data for demo - replace with actual API call
        return [
            { id: 1, name: 'John Doe', age: 45 },
            { id: 2, name: 'Jane Smith', age: 32 },
            { id: 3, name: 'Robert Johnson', age: 58 },
            { id: 4, name: 'Emily Davis', age: 29 },
            { id: 5, name: 'Michael Wilson', age: 41 }
        ];
    }

    async fetchDiseases() {
        try {
            // Fetch all diseases from API
            const response = await fetch('https://healsync-backend-d788.onrender.com/v1/healsync/disease/all');
            
            if (response.ok) {
                const data = await response.json();
                console.log('All Diseases API Response:', data);
                
                // Return the diseases from API response
                // Adapt this based on your actual API response structure
                return data.diseases || data || [];
                
            } else {
                throw new Error(`API responded with status: ${response.status}`);
            }
            
        } catch (error) {
            console.error('Error fetching all diseases from API:', error);
            console.log('Using fallback disease data');
            
            // Return mock data as fallback
            return [
                { id: 1, name: 'Type 2 Diabetes', description: 'Diabetes Mellitus Type 2' },
                { id: 2, name: 'Hypertension', description: 'High Blood Pressure' },
                { id: 3, name: 'Asthma', description: 'Chronic Respiratory Condition' },
                { id: 4, name: 'Arthritis', description: 'Joint Inflammation' },
                { id: 5, name: 'Depression', description: 'Major Depressive Disorder' },
                { id: 6, name: 'Seasonal Allergies', description: 'Allergic Rhinitis' },
                { id: 7, name: 'Vitamin D Deficiency', description: 'Low Vitamin D Levels' }
            ];
        }
    }

    async fetchMedicines() {
        try {
            // Fetch all medicines from API
            const response = await fetch('https://healsync-backend-d788.onrender.com/v1/healsync/medicine/all');
            
            if (response.ok) {
                const data = await response.json();
                console.log('All Medicines API Response:', data);
                
                // Return the medicines from API response
                // Adapt this based on your actual API response structure
                return data.medicines || data || [];
                
            } else {
                throw new Error(`API responded with status: ${response.status}`);
            }
            
        } catch (error) {
            console.error('Error fetching all medicines from API:', error);
            console.log('Using fallback medicine data');
            
            // Return mock medicine data as fallback
            return [
                { id: 1, name: 'Metformin', type: 'Tablet', strength: '500mg' },
                { id: 2, name: 'Lisinopril', type: 'Tablet', strength: '10mg' },
                { id: 3, name: 'Aspirin', type: 'Tablet', strength: '75mg' },
                { id: 4, name: 'Insulin', type: 'Injection', strength: '100 units/ml' },
                { id: 5, name: 'Albuterol', type: 'Inhaler', strength: '90mcg' },
                { id: 6, name: 'Atorvastatin', type: 'Tablet', strength: '20mg' },
                { id: 7, name: 'Amlodipine', type: 'Tablet', strength: '5mg' },
                { id: 8, name: 'Omeprazole', type: 'Capsule', strength: '20mg' },
                { id: 9, name: 'Loratadine', type: 'Tablet', strength: '10mg' },
                { id: 10, name: 'Vitamin D3', type: 'Tablet', strength: '2000 IU' }
            ];
        }
    }

    populatePatientDropdown(patients) {
        const select = document.getElementById('patient-select');
        // Clear existing options
        select.innerHTML = '<option value="">Choose a patient...</option>';
        
        patients.forEach(patient => {
            const option = document.createElement('option');
            option.value = patient.id;
            option.textContent = `${patient.name} (Age: ${patient.age})`;
            select.appendChild(option);
        });
    }

    populateDiseaseDropdown(diseases) {
        const select = document.getElementById('disease-select');
        // Clear existing options
        select.innerHTML = '<option value="">Select condition...</option>';
        
        diseases.forEach(disease => {
            const option = document.createElement('option');
            option.value = disease.id;
            option.textContent = disease.name;
            if (disease.description) {
                option.title = disease.description; // Add tooltip with description
            }
            select.appendChild(option);
        });
    }

    addMedicineRow() {
        this.medicineCounter++;
        const container = document.getElementById('medicine-rows');
        const row = document.createElement('div');
        row.className = 'medicine-row';
        row.setAttribute('data-row-id', this.medicineCounter);

        row.innerHTML = `
            <div class="form-group">
                <label class="form-label">Medicine</label>
                <select name="medicines[${this.medicineCounter}][medicineId]" class="form-select medicine-select" required>
                    <option value="">Select medicine...</option>
                    ${this.medicines.map(med => 
                        `<option value="${med.id}">${med.name} (${med.strength})</option>`
                    ).join('')}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Dosage</label>
                <input type="text" name="medicines[${this.medicineCounter}][dosage]" class="form-input" placeholder="e.g., 500mg, 2 tablets" required>
            </div>
            <div class="form-group">
                <label class="form-label">Timing Instructions</label>
                <input type="text" name="medicines[${this.medicineCounter}][timing]" class="form-input" placeholder="e.g., Twice daily with meals" required>
            </div>
            <div>
                <button type="button" class="remove-medicine-btn" onclick="doctorDashboard.removeMedicineRow(${this.medicineCounter})">
                    Remove
                </button>
            </div>
        `;

        container.appendChild(row);
    }

    addInitialMedicineRow() {
        // Add the first medicine row by default
        this.addMedicineRow();
    }

    removeMedicineRow(rowId) {
        const row = document.querySelector(`[data-row-id="${rowId}"]`);
        if (row) {
            row.remove();
        }

        // Ensure at least one medicine row exists
        const remainingRows = document.querySelectorAll('.medicine-row');
        if (remainingRows.length === 0) {
            this.addMedicineRow();
        }
    }

    async handleFormSubmit() {
        const formData = new FormData(document.getElementById('treatment-form'));
        const submitBtn = document.getElementById('submit-treatment');
        const submitText = document.getElementById('submit-text');
        const submitLoader = document.getElementById('submit-loader');

        try {
            // Show loading state
            submitBtn.disabled = true;
            submitText.style.display = 'none';
            submitLoader.style.display = 'inline-block';

            // Collect form data
            const treatmentData = {
                doctorId: this.doctorId,
                diseaseId: parseInt(formData.get('diseaseId')),
                status: formData.get('status'),
                notes: formData.get('notes'),
                startDate: formData.get('startDate'),
                medicines: []
            };

            // Collect medicines data
            const medicineRows = document.querySelectorAll('.medicine-row');
            medicineRows.forEach((row, index) => {
                const medicineId = row.querySelector('select[name*="medicineId"]').value;
                const dosage = row.querySelector('input[name*="dosage"]').value;
                const timing = row.querySelector('input[name*="timing"]').value;

                if (medicineId && dosage && timing) {
                    treatmentData.medicines.push({
                        medicineId: parseInt(medicineId),
                        dosage: dosage.trim(),
                        timing: timing.trim()
                    });
                }
            });

            // Validate medicines
            if (treatmentData.medicines.length === 0) {
                throw new Error('Please add at least one medicine to the treatment plan.');
            }

            // Submit to API
            const patientId = formData.get('patientId');
            const response = await this.createTreatmentPlan(patientId, treatmentData);

            // Show success message
            this.showAlert(`Treatment Plan #${response.treatmentId} created successfully!`, 'success');
            this.resetForm();
            this.loadRecentTreatments();

        } catch (error) {
            console.error('Error creating treatment plan:', error);
            this.showAlert(error.message || 'Failed to create treatment plan. Please try again.', 'error');
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            submitText.style.display = 'inline';
            submitLoader.style.display = 'none';
        }
    }

    async createTreatmentPlan(patientId, treatmentData) {
        try {
            // Actual API integration
            const response = await fetch(`https://healsync-backend-d788.onrender.com/api/patients/${patientId}/treatment-plans`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(treatmentData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
            
        } catch (error) {
            console.error('API Error:', error);
            
            // Fallback to mock response for demo
            console.log('Falling back to mock response for demo');
            
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Mock successful response
            return {
                treatmentId: Math.floor(Math.random() * 1000) + 1,
                patientId: parseInt(patientId),
                ...treatmentData,
                startDate: treatmentData.startDate || new Date().toISOString().split('T')[0],
                medicines: treatmentData.medicines.map((med, index) => ({
                    treatmentMedID: index + 1,
                    medicineName: this.medicines.find(m => m.id === med.medicineId)?.name || 'Unknown',
                    ...med
                }))
            };
        }
    }

    async loadRecentTreatments() {
        try {
            const container = document.getElementById('recent-treatments');
            container.innerHTML = '<div class="treatment-card-skeleton loading-skeleton"></div>'.repeat(3);

            // Mock recent treatments data
            const treatments = [
                {
                    treatmentId: 1,
                    patientName: 'John Doe',
                    disease: 'Diabetes',
                    status: 'Active',
                    startDate: '2025-08-01',
                    medicineCount: 2
                },
                {
                    treatmentId: 2,
                    patientName: 'Jane Smith',
                    disease: 'Hypertension',
                    status: 'Active',
                    startDate: '2025-07-28',
                    medicineCount: 3
                },
                {
                    treatmentId: 3,
                    patientName: 'Robert Johnson',
                    disease: 'Asthma',
                    status: 'Completed',
                    startDate: '2025-07-15',
                    medicineCount: 1
                }
            ];

            // Simulate loading delay
            setTimeout(() => {
                container.innerHTML = treatments.map(treatment => this.createTreatmentCard(treatment)).join('');
            }, 1000);

        } catch (error) {
            console.error('Error loading recent treatments:', error);
            document.getElementById('recent-treatments').innerHTML = 
                '<div class="alert alert-error">Failed to load recent treatments.</div>';
        }
    }

    createTreatmentCard(treatment) {
        return `
            <div class="treatment-plan-card">
                <div class="treatment-card-header">
                    <div class="treatment-id">Plan #${treatment.treatmentId}</div>
                    <div class="treatment-status status-${treatment.status.toLowerCase()}">${treatment.status}</div>
                </div>
                <div class="treatment-card-body">
                    <div class="treatment-info">
                        <div class="treatment-info-item">
                            <span class="treatment-info-label">Patient</span>
                            <span class="treatment-info-value">${treatment.patientName}</span>
                        </div>
                        <div class="treatment-info-item">
                            <span class="treatment-info-label">Condition</span>
                            <span class="treatment-info-value">${treatment.disease}</span>
                        </div>
                        <div class="treatment-info-item">
                            <span class="treatment-info-label">Start Date</span>
                            <span class="treatment-info-value">${new Date(treatment.startDate).toLocaleDateString()}</span>
                        </div>
                        <div class="treatment-info-item">
                            <span class="treatment-info-label">Medicines</span>
                            <span class="treatment-info-value">${treatment.medicineCount} prescribed</span>
                        </div>
                    </div>
                </div>
                <div class="treatment-card-actions">
                    <button class="btn btn-small btn-primary" onclick="doctorDashboard.viewTreatmentDetails(${treatment.treatmentId})">
                        View Details
                    </button>
                    <button class="btn btn-small btn-secondary" onclick="doctorDashboard.editTreatment(${treatment.treatmentId})">
                        Edit Plan
                    </button>
                </div>
            </div>
        `;
    }

    viewTreatmentDetails(treatmentId) {
        const modal = document.getElementById('treatment-modal');
        const loader = document.getElementById('modal-loader');
        const content = document.getElementById('modal-content');

        // Show modal and loader
        loader.style.display = 'block';
        content.innerHTML = '';
        modal.style.display = 'block';
        setTimeout(() => modal.classList.add('visible'), 10);

        // Render mock content and hide loader
        setTimeout(() => {
            loader.style.display = 'none';
            content.innerHTML = `
                <div class="treatment-info">
                    <h3>Treatment Plan #${treatmentId}</h3>
                    <div class="treatment-info-item">
                        <span class="treatment-info-label">Patient</span>
                        <span class="treatment-info-value">John Doe (Age: 45)</span>
                    </div>
                    <div class="treatment-info-item">
                        <span class="treatment-info-label">Condition</span>
                        <span class="treatment-info-value">Type 2 Diabetes</span>
                    </div>
                    <div class="treatment-info-item">
                        <span class="treatment-info-label">Status</span>
                        <span class="treatment-info-value"><span class="treatment-status status-active">Active</span></span>
                    </div>
                    <div class="treatment-info-item">
                        <span class="treatment-info-label">Start Date</span>
                        <span class="treatment-info-value">August 1, 2025</span>
                    </div>
                </div>

                <div class="medicine-list">
                    <h4 class="medicine-list-title">Prescribed Medicines</h4>
                    <div class="medicine-item">
                        <div class="medicine-name">Metformin</div>
                        <div class="medicine-details">
                            <div class="medicine-dosage">500mg</div>
                            <div class="medicine-timing">Twice daily with meals</div>
                        </div>
                    </div>
                    <div class="medicine-item">
                        <div class="medicine-name">Insulin</div>
                        <div class="medicine-details">
                            <div class="medicine-dosage">10 units</div>
                            <div class="medicine-timing">Before breakfast</div>
                        </div>
                    </div>
                </div>

                <div class="treatment-notes">
                    <div class="treatment-notes-title">Doctor's Notes</div>
                    <div class="treatment-notes-content">
                        Monitor blood glucose levels daily. Take Metformin with meals to reduce stomach upset. <br>
                        Inject insulin 15-30 minutes before breakfast. Follow up in 2 weeks for progress evaluation.
                    </div>
                </div>
            `;
        }, 300);
    }

    editTreatment(treatmentId) {
        this.showAlert('Edit functionality will be implemented in the next version.', 'warning');
    }

    resetForm() {
        document.getElementById('treatment-form').reset();
        document.getElementById('medicine-rows').innerHTML = '';
        this.medicineCounter = 0;
        this.addInitialMedicineRow();
        document.getElementById('start-date').value = new Date().toISOString().split('T')[0];
    }

    closeModal() {
        const modal = document.getElementById('treatment-modal');
        modal.classList.remove('visible');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }

    showDropdownLoading() {
        // Add loading text to dropdowns
        const patientSelect = document.getElementById('patient-select');
        const diseaseSelect = document.getElementById('disease-select');
        
        patientSelect.innerHTML = '<option value="">Loading patients...</option>';
        diseaseSelect.innerHTML = '<option value="">Loading diseases...</option>';
        
        // Disable dropdowns during loading
        patientSelect.disabled = true;
        diseaseSelect.disabled = true;
    }

    hideDropdownLoading() {
        // Re-enable dropdowns
        const patientSelect = document.getElementById('patient-select');
        const diseaseSelect = document.getElementById('disease-select');
        
        patientSelect.disabled = false;
        diseaseSelect.disabled = false;
    }

    showAlert(message, type = 'success') {
        const container = document.getElementById('alert-container');
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        
        container.appendChild(alert);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 5000);
    }
}

// Initialize doctor dashboard when page loads
let doctorDashboard;
document.addEventListener('DOMContentLoaded', () => {
    doctorDashboard = new DoctorDashboard();
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
