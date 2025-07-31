document.addEventListener('DOMContentLoaded', function() {

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
            }
        });
    });

    // --- Doctor Registration Form Submission ---
    const doctorForm = document.getElementById('doctor-form');
    if (doctorForm) {
        doctorForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const name = document.getElementById('doc-name').value.trim();
            const speciality = document.getElementById('doc-speciality').value.trim();
            const email = document.getElementById('doc-email').value.trim();
            const mobileNo = document.getElementById('doc-mobile').value.trim();
            const bio = document.getElementById('doc-bio').value.trim();
            const shift = document.getElementById('doc-shift').value.trim();
            const password = document.getElementById('doc-password').value;

            const messageDiv = document.getElementById('doctor-message');
            messageDiv.textContent = 'Registering...';

            try {
                const response = await fetch('https://healsync-backend-d788.onrender.com/v1/healsync/doctor/add', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name,
                        speciality,
                        email,
                        mobileNo,
                        bio,
                        shift,
                        password
                    })
                });

                const result = await response.json();
                if (response.ok) {
                    messageDiv.style.color = 'green';
                    messageDiv.textContent = 'Doctor registered successfully!';
                    doctorForm.reset();
                } else {
                    messageDiv.style.color = 'red';
                    messageDiv.textContent = result.message || 'Registration failed.';
                }
            } catch (err) {
                messageDiv.style.color = 'red';
                messageDiv.textContent = 'Network error. Please try again.';
            }
        });
    }

});
