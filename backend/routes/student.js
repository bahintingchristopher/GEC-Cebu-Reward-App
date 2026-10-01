const express = require('express');
const db = require('../config/database');
const { authenticateToken, studentOnly } = require('../middleware/auth');
const { normalizeEmail, isValidEmail } = require('../utils/validators');

const router = express.Router();
router.use(authenticateToken, studentOnly);

// Profile (includes qr_token for the student's personal QR code)
router.get('/profile', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, username, full_name, email, user_id, total_points, qr_token FROM users WHERE id = ?',
      [req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update the student's editable profile fields (full_name, email)
router.put('/profile', async (req, res) => {
  try {
    const { full_name, email } = req.body;
    const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'Account not found' });

    const newName = full_name !== undefined && String(full_name).trim() !== '' ? String(full_name).trim() : user.full_name;

    // Only rewrite the email column when a non-blank address was sent, so a
    // name-only save keeps whatever address is already stored.
    let newEmail = user.email;
    if (email !== undefined && email !== null && String(email).trim() !== '') {
      const candidate = normalizeEmail(email);
      if (!isValidEmail(candidate)) {
        return res.status(400).json({ error: 'Please enter a valid email address' });
      }
      const [taken] = await db.execute(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [candidate, user.id]
      );
      if (taken.length) {
        return res.status(409).json({ error: 'That email is already in use' });
      }
      newEmail = candidate;
    }

    await db.execute('UPDATE users SET full_name = ?, email = ? WHERE id = ?', [newName, newEmail, user.id]);

    const [updated] = await db.execute(
      'SELECT id, username, full_name, email, user_id, total_points, qr_token FROM users WHERE id = ?',
      [req.user.id]
    );
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Tasks list (with daily-attendance status for this student)
router.get('/tasks', async (req, res) => {
  try {
    const [tasks] = await db.execute('SELECT * FROM tasks WHERE is_active = 1 ORDER BY created_at DESC');
    const [attended] = await db.execute(
      'SELECT task_id, attended_date FROM attendances WHERE user_id = ?',
      [req.user.id]
    );
    const today = db.todayLocalDate();
    const countMap = {};
    const todayMap = {};
    for (const a of attended) {
      countMap[a.task_id] = (countMap[a.task_id] || 0) + 1;
      if (a.attended_date === today) todayMap[a.task_id] = true;
    }
    const result = tasks.map(t => ({
      ...t,
      attended: !!todayMap[t.id],
      attended_today: !!todayMap[t.id],
      times_attended: countMap[t.id] || 0
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Student self check-in
router.post('/events/check-in', async (req, res) => {
  try {
    const { event_code } = req.body;
    if (!event_code) {
      return res.status(400).json({ error: 'event_code is required' });
    }
    const code = String(event_code).trim().replace(/^EV:/i, '');

    const [taskRows] = await db.execute('SELECT * FROM tasks WHERE event_code = ?', [code]);
    const task = taskRows[0];
    if (!task) {
      return res.status(404).json({ error: 'No event found for this QR code' });
    }
    if (!task.is_active) {
      return res.status(400).json({ error: 'This event is not active' });
    }
    if (!task.allow_self_checkin) {
      return res.status(400).json({ error: 'Self check-in is not allowed for this event' });
    }

    if (task.start_time && task.end_time) {
      const now = db.toHHMM(new Date());
      if (now < task.start_time || now > task.end_time) {
        return res.status(400).json({
          error: `Check-in window for this event is closed (${task.start_time} - ${task.end_time})`
        });
      }
    }

    const today = db.todayLocalDate();

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [existing] = await conn.execute(
        'SELECT * FROM attendances WHERE user_id = ? AND task_id = ? AND attended_date = ?',
        [req.user.id, task.id, today]
      );
      if (existing.length) {
        await conn.rollback();
        return res.status(409).json({
          error: 'Already checked in today',
          message: `You already earned points for "${task.title}" today.`,
          already_attended: true
        });
      }

      await conn.execute(
        'INSERT INTO attendances (user_id, task_id, points_awarded, logged_by, attended_date) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, task.id, task.points_reward, req.user.id, today]
      );
      await conn.execute('UPDATE users SET total_points = total_points + ? WHERE id = ?', [task.points_reward, req.user.id]);
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    const [updated] = await db.execute('SELECT total_points FROM users WHERE id = ?', [req.user.id]);
    res.status(201).json({
      message: `Attendance logged! +${task.points_reward} points for "${task.title}"`,
      event_title: task.title,
      points_awarded: task.points_reward,
      total_points: updated[0].total_points,
      attended_at: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// My attendance history
router.get('/attendance', async (req, res) => {
  try {
    const [history] = await db.execute(
      `SELECT a.id, a.points_awarded, a.attended_at,
              t.title as task_title, t.points_reward
       FROM attendances a
       JOIN tasks t ON a.task_id = t.id
       WHERE a.user_id = ?
       ORDER BY a.attended_at DESC`,
      [req.user.id]
    );
    res.json(history);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Rewards catalog
router.get('/rewards', async (req, res) => {
  try {
    const [rewards] = await db.execute(
      'SELECT * FROM rewards WHERE is_active = 1 AND stock_quantity > 0 ORDER BY created_at DESC'
    );
    res.json(rewards);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Redeem reward
router.post('/rewards/:id/redeem', async (req, res) => {
  try {
    const rewardId = req.params.id;

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [rewardRows] = await conn.execute('SELECT * FROM rewards WHERE id = ? FOR UPDATE', [rewardId]);
      const reward = rewardRows[0];
      if (!reward) {
        await conn.rollback();
        return res.status(404).json({ error: 'Reward not found' });
      }
      if (!reward.is_active) {
        await conn.rollback();
        return res.status(400).json({ error: 'Reward is not active' });
      }
      if (reward.stock_quantity <= 0) {
        await conn.rollback();
        return res.status(400).json({ error: 'Reward out of stock' });
      }

      const [studentRows] = await conn.execute('SELECT * FROM users WHERE id = ? FOR UPDATE', [req.user.id]);
      const student = studentRows[0];
      if (student.total_points < reward.points_required) {
        await conn.rollback();
        return res.status(400).json({ error: 'Insufficient points', required: reward.points_required, available: student.total_points });
      }

      await conn.execute('UPDATE users SET total_points = total_points - ? WHERE id = ?', [reward.points_required, req.user.id]);
      await conn.execute('UPDATE rewards SET stock_quantity = stock_quantity - 1 WHERE id = ?', [rewardId]);
      await conn.execute(
        "INSERT INTO redemptions (user_id, reward_id, points_spent, status, claimed_at) VALUES (?, ?, ?, 'claimed', CURRENT_TIMESTAMP)",
        [req.user.id, rewardId, reward.points_required]
      );
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    const [updated] = await db.execute('SELECT total_points FROM users WHERE id = ?', [req.user.id]);
    res.status(201).json({ message: 'Reward instantly redeemed successfully', remaining_points: updated[0].total_points });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// History (redemptions with reward details)
router.get('/history', async (req, res) => {
  try {
    const [history] = await db.execute(
      `SELECT r.id, r.points_spent, r.status, r.redeemed_at, r.claimed_at,
              rew.title as reward_title, rew.description as reward_description
       FROM redemptions r
       JOIN rewards rew ON r.reward_id = rew.id
       WHERE r.user_id = ?
       ORDER BY r.redeemed_at DESC`,
      [req.user.id]
    );
    res.json(history);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
