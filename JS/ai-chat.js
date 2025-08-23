// HealSync AI Chat Assistant - Professional Implementation
// World-class AI integration for healthcare support

class HealSyncAI {
    constructor() {
        this.chatWidget = document.getElementById('chat-widget');
        this.chatBody = document.querySelector('.chat-body');
        this.chatForm = document.getElementById('chat-form');
        this.chatInput = document.getElementById('chat-input');
        this.micBtn = document.getElementById('mic-btn');
        this.isListening = false;
        this.recognition = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initSpeechRecognition();
        this.displayWelcomeMessage();
    }

    setupEventListeners() {
        // Form submission
        if (this.chatForm) {
            this.chatForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleUserMessage();
            });
        }

        // Microphone button
        if (this.micBtn) {
            this.micBtn.addEventListener('click', () => {
                this.toggleSpeechRecognition();
            });
        }

        // Enter key handling
        if (this.chatInput) {
            this.chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleUserMessage();
                }
            });
        }
    }

    initSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';

            this.recognition.onstart = () => {
                this.isListening = true;
                this.updateMicButton(true);
            };

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.chatInput.value = transcript;
                this.handleUserMessage();
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.updateMicButton(false);
                this.isListening = false;
            };

            this.recognition.onend = () => {
                this.updateMicButton(false);
                this.isListening = false;
            };
        } else {
            // Hide mic button if speech recognition is not supported
            if (this.micBtn) {
                this.micBtn.style.display = 'none';
            }
        }
    }

    toggleSpeechRecognition() {
        if (!this.recognition) return;

        if (this.isListening) {
            this.recognition.stop();
        } else {
            this.recognition.start();
        }
    }

    updateMicButton(isListening) {
        if (!this.micBtn) return;

        if (isListening) {
            this.micBtn.style.background = 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)';
            this.micBtn.style.color = 'white';
            this.micBtn.style.transform = 'scale(1.1)';
        } else {
            this.micBtn.style.background = 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)';
            this.micBtn.style.color = '#6B7280';
            this.micBtn.style.transform = 'scale(1)';
        }
    }

    displayWelcomeMessage() {
        if (!this.chatBody) return;

        const welcomeMessage = this.createMessageElement(
            'Hello! I\'m your HealSync AI Assistant. I can help you with:\n\n• Finding doctors and specialists\n• Understanding medical conditions\n• Appointment scheduling guidance\n• General health information\n\nHow can I assist you today?',
            'ai'
        );
        
        this.chatBody.innerHTML = '';
        this.chatBody.appendChild(welcomeMessage);
    }

    handleUserMessage() {
        const message = this.chatInput.value.trim();
        if (!message) return;

        // Display user message
        this.displayMessage(message, 'user');
        
        // Clear input
        this.chatInput.value = '';

        // Show typing indicator
        this.showTypingIndicator();

        // Simulate AI response (in real implementation, this would call an AI API)
        setTimeout(() => {
            this.hideTypingIndicator();
            const response = this.generateAIResponse(message);
            this.displayMessage(response, 'ai');
        }, 1500);
    }

    displayMessage(message, type) {
        if (!this.chatBody) return;

        const messageElement = this.createMessageElement(message, type);
        this.chatBody.appendChild(messageElement);
        this.chatBody.scrollTop = this.chatBody.scrollHeight;
    }

    createMessageElement(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}`;
        messageDiv.textContent = message;
        return messageDiv;
    }

    showTypingIndicator() {
        if (!this.chatBody) return;

        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-message ai typing-indicator';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
        
        this.chatBody.appendChild(typingDiv);
        this.chatBody.scrollTop = this.chatBody.scrollHeight;
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    generateAIResponse(userMessage) {
        const message = userMessage.toLowerCase();
        
        // Healthcare-related responses
        if (message.includes('appointment') || message.includes('book') || message.includes('schedule')) {
            return "I can help you schedule an appointment! Please visit our 'Find Doctors' section to browse available specialists and book your preferred time slot. You can also call our helpline for immediate assistance.";
        }
        
        if (message.includes('doctor') || message.includes('specialist')) {
            return "HealSync has a wide network of qualified healthcare professionals. You can browse doctors by specialty, location, and availability. Would you like me to guide you to the doctors directory?";
        }
        
        if (message.includes('symptom') || message.includes('pain') || message.includes('sick')) {
            return "I understand you're experiencing health concerns. While I can provide general information, it's important to consult with a healthcare professional for proper diagnosis and treatment. Would you like help finding a suitable doctor?";
        }
        
        if (message.includes('prescription') || message.includes('medication') || message.includes('medicine')) {
            return "For prescription and medication queries, please consult directly with your healthcare provider through our secure messaging system or schedule a consultation. I cannot provide specific medical advice.";
        }
        
        if (message.includes('emergency') || message.includes('urgent')) {
            return "🚨 For medical emergencies, please call 911 immediately or visit your nearest emergency room. For urgent but non-emergency care, you can use our urgent care booking feature.";
        }
        
        if (message.includes('insurance') || message.includes('payment') || message.includes('cost')) {
            return "HealSync accepts most major insurance plans. You can verify your coverage during the booking process. For specific pricing and payment options, please contact our billing department or check with your selected healthcare provider.";
        }
        
        if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
            return "Hello! Welcome to HealSync. I'm here to help you navigate our healthcare platform. Whether you need to find a doctor, book an appointment, or get general health guidance, I'm at your service!";
        }
        
        if (message.includes('thank') || message.includes('thanks')) {
            return "You're very welcome! I'm glad I could help. If you have any other questions about HealSync's services or need assistance with anything else, feel free to ask anytime.";
        }
        
        // Default response
        return "I'm here to help with your healthcare needs on HealSync. I can assist with finding doctors, booking appointments, understanding our services, and providing general health guidance. Could you please tell me more about what you're looking for?";
    }
}

// Initialize AI Chat when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on a page with the AI chat widget
    if (document.getElementById('chat-widget')) {
        window.healSyncAI = new HealSyncAI();
    }
});
