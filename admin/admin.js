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

});
