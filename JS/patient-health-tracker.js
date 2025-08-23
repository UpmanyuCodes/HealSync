// =================================================================
// PATIENT HEALTH TRACKER SCRIPT
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    const currentUser = JSON.parse(localStorage.getItem('healSync_userData'));
    if (!currentUser || !currentUser.patientId) {
        window.location.href = '/HTML/login.html';
        return;
    }

    const form = document.getElementById('healthTrackerForm');
    const logoutBtn = document.getElementById('logoutBtn');

    // Setup event listeners
    form.addEventListener('submit', (e) => handleFormSubmit(e, currentUser.patientId));
    logoutBtn.addEventListener('click', handleLogout);

    // Hide loader once page is ready
    hideLoader();
});

/**
 * Handles the submission of the health tracker form.
 * @param {Event} e - The form submission event.
 * @param {number} patientId - The ID of the current patient.
 */
async function handleFormSubmit(e, patientId) {
    e.preventDefault();
    showLoader('Saving your data...');

    const formData = new FormData(e.target);
    const data = {
        patientId: patientId,
        entryDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        mood: formData.get('mood'),
        weight: parseFloat(formData.get('weight')) || null,
        bloodPressureSystolic: parseInt(formData.get('bloodPressureSystolic')) || null,
        bloodPressureDiastolic: parseInt(formData.get('bloodPressureDiastolic')) || null,
        bloodSugar: parseInt(formData.get('bloodSugar')) || null,
        notes: formData.get('notes') || null,
    };

    try {
        // API endpoint for creating a health entry
        // This is a hypothetical endpoint. Replace with the actual one from your API guide.
        const endpoint = '/v1/healsync/tracker/entry/create'; 
        
        // The API guide does not specify this endpoint, so we'll simulate the request.
        // In a real scenario, you would use patientAPI.makeRequest or a specific method.
        console.log('Submitting health data:', data);
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Assuming the API call is successful
        showSnackbar('Health data saved successfully!', 'success');
        
        // Optionally, clear the form after successful submission
        e.target.reset();

    } catch (error) {
        console.error('Error saving health data:', error);
        showSnackbar(error.userMessage || 'Failed to save data. Please try again.', 'error');
    } finally {
        hideLoader();
    }
}

/**
 * Handles user logout.
 */
function handleLogout() {
    localStorage.removeItem('healSync_userData');
    window.location.href = '/HTML/login.html';
}
