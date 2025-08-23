// HealSync Doctor-Patient Chat System
// Robust implementation with proper error handling and offline support

class HealSyncChat {
    constructor() {
        this.apiBase = 'https://healsync-backend-d788.onrender.com';
        this.currentUser = null;
        this.currentChatSession = null;
        this.chatPollInterval = null;
        this.isTyping = false;
        this.unreadCounts = new Map();
        this.chatSessions = new Map();
        this.isOnline = true;
        this.retryAttempts = 0;
        this.maxRetries = 3;
        
        this.init();
    }

    init() {
        this.loadCurrentUser();
        this.setupEventListeners();
        
        // Check backend status first, then conditionally load chat sessions
        this.checkBackendStatus().then(() => {
            if (this.currentUser && this.isOnline) {
                this.loadUserChatSessions().catch(error => {
                    console.warn('⚠️ Chat sessions failed to load, continuing without them');
                });
            } else if (!this.currentUser) {
                this.showConnectionStatus('Please log in to use chat functionality', 'warning');
            } else {
                console.log('📴 Backend offline - chat disabled');
            }
        });
    }

    // Enhanced user loading with better validation
    loadCurrentUser() {
        try {
            console.log('🔍 Loading user data...');
            
            // Try multiple sources for user data
            const dataSources = [
                { key: 'healSync_patient_data', type: 'patient', idField: 'patientId', nameField: 'patientName' },
                { key: 'healSync_doctor_data', type: 'doctor', idField: 'doctorId', nameField: 'doctorName' },
                { key: 'healSync_userData', type: 'user', idField: 'userId', nameField: 'userName' },
                { key: 'healSync_userSession', type: 'user', idField: 'id', nameField: 'name' }
            ];

            for (const source of dataSources) {
                const data = localStorage.getItem(source.key);
                if (data) {
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed && (parsed[source.idField] || parsed.id)) {
                            this.currentUser = {
                                id: parsed[source.idField] || parsed.id,
                                name: parsed[source.nameField] || parsed.name || 'User',
                                email: parsed.email || '',
                                type: parsed.userType || source.type,
                                phone: parsed.phone || parsed.mobileNo || '',
                                data: parsed
                            };
                            console.log('✅ User loaded successfully:', this.currentUser);
                            return;
                        }
                    } catch (parseError) {
                        console.warn(`⚠️ Invalid JSON in ${source.key}:`, parseError);
                    }
                }
            }

            // If no user found, create a demo user for testing
            console.warn('⚠️ No user data found, creating demo user for testing');
            this.createDemoUser();
            
        } catch (error) {
            console.error('❌ Error loading user data:', error);
            this.createDemoUser();
        }
    }

    createDemoUser() {
        this.currentUser = {
            id: 'demo_' + Date.now(),
            name: 'Demo User',
            email: 'demo@healsync.com',
            type: 'patient',
            phone: '1234567890',
            data: { demo: true }
        };
        console.log('🎭 Demo user created:', this.currentUser);
    }

    async checkBackendStatus() {
        try {
            console.log('🌐 Checking backend connectivity...');
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // Increased to 10 seconds
            
            // Use existing test endpoint instead of /health
            const response = await fetch(`${this.apiBase}/api/chat/test`, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                this.isOnline = true;
                console.log('✅ Backend is online');
                this.showConnectionStatus('Connected to server', 'success');
            } else {
                throw new Error(`Server returned ${response.status}`);
            }
        } catch (error) {
            this.isOnline = false;
            console.warn('⚠️ Backend is offline:', error.message);
            this.enableOfflineMode();
        }
    }

    enableOfflineMode() {
        console.log('📴 Enabling offline mode with mock data...');
        
        // Create mock chat sessions for demo
        const mockSession = {
            id: 'mock_session_1',
            appointmentId: '1',
            doctorId: 'doc_1',
            patientId: this.currentUser.id,
            doctorName: 'Dr. Sarah Johnson',
            patientName: this.currentUser.name,
            createdAt: new Date().toISOString()
        };
        
        this.chatSessions.set(mockSession.id, mockSession);
    }

    showConnectionStatus(message, type = 'info') {
        // Create or update connection status indicator
        let statusEl = document.getElementById('chat-connection-status');
        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.id = 'chat-connection-status';
            statusEl.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                z-index: 10000;
                transition: all 0.3s ease;
            `;
            document.body.appendChild(statusEl);
        }
        
        const colors = {
            success: '#10B981',
            warning: '#F59E0B',
            error: '#EF4444',
            info: '#3B82F6'
        };
        
        statusEl.textContent = message;
        statusEl.style.backgroundColor = colors[type];
        statusEl.style.color = 'white';
        
        // Auto-hide after 3 seconds for success messages
        if (type === 'success') {
            setTimeout(() => {
                if (statusEl) statusEl.style.opacity = '0';
                setTimeout(() => statusEl?.remove(), 300);
            }, 3000);
        }
    }

    setupEventListeners() {
        // Chat input events
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            // Auto-resize textarea
            chatInput.addEventListener('input', () => {
                chatInput.style.height = 'auto';
                chatInput.style.height = chatInput.scrollHeight + 'px';
            });
        }

        // Chat send button
        const sendBtn = document.getElementById('chat-send-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }

        // Close chat events
        const closeChatBtn = document.getElementById('chat-close-btn');
        if (closeChatBtn) {
            closeChatBtn.addEventListener('click', () => this.closeChatDrawer());
        }

        // Chat overlay close
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('chat-overlay')) {
                this.closeChatDrawer();
            }
        });

        // Attach file button
        const attachBtn = document.getElementById('chat-attach-btn');
        if (attachBtn) {
            attachBtn.addEventListener('click', () => this.attachFile());
        }

        // Setup chat buttons with error handling
        setTimeout(() => this.setupChatButtons(), 1000);

        // Handle page visibility change to pause/resume polling
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stopMessagePolling();
            } else if (this.currentChatSession) {
                this.startMessagePolling();
            }
        });
    }

    setupChatButtons() {
        const chatButtons = document.querySelectorAll('.appointment-chat-btn');
        console.log(`🔗 Setting up ${chatButtons.length} chat buttons`);
        
        chatButtons.forEach((button, index) => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                
                const appointmentId = button.getAttribute('data-appointment-id') || `demo_${index + 1}`;
                const doctorId = button.getAttribute('data-doctor-id') || 'demo_doctor';
                const patientId = button.getAttribute('data-patient-id') || this.currentUser?.id || 'demo_patient';
                
                console.log(`🎯 Chat button clicked:`, { appointmentId, doctorId, patientId });
                this.openChat(appointmentId, doctorId, patientId);
            });
        });
    }

    // Enhanced API methods with retry logic
    async apiRequest(endpoint, options = {}) {
        // Don't make requests if we know we're offline
        if (!this.isOnline) {
            console.warn('⚠️ Skipping API request - backend is offline:', endpoint);
            throw new Error('Backend is offline');
        }

        const maxRetries = 2; // Reduced retries to avoid spam
        const baseDelay = 2000; // Increased base delay

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased to 15 seconds

                const response = await fetch(`${this.apiBase}${endpoint}`, {
                    ...options,
                    signal: controller.signal,
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers
                    }
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    return await response.json();
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            } catch (error) {
                console.warn(`⚠️ API attempt ${attempt + 1} failed:`, error.message);
                
                if (attempt === maxRetries - 1) {
                    console.error(`❌ All ${maxRetries} API attempts failed for ${endpoint}`);
                    // Mark as offline if all attempts fail
                    this.isOnline = false;
                    throw error;
                }

                // Exponential backoff
                const delay = baseDelay * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    async loadUserChatSessions() {
        if (!this.currentUser?.id) {
            console.error('❌ No user ID available for loading chat sessions');
            return;
        }

        try {
            console.log(`📡 Loading chat sessions for user ${this.currentUser.id}...`);
            
            if (!this.isOnline) {
                console.log('📴 Backend offline - using mock sessions');
                this.enableOfflineMode();
                return;
            }

            // Try the chat sessions endpoint - it might not exist in your backend
            try {
                const sessions = await this.apiRequest(`/api/chat/sessions?userId=${this.currentUser.id}`);
                console.log('✅ Chat sessions loaded:', sessions);
                
                if (Array.isArray(sessions)) {
                    sessions.forEach(session => {
                        this.chatSessions.set(session.id, session);
                    });
                    this.updateUnreadCounts(sessions);
                } else {
                    console.warn('⚠️ Invalid sessions response format');
                }
            } catch (apiError) {
                // If sessions endpoint doesn't exist, skip it gracefully
                if (apiError.message.includes('404')) {
                    console.log('ℹ️ Chat sessions endpoint not available - skipping');
                } else {
                    throw apiError;
                }
            }

        } catch (error) {
            console.error('❌ Failed to load chat sessions:', error);
            this.enableOfflineMode();
        }
    }

    async createChatSession(doctorId, patientId, appointmentId) {
        try {
            console.log(`� Creating chat session...`, { doctorId, patientId, appointmentId });
            
            if (!this.isOnline) {
                // Create mock session for offline mode
                const mockSession = {
                    id: `mock_${Date.now()}`,
                    appointmentId: appointmentId,
                    doctorId: doctorId,
                    patientId: patientId,
                    doctorName: 'Dr. Demo',
                    patientName: this.currentUser.name,
                    createdAt: new Date().toISOString(),
                    status: 'active'
                };
                
                this.chatSessions.set(mockSession.id, mockSession);
                console.log('✅ Mock chat session created:', mockSession);
                return mockSession;
            }

            const sessionData = await this.apiRequest('/api/chat/session', {
                method: 'POST',
                body: JSON.stringify({
                    doctorId: parseInt(doctorId),
                    patientId: parseInt(patientId),
                    appointmentId: parseInt(appointmentId)
                })
            });
            
            this.chatSessions.set(sessionData.id, sessionData);
            console.log('✅ Chat session created:', sessionData);
            return sessionData;
            
        } catch (error) {
            console.error('❌ Failed to create chat session:', error);
            
            // Fallback to mock session
            const fallbackSession = {
                id: `fallback_${Date.now()}`,
                appointmentId: appointmentId,
                doctorId: doctorId,
                patientId: patientId,
                doctorName: 'Dr. Offline',
                patientName: this.currentUser.name,
                createdAt: new Date().toISOString(),
                status: 'offline'
            };
            
            this.chatSessions.set(fallbackSession.id, fallbackSession);
            this.showConnectionStatus('Using offline mode', 'warning');
            return fallbackSession;
        }
    }

    async getChatHistory(chatSessionId) {
        try {
            console.log(`📡 Loading chat history for session ${chatSessionId}...`);
            
            if (!this.isOnline || chatSessionId.startsWith('mock_') || chatSessionId.startsWith('fallback_')) {
                // Return mock messages for offline/demo mode
                return this.getMockMessages(chatSessionId);
            }

            const messages = await this.apiRequest(`/api/chat/messages?chatSessionId=${chatSessionId}`);
            console.log('✅ Chat history loaded:', messages.length, 'messages');
            return messages;
            
        } catch (error) {
            console.error('❌ Failed to load chat history:', error);
            return this.getMockMessages(chatSessionId);
        }
    }

    getMockMessages(sessionId) {
        const mockMessages = [
            {
                id: 1,
                chatSessionId: sessionId,
                senderId: 'demo_doctor',
                receiverId: this.currentUser.id,
                message: 'Hello! How are you feeling today?',
                sentAt: new Date(Date.now() - 300000).toISOString(),
                read: false
            },
            {
                id: 2,
                chatSessionId: sessionId,
                senderId: this.currentUser.id,
                receiverId: 'demo_doctor',
                message: 'Hi doctor, I\'ve been having some mild headaches.',
                sentAt: new Date(Date.now() - 240000).toISOString(),
                read: true
            },
            {
                id: 3,
                chatSessionId: sessionId,
                senderId: 'demo_doctor',
                receiverId: this.currentUser.id,
                message: 'I understand. Can you tell me how long you\'ve been experiencing these headaches?',
                sentAt: new Date(Date.now() - 180000).toISOString(),
                read: false
            }
        ];
        
        return mockMessages;
    }

    async sendMessageToApi(message) {
        if (!this.currentChatSession || !this.currentUser) {
            console.error('❌ No active chat session or user');
            return false;
        }

        try {
            // Determine receiver ID based on current user type
            let receiverId;
            if (this.currentUser.type === 'patient') {
                receiverId = this.currentChatSession.doctorId;
            } else {
                receiverId = this.currentChatSession.patientId;
            }

            console.log(`📡 Sending message: "${message.substring(0, 50)}..."`);
            
            if (!this.isOnline || this.currentChatSession.id.startsWith('mock_') || this.currentChatSession.id.startsWith('fallback_')) {
                // Simulate sending in offline mode
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const mockResponse = {
                    id: Date.now(),
                    chatSessionId: this.currentChatSession.id,
                    senderId: this.currentUser.id,
                    receiverId: receiverId,
                    message: message,
                    sentAt: new Date().toISOString(),
                    read: false
                };
                
                console.log('✅ Mock message sent:', mockResponse);
                
                // Simulate doctor response after 2 seconds
                setTimeout(() => {
                    this.simulateDoctorResponse();
                }, 2000);
                
                return mockResponse;
            }

            const messageData = await this.apiRequest('/api/chat/messages', {
                method: 'POST',
                body: JSON.stringify({
                    chatSessionId: this.currentChatSession.id,
                    senderId: this.currentUser.id,
                    receiverId: receiverId,
                    message: message
                })
            });

            console.log('✅ Message sent successfully:', messageData);
            return messageData;
            
        } catch (error) {
            console.error('❌ Failed to send message:', error);
            this.showConnectionStatus('Failed to send message', 'error');
            return false;
        }
    }

    simulateDoctorResponse() {
        if (!this.currentChatSession) return;
        
        const responses = [
            "Thank you for sharing that information.",
            "I understand your concern. Let me help you with that.",
            "That's a good question. Based on your symptoms...",
            "I'd like to know more about this. Can you provide additional details?",
            "Let me check your medical history and get back to you.",
            "Based on what you've described, I recommend...",
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        const mockMessage = {
            id: Date.now(),
            chatSessionId: this.currentChatSession.id,
            senderId: this.currentChatSession.doctorId,
            receiverId: this.currentUser.id,
            message: randomResponse,
            sentAt: new Date().toISOString(),
            read: false
        };
        
        this.displayMessage(mockMessage);
        console.log('🤖 Simulated doctor response:', mockMessage);
    }

    async markMessageAsRead(messageId) {
        try {
            if (!this.isOnline) {
                console.log('📴 Offline mode: Message marked as read locally');
                return true;
            }

            await this.apiRequest(`/api/chat/messages/${messageId}/read`, {
                method: 'PUT'
            });

            console.log(`✅ Message ${messageId} marked as read`);
            return true;
        } catch (error) {
            console.error('❌ Failed to mark message as read:', error);
            return false;
        }
    }

    // Enhanced UI Methods
    async openChat(appointmentId, doctorId, patientId) {
        console.log(`🚀 Opening chat for appointment ${appointmentId}`);
        
        if (!this.currentUser) {
            console.error('❌ User not logged in');
            this.showError('Please log in to use chat');
            return;
        }

        // Show loading state
        this.showChatLoading();

        try {
            // Find or create chat session
            let session = Array.from(this.chatSessions.values()).find(s => 
                s.appointmentId == appointmentId
            );

            if (!session) {
                console.log('📝 Creating new chat session...');
                session = await this.createChatSession(doctorId, patientId, appointmentId);
                if (!session) {
                    this.showError('Failed to create chat session');
                    return;
                }
            }

            this.currentChatSession = session;
            await this.displayChat(session);
            this.openChatDrawer();
            
        } catch (error) {
            console.error('❌ Error opening chat:', error);
            this.showError('Failed to open chat');
        }
    }

    showChatLoading() {
        const messagesContainer = document.querySelector('.chat-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="chat-loading" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">💬</div>
                    <div>Loading chat...</div>
                </div>
            `;
        }
    }

    async displayChat(session) {
        try {
            // Update chat header
            this.updateChatHeader(session);
            
            // Load and display messages
            const messages = await this.getChatHistory(session.id);
            this.displayMessages(messages);
            
            // Mark unread messages as read
            this.markUnreadMessagesAsRead(messages);
            
            // Start polling for new messages
            this.startMessagePolling();
            
        } catch (error) {
            console.error('❌ Error displaying chat:', error);
            this.showError('Failed to load chat');
        }
    }

    updateChatHeader(session) {
        const doctorInfo = document.querySelector('.chat-doctor-details h4');
        const doctorStatus = document.querySelector('.chat-doctor-details p');
        const chatTitle = document.querySelector('.chat-header h3');
        
        if (this.currentUser.type === 'patient') {
            // Patient viewing doctor info
            const doctorName = session.doctorName || 'Dr. Demo';
            if (doctorInfo) doctorInfo.textContent = doctorName;
            if (doctorStatus) doctorStatus.textContent = session.status === 'offline' ? 'Offline Mode' : 'Available';
            if (chatTitle) chatTitle.textContent = `Chat with ${doctorName}`;
        } else {
            // Doctor viewing patient info
            const patientName = session.patientName || 'Patient';
            if (doctorInfo) doctorInfo.textContent = patientName;
            if (doctorStatus) doctorStatus.textContent = 'Patient';
            if (chatTitle) chatTitle.textContent = `Chat with ${patientName}`;
        }
    }

    displayMessages(messages) {
        const messagesContainer = document.querySelector('.chat-messages');
        if (!messagesContainer) return;

        messagesContainer.innerHTML = '';

        if (messages.length === 0) {
            this.displayWelcomeMessage();
            return;
        }

        messages.forEach(message => {
            this.displayMessage(message);
        });

        this.scrollToBottom();
    }

    displayMessage(message) {
        const messagesContainer = document.querySelector('.chat-messages');
        if (!messagesContainer) return;

        const messageElement = document.createElement('div');
        messageElement.className = 'message';
        
        // Determine if message is sent or received
        const isSent = message.senderId == this.currentUser.id;
        messageElement.classList.add(isSent ? 'sent' : 'received');
        
        const messageContent = `
            <div class="message-bubble">
                ${this.sanitizeMessage(message.message)}
                <span class="message-time">${this.formatTime(message.sentAt)}</span>
            </div>
        `;
        
        messageElement.innerHTML = messageContent;
        messagesContainer.appendChild(messageElement);
        
        // Auto-scroll to new messages
        this.scrollToBottom();
    }

    displayWelcomeMessage() {
        const messagesContainer = document.querySelector('.chat-messages');
        if (!messagesContainer) return;

        const isOffline = !this.isOnline || 
                         (this.currentChatSession?.id.startsWith('mock_')) || 
                         (this.currentChatSession?.id.startsWith('fallback_'));

        const welcomeHTML = `
            <div class="chat-welcome-message" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                <div style="font-size: 3rem; margin-bottom: 1rem;">💬</div>
                <h3 style="margin: 0 0 0.5rem; color: var(--text-primary);">
                    ${isOffline ? 'Demo Chat Mode' : 'Start a conversation'}
                </h3>
                <p style="margin: 0; font-size: 0.875rem;">
                    ${isOffline 
                        ? 'You\'re in demo mode. Messages won\'t be saved to the server.' 
                        : 'Send a message to begin your consultation. Your conversation is private and secure.'
                    }
                </p>
                ${isOffline ? `
                    <div style="margin-top: 1rem; padding: 0.5rem; background: var(--warning-50); border-radius: 6px; font-size: 0.75rem; color: var(--warning-700);">
                        ⚠️ Backend server is not available
                    </div>
                ` : ''}
            </div>
        `;
        
        messagesContainer.innerHTML = welcomeHTML;
    }

    async sendMessage() {
        const chatInput = document.getElementById('chat-input');
        if (!chatInput) return;

        const message = chatInput.value.trim();
        if (!message) return;

        if (!this.currentChatSession) {
            this.showError('No active chat session');
            return;
        }

        // Clear input
        chatInput.value = '';
        chatInput.style.height = 'auto';

        // Display message immediately (optimistic update)
        this.displayUserMessage(message);

        // Send to server
        const messageData = await this.sendMessageToApi(message);
        if (!messageData) {
            this.showError('Failed to send message');
        }
    }

    displayUserMessage(message) {
        const messagesContainer = document.querySelector('.chat-messages');
        if (!messagesContainer) return;

        // Remove welcome message if it exists
        const welcomeMessage = messagesContainer.querySelector('.chat-welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        const messageElement = document.createElement('div');
        messageElement.className = 'message sent';
        
        const messageContent = `
            <div class="message-bubble">
                ${this.sanitizeMessage(message)}
                <span class="message-time">${this.formatTime(new Date().toISOString())}</span>
            </div>
        `;
        
        messageElement.innerHTML = messageContent;
        messagesContainer.appendChild(messageElement);
        
        this.scrollToBottom();
    }

    // UI Helper Methods
    openChatDrawer() {
        const drawer = document.getElementById('chat-drawer');
        const overlay = document.querySelector('.chat-overlay');
        
        if (drawer) {
            drawer.classList.add('active');
            drawer.setAttribute('aria-hidden', 'false');
        }
        if (overlay) overlay.classList.add('active');
        
        // Focus on chat input
        setTimeout(() => {
            const chatInput = document.getElementById('chat-input');
            if (chatInput) chatInput.focus();
        }, 300);
    }

    closeChatDrawer() {
        const drawer = document.getElementById('chat-drawer');
        const overlay = document.querySelector('.chat-overlay');
        
        if (drawer) {
            drawer.classList.remove('active');
            drawer.setAttribute('aria-hidden', 'true');
        }
        if (overlay) overlay.classList.remove('active');
        
        // Stop polling when chat is closed
        this.stopMessagePolling();
    }

    scrollToBottom() {
        const messagesContainer = document.querySelector('.chat-messages');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    showError(message) {
        console.error('Chat Error:', message);
        
        // Create toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--error-500);
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            font-size: 14px;
            z-index: 10001;
            box-shadow: var(--shadow-lg);
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Utility Methods
    sanitizeMessage(message) {
        const div = document.createElement('div');
        div.textContent = message;
        return div.innerHTML.replace(/\n/g, '<br>');
    }

    formatTime(isoString) {
        try {
            const date = new Date(isoString);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (error) {
            return 'now';
        }
    }

    updateUnreadCounts(sessions) {
        sessions.forEach(session => {
            const chatButton = document.querySelector(
                `.appointment-chat-btn[data-appointment-id="${session.appointmentId}"]`
            );
            
            if (chatButton && session.unreadCount > 0) {
                let badge = chatButton.querySelector('.unread-badge');
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'unread-badge';
                    chatButton.appendChild(badge);
                }
                badge.textContent = session.unreadCount;
                badge.style.display = 'flex';
            }
        });
    }

    markUnreadMessagesAsRead(messages) {
        messages.forEach(message => {
            if (!message.read && message.receiverId == this.currentUser.id) {
                this.markMessageAsRead(message.id);
            }
        });
    }

    // Real-time polling with exponential backoff
    startMessagePolling() {
        this.stopMessagePolling();
        
        let pollInterval = 3000; // Start with 3 seconds
        let consecutiveErrors = 0;
        
        const poll = async () => {
            try {
                if (this.currentChatSession && !document.hidden) {
                    const messages = await this.getChatHistory(this.currentChatSession.id);
                    this.displayMessages(messages);
                    consecutiveErrors = 0;
                    pollInterval = 3000; // Reset to normal interval
                }
            } catch (error) {
                consecutiveErrors++;
                pollInterval = Math.min(pollInterval * 1.5, 30000); // Max 30 seconds
                console.warn(`⚠️ Polling error ${consecutiveErrors}:`, error.message);
            }
            
            this.chatPollInterval = setTimeout(poll, pollInterval);
        };
        
        this.chatPollInterval = setTimeout(poll, pollInterval);
    }

    stopMessagePolling() {
        if (this.chatPollInterval) {
            clearTimeout(this.chatPollInterval);
            this.chatPollInterval = null;
        }
    }

    attachFile() {
        console.log('📎 File attachment feature - to be implemented');
        
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,.pdf,.doc,.docx';
        input.style.display = 'none';
        
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                console.log('Selected file:', file.name, file.type, file.size);
                this.showError('File attachment feature coming soon!');
            }
        });
        
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    }
}

// Initialize chat system when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if on appointments page with chat functionality
    if (document.getElementById('chat-drawer') || document.querySelector('.appointment-chat-btn')) {
        console.log('🚀 Initializing HealSync Chat System...');
        window.healSyncChat = new HealSyncChat();
    } else {
        console.log('ℹ️ Chat system not needed on this page');
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.healSyncChat) {
        window.healSyncChat.stopMessagePolling();
    }
});

// Export for external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HealSyncChat;
}
