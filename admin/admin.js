// API Configuration
const API_BASE = 'https://healsync-backend-d788.onrender.com';

// Utility function to truncate text
function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Snackbar notification system
function showSnackbar(message, type = 'info') {
    // Create snackbar element
    const snackbar = document.createElement('div');
    snackbar.className = `snackbar snackbar-${type}`;
    snackbar.innerHTML = `
        <div class="snackbar-content">
            <span class="snackbar-icon">${getSnackbarIcon(type)}</span>
            <span class="snackbar-message">${message}</span>
        </div>
        <button class="snackbar-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    // Add to page
    document.body.appendChild(snackbar);
    
    // Show with animation
    setTimeout(() => snackbar.classList.add('show'), 100);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (snackbar.parentElement) {
            snackbar.classList.remove('show');
            setTimeout(() => snackbar.remove(), 300);
        }
    }, 5000);
}

function getSnackbarIcon(type) {
    switch (type) {
        case 'success': return '✅';
        case 'error': return '❌';
        case 'warning': return '⚠️';
        default: return 'ℹ️';
    }
}

// Enhanced message function
function setMessage(elementId, message, type = 'info') {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.className = `message message-${type}`;
        element.style.display = 'block';
        
        // Also show snackbar for important messages
        if (type === 'success' || type === 'error') {
            showSnackbar(message, type);
        }
        
        // Auto hide after 3 seconds
        setTimeout(() => {
            element.style.display = 'none';
        }, 3000);
    }
}

// Loading state management
function setLoading(tableSelector, isLoading) {
    const tbody = document.querySelector(`${tableSelector} .data-table tbody`);
    if (!tbody) return;
    
    if (isLoading) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 2rem;">
                    <div class="loading-spinner"></div>
                    <div style="margin-top: 1rem; color: #6B7280;">Loading data...</div>
                </td>
            </tr>
        `;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication before allowing access
    if (!checkAdminAuthentication()) {
        return; // Exit if not authenticated
    }

    // Initialize admin panel
    initializeAdminPanel();

    // Get all navigation links from the sidebar
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');

    // Get all content sections from the main content area
    const contentSections = document.querySelectorAll('.main-content .content-section');

    // Add a click event listener to each navigation link
    navLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            // Prevent the default link behavior (page reload)
            event.preventDefault();

            // Get the target section's ID from the 'data-target' attribute of the clicked link
            const targetId = this.getAttribute('data-target');

            // --- Handle the visual state of the navigation links ---

            // Remove the 'active' class from all navigation links
            navLinks.forEach(navLink => {
                navLink.classList.remove('active');
            });

            // Add the 'active' class to the clicked link
            this.classList.add('active');

            // Hide all content sections
            contentSections.forEach(section => {
                section.classList.remove('active');
            });

            // Find the content section that matches the target ID
            const targetSection = document.getElementById(targetId);

            // If a matching section is found, show it by adding the 'active' class
            if (targetSection) {
                targetSection.classList.add('active');
                
                // Load data when switching to a section
                loadSectionData(targetId);
            }
        });
    });

    // Initialize form handlers
    initializeForms();
});

// Initialize admin panel
function initializeAdminPanel() {
    // Load initial data for the active section
    const activeSection = document.querySelector('.content-section.active');
    if (activeSection) {
        loadSectionData(activeSection.id);
    }
}

// Load data for specific sections
function loadSectionData(sectionId) {
    switch(sectionId) {
        case 'doctors':
            loadDoctors();
            break;
        case 'diseases':
            loadDiseases();
            break;
        case 'medicines':
            loadMedicines();
            break;
    }
}

// Initialize all form handlers
function initializeForms() {
    initializeDoctorForm();
    initializeDiseaseForm();
    initializeMedicineForm();
}

// === DOCTOR MANAGEMENT ===
function initializeDoctorForm() {
    const doctorForm = document.getElementById('doctor-form');
    if (doctorForm) {
        doctorForm.addEventListener('submit', handleDoctorSubmit);
    }
    
    const cancelBtn = document.getElementById('cancel-doctor-edit');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', resetDoctorForm);
    }
}

async function handleDoctorSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const isUpdate = form.dataset.mode === 'update';
    const doctorId = form.dataset.doctorId;
    
    const formData = {
        name: document.getElementById('doc-name').value.trim(),
        speciality: document.getElementById('doc-speciality').value.trim(),
        email: document.getElementById('doc-email').value.trim(),
        mobileNo: document.getElementById('doc-mobile').value.trim(),
        bio: document.getElementById('doc-bio').value.trim(),
        shift: document.getElementById('doc-shift').value.trim(),
        password: document.getElementById('doc-password').value
    };

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="loading-spinner" style="width: 16px; height: 16px; margin-right: 8px;"></span>${isUpdate ? 'Updating...' : 'Adding...'}`;

    try {
        const url = isUpdate ? `${API_BASE}/v1/healsync/doctor/${doctorId}` : `${API_BASE}/v1/healsync/doctor/add`;
        const method = isUpdate ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            const result = await response.json();
            showSnackbar(isUpdate ? 'Doctor updated successfully!' : 'Doctor added successfully!', 'success');
            resetDoctorForm();
            loadDoctors(); // Refresh the doctors list
        } else {
            const errorText = await response.text();
            showSnackbar(errorText || (isUpdate ? 'Failed to update doctor' : 'Failed to add doctor'), 'error');
        }
    } catch (err) {
        console.error('Doctor submit error:', err);
        showSnackbar('Network error. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

function resetDoctorForm() {
    const form = document.getElementById('doctor-form');
    form.reset();
    delete form.dataset.mode;
    delete form.dataset.doctorId;
    
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Register Doctor';
    
    const cancelBtn = document.getElementById('cancel-doctor-edit');
    if (cancelBtn) cancelBtn.style.display = 'none';
    
    const messageDiv = document.getElementById('doctor-message');
    setMessage(messageDiv, '', 'info');
}

async function loadDoctors() {
    setLoading('#doctors', true);
    try {
        const response = await fetch(`${API_BASE}/v1/healsync/doctor/public-profiles`);
        if (!response.ok) {
            throw new Error('Failed to load doctors');
        }
        const doctors = await response.json();
        renderDoctorsTable(doctors);
    } catch (error) {
        console.error('Error loading doctors:', error);
        showSnackbar('Failed to load doctors. Please check your connection and try again.', 'error');
        const tbody = document.querySelector('#doctors .data-table tbody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: #EF4444; padding: 2rem;">
                        <div>❌ Failed to load doctors</div>
                        <div style="font-size: 0.875rem; margin-top: 0.5rem;">Please check your connection and try again</div>
                    </td>
                </tr>
            `;
        }
    } finally {
        setLoading('#doctors', false);
    }
}

function renderDoctorsTable(doctors) {
    const tbody = document.querySelector('#doctors .data-table tbody');
    if (!tbody) return;

    if (doctors.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: #6B7280; padding: 2rem;">
                    <div style="font-size: 1.125rem; margin-bottom: 0.5rem;">No doctors found</div>
                    <div style="font-size: 0.875rem;">Add your first doctor using the form above</div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = doctors.map(doctor => `
        <tr class="table-row" data-id="${doctor.doctorId}">
            <td class="id-column">${doctor.doctorId}</td>
            <td class="name-column">
                <div class="entity-name">${doctor.name}</div>
                <div class="entity-subtitle">Shift: ${doctor.shift}</div>
            </td>
            <td>${doctor.speciality || doctor.speaciality}</td>
            <td class="email-column">${doctor.email}</td>
            <td class="mobile-column">${doctor.mobileNo}</td>
            <td class="actions-column">
                <button class="btn btn-secondary btn-sm" onclick="editDoctor(${doctor.doctorId})" title="Edit Doctor">
                    <span class="btn-icon">✏️</span> Edit
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteDoctor(${doctor.doctorId})" title="Delete Doctor">
                    <span class="btn-icon">🗑️</span> Delete
                </button>
            </td>
        </tr>
    `).join('');
}

async function editDoctor(doctorId) {
    try {
        const response = await fetch(`${API_BASE}/v1/healsync/doctor/${doctorId}`);
        if (response.ok) {
            const doctor = await response.json();
            populateDoctorForm(doctor);
        }
    } catch (err) {
        alert('Failed to load doctor details');
    }
}

function populateDoctorForm(doctor) {
    document.getElementById('doc-name').value = doctor.name;
    document.getElementById('doc-speciality').value = doctor.speciality || doctor.speaciality;
    document.getElementById('doc-email').value = doctor.email;
    document.getElementById('doc-mobile').value = doctor.mobileNo;
    document.getElementById('doc-bio').value = doctor.bio;
    document.getElementById('doc-shift').value = doctor.shift;
    document.getElementById('doc-password').value = ''; // Don't prefill password
    
    // Add update mode to form
    const form = document.getElementById('doctor-form');
    form.dataset.mode = 'update';
    form.dataset.doctorId = doctor.doctorId;
    
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Update Doctor';
    
    const cancelBtn = document.getElementById('cancel-doctor-edit');
    if (cancelBtn) cancelBtn.style.display = 'inline-block';
}

async function deleteDoctor(doctorId) {
    if (!confirm('⚠️ Are you sure you want to delete this doctor?\n\nThis action cannot be undone.')) return;
    
    try {
        const response = await fetch(`${API_BASE}/v1/healsync/doctor/${doctorId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showSnackbar('Doctor deleted successfully', 'success');
            loadDoctors();
        } else {
            const errorText = await response.text();
            showSnackbar(errorText || 'Failed to delete doctor', 'error');
        }
    } catch (err) {
        console.error('Delete doctor error:', err);
        showSnackbar('Network error occurred', 'error');
    }
}

// === DISEASE MANAGEMENT ===
function initializeDiseaseForm() {
    const diseaseForm = document.getElementById('disease-form');
    if (diseaseForm) {
        diseaseForm.addEventListener('submit', handleDiseaseSubmit);
    }
    
    const cancelBtn = document.getElementById('cancel-disease-edit');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', resetDiseaseForm);
    }
}

async function handleDiseaseSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const isUpdate = form.dataset.mode === 'update';
    const diseaseId = form.dataset.diseaseId;
    
    const formData = {
        name: document.getElementById('disease-name').value.trim(),
        description: document.getElementById('disease-desc').value.trim(),
        symptoms: document.getElementById('disease-symptoms').value.trim()
    };

    const messageDiv = document.getElementById('disease-message');
    setMessage(messageDiv, isUpdate ? 'Updating disease...' : 'Adding disease...', 'info');

    try {
        const url = isUpdate ? `${API_BASE}/v1/healsync/disease/update/${diseaseId}` : `${API_BASE}/v1/healsync/disease/add`;
        const method = isUpdate ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            setMessage(messageDiv, isUpdate ? 'Disease updated successfully!' : 'Disease added successfully!', 'success');
            resetDiseaseForm();
            loadDiseases();
        } else {
            const errorText = await response.text();
            setMessage(messageDiv, errorText || (isUpdate ? 'Update failed.' : 'Failed to add disease.'), 'error');
        }
    } catch (err) {
        setMessage(messageDiv, 'Network error. Please try again.', 'error');
    }
}

function resetDiseaseForm() {
    const form = document.getElementById('disease-form');
    form.reset();
    delete form.dataset.mode;
    delete form.dataset.diseaseId;
    
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Add Disease';
    
    const cancelBtn = document.getElementById('cancel-disease-edit');
    if (cancelBtn) cancelBtn.style.display = 'none';
    
    const messageDiv = document.getElementById('disease-message');
    setMessage(messageDiv, '', 'info');
}

async function loadDiseases() {
    setLoading('#diseases', true);
    try {
        // Try API first, fallback to offline mode if needed
        let diseases;
        if (window.offlineFallback && window.offlineFallback.isOffline()) {
            diseases = await window.offlineFallback.getDiseases();
        } else {
            const response = await fetch(`${API_BASE}/v1/healsync/disease/all`);
            if (response.ok) {
                diseases = await response.json();
            } else {
                throw new Error('Failed to load diseases');
            }
        }
        renderDiseasesTable(diseases);
    } catch (error) {
        console.error('Failed to load diseases:', error);
        
        // Try offline fallback
        if (window.offlineFallback) {
            try {
                window.offlineFallback.enableOfflineMode();
                const diseases = await window.offlineFallback.getDiseases();
                renderDiseasesTable(diseases);
                return;
            } catch (offlineError) {
                console.error('Offline fallback also failed:', offlineError);
            }
        }
        
        showSnackbar('Failed to load diseases. Please try again.', 'error');
    } finally {
        setLoading('#diseases', false);
    }
}

function renderDiseasesTable(diseases) {
    const tbody = document.querySelector('#diseases .data-table tbody');
    if (!tbody) return;

    if (diseases.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: #6B7280; padding: 2rem;">
                    <div style="font-size: 1.125rem; margin-bottom: 0.5rem;">No diseases found</div>
                    <div style="font-size: 0.875rem;">Add your first disease using the form above</div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = diseases.map(disease => `
        <tr class="table-row" data-id="${disease.diseaseId}">
            <td class="id-column">${disease.diseaseId}</td>
            <td class="name-column">
                <div class="entity-name">${disease.name}</div>
            </td>
            <td class="description-column">${truncateText(disease.description, 80)}</td>
            <td class="symptoms-column">${truncateText(disease.symptoms, 60)}</td>
            <td class="actions-column">
                <button class="btn btn-secondary btn-sm" onclick="editDisease(${disease.diseaseId})" title="Edit Disease">
                    <span class="btn-icon">✏️</span> Edit
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteDisease(${disease.diseaseId})" title="Delete Disease">
                    <span class="btn-icon">🗑️</span> Delete
                </button>
            </td>
        </tr>
    `).join('');
}

async function editDisease(diseaseId) {
    try {
        const response = await fetch(`${API_BASE}/v1/healsync/disease/details?id=${diseaseId}`);
        if (response.ok) {
            const disease = await response.json();
            populateDiseaseForm(disease);
        }
    } catch (err) {
        alert('Failed to load disease details');
    }
}

function populateDiseaseForm(disease) {
    document.getElementById('disease-name').value = disease.name;
    document.getElementById('disease-desc').value = disease.description;
    document.getElementById('disease-symptoms').value = disease.symptoms;
    
    const form = document.getElementById('disease-form');
    form.dataset.mode = 'update';
    form.dataset.diseaseId = disease.diseaseId;
    
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Update Disease';
    
    const cancelBtn = document.getElementById('cancel-disease-edit');
    if (cancelBtn) cancelBtn.style.display = 'inline-block';
}

async function deleteDisease(diseaseId) {
    if (!confirm('Are you sure you want to delete this disease?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/v1/healsync/disease/delete/${diseaseId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('Disease deleted successfully');
            loadDiseases();
        } else {
            alert('Failed to delete disease');
        }
    } catch (err) {
        alert('Network error occurred');
    }
}

// === MEDICINE MANAGEMENT ===
function initializeMedicineForm() {
    const medicineForm = document.getElementById('medicine-form');
    if (medicineForm) {
        medicineForm.addEventListener('submit', handleMedicineSubmit);
    }
    
    const cancelBtn = document.getElementById('cancel-medicine-edit');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', resetMedicineForm);
    }
}

async function handleMedicineSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const isUpdate = form.dataset.mode === 'update';
    const medicineId = form.dataset.medicineId;
    
    const formData = {
        name: document.getElementById('med-name').value.trim(),
        usage: document.getElementById('med-usage').value.trim(),
        sideEffect: document.getElementById('med-sideeffect').value.trim()
    };

    const messageDiv = document.getElementById('medicine-message');
    setMessage(messageDiv, isUpdate ? 'Updating medicine...' : 'Adding medicine...', 'info');

    try {
        const url = isUpdate ? `${API_BASE}/v1/healsync/medicine/update/${medicineId}` : `${API_BASE}/v1/healsync/medicine/add`;
        const method = isUpdate ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            setMessage(messageDiv, isUpdate ? 'Medicine updated successfully!' : 'Medicine added successfully!', 'success');
            resetMedicineForm();
            loadMedicines();
        } else {
            const errorText = await response.text();
            setMessage(messageDiv, errorText || (isUpdate ? 'Update failed.' : 'Failed to add medicine.'), 'error');
        }
    } catch (err) {
        setMessage(messageDiv, 'Network error. Please try again.', 'error');
    }
}

function resetMedicineForm() {
    const form = document.getElementById('medicine-form');
    form.reset();
    delete form.dataset.mode;
    delete form.dataset.medicineId;
    
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Add Medicine';
    
    const cancelBtn = document.getElementById('cancel-medicine-edit');
    if (cancelBtn) cancelBtn.style.display = 'none';
    
    const messageDiv = document.getElementById('medicine-message');
    setMessage(messageDiv, '', 'info');
}

async function loadMedicines() {
    setLoading('#medicines', true);
    try {
        // Try API first, fallback to offline mode if needed
        let medicines;
        if (window.offlineFallback && window.offlineFallback.isOffline()) {
            medicines = await window.offlineFallback.getMedicines();
        } else {
            const response = await fetch(`${API_BASE}/v1/healsync/medicine/all`);
            if (response.ok) {
                medicines = await response.json();
            } else {
                throw new Error('Failed to load medicines');
            }
        }
        renderMedicinesTable(medicines);
    } catch (error) {
        console.error('Failed to load medicines:', error);
        
        // Try offline fallback
        if (window.offlineFallback) {
            try {
                window.offlineFallback.enableOfflineMode();
                const medicines = await window.offlineFallback.getMedicines();
                renderMedicinesTable(medicines);
                return;
            } catch (offlineError) {
                console.error('Offline fallback also failed:', offlineError);
            }
        }
        
        showSnackbar('Failed to load medicines. Please try again.', 'error');
    } finally {
        setLoading('#medicines', false);
    }
}

function renderMedicinesTable(medicines) {
    const tbody = document.querySelector('#medicines .data-table tbody');
    if (!tbody) return;

    if (medicines.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: #6B7280; padding: 2rem;">
                    <div style="font-size: 1.125rem; margin-bottom: 0.5rem;">No medicines found</div>
                    <div style="font-size: 0.875rem;">Add your first medicine using the form above</div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = medicines.map(medicine => `
        <tr class="table-row" data-id="${medicine.medicineId}">
            <td class="id-column">${medicine.medicineId}</td>
            <td class="name-column">
                <div class="entity-name">${medicine.name}</div>
            </td>
            <td class="usage-column">${truncateText(medicine.usage, 80)}</td>
            <td class="side-effects-column">${truncateText(medicine.sideEffects, 60)}</td>
            <td class="actions-column">
                <button class="btn btn-secondary btn-sm" onclick="editMedicine(${medicine.medicineId})" title="Edit Medicine">
                    <span class="btn-icon">✏️</span> Edit
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteMedicine(${medicine.medicineId})" title="Delete Medicine">
                    <span class="btn-icon">🗑️</span> Delete
                </button>
            </td>
        </tr>
    `).join('');
}

async function editMedicine(medicineId) {
    try {
        const response = await fetch(`${API_BASE}/v1/healsync/medicine/${medicineId}`);
        if (response.ok) {
            const medicine = await response.json();
            populateMedicineForm(medicine);
        }
    } catch (err) {
        alert('Failed to load medicine details');
    }
}

function populateMedicineForm(medicine) {
    document.getElementById('med-name').value = medicine.name;
    document.getElementById('med-usage').value = medicine.usage;
    document.getElementById('med-sideeffect').value = medicine.sideEffect;
    
    const form = document.getElementById('medicine-form');
    form.dataset.mode = 'update';
    form.dataset.medicineId = medicine.medicineId;
    
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Update Medicine';
    
    const cancelBtn = document.getElementById('cancel-medicine-edit');
    if (cancelBtn) cancelBtn.style.display = 'inline-block';
}

async function deleteMedicine(medicineId) {
    if (!confirm('Are you sure you want to delete this medicine?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/v1/healsync/medicine/delete/${medicineId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('Medicine deleted successfully');
            loadMedicines();
        } else {
            alert('Failed to delete medicine');
        }
    } catch (err) {
        alert('Network error occurred');
    }
}

// === UTILITY FUNCTIONS ===
function setMessage(element, message, type) {
    if (!element) return;
    
    // Clear message if empty
    if (!message) {
        element.textContent = '';
        element.style.background = 'transparent';
        element.style.border = 'none';
        element.style.padding = '0';
        return;
    }
    
    const colors = {
        info: '#1E3A8A',
        success: '#065F46',
        error: '#7F1D1D'
    };
    const bgs = {
        info: '#DBEAFE',
        success: '#D1FAE5',
        error: '#FECACA'
    };
    
    element.style.color = colors[type] || colors.info;
    element.style.background = bgs[type] || bgs.info;
    element.style.border = '1px solid rgba(0,0,0,0.05)';
    element.style.padding = '10px 12px';
    element.style.borderRadius = '8px';
    element.textContent = message;
    
    // Clear message after 5 seconds for success
    if (type === 'success') {
        setTimeout(() => {
            element.textContent = '';
            element.style.background = 'transparent';
            element.style.border = 'none';
            element.style.padding = '0';
        }, 5000);
    }
}

// Authentication functions
function checkAdminAuthentication() {
    const adminSession = localStorage.getItem('healSync_adminSession');
    const loginTime = localStorage.getItem('healSync_adminLoginTime');
    
    if (!adminSession || !loginTime) {
        // No session found, redirect to login
        window.location.href = '/admin/login.html';
        return false;
    }
    
    // Check if session is still valid (24 hours)
    const loginDate = new Date(loginTime);
    const now = new Date();
    const hoursDiff = (now - loginDate) / (1000 * 60 * 60);
    
    if (hoursDiff >= 24) {
        // Session expired, clear storage and redirect
        clearAdminSession();
        alert('Your session has expired. Please log in again.');
        window.location.href = '/admin/login.html';
        return false;
    }
    
    // Session is valid, display admin info
    displayAdminInfo();
    return true;
}

function clearAdminSession() {
    localStorage.removeItem('healSync_adminSession');
    localStorage.removeItem('healSync_adminLoginTime');
    localStorage.removeItem('healSync_adminEmail');
    localStorage.removeItem('healSync_adminName');
}

function displayAdminInfo() {
    const adminName = localStorage.getItem('healSync_adminName') || 'Admin';
    const adminEmail = localStorage.getItem('healSync_adminEmail') || '';
    
    // Update sidebar header to show admin info
    const sidebarHeader = document.querySelector('.sidebar-header');
    if (sidebarHeader) {
        sidebarHeader.innerHTML = `
            <h2>HealSync Admin</h2>
            <div style="font-size: 0.875rem; color: #6B7280; margin-top: 0.5rem;">
                <div>Welcome, ${adminName}</div>
                ${adminEmail ? `<div>${adminEmail}</div>` : ''}
            </div>
        `;
    }
}

function adminLogout() {
    if (confirm('Are you sure you want to logout?')) {
        clearAdminSession();
        window.location.href = '/admin/login.html';
    }
}
