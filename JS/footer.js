document.addEventListener('DOMContentLoaded', () => {

    // --- Mobile Menu Toggle ---
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('visible');
        });
    }

    // --- AI Insights Modal Logic ---
    // Your existing code for the insights modal can remain here
    
    // --- AI Chat Assistant & Voice Logic ---
    const chatToggleBtn = document.getElementById('chat-toggle-btn');
    const chatWidget = document.getElementById('chat-widget');
    const closeChatBtn = document.getElementById('close-chat-btn');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatBody = document.getElementById('chat-body');
    const micBtn = document.getElementById('mic-btn');

    // --- Voice Recognition (Speech-to-Text) Setup ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            const speechResult = event.results[0][0].transcript;
            chatInput.value = speechResult;
            chatForm.dispatchEvent(new Event('submit')); // Auto-submit after speech
        };

        recognition.onspeechend = () => {
            micBtn.classList.remove('is-listening');
            recognition.stop();
        };

        recognition.onerror = (event) => {
            micBtn.classList.remove('is-listening');
            console.error("Speech recognition error", event.error);
        };
    }

    // --- Event Listeners ---
    if (chatToggleBtn) {
        chatToggleBtn.addEventListener('click', () => chatWidget.classList.toggle('active'));
    }
    if (closeChatBtn) {
        closeChatBtn.addEventListener('click', () => chatWidget.classList.remove('active'));
    }

    if (micBtn) {
        micBtn.addEventListener('click', () => {
            if (!recognition) {
                alert("Sorry, your browser doesn't support voice recognition.");
                return;
            }
            if (micBtn.classList.contains('is-listening')) {
                recognition.stop();
                micBtn.classList.remove('is-listening');
            } else {
                recognition.start();
                micBtn.classList.add('is-listening');
            }
        });
    }

    if (chatForm) {
        chatForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const userInput = chatInput.value.trim();
            if (!userInput) return;

            addMessage(userInput, 'user');
            chatInput.value = '';

            // Add typing indicator
            const loadingIndicator = addMessage('AI is thinking...', 'ai loading');
            
            // Start timer to show if it's taking too long
            const startTime = Date.now();
            const slowWarning = setTimeout(() => {
                if (loadingIndicator.parentNode) {
                    loadingIndicator.textContent = 'Still processing... This may take a moment.';
                }
            }, 3000);
            
            try {
                const aiResponse = await getAiResponse(userInput);
                clearTimeout(slowWarning);
                loadingIndicator.remove();
                addMessage(aiResponse, 'ai');
                
                // Only speak if response is ready quickly (under 5 seconds)
                const responseTime = Date.now() - startTime;
                if (responseTime < 5000) {
                    speak(aiResponse);
                }
            } catch (error) {
                clearTimeout(slowWarning);
                loadingIndicator.remove();
                addMessage("Sorry, something went wrong. Please try again.", 'ai');
            }
        });
    }

    // --- Core Functions ---
    function addMessage(text, type) {
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${type}`;
        if (type === 'ai loading') {
            messageElement.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
        } else {
            messageElement.textContent = text;
        }
        chatBody.appendChild(messageElement);
        chatBody.scrollTop = chatBody.scrollHeight;
        return messageElement;
    }

    function speak(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            window.speechSynthesis.speak(utterance);
        }
    }

    async function getAiResponse(prompt) {
        const apiKey = "YOUR_GEMINI_API_KEY";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        // Shorter, more focused prompt for faster responses
        const enhancedPrompt = `You are HealSync AI Assistant. Be concise and helpful.

User: ${prompt}`;

        const payload = {
            contents: [{
                parts: [{
                    text: enhancedPrompt
                }]
            }],
            generationConfig: {
                maxOutputTokens: 150,  // Limit response length for speed
                temperature: 0.7,      // Balanced creativity/consistency
                topP: 0.8,
                topK: 40
            }
        };

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                console.error('API Response Error:', response.status, response.statusText);
                return "Sorry, I'm having trouble connecting. Please try again later.";
            }
            
            const result = await response.json();
            
            if (result.candidates && result.candidates[0]?.content?.parts[0]) {
                return result.candidates[0].content.parts[0].text;
            } else {
                return "I'm sorry, I couldn't generate a response. Please try again.";
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                return "Response timed out. Please try a shorter question.";
            }
            console.error("AI API Error:", error);
            return "Sorry, an error occurred while processing your request.";
        }
    }

    // Footer Location Intelligence API
    const footerLocationIndex = {
        'home': '/HTML/index.html',
        'login': '/HTML/login.html',
        'register': '/HTML/register.html',
        'doctor dashboard': '/HTML/doctor-treatment-dashboard.html',
        'patient dashboard': '/HTML/patient-treatment-dashboard.html',
        'appointments': '/HTML/appointments-doctor.html',
        'profile': '/HTML/patient-profile.html',
        'edit profile': '/HTML/patient-profile-edit.html',
        'tracker': '/HTML/tracker.html',
        'doctors': '/HTML/doctors.html',
        'footer': '/HTML/footer.html',
        'reset password': '/HTML/reset-password.html',
        'verify otp': '/HTML/verify-otp.html',
        // Add more mappings as needed
    };

    // Fuzzy search for location
    function findLocation(query) {
        query = query.trim().toLowerCase();
        let bestMatch = null;
        let bestScore = 0;
        for (const [key, url] of Object.entries(footerLocationIndex)) {
            let score = 0;
            if (key === query) score = 3;
            else if (key.includes(query)) score = 2;
            else if (query.includes(key)) score = 1;
            if (score > bestScore) {
                bestScore = score;
                bestMatch = { key, url };
            }
        }
        return bestMatch ? bestMatch.url : null;
    }

    // Fast answer API for location queries
    window.footerAPI = {
        findLocation,
        getAllLocations: () => Object.assign({}, footerLocationIndex),
        answer: (question) => {
            // Example: "Where is the doctor dashboard?"
            const match = findLocation(question.replace(/where is|how to get to|go to|open/gi, '').trim());
            return match ? `You can find it at: ${match}` : 'Sorry, location not found.';
        }
    };

    // Example usage:
    // console.log(window.footerAPI.answer('Where is the patient dashboard?'));
});
