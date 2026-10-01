const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { generateQrToken, generateNextUserId } = db;
const { JWT_SECRET } = require('../middleware/auth');
const { normalizeEmail, isValidEmail } = require('../utils/validators');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
      JWT_SECRET
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email || null,
        role: user.role,
        user_id: user.user_id,
        total_points: user.total_points,
        qr_token: user.qr_token
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { username, password, full_name, user_id, email } = req.body;

    if (!username || !password || !full_name) {
      return res.status(400).json({ error: 'Username, password, and full name are required' });
    }
    if (email === undefined || email === null || String(email).trim() === '') {
      return res.status(400).json({ error: 'Email address is required' });
    }
    const emailAddress = normalizeEmail(email);
    if (!isValidEmail(emailAddress)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const [existing] = await db.execute('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const [emailTaken] = await db.execute('SELECT id FROM users WHERE email = ?', [emailAddress]);
    if (emailTaken.length) {
      return res.status(409).json({ error: 'That email is already in use' });
    }

    if (user_id) {
      const [sidExisting] = await db.execute('SELECT id FROM users WHERE user_id = ?', [user_id]);
      if (sidExisting.length) {
        return res.status(409).json({ error: 'User ID already exists' });
      }
    }

    let qrToken = generateQrToken();
    while ((await db.execute('SELECT id FROM users WHERE qr_token = ?', [qrToken]))[0].length) {
      qrToken = generateQrToken();
    }
    const finalUserId = user_id ? String(user_id).trim() : await generateNextUserId();
    const hash = bcrypt.hashSync(password, 10);
    const [result] = await db.execute(
      'INSERT INTO users (username, password_hash, full_name, email, role, user_id, qr_token) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, hash, full_name, emailAddress, 'student', finalUserId, qrToken]
    );

    const token = jwt.sign(
      { id: result.insertId, username, role: 'student', full_name },
      JWT_SECRET
    );

    res.status(201).json({
      token,
      user: {
        id: result.insertId,
        username,
        full_name,
        email: emailAddress,
        role: 'student',
        user_id: finalUserId,
        total_points: 0,
        qr_token: qrToken
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Account recovery - Step 1: verify identity
router.post('/forgot-password', async (req, res) => {
  try {
    const { username, user_id } = req.body;

    if (!username || !user_id) {
      return res.status(400).json({ error: 'Username and User ID are required' });
    }

    const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
    const user = rows[0];
    if (!user) {
      return res.status(404).json({ error: 'No account found with that username' });
    }
    if (user.role !== 'student') {
      return res.status(403).json({ error: 'Account recovery is only available for student accounts' });
    }

    const givenId = String(user_id).trim().toUpperCase();
    const storedId = (user.user_id || '').trim().toUpperCase();
    if (!storedId || storedId !== givenId) {
      return res.status(401).json({ error: 'The User ID does not match this account. Please contact the administrator if you cannot remember it.' });
    }

    const resetToken = jwt.sign(
      { id: user.id, purpose: 'password-reset' },
      JWT_SECRET,
      { expiresIn: '10m' }
    );

    res.json({
      message: 'Identity verified. You can now set a new password.',
      reset_token: resetToken
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Account recovery - Step 2: set new password
router.post('/reset-password', async (req, res) => {
  try {
    const { reset_token, new_password } = req.body;

    if (!reset_token || !new_password) {
      return res.status(400).json({ error: 'reset_token and new_password are required' });
    }
    if (String(new_password).length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    let payload;
    try {
      payload = jwt.verify(reset_token, JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ error: 'Recovery token is invalid or has expired. Please start over.' });
    }
    if (!payload.id || payload.purpose !== 'password-reset') {
      return res.status(400).json({ error: 'Invalid recovery token' });
    }

    const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [payload.id]);
    if (!rows.length) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const hash = bcrypt.hashSync(new_password, 10);
    await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, payload.id]);

    res.json({ message: 'Password updated successfully. You can now log in with your new password.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;