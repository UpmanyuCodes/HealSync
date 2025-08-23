// HealSync Doctor-Patient Chat System
// Comprehensive chat functionality with API integration

class HealSyncChat {
    constructor() {
        this.apiBase = 'https://healsync-backend-d788.onrender.com';
        this.currentChatSession = null;
        this.currentAppointment = null;
        this.currentDoctor = null;
        this.chatPollInterval = null;
        this.isTyping = false;
        this.unreadCounts = new Map();
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadUnreadCounts();
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

            chatInput.addEventListener('input', () => {
                this.handleTyping();
            });
        }

        // Chat send button
        const sendBtn = document.getElementById('chat-send-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }

        // Close chat events
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('chat-overlay')) {
                this.closeChatDrawer();
            }
        });

        // Mobile responsive handling
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    // Open chat with a specific doctor for an appointment
    async openChat(appointment, doctor) {
        try {
            this.currentAppointment = appointment;
            this.currentDoctor = doctor;

            // Update chat header
            this.updateChatHeader(doctor);

            // Get or create chat session
            await this.getOrCreateChatSession(appointment.id, doctor.id);

            // Load chat history
            await this.loadChatHistory();

            // Show chat drawer
            this.showChatDrawer();

            // Start polling for new messages
            this.startMessagePolling();

            // Mark messages as read
            await this.markMessagesAsRead();

        } catch (error) {
            console.error('Error opening chat:', error);
            showSnackbar('Unable to open chat. Please try again.', 'error');
        }
    }

    updateChatHeader(doctor) {
        const doctorName = document.getElementById('chat-doctor-name');
        const doctorSpecialty = document.getElementById('chat-doctor-specialty');
        const chatStatus = document.getElementById('chat-status');

        if (doctorName) doctorName.textContent = doctor.name;
        if (doctorSpecialty) doctorSpecialty.textContent = doctor.specialty;
        if (chatStatus) {
            chatStatus.textContent = 'Online';
            chatStatus.className = 'chat-status online';
        }
    }

    async getOrCreateChatSession(appointmentId, doctorId) {
        try {
            const patientData = getPatientSession();
            if (!patientData) throw new Error('Not authenticated');

            // Check if session already exists
            const existingSessions = await this.getChatSessions(patientData.id);
            let session = existingSessions.find(s => 
                s.appointmentId == appointmentId && s.doctorId == doctorId
            );

            if (!session) {
                // Create new chat session
                session = await this.createChatSession({
                    patientId: patientData.id,
                    doctorId: doctorId,
                    appointmentId: appointmentId,
                    status: 'active'
                });
            }

            this.currentChatSession = session;
            return session;

        } catch (error) {
            console.error('Error getting/creating chat session:', error);
            throw error;
        }
    }

    async createChatSession(sessionData) {
        try {
            const response = await fetch(`${this.apiBase}/api/chat/session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify(sessionData)
            });

            if (!response.ok) {
                throw new Error('Failed to create chat session');
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating chat session:', error);
            throw error;
        }
    }

    async getChatSessions(userId) {
        try {
            const response = await fetch(`${this.apiBase}/api/chat/sessions?userId=${userId}`, {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to get chat sessions');
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting chat sessions:', error);
            return [];
        }
    }

    async loadChatHistory() {
        try {
            if (!this.currentChatSession) return;

            const response = await fetch(
                `${this.apiBase}/api/chat/messages?chatSessionId=${this.currentChatSession.id}`,
                {
                    headers: {
                        'Authorization': `Bearer ${getAuthToken()}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Failed to load chat history');
            }

            const messages = await response.json();
            this.displayMessages(messages);

        } catch (error) {
            console.error('Error loading chat history:', error);
            this.showWelcomeMessage();
        }
    }

    displayMessages(messages) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        // Clear welcome message
        chatMessages.innerHTML = '';

        messages.forEach(message => {
            this.addMessageToUI(message);
        });

        this.scrollToBottom();
    }

    addMessageToUI(message) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        const messageElement = document.createElement('div');
        const patientData = getPatientSession();
        const isPatientMessage = message.senderId == patientData.id;
        
        messageElement.className = `message ${isPatientMessage ? 'sent' : 'received'}`;
        
        messageElement.innerHTML = `
            <div class="message-bubble">
                ${this.escapeHtml(message.content)}
                <span class="message-time">${this.formatMessageTime(message.createdAt)}</span>
            </div>
        `;

        chatMessages.appendChild(messageElement);
        this.scrollToBottom();
    }

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const sendBtn = document.getElementById('chat-send-btn');
        
        if (!input || !this.currentChatSession) return;

        const messageText = input.value.trim();
        if (!messageText) return;

        try {
            // Disable input while sending
            input.disabled = true;
            sendBtn.disabled = true;

            const patientData = getPatientSession();
            if (!patientData) throw new Error('Not authenticated');

            const messageData = {
                chatSessionId: this.currentChatSession.id,
                senderId: patientData.id,
                receiverId: this.currentDoctor.id,
                content: messageText,
                messageType: 'text'
            };

            // Add message to UI immediately (optimistic update)
            this.addMessageToUI({
                ...messageData,
                createdAt: new Date().toISOString(),
                id: Date.now() // temporary ID
            });

            // Clear input
            input.value = '';

            // Send to server
            const response = await fetch(`${this.apiBase}/api/chat/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify(messageData)
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            // Message sent successfully
            console.log('Message sent successfully');

        } catch (error) {
            console.error('Error sending message:', error);
            showSnackbar('Failed to send message. Please try again.', 'error');
        } finally {
            // Re-enable input
            input.disabled = false;
            sendBtn.disabled = false;
            input.focus();
        }
    }

    async markMessagesAsRead() {
        try {
            if (!this.currentChatSession) return;

            // Get unread messages for this chat session
            const response = await fetch(
                `${this.apiBase}/api/chat/messages?chatSessionId=${this.currentChatSession.id}`,
                {
                    headers: {
                        'Authorization': `Bearer ${getAuthToken()}`
                    }
                }
            );

            if (!response.ok) return;

            const messages = await response.json();
            const patientData = getPatientSession();
            
            // Mark unread messages as read
            const unreadMessages = messages.filter(m => 
                m.receiverId == patientData.id && !m.isRead
            );

            for (const message of unreadMessages) {
                await fetch(`${this.apiBase}/api/chat/messages/${message.id}/read`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${getAuthToken()}`
                    }
                });
            }

            // Update unread count
            this.unreadCounts.set(this.currentChatSession.id, 0);
            this.updateUnreadBadges();

        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    }

    startMessagePolling() {
        this.stopMessagePolling();
        
        this.chatPollInterval = setInterval(async () => {
            await this.pollForNewMessages();
        }, 3000); // Poll every 3 seconds
    }

    stopMessagePolling() {
        if (this.chatPollInterval) {
            clearInterval(this.chatPollInterval);
            this.chatPollInterval = null;
        }
    }

    async pollForNewMessages() {
        try {
            if (!this.currentChatSession) return;

            const response = await fetch(
                `${this.apiBase}/api/chat/messages?chatSessionId=${this.currentChatSession.id}`,
                {
                    headers: {
                        'Authorization': `Bearer ${getAuthToken()}`
                    }
                }
            );

            if (!response.ok) return;

            const messages = await response.json();
            const chatMessages = document.getElementById('chat-messages');
            const existingMessages = chatMessages.querySelectorAll('.message').length;

            if (messages.length > existingMessages) {
                // New messages found - reload the chat
                this.displayMessages(messages);
                await this.markMessagesAsRead();
            }

        } catch (error) {
            console.error('Error polling for messages:', error);
        }
    }

    showChatDrawer() {
        const drawer = document.getElementById('chat-drawer');
        const overlay = document.getElementById('chat-overlay');
        
        if (drawer) drawer.classList.add('active');
        if (overlay && window.innerWidth <= 768) {
            overlay.classList.add('active');
        }
        
        // Focus on input
        setTimeout(() => {
            const input = document.getElementById('chat-input');
            if (input) input.focus();
        }, 300);
    }

    closeChatDrawer() {
        const drawer = document.getElementById('chat-drawer');
        const overlay = document.getElementById('chat-overlay');
        
        if (drawer) drawer.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        
        // Stop polling
        this.stopMessagePolling();
        
        // Clear current session
        this.currentChatSession = null;
        this.currentAppointment = null;
        this.currentDoctor = null;
    }

    minimizeChat() {
        const drawer = document.getElementById('chat-drawer');
        if (drawer) {
            drawer.classList.toggle('minimized');
        }
    }

    showWelcomeMessage() {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        chatMessages.innerHTML = `
            <div class="chat-welcome-message">
                <div class="welcome-icon">
                    <i class="fas fa-comments"></i>
                </div>
                <h3>Start a conversation</h3>
                <p>Chat with your doctor about your appointment, ask questions, or share any concerns.</p>
            </div>
        `;
    }

    handleTyping() {
        // Typing indicator logic can be added here
        // For now, we'll keep it simple
    }

    handleResize() {
        const overlay = document.getElementById('chat-overlay');
        const drawer = document.getElementById('chat-drawer');
        
        if (window.innerWidth > 768) {
            if (overlay) overlay.classList.remove('active');
        } else if (drawer && drawer.classList.contains('active')) {
            if (overlay) overlay.classList.add('active');
        }
    }

    scrollToBottom() {
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    formatMessageTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async loadUnreadCounts() {
        try {
            const patientData = getPatientSession();
            if (!patientData) return;

            const sessions = await this.getChatSessions(patientData.id);
            
            for (const session of sessions) {
                const response = await fetch(
                    `${this.apiBase}/api/chat/messages?chatSessionId=${session.id}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${getAuthToken()}`
                        }
                    }
                );

                if (response.ok) {
                    const messages = await response.json();
                    const unreadCount = messages.filter(m => 
                        m.receiverId == patientData.id && !m.isRead
                    ).length;
                    
                    this.unreadCounts.set(session.id, unreadCount);
                }
            }

            this.updateUnreadBadges();

        } catch (error) {
            console.error('Error loading unread counts:', error);
        }
    }

    updateUnreadBadges() {
        // Update unread badges in appointment cards
        const chatButtons = document.querySelectorAll('.appointment-chat-btn');
        chatButtons.forEach(btn => {
            const appointmentId = btn.getAttribute('data-appointment-id');
            const sessionId = this.findSessionIdByAppointment(appointmentId);
            
            if (sessionId) {
                const unreadCount = this.unreadCounts.get(sessionId) || 0;
                const badge = btn.querySelector('.unread-badge');
                
                if (unreadCount > 0) {
                    if (!badge) {
                        const newBadge = document.createElement('span');
                        newBadge.className = 'unread-badge';
                        newBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                        btn.appendChild(newBadge);
                    } else {
                        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                    }
                } else if (badge) {
                    badge.remove();
                }
            }
        });
    }

    findSessionIdByAppointment(appointmentId) {
        // This would need to be implemented based on your session storage
        // For now, return null
        return null;
    }

    // File attachment functionality
    attachFile() {
        showSnackbar('File attachment feature coming soon!', 'info');
    }

    // Utility function to get auth token
    getAuthToken() {
        return localStorage.getItem('healSync_auth_token') || '';
    }
}

// Global chat functions for appointment cards
function openChatWithDoctor(appointment, doctor) {
    if (!window.healSyncChat) {
        window.healSyncChat = new HealSyncChat();
    }
    window.healSyncChat.openChat(appointment, doctor);
}

function closeChatDrawer() {
    if (window.healSyncChat) {
        window.healSyncChat.closeChatDrawer();
    }
}

function minimizeChat() {
    if (window.healSyncChat) {
        window.healSyncChat.minimizeChat();
    }
}

function sendMessage() {
    if (window.healSyncChat) {
        window.healSyncChat.sendMessage();
    }
}

function attachFile() {
    if (window.healSyncChat) {
        window.healSyncChat.attachFile();
    }
}

// Initialize chat system when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if on appointments page
    if (document.getElementById('chat-drawer')) {
        window.healSyncChat = new HealSyncChat();
    }
});

// Utility function to get auth token (backward compatibility)
function getAuthToken() {
    return localStorage.getItem('healSync_auth_token') || 
           (window.healSyncAuth ? window.healSyncAuth.getAuthToken() : '');
}
