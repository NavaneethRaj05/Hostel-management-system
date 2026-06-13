const API_BASE = 'http://localhost:3001/api';

async function registerUser({ name, email, password, role, usn, phone, address, parentPhone }) {
    try {
        const res = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role, usn, phone, address, parentPhone })
        });
        
        if (!res.ok) {
            const errorData = await res.json();
            return { error: errorData.error || 'Registration failed' };
        }
        
        return await res.json();
    } catch (error) {
        console.error('Registration error:', error);
        return { error: 'Network error. Please try again.' };
    }
}

async function loginUser({ email, password }) {
    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        if (!res.ok) {
            let serverMsg = '';
            try { serverMsg = (await res.json()).error || ''; } catch (_) {}
            const err = new Error(`HTTP error! status: ${res.status}${serverMsg ? ` - ${serverMsg}` : ''}`);
            err.status = res.status;
            err.serverMessage = serverMsg;
            throw err;
        }
        
        return await res.json();
    } catch (error) {
        console.error('Login error:', error);
        return { error: 'Network error. Please try again.' };
    }
}

// Handle login form submission
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value.trim();
            const messageDiv = document.getElementById('loginMessage');
            
            // Require all fields (email and password)
            if (!email || !password) {
                messageDiv.textContent = 'Please enter both email and password.';
                messageDiv.className = 'mt-2 text-danger';
                return;
            }
            
            try {
                const result = await loginUser({ email, password });
                
                if (result.error) {
                    messageDiv.textContent = result.error;
                    messageDiv.className = 'mt-2 text-danger';
                } else {
                    messageDiv.textContent = 'Login successful!';
                    messageDiv.className = 'mt-2 text-success';
                    
                    // Store user info in localStorage
                    localStorage.setItem('user', JSON.stringify(result));
                    
                    // Hide modal and redirect to dashboard
                    const modal = bootstrap.Modal.getInstance(document.getElementById('authModal'));
                    modal.hide();
                    
                    // Redirect to dashboard
                    window.location.href = 'dashboard.html';
                }
            } catch (error) {
                messageDiv.textContent = 'Login failed. Please try again.';
                messageDiv.className = 'mt-2 text-danger';
                console.error('Login error:', error);
            }
        });
    }
    
    // Handle register form submission
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('registerConfirmPassword').value;
            const usn = document.getElementById('registerUSN').value;
            const phone = document.getElementById('registerPhone').value;
            const address = document.getElementById('registerAddress').value;
            const parentPhone = document.getElementById('registerParentPhone').value;
            const messageDiv = document.getElementById('registerMessage');
            
            // Basic validation
            if (password !== confirmPassword) {
                messageDiv.textContent = 'Passwords do not match.';
                messageDiv.className = 'mt-2 text-danger';
                return;
            }
            
            if (password.length < 6) {
                messageDiv.textContent = 'Password must be at least 6 characters long.';
                messageDiv.className = 'mt-2 text-danger';
                return;
            }
            
            if (!/^4YG[0-9]{2}[A-Z]{2}[0-9]{3}$/.test(usn.toUpperCase())) {
                messageDiv.textContent = 'Invalid USN format. Use format like: 4YG23CS300';
                messageDiv.className = 'mt-2 text-danger';
                return;
            }
            
            if (!/^[0-9]{10}$/.test(phone)) {
                messageDiv.textContent = 'Please enter a valid 10-digit phone number.';
                messageDiv.className = 'mt-2 text-danger';
                return;
            }
            
            if (!/^[0-9]{10}$/.test(parentPhone)) {
                messageDiv.textContent = 'Please enter a valid 10-digit parent/guardian phone number.';
                messageDiv.className = 'mt-2 text-danger';
                return;
            }
            
            try {
                const result = await registerUser({ 
                    name, 
                    email, 
                    password, 
                    role: 'student', 
                    usn: usn.toUpperCase(),
                    phone,
                    address,
                    parentPhone
                });
                
                if (result.error) {
                    messageDiv.textContent = result.error;
                    messageDiv.className = 'mt-2 text-danger';
                } else {
                    messageDiv.textContent = 'Registration successful! You can now login.';
                    messageDiv.className = 'mt-2 text-success';
                    
                    // Clear form
                    registerForm.reset();
                    
                    // Switch to login tab
                    const loginTab = document.getElementById('login-tab');
                    loginTab.click();
                }
            } catch (error) {
                messageDiv.textContent = 'Registration failed. Please try again.';
                messageDiv.className = 'mt-2 text-danger';
                console.error('Registration error:', error);
            }
        });
    }
    
    // Handle forgot password form submission
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('forgotEmail').value;
            const usn = document.getElementById('forgotUSN').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmNewPassword = document.getElementById('confirmNewPassword').value;
            const messageDiv = document.getElementById('forgotPasswordMessage');
            
            // Basic validation
            if (newPassword !== confirmNewPassword) {
                messageDiv.textContent = 'Passwords do not match.';
                messageDiv.className = 'mt-2 text-danger';
                return;
            }
            
            if (newPassword.length < 6) {
                messageDiv.textContent = 'Password must be at least 6 characters long.';
                messageDiv.className = 'mt-2 text-danger';
                return;
            }
            
            if (!/^4YG[0-9]{2}[A-Z]{2}[0-9]{3}$/.test(usn.toUpperCase())) {
                messageDiv.textContent = 'Invalid USN format. Use format like: 4YG23CS300';
                messageDiv.className = 'mt-2 text-danger';
                return;
            }
            
            try {
                const response = await fetch(`${API_BASE}/forgot-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        email, 
                        usn: usn.toUpperCase(), 
                        newPassword 
                    })
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    messageDiv.textContent = 'Password reset successful! You can now login with your new password.';
                    messageDiv.className = 'mt-2 text-success';
                    
                    // Clear form
                    forgotPasswordForm.reset();
                    
                    // Close modal after 2 seconds
                    setTimeout(() => {
                        const modal = bootstrap.Modal.getInstance(document.getElementById('forgotPasswordModal'));
                        modal.hide();
                    }, 2000);
                } else {
                    messageDiv.textContent = result.error || 'Password reset failed.';
                    messageDiv.className = 'mt-2 text-danger';
                }
            } catch (error) {
                messageDiv.textContent = 'Password reset failed. Please try again.';
                messageDiv.className = 'mt-2 text-danger';
                console.error('Password reset error:', error);
            }
        });
    }
    
    // Check if user is already logged in
    const user = localStorage.getItem('user');
    if (user) {
        // Redirect to dashboard if already logged in
        window.location.href = 'dashboard.html';
    }
});

function logout() {
    localStorage.removeItem('user');
    location.reload();
}

// Show forgot password modal
function showForgotPasswordModal() {
    const modal = new bootstrap.Modal(document.getElementById('forgotPasswordModal'));
    modal.show();
}

window.hostelApi = { registerUser, loginUser };

// Guest Chatbot Logic
let guestChatHistory = [];

document.addEventListener('DOMContentLoaded', function() {
    const chatToggleBtn = document.getElementById('chat-toggle-btn');
    const chatCloseBtn = document.getElementById('chat-close-btn');
    const chatWindow = document.getElementById('chat-window');
    const toggleIcon = document.getElementById('toggle-icon');
    const chatForm = document.getElementById('chat-input-form');
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('chat-message-input');

    if (chatToggleBtn && chatWindow) {
        chatToggleBtn.addEventListener('click', function() {
            if (chatWindow.classList.contains('d-none')) {
                chatWindow.classList.remove('d-none');
                toggleIcon.className = 'bi bi-x-lg fs-3';
                messageInput.focus();
                scrollToBottom();
            } else {
                chatWindow.classList.add('d-none');
                toggleIcon.className = 'bi bi-chat-dots-fill fs-3';
            }
        });
    }

    if (chatCloseBtn && chatWindow) {
        chatCloseBtn.addEventListener('click', function() {
            chatWindow.classList.add('d-none');
            if (toggleIcon) toggleIcon.className = 'bi bi-chat-dots-fill fs-3';
        });
    }

    if (chatForm) {
        chatForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const message = messageInput.value.trim();
            if (!message) return;

            messageInput.value = '';
            await sendChatToAPI(message);
        });
    }

    async function sendChatToAPI(message) {
        // Render user message
        appendMessage(message, 'user');
        scrollToBottom();

        // Show typing indicator
        showTypingIndicator();
        scrollToBottom();

        try {
            const res = await fetch(`${API_BASE}/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    history: guestChatHistory
                })
            });

            removeTypingIndicator();

            if (res.ok) {
                const data = await res.json();
                appendMessage(data.text, 'bot');
                
                // Save to history
                guestChatHistory.push({ sender: 'user', text: message });
                guestChatHistory.push({ sender: 'bot', text: data.text });
            } else {
                appendMessage('Sorry, I am having trouble connecting to the backend service. Please try again.', 'bot');
            }
        } catch (error) {
            console.error('Chat error:', error);
            removeTypingIndicator();
            appendMessage('Network error. Please make sure the backend server is running.', 'bot');
        }
        scrollToBottom();
    }

    function appendMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'd-flex mb-2' + (sender === 'user' ? ' justify-content-end' : '');
        
        const bubble = document.createElement('div');
        bubble.className = sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot';
        
        // Clean markdown code blocks if any, replace newlines with br for vanilla layout
        bubble.innerHTML = formatChatText(text);
        
        msgDiv.appendChild(bubble);
        chatMessages.appendChild(msgDiv);
    }

    function formatChatText(text) {
        // Escape HTML
        let escaped = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
        
        // Bold formatting
        escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Newlines to br
        return escaped.replace(/\n/g, '<br>');
    }

    function showTypingIndicator() {
        const indicatorDiv = document.createElement('div');
        indicatorDiv.className = 'd-flex mb-2';
        indicatorDiv.id = 'typing-indicator-container';
        indicatorDiv.innerHTML = `
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        chatMessages.appendChild(indicatorDiv);
    }

    function removeTypingIndicator() {
        const indicator = document.getElementById('typing-indicator-container');
        if (indicator) {
            indicator.remove();
        }
    }

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Expose quick query sender globally
    window.sendGuestQuickMsg = async function(message) {
        await sendChatToAPI(message);
    };
});
