document.addEventListener('DOMContentLoaded', () => {

    // --- Mobile Menu Toggle ---
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            // Your existing mobile menu logic here
            // For example: mobileMenu.classList.toggle('visible');
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
        chatToggleBtn.addEventListener('click', () => chatWidget.classList.toggle('visible'));
    }
    if (closeChatBtn) {
        closeChatBtn.addEventListener('click', () => chatWidget.classList.remove('visible'));
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

            const loadingIndicator = addMessage('', 'ai loading');
            const aiResponse = await getAiResponse(userInput);
            
            loadingIndicator.remove();
            addMessage(aiResponse, 'ai');
            speak(aiResponse); // Speak the AI's response
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
        const apiKey = ""; // The environment handles the API key
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const systemInstruction = {
            role: "system",
            parts: [{ text: "You are a helpful AI assistant for HealSync, a healthcare platform. Your role is to answer general questions about the platform's features. Do not provide medical advice. If asked for medical advice, politely decline and recommend the user consult a healthcare professional." }]
        };

        const userMessage = { role: "user", parts: [{ text: prompt }] };
        const payload = { contents: [systemInstruction, userMessage] };

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                return "Sorry, I'm having trouble connecting. Please try again later.";
            }
            const result = await response.json();
            if (result.candidates && result.candidates[0]?.content?.parts[0]) {
                return result.candidates[0].content.parts[0].text;
            } else {
                return "I'm sorry, I couldn't generate a response.";
            }
        } catch (error) {
            console.error("AI API Error:", error);
            return "Sorry, an error occurred.";
        }
    }
});
