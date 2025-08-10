// Index page interactions: mobile menu, feature card navigation, AI chat control

(function () {
  const featureCards = document.querySelectorAll('.feature-card');
  const chatWidget = document.getElementById('chat-widget');
  const chatToggleBtn = document.getElementById('chat-toggle-btn');
  const closeChatBtn = document.getElementById('close-chat-btn');

  // Make feature cards clickable
  featureCards.forEach(card => {
    const link = card.getAttribute('data-link');
    const openChat = card.hasAttribute('data-open-chat');

    card.addEventListener('click', () => {
      if (openChat && chatWidget) {
        chatWidget.classList.add('visible');
        document.getElementById('chat-input')?.focus();
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

  // Chat toggle handlers (robust: also delegate in case inner SVG is clicked)
  function toggleChat() {
    if (!chatWidget) return;
    chatWidget.classList.toggle('visible');
    if (chatWidget.classList.contains('visible')) {
      document.getElementById('chat-input')?.focus();
    }
  }

  chatToggleBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    toggleChat();
  });

  document.addEventListener('click', (e) => {
    const btn = e.target?.closest('#chat-toggle-btn');
    if (btn) {
      e.preventDefault();
      toggleChat();
    }
  });

  closeChatBtn?.addEventListener('click', () => {
    chatWidget?.classList.remove('visible');
  });

  // Mobile menu toggle
  const mobileBtn = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');
  mobileBtn?.addEventListener('click', () => {
    mobileMenu?.classList.toggle('visible');
  });
})();
