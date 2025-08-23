document.addEventListener('DOMContentLoaded', () => {
    // --- Mobile Menu Toggle ---
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('visible');
        });
    }

    // --- AI Chat Assistant & Voice Logic ---
    const chatToggleBtn = document.getElementById('chat-toggle-btn');
    const chatWidget = document.getElementById('chat-widget');
    const closeChatBtn = document.getElementById('close-chat-btn');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatBody = document.getElementById('chat-body');
    const micBtn = document.getElementById('mic-btn');

    // --- Voice Recognition ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            const speechResult = event.results[0][0].transcript;
            if (chatInput && chatForm) {
                chatInput.value = speechResult;
                chatForm.dispatchEvent(new Event('submit')); // Auto-submit
            }
        };

        recognition.onspeechend = () => {
            micBtn?.classList.remove('is-listening');
            recognition.stop();
        };

        recognition.onerror = () => {
            micBtn?.classList.remove('is-listening');
            addMessage("Voice recognition error. Please try again.", 'ai');
        };
    }

    // --- Event Listeners ---
    chatToggleBtn?.addEventListener('click', () => chatWidget?.classList.toggle('active'));
    closeChatBtn?.addEventListener('click', () => chatWidget?.classList.remove('active'));

    micBtn?.addEventListener('click', () => {
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

    // --- Intent Detection & Page Mapping ---
    const intentPageMapping = {
        'book_appointment': '/HTML/appointments-doctor.html',
        'patient_appointment': '/HTML/appointments-patient.html',
        'view_profile': '/HTML/patient-profile.html',
        'edit_profile': '/HTML/patient-profile-edit.html',
        'doctor_dashboard': '/HTML/doctor-treatment-dashboard.html',
        'patient_dashboard': '/HTML/patient-treatment-dashboard.html',
        'health_tracker': '/HTML/tracker.html',
        'find_doctors': '/HTML/doctors.html',
        'treatment_plan': '/HTML/treatments-plan.html',
        'login': '/HTML/login.html',
        'register': '/HTML/register.html',
        'reset_password': '/HTML/reset-password.html',
        'home': '/HTML/index.html'
    };

    // --- Enhanced Gemini API Call with Intent Detection ---
    async function callGeminiAPI(input) {
        const apiKey = "YOUR_GEMINI_KEY"; 
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const enhancedPrompt = `You are HealSync AI Assistant. Analyze user input and detect intents for page redirection.

Available intents and actions:
- book_appointment: When user wants to book/schedule appointment
- patient_appointment: When patient wants to view their appointments
- view_profile: When user wants to see their profile
- edit_profile: When user wants to edit/update profile
- doctor_dashboard: When doctor wants dashboard access
- patient_dashboard: When patient wants dashboard access
- health_tracker: When user wants to track health/symptoms
- find_doctors: When user wants to find/search doctors
- treatment_plan: When user wants to see treatment plans
- login: When user wants to login/sign in
- register: When user wants to register/sign up
- reset_password: When user wants to reset password
- home: When user wants to go home/main page

If user input matches an intent, respond with: "INTENT:[intent_name]|MESSAGE:[your helpful message]"
If no intent detected, respond normally as a helpful healthcare assistant.

User: ${input}`;

        const payload = {
            contents: [{ parts: [{ text: enhancedPrompt }] }],
            generationConfig: { maxOutputTokens: 150, temperature: 0.7 }
        };

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error("API error");

            const result = await response.json();
            return result.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
        } catch (error) {
            console.error("AI API Error:", error);
            return "Sorry, something went wrong. Please try again.";
        }
    }

    // --- Intent Handler ---
    function handleIntent(aiResponse) {
        // Check if response contains intent
        if (aiResponse.includes("INTENT:")) {
            const intentMatch = aiResponse.match(/INTENT:(\w+)\|MESSAGE:(.*)/);
            if (intentMatch) {
                const intent = intentMatch[1];
                const message = intentMatch[2];
                
                // Check if intent has a corresponding page
                if (intentPageMapping[intent]) {
                    addMessage(message, 'ai');
                    speak(message);
                    
                    // Show redirect message
                    setTimeout(() => {
                        addMessage(`Redirecting you to the ${intent.replace('_', ' ')} page...`, 'ai');
                        // Redirect after 2 seconds
                        setTimeout(() => {
                            window.location.href = intentPageMapping[intent];
                        }, 2000);
                    }, 1000);
                    
                    return true; // Intent handled
                }
            }
        }
        return false; // No intent detected
    }

    // --- Enhanced Chat Form Submit with Intent Detection ---
    chatForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const userInput = chatInput?.value.trim();
        if (!userInput) return;

        addMessage(userInput, 'user');
        chatInput.value = '';

        const loadingIndicator = addMessage('', 'loading');

        try {
            const aiResponse = await callGeminiAPI(userInput);
            loadingIndicator.remove();
            
            // Check for intent and handle redirection
            const intentHandled = handleIntent(aiResponse);
            
            // If no intent was detected, show normal response
            if (!intentHandled) {
                addMessage(aiResponse, 'ai');
                speak(aiResponse); // 🔊 Speak the response
            }
        } catch (error) {
            loadingIndicator.remove();
            addMessage("Error, please try again.", 'ai');
        }
    });

    // --- Helper Functions ---
    function addMessage(text, type) {
        if (!chatBody) return null;
        const messageElement = document.createElement('div');

        if (type === 'loading') {
            messageElement.className = 'chat-message ai';
            messageElement.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
        } else {
            messageElement.className = `chat-message ${type}`;
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


    // --- Footer Location API ---

    async function getAiResponse(prompt) {
        const apiKey = "YOUR_GEMINI_KEY";
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
    };

    function findLocation(query) {
        query = query.trim().toLowerCase();
        for (const [key, url] of Object.entries(footerLocationIndex)) {
            if (query.includes(key)) return url;
        }
        return null;
    }

    window.footerAPI = {
        findLocation,
        getAllLocations: () => Object.assign({}, footerLocationIndex),
        answer: (question) => {
            const match = findLocation(question.replace(/where is|go to|open/gi, '').trim());
            return match ? `You can find it at: ${match}` : 'Sorry, location not found.';
        }
    };
});
