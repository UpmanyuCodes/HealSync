// Doctor Appointment-Based Patient Fetcher
// This module fetches patients who have booked appointments with the doctor

const DoctorAppointmentPatients = {
    
    // Fetch all patients who have booked appointments with this doctor
    async fetchPatientsFromAppointments(doctorId) {
        try {
            console.log('Fetching patients from doctor appointments...', doctorId);
            
            // Method 1: Check localStorage for recent appointments
            const localPatients = this.getPatientsFromLocalStorage(doctorId);
            if (localPatients && localPatients.length > 0) {
                console.log('Found patients from localStorage:', localPatients);
                return localPatients;
            }
            
            // Method 2: Try to get doctor's appointments from API
            const appointments = await this.getDoctorAppointments(doctorId);
            
            if (appointments && appointments.length > 0) {
                // Extract unique patients from appointments
                const patients = this.extractPatientsFromAppointments(appointments);
                console.log('Patients extracted from API appointments:', patients);
                return patients;
            }
            
            // If no appointments found, return empty array
            console.log('No appointments found for doctor', doctorId);
            return [];
            
        } catch (error) {
            console.error('Error fetching patients from appointments:', error);
            return [];
        }
    },

    // Get patients from localStorage appointments
    getPatientsFromLocalStorage(doctorId) {
        try {
            console.log('🔍 Checking localStorage for appointments...', doctorId);
            
            // Check both storage locations
            const appointments = JSON.parse(localStorage.getItem('healsync_appointments') || '[]');
            const bookings = JSON.parse(localStorage.getItem('healSync_bookings') || '[]');
            
            console.log('📂 Stored appointments:', appointments);
            console.log('📂 Stored bookings:', bookings);
            
            // Combine both sources
            const allAppointments = [...appointments, ...bookings];
            
            const doctorAppointments = allAppointments.filter(apt => apt.doctorId == doctorId);
            console.log('👨‍⚕️ Doctor appointments for', doctorId, ':', doctorAppointments);
            
            if (doctorAppointments.length > 0) {
                console.log('✅ Found appointments for doctor', doctorId, ':', doctorAppointments);
                const patients = this.extractPatientsFromAppointments(doctorAppointments);
                console.log('👥 Extracted patients:', patients);
                return patients;
            }
            
            console.log('❌ No appointments found for doctor', doctorId);
            return [];
        } catch (error) {
            console.error('❌ Error reading appointments from localStorage:', error);
            return [];
        }
    },

    // Get all appointments for a doctor
    async getDoctorAppointments(doctorId) {
        const endpoints = [
            `/v1/healsync/book/doctor/appointments?doctorId=${doctorId}`,  // Correct API endpoint
            `/v1/healsync/book/filter?doctorId=${doctorId}`,  // Alternative filtering endpoint
            `/api/appointments/doctor/${doctorId}`,  // Legacy endpoint
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await fetch(`${API_BASE}${endpoint}`);
                if (response.ok) {
                    const data = await response.json();
                    console.log(`Appointments fetched from ${endpoint}:`, data);
                    return Array.isArray(data) ? data : [data];
                }
            } catch (error) {
                console.warn(`Failed to fetch from ${endpoint}:`, error.message);
            }
        }

        // If no endpoint works, return empty array
        console.log('No appointment endpoints available');
        return [];
    },

    // Extract unique patients from appointment data
    extractPatientsFromAppointments(appointments) {
        const patientMap = new Map();

        appointments.forEach(appointment => {
            const patient = {
                id: appointment.patientId,
                patientId: appointment.patientId,
                patientName: appointment.patientName || `Patient ${appointment.patientId}`,
                email: appointment.patientEmail || `patient${appointment.patientId}@example.com`,
                patientAge: appointment.patientAge || null,
                gender: appointment.patientGender || appointment.gender || 'Unknown',
                mobileNo: appointment.patientPhone || appointment.patientMobile || null,
                appointmentDate: appointment.date || appointment.appointmentDate,
                appointmentTime: appointment.startTime || appointment.time,
                status: appointment.status || 'SCHEDULED'
            };

            // Only add if we have a valid patient ID and name
            if (patient.id && patient.patientName) {
                patientMap.set(patient.id, patient);
            }
        });

        return Array.from(patientMap.values());
    },

    // Get a specific patient's appointment history with this doctor
    async getPatientAppointmentHistory(doctorId, patientId) {
        try {
            const appointments = await this.getDoctorAppointments(doctorId);
            return appointments.filter(apt => apt.patientId === patientId);
        } catch (error) {
            console.error('Error fetching patient appointment history:', error);
            return [];
        }
    }
};

// Make it available globally
window.DoctorAppointmentPatients = DoctorAppointmentPatients;
