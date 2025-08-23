// =================================================================
// SHARED LOADER SCRIPT
// =================================================================

/**
 * Manages the loading overlay for all pages.
 * This script should be included in any page that requires a loader.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Ensure the loader HTML is present on the page
    if (!document.getElementById('loadingOverlay')) {
        const loaderHTML = `
            <div id="loadingOverlay" class="loading-overlay">
                <div class="loader-wrapper">
                    <div class="loader-icon">
                        <i class="fas fa-heartbeat"></i>
                    </div>
                    <p class="loader-text">Loading your health data...</p>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', loaderHTML);
    }

    // Define global loader functions
    window.showLoader = function(message = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        const textElement = overlay.querySelector('.loader-text');
        
        if (textElement) {
            textElement.textContent = message;
        }
        
        overlay.classList.remove('hidden');
    };

    window.hideLoader = function() {
        const overlay = document.getElementById('loadingOverlay');
        overlay.classList.add('hidden');
    };

    // Hide the loader by default after the initial page load is complete
    // This can be overridden by calling showLoader() in page-specific scripts
    window.addEventListener('load', () => {
        // A small delay to prevent flickering on fast loads
        setTimeout(() => {
            if (!window.loaderActive) { // Check for a flag to keep it active
                hideLoader();
            }
        }, 200);
    });
});
