// Index page interactions: mobile menu, feature card navigation

document.addEventListener('DOMContentLoaded', function() {
  const featureCards = document.querySelectorAll('.feature-card');

  // Check if user is logged in and update navigation
  function updateNavigationForLoggedInUser() {
    const patientData = localStorage.getItem('healSync_patient_data');
    const userData = localStorage.getItem('healSync_userData');
    
    if (patientData || userData) {
      // User is logged in, update navigation
      const desktopActions = document.querySelector('.desktop-menu-actions');
      const mobileMenu = document.getElementById('mobile-menu');
      
      if (desktopActions) {
        desktopActions.innerHTML = `
          <a href="/HTML/doctors.html" class="btn btn-primary">Book Appointment</a>
          <a href="/HTML/patient-dashboard.html" class="btn btn-secondary">My Dashboard</a>
          <button class="btn btn-outline" onclick="handleUserLogout()">Logout</button>
        `;
      }
      
      if (mobileMenu) {
        // Update mobile menu to show logged-in options
        const loginLink = mobileMenu.querySelector('a[href="/HTML/login.html"]');
        if (loginLink) {
          loginLink.innerHTML = 'My Dashboard';
          loginLink.href = '/HTML/patient-dashboard.html';
        }
        
        // Add logout option to mobile menu
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'mobile-nav-link logout-btn';
        logoutBtn.innerHTML = 'Logout';
        logoutBtn.onclick = handleUserLogout;
        mobileMenu.appendChild(logoutBtn);
      }
    }
  }

  // Global logout function
  window.handleUserLogout = function() {
    // Clear all user session data
    const keys = ['healSync_patientSession', 'healSync_patient_data', 'healSync_userData', 'healSync_userType', 'healSync_patientId', 'healSync_userName'];
    keys.forEach(key => localStorage.removeItem(key));
    
    // Reload page to show logged-out state
    window.location.reload();
  };

  // Auto-create demo session for testing if none exists
  window.autoLoginForTesting = function() {
    const patientData = localStorage.getItem('healSync_patient_data');
    if (!patientData) {
      console.log('🔄 No session found, creating demo session for testing...');
      const demoPatientData = {
        patientId: 'demo123',
        patientName: 'Demo Patient',
        email: 'demo@patient.com',
        mobileNo: '1234567890',
        patientAge: 30,
        gender: 'Other',
        expiresAt: new Date().getTime() + (24 * 60 * 60 * 1000)
      };
      localStorage.setItem('healSync_patient_data', JSON.stringify(demoPatientData));
      console.log('✅ Demo session created:', demoPatientData);
      updateNavigationForLoggedInUser();
    }
  };

  // Auto-login for testing (remove in production)
  setTimeout(() => {
    window.autoLoginForTesting();
  }, 1000);

  // Initialize navigation on page load
  document.addEventListener('DOMContentLoaded', updateNavigationForLoggedInUser);

  // Make feature cards clickable
  featureCards.forEach(card => {
    const link = card.getAttribute('data-link');
    const openChat = card.hasAttribute('data-open-chat');

    card.addEventListener('click', () => {
      if (openChat) {
        const chatWidget = document.getElementById('chat-widget');
        if (chatWidget) {
          chatWidget.classList.add('active');
          document.getElementById('chat-input')?.focus();
        }
        return;
      }
      if (link) {
        window.location.href = link;
      }
    });

    // Accessibility: allow Enter key to activate
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });

  // Mobile menu toggle
  const mobileBtn = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');
  mobileBtn?.addEventListener('click', () => {
    mobileMenu?.classList.toggle('visible');
  });
});
