// Get session token
function getToken() {
    return localStorage.getItem('session_token');
}

// Set session token
function setToken(token) {
    localStorage.setItem('session_token', token);
}

// Remove session token
function removeToken() {
    localStorage.removeItem('session_token');
}

// Login form handler
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');
    
    // Hide previous errors
    errorMessage.classList.remove('show');
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Save token
            setToken(data.token);
            
            // Redirect based on role
            if (data.user.role === 'admin') {
                window.location.href = '/admin';
            } else {
                window.location.href = '/cashier';
            }
        } else {
            // Show error
            errorMessage.textContent = data.error || 'Login failed';
            errorMessage.classList.add('show');
        }
    } catch (error) {
        errorMessage.textContent = 'Network error. Please try again.';
        errorMessage.classList.add('show');
    }
});

// Check if already logged in
window.addEventListener('load', async () => {
    const token = getToken();
    
    if (token) {
        try {
            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // Already logged in, redirect
                if (data.user.role === 'admin') {
                    window.location.href = '/admin';
                } else {
                    window.location.href = '/cashier';
                }
            }
        } catch (error) {
            // Invalid token, stay on login page
            removeToken();
        }
    }
});
