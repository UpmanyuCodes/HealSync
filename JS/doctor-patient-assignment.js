// HealSync Doctor-Patient Assignment Functions
// NOTE: Based on updated API documentation, direct patient assignment endpoints don't exist.
// Patients are linked to doctors automatically through appointment bookings.
// This file provides fallback functions for when/if these endpoints are implemented.

// API Base URL - Update this to match your backend
const API_BASE = 'https://healsync-backend-d788.onrender.com';

// Doctor-Patient Assignment API Function (PLACEHOLDER - Endpoint doesn't exist yet)
async function assignPatientToDoctor(doctorId, patientId) {
    try {
        console.warn('Direct patient assignment endpoint not available in current API. Use appointment booking instead.');
        
        // This endpoint doesn't exist in the current API
        const response = await fetch(`${API_BASE}/v1/healsync/doctor/${doctorId}/patients/assign`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('healSync_token')}`
            },
            body: JSON.stringify({
                patientId: patientId,
                assignmentDate: new Date().toISOString(),
                assignedBy: 'admin'
            })
        });

        if (!response.ok) {
            throw new Error(`Assignment failed: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error assigning patient to doctor:', error);
        throw error;
    }
}

// Bulk assignment function
async function assignMultiplePatientsToDoctor(doctorId, patientIds) {
    const results = [];
    
    for (const patientId of patientIds) {
        try {
            const result = await assignPatientToDoctor(doctorId, patientId);
            results.push({ patientId, success: true, result });
        } catch (error) {
            results.push({ patientId, success: false, error: error.message });
        }
    }
    
    return results;
}

// Get doctor's current patients
async function getDoctorPatients(doctorId) {
    try {
        const response = await fetch(`${API_BASE}/v1/healsync/doctor/${doctorId}/patients`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch patients: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching doctor patients:', error);
        throw error;
    }
}

// Remove patient from doctor
async function removePatientFromDoctor(doctorId, patientId) {
    try {
        const response = await fetch(`${API_BASE}/v1/healsync/doctor/${doctorId}/patients/${patientId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('healSync_token')}`
            }
        });

        if (!response.ok) {
            throw new Error(`Removal failed: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error removing patient from doctor:', error);
        throw error;
    }
}

// Book appointment function (creates doctor-patient relationship automatically)
async function bookAppointmentWithDoctor(specialty, startDateTime, endDateTime, patientId) {
    try {
        const response = await fetch(`${API_BASE}/v1/healsync/book/appointment?speaciality=${encodeURIComponent(specialty)}&startDateTime=${encodeURIComponent(startDateTime)}&endDateTime=${encodeURIComponent(endDateTime)}&patientId=${patientId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('healSync_token')}`
            }
        });

        if (!response.ok) {
            throw new Error(`Appointment booking failed: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error booking appointment:', error);
        throw error;
    }
}

// Usage Examples:
/*
// Assign single patient to doctor
assignPatientToDoctor(1, 123)
    .then(result => console.log('Patient assigned successfully:', result))
    .catch(error => console.error('Assignment failed:', error));

// Assign multiple patients to doctor
assignMultiplePatientsToDoctor(1, [123, 456, 789])
    .then(results => console.log('Bulk assignment results:', results))
    .catch(error => console.error('Bulk assignment failed:', error));

// Get all patients for a doctor
getDoctorPatients(1)
    .then(patients => console.log('Doctor patients:', patients))
    .catch(error => console.error('Failed to fetch patients:', error));

// Remove patient from doctor
removePatientFromDoctor(1, 123)
    .then(result => console.log('Patient removed successfully:', result))
    .catch(error => console.error('Removal failed:', error));

// Book appointment (automatically creates relationship)
bookAppointmentWithDoctor('Cardiology', '2024-08-15T10:00:00', '2024-08-15T11:00:00', 123)
    .then(result => console.log('Appointment booked and relationship created:', result))
    .catch(error => console.error('Booking failed:', error));
*/
