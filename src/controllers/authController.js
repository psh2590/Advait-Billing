const db = require('../config/database');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

// Login
exports.login = (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    
    const query = 'SELECT * FROM users WHERE username = ? AND is_active = 1';
    
    db.get(query, [username], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Verify password
        try {
            const validPassword = await bcrypt.compare(password, user.password_hash);
            
            if (!validPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            // Create session
            const sessionToken = uuidv4();
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
            
            const sessionQuery = `
                INSERT INTO sessions (user_id, session_token, ip_address, expires_at)
                VALUES (?, ?, ?, ?)
            `;
            
            db.run(sessionQuery, [user.user_id, sessionToken, req.ip, expiresAt], function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Failed to create session' });
                }
                
                // Update last login
                db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?', [user.user_id]);
                
                res.json({
                    message: 'Login successful',
                    token: sessionToken,
                    user: {
                        user_id: user.user_id,
                        username: user.username,
                        full_name: user.full_name,
                        role: user.role,
                        email: user.email
                    }
                });
            });
        } catch (error) {
            return res.status(500).json({ error: 'Login failed' });
        }
    });
};

// Logout
exports.logout = (req, res) => {
    const sessionToken = req.headers['authorization']?.replace('Bearer ', '') || req.query.token;
    
    if (!sessionToken) {
        return res.status(400).json({ error: 'No session token provided' });
    }
    
    db.run('DELETE FROM sessions WHERE session_token = ?', [sessionToken], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ message: 'Logged out successfully' });
    });
};

// Verify session
exports.verifySession = (req, res) => {
    res.json({ 
        valid: true, 
        user: req.user 
    });
};

// Get all users (admin only)
exports.getAllUsers = (req, res) => {
    const query = `
        SELECT user_id, username, full_name, role, email, phone, is_active, created_at, last_login
        FROM users
        ORDER BY created_at DESC
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ users: rows });
    });
};

// Create new user (admin only)
exports.createUser = async (req, res) => {
    const { username, password, full_name, role, email, phone } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const query = `
            INSERT INTO users (username, password_hash, full_name, role, email, phone)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        db.run(query, [username, hashedPassword, full_name, role || 'cashier', email, phone], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(409).json({ error: 'Username already exists' });
                }
                return res.status(500).json({ error: err.message });
            }
            
            res.json({
                message: 'User created successfully',
                user_id: this.lastID
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create user' });
    }
};

// Change password
exports.changePassword = async (req, res) => {
    const { user_id } = req.user;
    const { old_password, new_password } = req.body;
    
    if (!old_password || !new_password) {
        return res.status(400).json({ error: 'Old and new password required' });
    }
    
    db.get('SELECT password_hash FROM users WHERE user_id = ?', [user_id], async (err, user) => {
        if (err || !user) {
            return res.status(500).json({ error: 'User not found' });
        }
        
        try {
            const validPassword = await bcrypt.compare(old_password, user.password_hash);
            
            if (!validPassword) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }
            
            const hashedPassword = await bcrypt.hash(new_password, 10);
            
            db.run('UPDATE users SET password_hash = ? WHERE user_id = ?', [hashedPassword, user_id], (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to update password' });
                }
                res.json({ message: 'Password changed successfully' });
            });
        } catch (error) {
            res.status(500).json({ error: 'Password change failed' });
        }
    });
};
