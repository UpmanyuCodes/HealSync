// disease.js
// Fetches all disease details from the HealSync API and displays them in a modal or section.

function fetchDiseaseDetails(diseaseId = 1) {
    const apiUrl = `https://healsync-backend-d788.onrender.com/v1/healsync/disease/details?id=${diseaseId}`;
    
    // Show loader if modal exists
    const loader = document.getElementById('modal-loader');
    if (loader) loader.style.display = 'block';
    
    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            // Hide loader
            if (loader) loader.style.display = 'none';
            // Display data in modal-content or console
            const contentDiv = document.getElementById('modal-content');
            if (contentDiv) {
                contentDiv.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
                // Optionally open modal if not already open
                document.getElementById('ai-modal').style.display = 'block';
            } else {
                alert('Disease Details: ' + JSON.stringify(data));
            }
        })
        .catch(error => {
            if (loader) loader.style.display = 'none';
            alert('Failed to fetch disease details: ' + error);
        });
}

// Example: Add a button to trigger this fetch (for demo)
document.addEventListener('DOMContentLoaded', function() {
    const cta = document.querySelector('.cta-action');
    if (cta) {
        const btn = document.createElement('button');
        btn.textContent = 'Show Disease Details';
        btn.className = 'btn btn-primary';
        btn.onclick = () => fetchDiseaseDetails(1);
        cta.appendChild(btn);
    }
});
