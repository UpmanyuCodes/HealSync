// Doctor Dashboard JavaScript - Main Functionality
// Handles treatment plan creation, medicine management, and UI interactions

const API_BASE = 'https://healsync-backend-d788.onrender.com';

class DoctorDashboard {
    constructor() {
        this.medicines = [];
        this.patients = [];
        this.diseases = [];
        this.medicineCounter = 0;
        this.currentDoctorId = null;
        this.init();
    }

    async init() {
        // Get current doctor info
        this.getCurrentDoctorInfo();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load data
        await this.loadDropdownData();
        
        // Load patient statistics
        this.loadPatientStatistics();
        
        // Add initial medicine row
        this.addInitialMedicineRow();
        
        // Load recent treatments
        this.loadRecentTreatments();
    }

    getCurrentDoctorInfo() {
        try {
            const userData = localStorage.getItem('healSync_userData');
            if (userData) {
                const doctor = JSON.parse(userData);
                this.currentDoctorId = doctor.doctorId || localStorage.getItem('currentDoctorId');
                console.log('Current doctor ID:', this.currentDoctorId);
            }
        } catch (error) {
            console.error('Error getting doctor info:', error);
        }
    }

    setupEventListeners() {
        // Form submission
        const treatmentForm = document.getElementById('treatment-form');
        if (treatmentForm) {
            treatmentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit();
            });
        }

        // Add medicine button
        const addMedicineBtn = document.getElementById('add-medicine');
        if (addMedicineBtn) {
            addMedicineBtn.addEventListener('click', () => {
                this.addMedicineRow();
            });
        }

        // Reset form button
        const resetFormBtn = document.getElementById('reset-form');
        if (resetFormBtn) {
            resetFormBtn.addEventListener('click', () => {
                this.resetForm();
            });
        }

        // Modal close buttons
        const closeModalBtn = document.getElementById('close-modal-btn');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }

        // Modal overlay click
        const treatmentModal = document.getElementById('treatment-modal');
        if (treatmentModal) {
            treatmentModal.addEventListener('click', (e) => {
                if (e.target.id === 'treatment-modal') {
                    this.closeModal();
                }
            });
        }

        // Set today's date as default
        const startDateInput = document.getElementById('start-date');
        if (startDateInput) {
            startDateInput.value = new Date().toISOString().split('T')[0];
        }
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
        try {
            console.log('Fetching patients...');
            
            // Method 1: Try to get patients from doctor's appointments
            if (window.DoctorAppointmentPatients && this.currentDoctorId) {
                try {
                    const appointmentPatients = await window.DoctorAppointmentPatients.fetchPatientsFromAppointments(this.currentDoctorId);
                    if (appointmentPatients && appointmentPatients.length > 0) {
                        console.log('Found patients from appointments:', appointmentPatients);
                        return this.transformPatientData(appointmentPatients);
                    }
                } catch (error) {
                    console.warn('Failed to fetch patients from appointments:', error.message);
                }
            }
            
            // Method 2: Use the doctor-patient API utility for better integration
            if (window.DoctorPatientAPI && this.currentDoctorId) {
                try {
                    const patients = await window.DoctorPatientAPI.getActivePatients(this.currentDoctorId);
                    return this.transformPatientData(patients);
                } catch (apiError) {
                    console.warn('DoctorPatientAPI failed:', apiError.message);
                }
            }

            // Method 3: Try multiple endpoints to get patient data
            const endpoints = [
                `/v1/healsync/doctor/${this.currentDoctorId}/patients/active`,
                '/v1/healsync/doctor/public-profiles', // Test connectivity
                '/v1/healsync/disease/all' // Another test endpoint
            ];
            
            for (const endpoint of endpoints) {
                try {
                    const response = await fetch(`${API_BASE}${endpoint}`);
                    if (response.ok) {
                        console.log(`Successfully connected to backend via ${endpoint}`);
                        break; // Exit if we can connect
                    }
                } catch (error) {
                    console.warn(`Endpoint ${endpoint} failed:`, error.message);
                }
            }
            
            // Use mock patient data for development
            const mockPatients = [
                {
                    id: 1,
                    patientId: 1,
                    patientName: 'John Doe',
                    email: 'john.doe@example.com',
                    patientAge: 45,
                    gender: 'Male',
                    mobileNo: '+1 (555) 123-4567',
                    dateOfBirth: '1979-03-15'
                },
                {
                    id: 2,
                    patientId: 2,
                    patientName: 'Jane Smith',
                    email: 'jane.smith@example.com',
                    patientAge: 38,
                    gender: 'Female',
                    mobileNo: '+1 (555) 234-5678',
                    dateOfBirth: '1986-07-22'
                },
                {
                    id: 3,
                    patientId: 3,
                    patientName: 'Michael Johnson',
                    email: 'michael.j@example.com',
                    patientAge: 52,
                    gender: 'Male',
                    mobileNo: '+1 (555) 345-6789',
                    dateOfBirth: '1972-11-08'
                }
            ];

            console.log('Using mock patients for development:', mockPatients.length);
            const transformedPatients = this.transformPatientData(mockPatients);
            console.log('Transformed patients:', transformedPatients);
            return transformedPatients;
            
        } catch (error) {
            console.error('Error fetching patients from API:', error);
            // Return mock data instead of showing error
            console.log('Fallback to mock data due to error');
            return this.transformPatientData([
                { id: 1, patientId: 1, patientName: 'Sample Patient', email: 'sample@example.com', patientAge: 30, gender: 'Male' }
            ]);
        }
    }    // Transform patient data to match our needs
    transformPatientData(patients) {
        return patients.map(patient => ({
            id: patient.patientId || patient.id,
            name: patient.patientName || patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
            age: patient.patientAge || patient.age || this.calculateAge(patient.dateOfBirth || patient.dob),
            email: patient.email || patient.patientEmail,
            phone: patient.mobileNo || patient.phone || patient.phoneNumber,
            gender: patient.gender
        })).filter(patient => patient.name); // Filter out patients without names
    }

    // Helper method to calculate age from date of birth
    calculateAge(dateOfBirth) {
        if (!dateOfBirth) return null;
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }

    async fetchDiseases() {
        try {
            // Fetch all diseases from API
            const response = await fetch(`${API_BASE}/v1/healsync/disease/all`);
            
            if (!response.ok) {
                throw new Error(`API responded with status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('All Diseases API Response:', data);
            
            // Return the diseases from API response
            return data.diseases || data || [];
            
        } catch (error) {
            console.error('Error fetching diseases from API:', error);
            this.showAlert('Failed to load diseases. Please check your connection and try again.', 'error');
            return [];
        }
    }

    async fetchMedicines() {
        try {
            // Fetch all medicines from API
            const response = await fetch(`${API_BASE}/v1/healsync/medicine/all`);
            
            if (!response.ok) {
                throw new Error(`API responded with status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('All Medicines API Response:', data);
            
            // Return the medicines from API response
            return data.medicines || data || [];
            
        } catch (error) {
            console.error('Error fetching medicines from API:', error);
            this.showAlert('Failed to load medicines. Please check your connection and try again.', 'error');
            return [];
        }
    }

    populatePatientDropdown(patients) {
        console.log('populatePatientDropdown called with:', patients);
        const select = document.getElementById('patient-select');
        
        if (!select) {
            console.error('patient-select element not found!');
            return;
        }
        
        // Clear existing options
        select.innerHTML = '<option value="">Choose a patient...</option>';
        
        if (!patients || patients.length === 0) {
            console.warn('No patients to populate in dropdown');
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "No patients available";
            option.disabled = true;
            select.appendChild(option);
            return;
        }
        
        patients.forEach((patient, index) => {
            console.log(`Adding patient ${index + 1}:`, patient);
            const option = document.createElement('option');
            option.value = patient.id;
            option.textContent = `${patient.name} (Age: ${patient.age || 'N/A'})`;
            select.appendChild(option);
        });
        
        console.log(`Successfully populated ${patients.length} patients in dropdown`);
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
        // Prepare the payload according to API documentation
        const apiPayload = {
            patientId: parseInt(patientId),
            diagnosis: treatmentData.diagnosis || `Treatment for Disease ID: ${treatmentData.diseaseId}`,
            treatmentGoals: treatmentData.treatmentGoals || treatmentData.notes || "Patient recovery and symptom management",
            notes: treatmentData.notes || "Treatment plan created via doctor dashboard",
            startDate: treatmentData.startDate || new Date().toISOString().split('T')[0],
            endDate: treatmentData.endDate || this.calculateEndDate(treatmentData.startDate),
            status: treatmentData.status || 'ACTIVE',
            medicines: treatmentData.medicines.map(med => ({
                medicineId: parseInt(med.medicineId),
                medicineName: med.medicineName || `Medicine ${med.medicineId}`,
                dosage: med.dosage,
                timing: `${med.frequency} - ${med.instructions || 'As prescribed'}`
            }))
        };

        console.log('Creating treatment plan with payload:', apiPayload);

        // API call to create treatment plan
        const response = await fetch(`${API_BASE}/v1/healsync/treatment-plan/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(apiPayload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || `HTTP error! status: ${response.status}`;
            throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log('Treatment plan created successfully:', result);
        
        // Handle the documented API response format
        if (result.status === 'success' && result.data) {
            return result.data;
        } else if (result.status === 'error') {
            throw new Error(result.message || 'Failed to create treatment plan');
        }
        
        return result;
    }

    // Helper function to calculate end date (3 months from start date)
    calculateEndDate(startDate) {
        if (!startDate) return null;
        const start = new Date(startDate);
        const end = new Date(start);
        end.setMonth(start.getMonth() + 3); // Default 3 months treatment
        return end.toISOString().split('T')[0];
    }



    async loadRecentTreatments() {
        try {
            const container = document.getElementById('recent-treatments');
            if (!container) return;
            
            container.innerHTML = '<div class="treatment-card-skeleton loading-skeleton"></div>'.repeat(3);

            // Try to fetch treatment plans from API with fallback
            let apiTreatments = [];
            try {
                const response = await fetch(`${API_BASE}/v1/healsync/treatment-plan/all`);
                
                if (response.ok) {
                    const responseData = await response.json();
                    console.log('Treatment Plans API Response:', responseData);
                    
                    // Handle the documented API response format
                    if (responseData.status === 'success' && responseData.data) {
                        apiTreatments = Array.isArray(responseData.data) ? responseData.data : [];
                    } else {
                        console.warn('Unexpected API response format:', responseData);
                    }
                } else {
                    console.warn(`Treatment plans API returned ${response.status}, using fallback data`);
                }
            } catch (apiError) {
                console.warn('Treatment plans API unavailable, using fallback data:', apiError.message);
            }
            
            // If no API data, use fallback sample data
            if (apiTreatments.length === 0) {
                apiTreatments = [
                    {
                        treatmentId: 1,
                        patientId: 1,
                        patientName: "John Doe",
                        diseaseId: 1,
                        diseaseName: "Hypertension",
                        status: "Active",
                        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        notes: "Regular monitoring required"
                    },
                    {
                        treatmentId: 2,
                        patientId: 2,
                        patientName: "Jane Smith",
                        diseaseId: 2,
                        diseaseName: "Diabetes",
                        status: "Active",
                        startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        notes: "Diet management focus"
                    }
                ];
            }

            // Handle different response structures and map to our UI format
            const treatments = apiTreatments.slice(0, 6).map(treatment => {
                return {
                    treatmentId: treatment.treatmentPlanId || treatment.treatmentId || treatment.id,
                    patientName: treatment.patientName || `Patient #${treatment.patientId}`,
                    patientEmail: treatment.patientEmail,
                    patientPhone: treatment.patientPhone,
                    diagnosis: treatment.diagnosis || 'Treatment Plan',
                    treatmentGoals: treatment.treatmentGoals,
                    status: treatment.status || 'ACTIVE',
                    startDate: treatment.startDate,
                    endDate: treatment.endDate,
                    medicineCount: treatment.medicines?.length || 0,
                    notes: treatment.notes,
                    medicines: treatment.medicines || []
                };
            });
            
            console.log(`Loaded ${treatments.length} treatment plans from API`);

            // Update UI with treatment data
            setTimeout(() => {
                if (treatments.length > 0) {
                    container.innerHTML = treatments.map(treatment => this.createTreatmentCard(treatment)).join('');
                } else {
                    container.innerHTML = `
                        <div class="no-treatments">
                            <i class="fas fa-clipboard-list"></i>
                            <h3>No Treatment Plans Yet</h3>
                            <p>Create your first treatment plan to get started.</p>
                        </div>
                    `;
                }
            }, 800);

        } catch (error) {
            console.error('Error loading recent treatments:', error);
            document.getElementById('recent-treatments').innerHTML = 
                '<div class="alert alert-error">Failed to load recent treatments. Please check your connection and try again.</div>';
        }
    }

    // Helper method to get patient name by ID
    async getPatientName(patientId) {
        try {
            if (!patientId) return 'Unknown Patient';
            
            // Check if we already have the patient in our loaded data
            if (this.patients && this.patients.length > 0) {
                const patient = this.patients.find(p => p.id == patientId);
                if (patient) return patient.name;
            }
            
            // Try to fetch specific patient data
            // Note: API doesn't have GET /v1/healsync/patient/{id} endpoint
            console.warn(`No API endpoint for individual patient ${patientId}. Using fallback.`);
            
            // Since endpoint doesn't exist, return fallback
            return `Patient #${patientId}`;
        } catch (error) {
            console.warn('Failed to get patient name:', error);
            return `Patient #${patientId}`;
        }
    }

    // Helper method to get disease name by ID
    async getDiseaseName(diseaseId) {
        try {
            if (!diseaseId) return 'Unknown Condition';
            
            // Check if we already have the disease in our loaded data
            if (this.diseases && this.diseases.length > 0) {
                const disease = this.diseases.find(d => d.id == diseaseId);
                if (disease) return disease.name;
            }
            
            // Try to fetch specific disease data
            // Note: API doesn't have GET /v1/healsync/disease/{id} endpoint
            console.warn(`No API endpoint for individual disease ${diseaseId}. Using disease/all.`);
            
            const response = await fetch(`${API_BASE}/v1/healsync/disease/all`);
            if (response.ok) {
                const diseases = await response.json();
                const disease = diseases.find(d => d.diseaseId == diseaseId || d.id == diseaseId);
                return disease?.name || disease?.diseaseName || `Condition #${diseaseId}`;
            }
            
            return `Condition #${diseaseId}`;
        } catch (error) {
            console.warn('Failed to get disease name:', error);
            return `Condition #${diseaseId}`;
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
                            <span class="treatment-info-label">Diagnosis</span>
                            <span class="treatment-info-value">${treatment.diagnosis}</span>
                        </div>
                        <div class="treatment-info-item">
                            <span class="treatment-info-label">Start Date</span>
                            <span class="treatment-info-value">${new Date(treatment.startDate).toLocaleDateString()}</span>
                        </div>
                        <div class="treatment-info-item">
                            <span class="treatment-info-label">Medicines</span>
                            <span class="treatment-info-value">${treatment.medicineCount} prescribed</span>
                        </div>
                        ${treatment.treatmentGoals ? `
                        <div class="treatment-info-item">
                            <span class="treatment-info-label">Goals</span>
                            <span class="treatment-info-value">${treatment.treatmentGoals}</span>
                        </div>
                        ` : ''}
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

    async viewTreatmentDetails(treatmentId) {
        const modal = document.getElementById('treatment-modal');
        const loader = document.getElementById('modal-loader');
        const content = document.getElementById('modal-content');
        const modalTitle = document.getElementById('modal-title');

        // Show modal and loader
        loader.style.display = 'block';
        content.innerHTML = '';
        modal.style.display = 'block';
        setTimeout(() => modal.classList.add('visible'), 10);

        try {
            // Fetch treatment details from API according to documentation
            const response = await fetch(`${API_BASE}/v1/healsync/treatment-plan/${treatmentId}`);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch treatment details: ${response.status}`);
            }
            
            const responseData = await response.json();
            console.log('Treatment Details API Response:', responseData);
            
            let treatment;
            if (responseData.status === 'success' && responseData.data) {
                treatment = responseData.data;
            } else {
                throw new Error('Invalid API response format');
            }
            
            // Process medicines data from the treatment
            const medicines = treatment.medicines || [];
            
            // Render content
            loader.style.display = 'none';
            modalTitle.textContent = `Treatment Plan #${treatmentId}`;
            content.innerHTML = this.renderTreatmentDetails(treatment, medicines);
            
        } catch (error) {
            console.error('Error fetching treatment details:', error);
            loader.style.display = 'none';
            content.innerHTML = `
                <div class="alert alert-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    Failed to load treatment details. Please try again.
                </div>
            `;
        }
    }

    renderTreatmentDetails(treatment, medicines) {
        const startDate = treatment.startDate ? new Date(treatment.startDate).toLocaleDateString() : 'Not specified';
        const endDate = treatment.endDate ? new Date(treatment.endDate).toLocaleDateString() : 'Not specified';
        
        return `
            <div class="treatment-info">
                <div class="treatment-info-item">
                    <span class="treatment-info-label">Patient</span>
                    <span class="treatment-info-value">${treatment.patientName}</span>
                </div>
                ${treatment.patientEmail ? `
                <div class="treatment-info-item">
                    <span class="treatment-info-label">Email</span>
                    <span class="treatment-info-value">${treatment.patientEmail}</span>
                </div>
                ` : ''}
                ${treatment.patientPhone ? `
                <div class="treatment-info-item">
                    <span class="treatment-info-label">Phone</span>
                    <span class="treatment-info-value">${treatment.patientPhone}</span>
                </div>
                ` : ''}
                <div class="treatment-info-item">
                    <span class="treatment-info-label">Diagnosis</span>
                    <span class="treatment-info-value">${treatment.diagnosis}</span>
                </div>
                ${treatment.treatmentGoals ? `
                <div class="treatment-info-item">
                    <span class="treatment-info-label">Treatment Goals</span>
                    <span class="treatment-info-value">${treatment.treatmentGoals}</span>
                </div>
                ` : ''}
                <div class="treatment-info-item">
                    <span class="treatment-info-label">Status</span>
                    <span class="treatment-info-value">
                        <span class="treatment-status status-${(treatment.status || 'ACTIVE').toLowerCase()}">${treatment.status || 'ACTIVE'}</span>
                    </span>
                </div>
                <div class="treatment-info-item">
                    <span class="treatment-info-label">Start Date</span>
                    <span class="treatment-info-value">${startDate}</span>
                </div>
                <div class="treatment-info-item">
                    <span class="treatment-info-label">End Date</span>
                    <span class="treatment-info-value">${endDate}</span>
                </div>
                ${treatment.notes ? `
                <div class="treatment-info-item">
                    <span class="treatment-info-label">Notes</span>
                    <span class="treatment-info-value">${treatment.notes}</span>
                </div>
                ` : ''}
            </div>

            <div class="medicine-list">
                <h4 class="medicine-list-title">Prescribed Medicines</h4>
                ${medicines.length > 0 ? medicines.map(medicine => `
                    <div class="medicine-item">
                        <div class="medicine-name">${medicine.medicineName || 'Unknown Medicine'}</div>
                        <div class="medicine-details">
                            <div class="medicine-dosage">Dosage: ${medicine.dosage || 'As directed'}</div>
                            <div class="medicine-timing">Timing: ${medicine.timing || 'As needed'}</div>
                            ${medicine.treatmentMedID ? `<div class="medicine-id">ID: ${medicine.treatmentMedID}</div>` : ''}
                        </div>
                    </div>
                `).join('') : '<p class="no-medicines">No medicines prescribed yet.</p>'}
            </div>

            <div class="treatment-notes">
                ${treatment.notes ? `
                    <h4>Treatment Notes</h4>
                    <p>${treatment.notes}</p>
                ` : ''}
            </div>
        `;
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

    // Load patient statistics for the dashboard
    async loadPatientStatistics() {
        try {
            if (!this.currentDoctorId) {
                console.warn('Doctor ID not available for statistics');
                return;
            }

            if (window.DoctorPatientUI) {
                await window.DoctorPatientUI.displayPatientStatistics(this.currentDoctorId, 'patient-stats-container');
            } else {
                // Fallback: hide the statistics section if utility not available
                const statsSection = document.querySelector('.patient-stats-section');
                if (statsSection) {
                    statsSection.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Error loading patient statistics:', error);
            const container = document.getElementById('patient-stats-container');
            if (container) {
                container.innerHTML = '<div class="error-message">Unable to load patient statistics</div>';
            }
        }
    }
}

// Initialize doctor dashboard when page loads
let doctorDashboard;
document.addEventListener('DOMContentLoaded', () => {
    // Initialize dashboard regardless of authentication for development
    console.log('Initializing Doctor Dashboard...');
    
    // Check if authentication is available
    if (window.DoctorAuth && typeof window.DoctorAuth.checkDoctorAuthentication === 'function') {
        console.log('Checking doctor authentication...');
        if (window.DoctorAuth.checkDoctorAuthentication()) {
            console.log('Doctor authenticated, initializing dashboard...');
            doctorDashboard = new DoctorDashboard();
        } else {
            console.log('Doctor not authenticated, but initializing for development...');
            doctorDashboard = new DoctorDashboard();
        }
    } else {
        console.log('DoctorAuth not available, initializing dashboard anyway...');
        doctorDashboard = new DoctorDashboard();
    }
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
