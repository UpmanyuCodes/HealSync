// API Service for Patient Profile Dashboard
// Centralized API handling with error management and retry logic

class PatientAPIService {
    constructor() {
        this.baseURL = 'https://healsync-backend-d788.onrender.com';
        this.endpoints = {
            // Patient Authentication
            patientLogin: '/v1/healsync/patient/login',
            patientAdd: '/v1/healsync/patient/add',
            
            // Appointment Management
            patientAppointments: '/v1/healsync/book/patient/appointments',
            bookAppointment: '/v1/healsync/book/appointment',
            cancelAppointment: '/v1/healsync/book/cancel/patient',
            rescheduleAppointment: '/v1/healsync/book/reschedule',
            appointmentDetails: '/v1/healsync/book/appointment',
            confirmAppointment: '/v1/healsync/book/confirm',
            completeAppointment: '/v1/healsync/book/complete',
            
            // Doctor Discovery
            allDoctors: '/v1/healsync/doctor/all',
            doctorsBySpecialty: '/v1/healsync/doctor/specialty',
            availableSlots: '/v1/healsync/book/available-slots',
            
            // Treatment Plans
            treatmentPlans: '/v1/healsync/treatment-plan/all',
            treatmentPlanById: '/v1/healsync/treatment-plan',
            createTreatmentPlan: '/v1/healsync/treatment-plan/create',
            
            // Medicine Management
            allMedicines: '/v1/healsync/medicine/all',
            medicineById: '/v1/healsync/medicine',
            
            // Disease Management
            allDiseases: '/v1/healsync/disease/all',
            diseaseById: '/v1/healsync/disease',
            
            // Emergency Services
            emergencyServices: '/v1/healsync/emergency/services',
            nearbyHospitals: '/v1/healsync/emergency/hospitals/nearby',
            
            // Password Reset
            forgotPassword: '/v1/healsync/password/forgot',
            verifyOTP: '/v1/healsync/password/verify',
            resetPassword: '/v1/healsync/password/reset'
        };
        
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }
    
    // Generic API call method with error handling
    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: { ...this.defaultHeaders, ...options.headers },
            ...options
        };
        
        try {
            console.log(`Making request to: ${url}`);
            const response = await fetch(url, config);
            
            // Handle different response types
            if (response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    return await response.json();
                } else {
                    return await response.text();
                }
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error(`API request failed for ${url}:`, error);
            throw this.handleAPIError(error, endpoint);
        }
    }
    
    // Error handling
    handleAPIError(error, endpoint) {
        let userMessage = 'An error occurred. Please try again.';
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            userMessage = 'Network error. Please check your connection.';
        } else if (error.message.includes('401')) {
            userMessage = 'Authentication failed. Please login again.';
        } else if (error.message.includes('404')) {
            userMessage = 'Requested resource not found.';
        } else if (error.message.includes('500')) {
            userMessage = 'Server error. Please try again later.';
        }
        
        return {
            success: false,
            error: error.message,
            userMessage: userMessage,
            endpoint: endpoint
        };
    }
    
    // Patient Authentication
    async authenticatePatient(email, password) {
        return await this.makeRequest(this.endpoints.patientLogin, {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }
    
    // Get Patient Appointments
    async getPatientAppointments(patientId) {
        const endpoint = `${this.endpoints.patientAppointments}?patientId=${patientId}`;
        return await this.makeRequest(endpoint, { method: 'GET' });
    }
    
    // Book New Appointment
    async bookAppointment(appointmentData) {
        const { specialty, startDateTime, endDateTime, patientId } = appointmentData;
        const params = new URLSearchParams({
            specialty,
            startDateTime,
            endDateTime,
            patientId: patientId.toString()
        });
        
        const endpoint = `${this.endpoints.bookAppointment}?${params}`;
        return await this.makeRequest(endpoint, { method: 'POST' });
    }
    
    // Cancel Appointment
    async cancelAppointment(appointmentId, patientId) {
        const params = new URLSearchParams({
            appointmentId: appointmentId.toString(),
            patientId: patientId.toString()
        });
        
        const endpoint = `${this.endpoints.cancelAppointment}?${params}`;
        return await this.makeRequest(endpoint, { method: 'POST' });
    }
    
    // Reschedule Appointment
    async rescheduleAppointment(rescheduleData) {
        const { appointmentId, requesterId, requesterRole, newStartDateTime, newEndDateTime } = rescheduleData;
        const params = new URLSearchParams({
            appointmentId: appointmentId.toString(),
            requesterId: requesterId.toString(),
            requesterRole,
            newStartDateTime,
            newEndDateTime
        });
        
        const endpoint = `${this.endpoints.rescheduleAppointment}?${params}`;
        return await this.makeRequest(endpoint, { method: 'POST' });
    }
    
    // Get Appointment Details
    async getAppointmentDetails(appointmentId) {
        const endpoint = `${this.endpoints.appointmentDetails}?appointmentId=${appointmentId}`;
        return await this.makeRequest(endpoint, { method: 'GET' });
    }
    
    // Get Available Slots
    async getAvailableSlots(specialty, date, durationMinutes = 60) {
        const params = new URLSearchParams({
            specialty,
            date,
            durationMinutes: durationMinutes.toString()
        });
        
        const endpoint = `${this.endpoints.availableSlots}?${params}`;
        return await this.makeRequest(endpoint, { method: 'GET' });
    }
    
    // Get All Doctors
    async getAllDoctors() {
        return await this.makeRequest(this.endpoints.allDoctors, { method: 'GET' });
    }
    
    // Get Doctors by Specialty
    async getDoctorsBySpecialty(specialty) {
        const endpoint = `${this.endpoints.doctorsBySpecialty}/${specialty}`;
        return await this.makeRequest(endpoint, { method: 'GET' });
    }
    
    // Get Treatment Plans for Patient
    async getPatientTreatmentPlans(patientId) {
        // Note: This endpoint might need to be filtered on the frontend
        // since the API returns all treatment plans
        const allPlans = await this.makeRequest(this.endpoints.treatmentPlans, { method: 'GET' });
        
        // Filter for specific patient if the API response is an array
        if (Array.isArray(allPlans)) {
            return allPlans.filter(plan => plan.patientId === patientId);
        }
        
        return allPlans;
    }
    
    // Get Treatment Plan by ID
    async getTreatmentPlan(treatmentPlanId) {
        const endpoint = `${this.endpoints.treatmentPlanById}/${treatmentPlanId}`;
        return await this.makeRequest(endpoint, { method: 'GET' });
    }
    
    // Get All Medicines
    async getAllMedicines() {
        return await this.makeRequest(this.endpoints.allMedicines, { method: 'GET' });
    }
    
    // Get Medicine by ID
    async getMedicine(medicineId) {
        const endpoint = `${this.endpoints.medicineById}/${medicineId}`;
        return await this.makeRequest(endpoint, { method: 'GET' });
    }
    
    // Get All Diseases
    async getAllDiseases() {
        return await this.makeRequest(this.endpoints.allDiseases, { method: 'GET' });
    }
    
    // Get Emergency Services
    async getEmergencyServices() {
        return await this.makeRequest(this.endpoints.emergencyServices, { method: 'GET' });
    }
    
    // Get Nearby Hospitals
    async getNearbyHospitals(latitude, longitude, radius = 10) {
        const params = new URLSearchParams({
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            radius: radius.toString()
        });
        
        const endpoint = `${this.endpoints.nearbyHospitals}?${params}`;
        return await this.makeRequest(endpoint, { method: 'GET' });
    }
    
    // Password Reset Flow
    async forgotPassword(email) {
        return await this.makeRequest(this.endpoints.forgotPassword, {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    }
    
    async verifyOTP(email, otp) {
        return await this.makeRequest(this.endpoints.verifyOTP, {
            method: 'POST',
            body: JSON.stringify({ email, otp })
        });
    }
    
    async resetPassword(email, newPassword, otp) {
        return await this.makeRequest(this.endpoints.resetPassword, {
            method: 'POST',
            body: JSON.stringify({ email, newPassword, otp })
        });
    }
    
    // Utility method to format dates for API calls
    formatDateTimeForAPI(date) {
        if (!(date instanceof Date)) {
            date = new Date(date);
        }
        return date.toISOString().slice(0, 19); // Remove milliseconds and timezone
    }
    
    // Utility method to parse API response dates
    parseDateTimeFromAPI(dateString) {
        return new Date(dateString);
    }
    
    // Health check method
    async healthCheck() {
        try {
            // Try a simple GET request to see if the API is responsive
            const response = await this.makeRequest('/health', { method: 'GET' });
            return { success: true, message: 'API is responsive' };
        } catch (error) {
            return { success: false, message: 'API is not responding', error };
        }
    }
}

// Create a global instance
const patientAPI = new PatientAPIService();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PatientAPIService;
} else {
    window.PatientAPIService = PatientAPIService;
    window.patientAPI = patientAPI;
}
