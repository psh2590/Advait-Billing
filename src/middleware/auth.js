const db = require('../config/database');

// Require authentication
function requireAuth(req, res, next) {
    const sessionToken = req.headers['authorization']?.replace('Bearer ', '') || req.query.token;
    
    if (!sessionToken) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Verify session token
    const query = `
        SELECT s.*, u.username, u.role, u.full_name 
        FROM sessions s
        JOIN users u ON s.user_id = u.user_id
        WHERE s.session_token = ? AND s.expires_at > datetime('now') AND u.is_active = 1
    `;
    
    db.get(query, [sessionToken], (err, session) => {
        if (err || !session) {
            return res.status(401).json({ error: 'Invalid or expired session' });
        }
        
        req.user = {
            user_id: session.user_id,
            username: session.username,
            role: session.role,
            full_name: session.full_name
        };
        
        next();
    });
}

// Require admin role
function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

module.exports = { requireAuth, requireAdmin };
