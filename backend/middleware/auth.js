const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET;

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  try {
    const [rows] = await db.execute(
      'SELECT id, username, role FROM users WHERE id = ?',
      [decoded.id]
    );
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Account no longer exists' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function studentOnly(req, res, next) {
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Student access required' });
  }
  next();
}

module.exports = { authenticateToken, adminOnly, studentOnly, JWT_SECRET };
