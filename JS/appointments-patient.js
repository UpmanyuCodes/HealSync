const baseUrl = 'https://healsync-backend-d788.onrender.com/v1/healsync/book';
let currentRescheduleId = null;

// Initialize app on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    setMinDate();
});

function initializeApp() {
    const patientData = getPatientSession();
    if (!patientData) {
        window.location.href = '/HTML/login.html';
        return;
    }
    
    // Handle URL parameters for pre-filling specialty
    handleUrlParameters();
    
    loadAppointments();
    updateAppointmentStats();
    
    // ✅ Debug: Check if chat system is properly initialized
    setTimeout(() => {
        console.log('🔍 Chat System Debug:');
        console.log('  - window.healSyncChat exists:', typeof window.healSyncChat !== 'undefined');
        console.log('  - Chat drawer element exists:', !!document.getElementById('chat-drawer'));
        if (window.healSyncChat) {
            console.log('  - Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(window.healSyncChat)));
            console.log('  - Has openChat method:', typeof window.healSyncChat.openChat === 'function');
        }
    }, 1000); // Wait 1 second for chat system to initialize
}

function setupEventListeners() {
    // Reschedule modal form
    document.getElementById('reschedule-form').addEventListener('submit', handleRescheduleSubmit);
    
    // Filter appointments
    document.getElementById('appointment-filter').addEventListener('change', filterAppointments);
    
    // Close modal when clicking outside
    document.getElementById('reschedule-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeRescheduleModal();
        }
    });
}

function setMinDate() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const minDate = tomorrow.toISOString().split('T')[0];
    const newDateInput = document.getElementById('new-date');
    if (newDateInput) {
        newDateInput.min = minDate;
    }
}

function handleUrlParameters() {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const specialty = urlParams.get('specialty') || sessionStorage.getItem('selectedSpecialty');
    
    if (specialty) {
        // Pre-fill specialty dropdown
        const specialtySelect = document.getElementById('specialty');
        if (specialtySelect) {
            specialtySelect.value = specialty;
            console.log(`✅ Pre-filled specialty: ${specialty}`);
        }
        
        // Clear sessionStorage to avoid repeated pre-filling
        sessionStorage.removeItem('selectedSpecialty');
        
        // Update URL to remove parameters (clean URL)
        if (urlParams.get('specialty')) {
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    }
}

// Function to fetch doctor details by ID
async function fetchDoctorDetails(doctorId) {
    try {
        console.log(`🔍 Fetching doctor details for ID: ${doctorId}`);
        
        // Use the API endpoint you specified
        const apiUrl = `https://healsync-backend-d788.onrender.com/v1/healsync/doctor/${doctorId}`;
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('healSync_token') || ''}`
            }
        });
        
        if (response.ok) {
            const doctorData = await response.json();
            console.log(`✅ Found doctor data for ID ${doctorId}:`, doctorData);
            
            // Extract doctor information from response
            const doctorInfo = {
                id: doctorId,
                name: doctorData.doctorName || 
                      doctorData.name || 
                      doctorData.firstName || 
                      (doctorData.firstName && doctorData.lastName ? `${doctorData.firstName} ${doctorData.lastName}` : null) ||
                      `Doctor #${doctorId}`,
                specialty: doctorData.specialty || 
                          doctorData.specialization || 
                          doctorData.department || 
                          'General Medicine',
                email: doctorData.email || '',
                phone: doctorData.phone || doctorData.mobileNo || '',
                data: doctorData
            };
            
            console.log(`✅ Processed doctor info:`, doctorInfo);
            return doctorInfo;
        } else {
            console.warn(`⚠️ Failed to fetch doctor ${doctorId}: ${response.status} ${response.statusText}`);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
    } catch (error) {
        console.error(`❌ Error fetching doctor details for ID ${doctorId}:`, error);
        
        // Return generic info as fallback
        return {
            id: doctorId,
            name: `Doctor #${doctorId}`,
            specialty: 'General Medicine',
            email: '',
            phone: '',
            data: null
        };
    }
}

async function loadAppointments() {
    const patientData = getPatientSession();
    if (!patientData) return;
    
    try {
        // Use enhanced API endpoint with complete doctor information
        const patientId = patientData.patientId || patientData.id;
        
        if (!patientId) {
            console.error('❌ No patient ID found in session data');
            await displayAppointments([]);
            return;
        }
        
        console.log(`📡 Loading enhanced appointments for patient ${patientId}...`);
        
        // Use proper timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        // ✅ NEW: Use enhanced appointment endpoint with complete doctor info
        const response = await fetch(`${baseUrl}/patient/appointments?patientId=${patientId}`, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('healSync_token') || ''}`
            }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const appointments = await response.json();
            console.log('✅ Enhanced appointments loaded successfully:', appointments);
            
            // Enhanced logging to verify backend fixes
            if (appointments && appointments.length > 0) {
                const sample = appointments[0];
                console.log('🎯 BACKEND FIXES VERIFICATION:');
                console.log('  ✅ Appointment ID:', sample.id, '(should not be undefined)');
                console.log('  ✅ Doctor Name:', sample.doctorName, '(should not be undefined)');
                console.log('  ✅ Doctor Specialty:', sample.doctorSpecialty, '(should not be undefined)');
                console.log('  ✅ Doctor Email:', sample.doctorEmail);
                console.log('  ✅ All enhanced fields:', Object.keys(sample));
            }
            
            await displayAppointments(Array.isArray(appointments) ? appointments : appointments.data || []);
        } else {
            // If API fails, show empty state
            console.warn(`❌ Failed to load appointments from API: ${response.status} ${response.statusText}`);
            await displayAppointments([]);
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn('⚠️ Request timed out - backend might be slow or offline');
            await displayAppointments([]);
        } else {
            console.error('❌ Error loading appointments:', error.message || error);
            await displayAppointments([]);
        }
        // Don't show error snackbar on page load, just log it
    }
}

async function displayAppointments(appointments) {
    const container = document.getElementById('appointments-container');
    
    // Debug: Log what we received
    console.log('🔍 Displaying appointments:', appointments);
    
    if (!appointments || appointments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>No appointments found</h3>
                <p>Book your first appointment to get started</p>
            </div>
        `;
        return;
    }
    
    // Debug: Show the structure of ALL appointments
    console.log('📊 Total appointments received:', appointments.length);
    if (appointments.length > 0) {
        console.log('📊 First appointment fields:', Object.keys(appointments[0]));
        console.log('📅 First appointment full data:', JSON.stringify(appointments[0], null, 2));
        
        // Show structure of all appointments for debugging
        appointments.forEach((apt, index) => {
            console.log(`📋 Appointment ${index + 1}:`, {
                id: apt.id,
                status: apt.status,
                doctorName: apt.doctorName,
                doctor: apt.doctor,
                doctorId: apt.doctorId,
                date: apt.date,
                start: apt.start,
                appointmentDate: apt.appointmentDate,
                scheduledDate: apt.scheduledDate
            });
        });
        
        // DIAGNOSIS: Frontend vs Backend Issue
        console.log('\n🏥 HEALSYNC APPOINTMENT DIAGNOSIS:');
        console.log('=======================================');
        
        const missingDoctorInfo = appointments.filter(apt => 
            !apt.doctorName && !apt.doctor && !apt.doctorFirstName
        ).length;
        
        const missingDoctorIds = appointments.filter(apt => !apt.doctorId).length;
        const missingSpecialties = appointments.filter(apt => 
            !apt.specialty && !apt.specialization
        ).length;
        
        console.log(`📊 ANALYSIS RESULTS (${appointments.length} appointments):`);
        console.log(`  ❌ Missing Doctor Names: ${missingDoctorInfo}/${appointments.length}`);
        console.log(`  ❌ Missing Doctor IDs: ${missingDoctorIds}/${appointments.length}`);
        console.log(`  ❌ Missing Specialties: ${missingSpecialties}/${appointments.length}`);
        
        if (missingDoctorInfo > 0 || missingDoctorIds > 0) {
            console.log('\n🚨 BACKEND ISSUE DETECTED:');
            console.log('  The backend is not providing complete doctor information.');
            console.log('  Required fields missing from API response:');
            if (missingDoctorInfo > 0) console.log('    - doctorName or doctor or doctorFirstName');
            if (missingDoctorIds > 0) console.log('    - doctorId');
            if (missingSpecialties > 0) console.log('    - specialty or specialization');
            console.log('\n💡 RECOMMENDATION:');
            console.log('  Ask backend developer to include doctor information in appointment API response.');
            console.log('  The appointment entity should include doctor details via JOIN or separate API call.');
        } else {
            console.log('\n✅ BACKEND DATA COMPLETE:');
            console.log('  All required doctor information is available.');
            console.log('  Any display issues are frontend-related.');
        }
        console.log('=======================================\n');
    }
    
    // Sort appointments by date (newest first)
    appointments.sort((a, b) => {
        // Get dates from different possible field names
        let dateA = a.start || a.appointmentDate || a.date || a.scheduledDate;
        let dateB = b.start || b.appointmentDate || b.date || b.scheduledDate;
        
        return new Date(dateB) - new Date(dateA);
    });
    
    // Show loading state while fetching doctor details
    container.innerHTML = '<div class="loading">Loading appointment details...</div>';
    
    try {
        // Create appointment cards with doctor information
        const appointmentCards = await Promise.all(
            appointments.map(appointment => createAppointmentCard(appointment))
        );
        
        container.innerHTML = appointmentCards.join('');
        console.log('✅ All appointment cards rendered with doctor information');
        
    } catch (error) {
        console.error('❌ Error creating appointment cards:', error);
        // Fallback to basic display without doctor fetching
        const basicCards = appointments.map(appointment => {
            // Simple card without API fetching
            return `
                <div class="appointment-card">
                    <h3>Appointment</h3>
                    <p>Status: ${appointment.status || 'booked'}</p>
                    <p>Doctor ID: ${appointment.doctorId || 'Unknown'}</p>
                </div>
            `;
        });
        container.innerHTML = basicCards.join('');
    }
}

async function createAppointmentCard(appointment) {
    // ✅ Backend now provides complete doctor information - no need for complex fetching
    console.log('🎯 Enhanced appointment from backend:', {
        id: appointment.id,
        doctorName: appointment.doctorName,
        doctorSpecialty: appointment.doctorSpecialty,
        doctorEmail: appointment.doctorEmail,
        status: appointment.status,
        startTime: appointment.startTime
    });
    
    // ✅ Use enhanced fields directly from backend
    const appointmentId = appointment.id; // Backend always provides 'id' field
    const doctorName = appointment.doctorName || 'Dr. Unknown';
    const specialty = appointment.doctorSpecialty || 'General Medicine';
    const doctorEmail = appointment.doctorEmail || '';
    const doctorMobile = appointment.doctorMobileNo || '';
    
    if (!appointmentId) {
        console.error(`❌ Missing appointment ID in appointment object:`, appointment);
        return '<div class="appointment-card error">Error: Missing appointment ID</div>';
    }
    
    // Handle dates using the enhanced backend format
    let startDate, endDate;
    
    if (appointment.startTime) {
        startDate = new Date(appointment.startTime);
    } else {
        startDate = new Date(); // fallback
    }
    
    if (appointment.endTime) {
        endDate = new Date(appointment.endTime);
    } else {
        endDate = new Date(startDate.getTime() + 60 * 60000); // Add 1 hour
    }
    
    // Check if dates are valid
    if (isNaN(startDate.getTime())) {
        console.warn('Invalid start date for appointment:', appointment);
        startDate = new Date();
    }
    
    if (isNaN(endDate.getTime())) {
        console.warn('Invalid end date for appointment:', appointment);
        endDate = new Date(startDate.getTime() + 60 * 60000);
    }
    
    const isUpcoming = startDate > new Date();
    const statusClass = getStatusClass(appointment.status);
    const statusIcon = getStatusIcon(appointment.status);
    
    const canCancel = isUpcoming && (appointment.status === 'booked' || appointment.status === 'confirmed');
    const canReschedule = isUpcoming && (appointment.status === 'booked' || appointment.status === 'confirmed');
    
    // ✅ Enhanced chat availability - now we have complete doctor info from backend
    const hasValidStatus = appointment.status === 'booked' || appointment.status === 'confirmed';
    const canChat = hasValidStatus && appointment.doctorId && appointment.doctorName;
    
    console.log(`✅ Using enhanced appointment data:`, {
        appointmentId,
        doctorName,
        specialty,
        canChat,
        doctorId: appointment.doctorId,
        patientId: appointment.patientId
    });

    return `
        <div class="appointment-card ${statusClass}">
            <div class="appointment-header">
                <div class="appointment-info">
                    <h3 class="doctor-name">
                        <i class="fas fa-user-md"></i>
                        ${doctorName}
                    </h3>
                    <p class="specialty">
                        <i class="fas fa-stethoscope"></i>
                        ${specialty}
                    </p>
                </div>
                <div class="appointment-status status-${appointment.status.toLowerCase()}">
                    <i class="${statusIcon}"></i>
                    <span>${appointment.status.toUpperCase()}</span>
                </div>
            </div>
            
            <div class="appointment-details">
                <div class="detail-row">
                    <div class="detail-item">
                        <i class="fas fa-calendar-alt"></i>
                        <div class="detail-content">
                            <span class="label">Date</span>
                            <span class="value">${formatDate(startDate)}</span>
                        </div>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-clock"></i>
                        <div class="detail-content">
                            <span class="label">Time</span>
                            <span class="value">${formatTime(startDate)} - ${formatTime(endDate)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-item">
                        <i class="fas fa-id-badge"></i>
                        <div class="detail-content">
                            <span class="label">Doctor ID</span>
                            <span class="value">#${appointment.doctorId}</span>
                        </div>
                    </div>
                    ${doctorEmail ? `
                    <div class="detail-item">
                        <i class="fas fa-envelope"></i>
                        <div class="detail-content">
                            <span class="label">Email</span>
                            <span class="value">${doctorEmail}</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                ${doctorMobile ? `
                <div class="detail-row">
                    <div class="detail-item">
                        <i class="fas fa-phone"></i>
                        <div class="detail-content">
                            <span class="label">Contact</span>
                            <span class="value">${doctorMobile}</span>
                        </div>
                    </div>
                </div>
                ` : ''}
                
                ${appointment.doctorNotes ? `
                <div class="appointment-notes">
                    <i class="fas fa-sticky-note"></i>
                    <div class="notes-content">
                        <span class="label">Doctor's Notes:</span>
                        <p>${appointment.doctorNotes}</p>
                    </div>
                </div>
                ` : ''}
                
                ${appointment.prescription ? `
                <div class="appointment-prescription">
                    <i class="fas fa-prescription-bottle-alt"></i>
                    <div class="prescription-content">
                        <span class="label">Prescription:</span>
                        <p>${appointment.prescription}</p>
                    </div>
                </div>
                ` : ''}
            </div>
            
            <div class="appointment-actions">
                ${canReschedule ? `
                    <button class="action-btn reschedule-btn" onclick="openRescheduleModal(${appointmentId})">
                        <i class="fas fa-calendar-day"></i>
                        Reschedule
                    </button>
                ` : ''}
                
                ${canCancel ? `
                    <button class="action-btn cancel-btn" onclick="cancelAppointment(${appointmentId})">
                        <i class="fas fa-times"></i>
                        Cancel
                    </button>
                ` : ''}
                
                ${canChat ? `
                    <button class="action-btn chat-btn" onclick="openChatWithDoctor(${appointmentId}, ${appointment.doctorId}, ${appointment.patientId}, '${doctorName.replace(/'/g, "\\'")}')">
                        <i class="fas fa-comments"></i>
                        Chat with Doctor
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

function getStatusClass(status) {
    const statusClasses = {
        'booked': 'status-booked',
        'confirmed': 'status-confirmed',
        'completed': 'status-completed',
        'cancelled': 'status-cancelled',
        'no-show': 'status-no-show'
    };
    return statusClasses[status] || 'status-default';
}

function getStatusIcon(status) {
    const statusIcons = {
        'booked': 'fas fa-clock',
        'confirmed': 'fas fa-check-circle',
        'completed': 'fas fa-check-double',
        'cancelled': 'fas fa-times-circle',
        'no-show': 'fas fa-exclamation-triangle'
    };
    return statusIcons[status] || 'fas fa-question-circle';
}

async function cancelAppointment(appointmentId) {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
        return;
    }
    
    const patientData = getPatientSession();
    if (!patientData) {
        showSnackbar('Please log in to cancel appointment', 'error');
        return;
    }
    
    showLoading();
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        // ✅ Use correct backend endpoint for cancellation
        const response = await fetch(`${baseUrl}/cancel/patient?appointmentId=${appointmentId}&patientId=${patientData.patientId || patientData.id}`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('healSync_token') || ''}`
            }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const result = await response.text(); // Backend returns plain text response
            showSnackbar('Appointment cancelled successfully', 'success');
            loadAppointments();
            updateAppointmentStats();
        } else {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to cancel appointment');
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('❌ Request timed out - backend is slow');
            showSnackbar('Request timed out - please try again', 'error');
        } else {
            console.error('Error cancelling appointment:', error);
            showSnackbar(error.message || 'Failed to cancel appointment', 'error');
        }
    } finally {
        hideLoading();
    }
}

function openRescheduleModal(appointmentId) {
    currentRescheduleId = appointmentId;
    document.getElementById('reschedule-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeRescheduleModal() {
    currentRescheduleId = null;
    document.getElementById('reschedule-modal').style.display = 'none';
    document.body.style.overflow = 'auto';
    document.getElementById('reschedule-form').reset();
}

async function handleRescheduleSubmit(event) {
    event.preventDefault();
    
    if (!currentRescheduleId) return;
    
    const patientData = getPatientSession();
    if (!patientData) {
        showSnackbar('Please log in to reschedule appointment', 'error');
        return;
    }
    
    const newDate = document.getElementById('new-date').value;
    const newTime = document.getElementById('new-time').value;
    
    if (!newDate || !newTime) {
        showSnackbar('Please select both date and time', 'error');
        return;
    }
    
    const newStartDateTime = new Date(`${newDate}T${newTime}:00`);
    const newEndDateTime = new Date(newStartDateTime.getTime() + 60 * 60000); // Default 1 hour
    
    showLoading();
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        // ✅ Use correct backend endpoint for rescheduling
        const rescheduleUrl = `${baseUrl}/reschedule?appointmentId=${currentRescheduleId}&requesterId=${patientData.patientId || patientData.id}&requesterRole=PATIENT&newStartDateTime=${newStartDateTime.toISOString()}&newEndDateTime=${newEndDateTime.toISOString()}`;
        
        const response = await fetch(rescheduleUrl, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('healSync_token') || ''}`
            }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const result = await response.text(); // Backend returns plain text response
            showSnackbar('Appointment rescheduled successfully', 'success');
            closeRescheduleModal();
            loadAppointments();
            updateAppointmentStats();
        } else {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to reschedule appointment');
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('❌ Request timed out - backend is slow');
            showSnackbar('Request timed out - please try again', 'error');
        } else {
            console.error('Error rescheduling appointment:', error);
            showSnackbar(error.message || 'Failed to reschedule appointment', 'error');
        }
    } finally {
        hideLoading();
    }
}

async function checkAvailability() {
    const specialty = document.getElementById('specialty').value;
    const date = document.getElementById('appointment-date').value;
    
    if (!specialty || !date) {
        showSnackbar('Please select specialty and date first', 'error');
        return;
    }
    
    showLoading();
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        const response = await fetch(`${baseUrl}/availability?specialty=${specialty}&date=${date}`, {
            signal: controller.signal,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('healSync_token') || ''}`
            }
        });
        
        clearTimeout(timeoutId);
        
        const result = await response.json();
        
        if (response.ok) {
            displayAvailableSlots(result.data || []);
        } else {
            throw new Error(result.message || 'Failed to check availability');
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('❌ Request timed out - backend is slow');
            showSnackbar('Request timed out - please try again', 'error');
        } else {
            console.error('Error checking availability:', error);
            showSnackbar('Failed to check availability', 'error');
        }
    } finally {
        hideLoading();
    }
}

function displayAvailableSlots(slots) {
    const card = document.getElementById('available-slots-card');
    const container = document.getElementById('available-slots-container');
    
    if (!slots || slots.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <p>No available slots for the selected date and specialty</p>
            </div>
        `;
    } else {
        container.innerHTML = slots.map(slot => `
            <div class="time-slot" onclick="selectTimeSlot('${slot.time}')">
                <i class="fas fa-clock"></i>
                <span>${formatTime(new Date(`2000-01-01T${slot.time}:00`))}</span>
                ${slot.doctorName ? `<small>Dr. ${slot.doctorName}</small>` : ''}
            </div>
        `).join('');
    }
    
    card.style.display = 'block';
}

function selectTimeSlot(time) {
    document.getElementById('appointment-time').value = time;
    document.getElementById('available-slots-card').style.display = 'none';
    showSnackbar('Time slot selected', 'success');
}

function filterAppointments() {
    const filter = document.getElementById('appointment-filter').value;
    const cards = document.querySelectorAll('.appointment-card');
    
    cards.forEach(card => {
        const status = card.querySelector('.appointment-status span').textContent.toLowerCase();
        
        if (filter === 'all' || status === filter) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Helper function to get patient appointments with proper error handling
async function getPatientAppointments(patientId) {
    try {
        console.log(`📡 Loading appointments for patient ${patientId}...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        // Use the correct API endpoint
        const response = await fetch(`${baseUrl}/patient/${patientId}`, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('healSync_token') || ''}`
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Appointments loaded:', result);
        return result.data || result || [];
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('❌ Request timed out - backend is slow or offline');
            throw new Error('Request timed out - please try again');
        }
        console.error('❌ Error loading patient appointments:', error);
        throw error;
    }
}

async function updateAppointmentStats() {
    const patientData = getPatientSession();
    if (!patientData) {
        console.warn('❌ No patient session available for stats');
        return;
    }

    // Use patientId if id is not available, with fallback to localStorage
    const patientId = patientData.id || patientData.patientId || localStorage.getItem('patientId');
    if (!patientId) {
        console.warn('❌ No patient ID found');
        return;
    }
    
    try {
        // Use the helper function for cleaner code
        const appointments = await getPatientAppointments(patientId);
        const now = new Date();
        
        const upcoming = appointments.filter(apt => {
            // Get appointment date from various possible field names
            const appointmentDate = apt.start || apt.appointmentDate || apt.date || apt.scheduledDate;
            const aptDate = new Date(appointmentDate);
            
            return aptDate > now && (apt.status === 'booked' || apt.status === 'confirmed');
        }).length;
        
        const pending = appointments.filter(apt => apt.status === 'booked' || apt.status === 'pending').length;
        const completed = appointments.filter(apt => apt.status === 'completed').length;
        
        document.getElementById('upcoming-count').textContent = upcoming;
        document.getElementById('pending-count').textContent = pending;
        document.getElementById('completed-count').textContent = completed;
        
    } catch (error) {
        console.error('❌ Error updating stats:', error);
        // Clear stats display on error
        document.getElementById('upcoming-count').textContent = '0';
        document.getElementById('pending-count').textContent = '0';
        document.getElementById('completed-count').textContent = '0';
    }
}

// Utility functions
function formatDate(date) {
    if (!date || isNaN(date.getTime())) {
        return 'Invalid Date';
    }
    
    try {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid Date';
    }
}

function formatTime(date) {
    if (!date || isNaN(date.getTime())) {
        return 'Invalid Time';
    }
    
    try {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Error formatting time:', error);
        return 'Invalid Time';
    }
}

function getPatientSession() {
    // Check multiple possible localStorage keys for patient data - aligned with chat system priority
    const keys = ['healSync_patient_data', 'patient', 'patientInfo', 'healSync_userSession', 'healSync_patientSession', 'healSync_userData', 'patientSession'];
    
    console.log('🔍 Checking localStorage for patient session...');
    console.log('🗂️ Available localStorage keys:', Object.keys(localStorage));
    
    for (const key of keys) {
        const session = localStorage.getItem(key);
        console.log(`🔎 Checking key "${key}":`, session ? 'found' : 'not found');
        
        if (session && session !== 'null' && session !== 'undefined') {
            try {
                const sessionData = JSON.parse(session);
                const now = new Date().getTime();
                
                // Check if session has expired (24 hours)
                if (sessionData.expiresAt && now > sessionData.expiresAt) {
                    console.log(`⏰ Session in ${key} has expired, removing...`);
                    localStorage.removeItem(key);
                    continue; // Try next key
                }
                
                console.log(`✅ Found valid patient session in: ${key}`, sessionData);
                
                // Ensure we have a patient ID (support multiple field names)
                const patientId = sessionData.patientId || sessionData.id || sessionData.userId;
                if (!patientId) {
                    console.warn(`⚠️ Session in ${key} missing patient ID (patientId/id/userId)`);
                    continue;
                }
                
                // Normalize the session data structure
                const normalizedSession = {
                    ...sessionData,
                    id: patientId,
                    patientId: patientId,
                    name: sessionData.name || sessionData.patientName || sessionData.firstName || 'Patient'
                };
                
                console.log(`🎯 Using normalized session from ${key}:`, normalizedSession);
                return normalizedSession;
            } catch (error) {
                console.error(`❌ Error parsing patient session from ${key}:`, error);
                localStorage.removeItem(key);
                continue; // Try next key
            }
        }
    }
    
    // No valid session found - redirect to login
    console.log('❌ No valid patient session found - redirecting to login');
    window.location.href = '/HTML/login.html';
    return null;
}

function handlePatientLogout() {
    // Clear all possible patient session keys
    const keys = ['healSync_patientSession', 'healSync_patient_data', 'healSync_userData', 'patientSession'];
    keys.forEach(key => localStorage.removeItem(key));
    window.location.href = '/HTML/login.html';
}

function showLoading() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

function showSnackbar(message, type = 'info') {
    // Remove existing snackbar
    const existingSnackbar = document.querySelector('.snackbar');
    if (existingSnackbar) {
        existingSnackbar.remove();
    }
    
    // Create new snackbar
    const snackbar = document.createElement('div');
    snackbar.className = `snackbar snackbar-${type}`;
    snackbar.innerHTML = `
        <div class="snackbar-content">
            <i class="fas ${getSnackbarIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(snackbar);
    
    // Show snackbar
    setTimeout(() => snackbar.classList.add('show'), 100);
    
    // Hide snackbar after 4 seconds
    setTimeout(() => {
        snackbar.classList.remove('show');
        setTimeout(() => snackbar.remove(), 300);
    }, 4000);
}

function getSnackbarIcon(type) {
    const icons = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-circle',
        'warning': 'fa-exclamation-triangle',
        'info': 'fa-info-circle'
    };
    return icons[type] || 'fa-info-circle';
}

// ✅ Enhanced chat integration function using backend API endpoints
function openChatWithDoctor(appointmentId, doctorId, patientId, doctorName) {
    console.log('🚀 Opening chat with doctor using enhanced API...', { 
        appointmentId, 
        doctorId, 
        patientId, 
        doctorName 
    });
    
    // Check if chat system is available
    if (typeof window.healSyncChat === 'undefined') {
        console.error('❌ Chat system not initialized');
        showSnackbar('Chat system is not available', 'error');
        return;
    }
    
    // Validate required parameters
    if (!appointmentId || !doctorId || !patientId) {
        console.error('❌ Missing required chat parameters:', {
            appointmentId, doctorId, patientId
        });
        showSnackbar('Cannot open chat - missing required information', 'error');
        return;
    }
    
    try {
        console.log('✅ Starting chat session with enhanced backend integration:');
        console.log('  📋 Appointment ID:', appointmentId);
        console.log('  👨‍⚕️ Doctor ID:', doctorId);
        console.log('  👤 Patient ID:', patientId);
        console.log('  🏷️ Doctor Name:', doctorName);
        
        // ✅ Use the correct chat system method: openChat with doctor name
        if (window.healSyncChat && typeof window.healSyncChat.openChat === 'function') {
            console.log('✅ Chat system openChat method found, calling it...');
            window.healSyncChat.openChat(appointmentId, doctorId, patientId, doctorName);
            showSnackbar('Opening chat with ' + doctorName, 'success');
        } else {
            console.warn('⚠️ Chat system openChat method not available');
            console.log('Available methods:', Object.getOwnPropertyNames(window.healSyncChat));
            showSnackbar('Chat system is not properly initialized', 'error');
        }
        
    } catch (error) {
        console.error('❌ Error opening chat:', error);
        showSnackbar('Failed to open chat: ' + error.message, 'error');
    }
}

// Chat UI functions (these delegate to the chat system)
function closeChatDrawer() {
    if (window.healSyncChat) {
        window.healSyncChat.closeChatDrawer();
    }
}

function minimizeChat() {
    if (window.healSyncChat) {
        window.healSyncChat.minimizeChat();
    }
}

function sendMessage() {
    if (window.healSyncChat) {
        window.healSyncChat.sendMessage();
    }
}

function attachFile() {
    if (window.healSyncChat) {
        // For now, show a message that file attachment is not yet implemented
        showSnackbar('File attachment feature coming soon', 'info');
    }
}
