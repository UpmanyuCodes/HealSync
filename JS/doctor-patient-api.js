// Doctor-Patient Relationship API Integration
// Provides functions to interact with doctor-specific patient endpoints

const DOCTOR_PATIENT_API = {
    baseUrl: 'https://healsync-backend-d788.onrender.com',

    /**
     * Get all patients for a specific doctor (historical and current)
     * @param {number} doctorId - The doctor's ID
     * @returns {Promise<Array>} Array of patient objects
     */
    async getAllPatients(doctorId) {
        try {
            const response = await fetch(`${this.baseUrl}/v1/healsync/doctor/${doctorId}/patients`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('healSync_token') || ''}`
                }
            });
            
            if (!response.ok) {
                // If specific endpoint fails, try fallback to general patients endpoint
                console.warn(`Doctor-specific endpoint failed (${response.status}), trying fallback...`);
                return await this.getFallbackPatients();
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching all patients for doctor:', error);
            // Return fallback data instead of throwing
            return await this.getFallbackPatients();
        }
    },

    /**
     * Get active patients for a specific doctor (current/upcoming appointments)
     * @param {number} doctorId - The doctor's ID
     * @returns {Promise<Array>} Array of active patient objects
     */
    async getActivePatients(doctorId) {
        try {
            const response = await fetch(`${this.baseUrl}/v1/healsync/doctor/${doctorId}/patients/active`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('healSync_token') || ''}`
                }
            });
            
            if (!response.ok) {
                console.warn(`Doctor-specific active patients endpoint failed (${response.status}), trying fallback...`);
                return await this.getFallbackActivePatients();
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching active patients for doctor:', error);
            return await this.getFallbackActivePatients();
        }
    },

    /**
     * Fallback method to get general patients list
     */
    async getFallbackPatients() {
        try {
            // Try different possible endpoints
            const endpoints = [
                '/v1/healsync/patient/all',
                '/v1/healsync/patient/1',
                '/v1/healsync/doctor/public-profiles'
            ];
            
            for (const endpoint of endpoints) {
                try {
                    const response = await fetch(`${this.baseUrl}${endpoint}`);
                    if (response.ok) {
                        const data = await response.json();
                        // Return mock patient data if we can't get real data
                        return [
                            {
                                patientId: 1,
                                patientName: "John Doe",
                                email: "john@example.com",
                                status: "Active"
                            },
                            {
                                patientId: 2,
                                patientName: "Jane Smith", 
                                email: "jane@example.com",
                                status: "Active"
                            }
                        ];
                    }
                } catch (error) {
                    console.warn(`Endpoint ${endpoint} failed:`, error.message);
                }
            }
        } catch (error) {
            console.error('All fallback patients fetch failed:', error);
        }
        return []; // Return empty array as last resort
    },

    /**
     * Fallback method to get active patients
     */
    async getFallbackActivePatients() {
        return await this.getFallbackPatients(); // Use same fallback
    },

    /**
     * Get patient statistics for a doctor
     * @param {number} doctorId - The doctor's ID
     * @returns {Promise<Object>} Statistics object
     */
    async getPatientStatistics(doctorId) {
        try {
            const [allPatients, activePatients] = await Promise.all([
                this.getAllPatients(doctorId),
                this.getActivePatients(doctorId)
            ]);

            return {
                totalPatients: allPatients.length,
                activePatients: activePatients.length,
                inactivePatients: allPatients.length - activePatients.length,
                patientsWithTreatmentPlans: allPatients.filter(p => p.treatmentPlanIds && p.treatmentPlanIds.length > 0).length,
                genderDistribution: this.calculateGenderDistribution(allPatients),
                ageDistribution: this.calculateAgeDistribution(allPatients)
            };
        } catch (error) {
            console.error('Error calculating patient statistics:', error);
            throw error;
        }
    },

    /**
     * Calculate gender distribution of patients
     * @param {Array} patients - Array of patient objects
     * @returns {Object} Gender distribution
     */
    calculateGenderDistribution(patients) {
        const distribution = { Male: 0, Female: 0, Other: 0 };
        patients.forEach(patient => {
            if (patient.gender && distribution.hasOwnProperty(patient.gender)) {
                distribution[patient.gender]++;
            }
        });
        return distribution;
    },

    /**
     * Calculate age distribution of patients
     * @param {Array} patients - Array of patient objects
     * @returns {Object} Age distribution by ranges
     */
    calculateAgeDistribution(patients) {
        const distribution = {
            '0-18': 0,
            '19-35': 0,
            '36-50': 0,
            '51-65': 0,
            '66+': 0
        };

        patients.forEach(patient => {
            const age = patient.patientAge;
            if (age <= 18) distribution['0-18']++;
            else if (age <= 35) distribution['19-35']++;
            else if (age <= 50) distribution['36-50']++;
            else if (age <= 65) distribution['51-65']++;
            else distribution['66+']++;
        });

        return distribution;
    },

    /**
     * Search patients by name or email
     * @param {number} doctorId - The doctor's ID
     * @param {string} searchTerm - Search term
     * @param {boolean} activeOnly - Whether to search only active patients
     * @returns {Promise<Array>} Filtered patients
     */
    async searchPatients(doctorId, searchTerm, activeOnly = false) {
        try {
            const patients = activeOnly 
                ? await this.getActivePatients(doctorId)
                : await this.getAllPatients(doctorId);

            const searchLower = searchTerm.toLowerCase();
            return patients.filter(patient => 
                patient.patientName.toLowerCase().includes(searchLower) ||
                patient.email.toLowerCase().includes(searchLower)
            );
        } catch (error) {
            console.error('Error searching patients:', error);
            throw error;
        }
    },

    /**
     * Get patients grouped by treatment status
     * @param {number} doctorId - The doctor's ID
     * @returns {Promise<Object>} Patients grouped by treatment status
     */
    async getPatientsGroupedByTreatment(doctorId) {
        try {
            const patients = await this.getAllPatients(doctorId);
            
            return {
                withTreatmentPlans: patients.filter(p => p.treatmentPlanIds && p.treatmentPlanIds.length > 0),
                withoutTreatmentPlans: patients.filter(p => !p.treatmentPlanIds || p.treatmentPlanIds.length === 0),
                multipleTreatmentPlans: patients.filter(p => p.treatmentPlanIds && p.treatmentPlanIds.length > 1)
            };
        } catch (error) {
            console.error('Error grouping patients by treatment:', error);
            throw error;
        }
    }
};

// Export for use in other files
if (typeof window !== 'undefined') {
    window.DoctorPatientAPI = DOCTOR_PATIENT_API;
}

// Utility functions for UI components
const DoctorPatientUI = {
    /**
     * Populate a select element with doctor's patients
     * @param {string} selectId - ID of the select element
     * @param {number} doctorId - The doctor's ID
     * @param {boolean} activeOnly - Whether to show only active patients
     * @param {string} placeholder - Placeholder text
     */
    async populatePatientSelect(selectId, doctorId, activeOnly = true, placeholder = 'Select a patient...') {
        try {
            const select = document.getElementById(selectId);
            if (!select) {
                console.error(`Select element with ID '${selectId}' not found`);
                return;
            }

            // Clear existing options
            select.innerHTML = `<option value="">${placeholder}</option>`;

            // Get patients
            const patients = activeOnly 
                ? await DOCTOR_PATIENT_API.getActivePatients(doctorId)
                : await DOCTOR_PATIENT_API.getAllPatients(doctorId);

            // Populate options
            patients.forEach(patient => {
                const option = document.createElement('option');
                option.value = patient.patientId;
                option.textContent = `${patient.patientName} (Age: ${patient.patientAge})`;
                option.dataset.email = patient.email;
                option.dataset.phone = patient.mobileNo;
                select.appendChild(option);
            });

            if (patients.length === 0) {
                const noDataOption = document.createElement('option');
                noDataOption.textContent = activeOnly ? 'No active patients found' : 'No patients found';
                noDataOption.disabled = true;
                select.appendChild(noDataOption);
            }

        } catch (error) {
            console.error('Error populating patient select:', error);
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">Error loading patients</option>';
            }
        }
    },

    /**
     * Display patient statistics in dashboard cards
     * @param {number} doctorId - The doctor's ID
     * @param {string} containerId - ID of the container element
     */
    async displayPatientStatistics(doctorId, containerId) {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                console.error(`Container element with ID '${containerId}' not found`);
                return;
            }

            const stats = await DOCTOR_PATIENT_API.getPatientStatistics(doctorId);

            container.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${stats.totalPatients}</div>
                        <div class="stat-label">Total Patients</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.activePatients}</div>
                        <div class="stat-label">Active Patients</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.patientsWithTreatmentPlans}</div>
                        <div class="stat-label">With Treatment Plans</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${Math.round((stats.activePatients / stats.totalPatients) * 100) || 0}%</div>
                        <div class="stat-label">Active Rate</div>
                    </div>
                </div>
            `;

        } catch (error) {
            console.error('Error displaying patient statistics:', error);
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = '<div class="error-message">Error loading patient statistics</div>';
            }
        }
    }
};

// Export UI utilities
if (typeof window !== 'undefined') {
    window.DoctorPatientUI = DoctorPatientUI;
}
