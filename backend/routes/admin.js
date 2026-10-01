const express = require('express');
const db = require('../config/database');
const { authenticateToken, adminOnly } = require('../middleware/auth');
const fs = require('fs');
const attendanceCsv = require('../utils/attendance_csv');
const realtime = require('../utils/realtime');

const router = express.Router();
router.use(authenticateToken, adminOnly);

// Dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const month = parseInt(req.query.month, 10);
    const year = parseInt(req.query.year, 10);
    const hasFilter = !isNaN(month) && month >= 1 && month <= 12 && !isNaN(year) && year >= 2000 && year <= 2100;
    const [totalStudents] = await db.execute("SELECT COUNT(*) AS count FROM users WHERE role = 'student'");
    const [pendingApprovals] = await db.execute("SELECT COUNT(*) AS count FROM student_tasks WHERE status = 'pending'");
    const [totalPointsDistributed] = hasFilter
      ? await db.execute(
          `SELECT COALESCE(SUM(points_awarded), 0) AS total FROM attendances WHERE YEAR(attended_at) = ? AND MONTH(attended_at) = ?`,
          [year, month]
        )
      : await db.execute("SELECT COALESCE(SUM(total_points), 0) AS total FROM users WHERE role = 'student'");
    const [totalRedemptions] = hasFilter
      ? await db.execute(
          `SELECT COUNT(*) AS count FROM redemptions WHERE YEAR(redeemed_at) = ? AND MONTH(redeemed_at) = ?`,
          [year, month]
        )
      : await db.execute('SELECT COUNT(*) AS count FROM redemptions');
    const [totalToday] = await db.execute(
      'SELECT COUNT(DISTINCT user_id) AS count FROM attendances WHERE attended_date = ?',
      [db.todayLocalDate()]
    );
    const [todayRows] = await db.execute(
      `SELECT u.id, u.full_name, u.user_id, MIN(a.attended_at) AS attended_at
       FROM attendances a
       JOIN users u ON a.user_id = u.id
       WHERE a.attended_date = ?
       GROUP BY u.id
       ORDER BY MIN(a.attended_at)`,
      [db.todayLocalDate()]
    );
    res.json({
      totalStudents: totalStudents[0].count,
      pendingApprovals: pendingApprovals[0].count,
      totalPointsDistributed: totalPointsDistributed[0].total,
      totalRedemptions: totalRedemptions[0].count,
      totalToday: totalToday[0].count,
      todayStudents: todayRows
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Overview charts
router.get('/overview/charts', async (req, res) => {
  try {
    const month = parseInt(req.query.month, 10);
    const year = parseInt(req.query.year, 10);
    const hasFilter = !isNaN(month) && month >= 1 && month <= 12 && !isNaN(year) && year >= 2000 && year <= 2100;
    const [dailyRows] = hasFilter
      ? await db.execute(
          `SELECT DATE(attended_at) AS date, COUNT(DISTINCT user_id) AS count
           FROM attendances
           WHERE YEAR(attended_at) = ? AND MONTH(attended_at) = ?
           GROUP BY DATE(attended_at)
           ORDER BY date`,
          [year, month]
        )
      : await db.execute(
          `SELECT DATE(attended_at) AS date, COUNT(DISTINCT user_id) AS count
           FROM attendances
           WHERE attended_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
           GROUP BY DATE(attended_at)
           ORDER BY date`
        );
    const [weeklyRows] = hasFilter
      ? await db.execute(
          `SELECT CASE
                  WHEN t.title LIKE '%skedda%' THEN 'SKEDDA'
                  WHEN t.title LIKE '%institute%' THEN 'Institute'
                  WHEN t.title LIKE '%friday night%' THEN 'Friday Night Activity'
                  WHEN t.title LIKE '%weekly devotional%' THEN 'Weekly Devotional'
                  WHEN t.title LIKE '%workshop%' THEN 'Career Workshop'
                  ELSE 'Others'
                END AS bucket, COUNT(DISTINCT a.user_id) AS count
           FROM attendances a
           JOIN tasks t ON a.task_id = t.id
           WHERE YEAR(a.attended_at) = ? AND MONTH(a.attended_at) = ?
           GROUP BY bucket
           ORDER BY FIELD(bucket, 'Weekly Devotional', 'Friday Night Activity', 'SKEDDA', 'Career Workshop', 'Institute', 'Others')`,
          [year, month]
        )
      : await db.execute(
          `SELECT CASE
                  WHEN t.title LIKE '%skedda%' THEN 'SKEDDA'
                  WHEN t.title LIKE '%institute%' THEN 'Institute'
                  WHEN t.title LIKE '%friday night%' THEN 'Friday Night Activity'
                  WHEN t.title LIKE '%weekly devotional%' THEN 'Weekly Devotional'
                  WHEN t.title LIKE '%workshop%' THEN 'Career Workshop'
                  ELSE 'Others'
                END AS bucket, COUNT(DISTINCT a.user_id) AS count
           FROM attendances a
           JOIN tasks t ON a.task_id = t.id
           WHERE a.attended_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
           GROUP BY bucket
           ORDER BY FIELD(bucket, 'Weekly Devotional', 'Friday Night Activity', 'SKEDDA', 'Career Workshop', 'Institute', 'Others')`
        );
    const [instituteRows] = hasFilter
      ? await db.execute(
          `SELECT DATE(a.attended_at) AS dayStart,
                  COUNT(DISTINCT a.user_id) AS count
           FROM attendances a
           JOIN tasks t ON a.task_id = t.id
           WHERE t.title LIKE '%institute%'
             AND YEAR(a.attended_at) = ? AND MONTH(a.attended_at) = ?
           GROUP BY dayStart
           ORDER BY dayStart`,
          [year, month]
        )
      : await db.execute(
          `SELECT DATE(a.attended_at) AS dayStart,
                  COUNT(DISTINCT a.user_id) AS count
           FROM attendances a
           JOIN tasks t ON a.task_id = t.id
           WHERE t.title LIKE '%institute%'
             AND a.attended_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
           GROUP BY dayStart
           ORDER BY dayStart`
        );
    const [fridayNightRows] = hasFilter
      ? await db.execute(
          `SELECT DATE(a.attended_at) AS dayStart,
                  COUNT(DISTINCT a.user_id) AS count
           FROM attendances a
           JOIN tasks t ON a.task_id = t.id
           WHERE t.title LIKE '%friday night%'
             AND YEAR(a.attended_at) = ? AND MONTH(a.attended_at) = ?
           GROUP BY dayStart
           ORDER BY dayStart`,
          [year, month]
        )
      : await db.execute(
          `SELECT DATE(a.attended_at) AS dayStart,
                  COUNT(DISTINCT a.user_id) AS count
           FROM attendances a
           JOIN tasks t ON a.task_id = t.id
           WHERE t.title LIKE '%friday night%'
             AND a.attended_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
           GROUP BY dayStart
           ORDER BY dayStart`
        );
    const [devotionalRows] = hasFilter
      ? await db.execute(
          `SELECT DATE(a.attended_at) AS dayStart,
                  COUNT(DISTINCT a.user_id) AS count
           FROM attendances a
           JOIN tasks t ON a.task_id = t.id
           WHERE t.title LIKE '%weekly devotional%'
             AND YEAR(a.attended_at) = ? AND MONTH(a.attended_at) = ?
           GROUP BY dayStart
           ORDER BY dayStart`,
          [year, month]
        )
      : await db.execute(
          `SELECT DATE(a.attended_at) AS dayStart,
                  COUNT(DISTINCT a.user_id) AS count
           FROM attendances a
           JOIN tasks t ON a.task_id = t.id
           WHERE t.title LIKE '%weekly devotional%'
             AND a.attended_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
           GROUP BY dayStart
           ORDER BY dayStart`
        );
    const [skeddaRows] = hasFilter
      ? await db.execute(
          `SELECT DATE(a.attended_at) AS dayStart,
                  COUNT(DISTINCT a.user_id) AS count
           FROM attendances a
           JOIN tasks t ON a.task_id = t.id
           WHERE t.title LIKE '%skedda%'
             AND YEAR(a.attended_at) = ? AND MONTH(a.attended_at) = ?
           GROUP BY dayStart
           ORDER BY dayStart`,
          [year, month]
        )
      : await db.execute(
          `SELECT DATE(a.attended_at) AS dayStart,
                  COUNT(DISTINCT a.user_id) AS count
           FROM attendances a
           JOIN tasks t ON a.task_id = t.id
           WHERE t.title LIKE '%skedda%'
             AND a.attended_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
           GROUP BY dayStart
           ORDER BY dayStart`
        );
    res.json({
      daily: dailyRows.map(r => ({ date: r.date, count: Number(r.count) })),
      weekly: weeklyRows.map(r => ({ title: r.bucket, count: Number(r.count) })),
      institute: instituteRows.map(r => ({ dayStart: r.dayStart, count: Number(r.count) })),
      fridayNight: fridayNightRows.map(r => ({ dayStart: r.dayStart, count: Number(r.count) })),
      devotional: devotionalRows.map(r => ({ dayStart: r.dayStart, count: Number(r.count) })),
      skedda: skeddaRows.map(r => ({ dayStart: r.dayStart, count: Number(r.count) }))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// Monthly performance: new app users, monthly attendance, and active users for a given month
router.get('/overview/monthly-performance', async (req, res) => {
  try {
    const month = parseInt(req.query.month, 10);
    const year = parseInt(req.query.year, 10);
    if (isNaN(month) || month < 1 || month > 12 || isNaN(year) || year < 2000 || year > 2100) {
      return res.status(400).json({ error: 'month and year are required' });
    }

    const [newUsersRows] = await db.execute(
      "SELECT COUNT(*) AS count FROM users WHERE role = 'student' AND YEAR(created_at) = ? AND MONTH(created_at) = ?",
      [year, month]
    );
    const [monthlyRows] = await db.execute(
      'SELECT COUNT(DISTINCT user_id) AS count FROM attendances WHERE YEAR(attended_at) = ? AND MONTH(attended_at) = ?',
      [year, month]
    );

    // Active users: students with at least 2 task activities (attendances) in the month.
    const [activeRows] = await db.execute(
      `SELECT COUNT(*) AS count
       FROM (
         SELECT user_id
         FROM attendances
         WHERE YEAR(attended_at) = ? AND MONTH(attended_at) = ?
         GROUP BY user_id
         HAVING COUNT(*) >= 2
       ) t`,
      [year, month]
    );

    res.json({
      newUsers: Number(newUsersRows[0].count),
      monthlyAttendance: Number(monthlyRows[0].count),
      activeUsers: Number(activeRows[0].count)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Top attendees
router.get('/top-attendees', async (req, res) => {
  try {
    const month = parseInt(req.query.month, 10);
    const year = parseInt(req.query.year, 10);
    const hasFilter = !isNaN(month) && month >= 1 && month <= 12 && !isNaN(year) && year >= 2000 && year <= 2100;
    const [rows] = hasFilter
      ? await db.execute(
          `SELECT u.id, u.full_name, u.username,
                  COUNT(DISTINCT DATE(a.attended_at)) AS days,
                  COALESCE(SUM(a.points_awarded), 0) AS points
           FROM users u
           JOIN attendances a ON a.user_id = u.id
           WHERE YEAR(a.attended_at) = ? AND MONTH(a.attended_at) = ?
           GROUP BY u.id, u.full_name, u.username
           ORDER BY days DESC, points DESC, u.full_name ASC
           LIMIT 20`,
          [year, month]
        )
      : await db.execute(
          `SELECT u.id, u.full_name, u.username,
                  COUNT(DISTINCT DATE(a.attended_at)) AS days,
                  COALESCE(SUM(a.points_awarded), 0) AS points
           FROM users u
           JOIN attendances a ON a.user_id = u.id
           GROUP BY u.id, u.full_name, u.username
           ORDER BY days DESC, points DESC, u.full_name ASC
           LIMIT 20`
        );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// Student names per chart bar (hover tooltip)
const CHART_KW = {
  institute: '%institute%',
  fridayNight: '%friday night%',
  devotional: '%weekly devotional%',
  skedda: '%skedda%'
};
router.get('/chart-names', async (req, res) => {
  try {
    const kw = req.query.kw === 'all' ? 'ALL' : CHART_KW[req.query.kw];
    const date = req.query.date;
    if (!kw) return res.status(400).json({ error: 'Invalid kw' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return res.status(400).json({ error: 'Invalid date' });
    const [rows] = await db.execute(
      kw === 'ALL'
        ? `SELECT DISTINCT u.full_name
           FROM attendances a
           JOIN users u ON a.user_id = u.id
           WHERE DATE(a.attended_at) = ?
           ORDER BY u.full_name ASC`
        : `SELECT DISTINCT u.full_name
           FROM attendances a
           JOIN users u ON a.user_id = u.id
           JOIN tasks t ON a.task_id = t.id
           WHERE t.title LIKE ?
             AND DATE(a.attended_at) = ?
           ORDER BY u.full_name ASC`,
      kw === 'ALL' ? [date] : [kw, date]
)
    res.json({ date, names: rows.map(r => r.full_name), count: rows.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// Tasks CRUD
router.get('/tasks', async (req, res) => {
  try {
    const [tasks] = await db.execute('SELECT * FROM tasks ORDER BY created_at DESC');
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/tasks', async (req, res) => {
  try {
    const { title, description, points_reward, category, start_time, end_time, allow_self_checkin } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (points_reward !== undefined && points_reward !== null && Number(points_reward) < 0) {
      return res.status(400).json({ error: 'points_reward cannot be negative' });
    }
    const event_code = await db.generateUnique('tasks', 'event_code', db.generateToken);
    const [result] = await db.execute(
      `INSERT INTO tasks (title, description, points_reward, category, start_time, end_time, allow_self_checkin, event_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        description || '',
        points_reward || 0,
        category || 'QR',
        start_time || null,
        end_time || null,
        allow_self_checkin !== undefined ? (allow_self_checkin ? 1 : 0) : 1,
        event_code
      ]
    );
    const [rows] = await db.execute('SELECT * FROM tasks WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/tasks/:id', async (req, res) => {
  try {
    const { title, description, points_reward, is_active, category, start_time, end_time, allow_self_checkin } = req.body;
    const [existingRows] = await db.execute('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    const existing = existingRows[0];
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }
    if (points_reward !== undefined && Number(points_reward) < 0) {
      return res.status(400).json({ error: 'points_reward cannot be negative' });
    }
    await db.execute(
      `UPDATE tasks SET title = ?, description = ?, points_reward = ?, is_active = ?, category = ?,
       start_time = ?, end_time = ?, allow_self_checkin = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [
        title || existing.title,
        description !== undefined ? description : existing.description,
        points_reward !== undefined ? points_reward : existing.points_reward,
        is_active !== undefined ? is_active : existing.is_active,
        category !== undefined ? (category || 'QR') : (existing.category || 'QR'),
        start_time !== undefined ? start_time : existing.start_time,
        end_time !== undefined ? end_time : existing.end_time,
        allow_self_checkin !== undefined ? (allow_self_checkin ? 1 : 0) : existing.allow_self_checkin,
        req.params.id
      ]
    );
    const [rows] = await db.execute('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/tasks/:id', async (req, res) => {
  try {
    const [existingRows] = await db.execute('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!existingRows.length) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute('DELETE FROM student_tasks WHERE task_id = ?', [req.params.id]);
      await conn.execute('DELETE FROM attendances WHERE task_id = ?', [req.params.id]);
      await conn.execute('DELETE FROM tasks WHERE id = ?', [req.params.id]);
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Rewards CRUD
router.get('/rewards', async (req, res) => {
  try {
    const [rewards] = await db.execute('SELECT * FROM rewards ORDER BY created_at DESC');
    res.json(rewards);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/rewards', async (req, res) => {
  try {
    const { title, description, points_required, stock_quantity } = req.body;
    if (!title || !points_required) {
      return res.status(400).json({ error: 'Title and points_required are required' });
    }
    if (Number(points_required) < 0) {
      return res.status(400).json({ error: 'points_required cannot be negative' });
    }
    if (stock_quantity !== undefined && Number(stock_quantity) < 0) {
      return res.status(400).json({ error: 'stock_quantity cannot be negative' });
    }
    const [result] = await db.execute(
      'INSERT INTO rewards (title, description, points_required, stock_quantity) VALUES (?, ?, ?, ?)',
      [title, description || '', points_required, stock_quantity || 0]
    );
    const [rows] = await db.execute('SELECT * FROM rewards WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/rewards/:id', async (req, res) => {
  try {
    const { title, description, points_required, stock_quantity, is_active } = req.body;
    const [existingRows] = await db.execute('SELECT * FROM rewards WHERE id = ?', [req.params.id]);
    const existing = existingRows[0];
    if (!existing) {
      return res.status(404).json({ error: 'Reward not found' });
    }
    if (points_required !== undefined && Number(points_required) < 0) {
      return res.status(400).json({ error: 'points_required cannot be negative' });
    }
    if (stock_quantity !== undefined && Number(stock_quantity) < 0) {
      return res.status(400).json({ error: 'stock_quantity cannot be negative' });
    }
    await db.execute(
      'UPDATE rewards SET title = ?, description = ?, points_required = ?, stock_quantity = ?, is_active = ? WHERE id = ?',
      [
        title || existing.title,
        description !== undefined ? description : existing.description,
        points_required !== undefined ? points_required : existing.points_required,
        stock_quantity !== undefined ? stock_quantity : existing.stock_quantity,
        is_active !== undefined ? is_active : existing.is_active,
        req.params.id
      ]
    );
    const [rows] = await db.execute('SELECT * FROM rewards WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/rewards/:id', async (req, res) => {
  try {
    const [existingRows] = await db.execute('SELECT * FROM rewards WHERE id = ?', [req.params.id]);
    if (!existingRows.length) {
      return res.status(404).json({ error: 'Reward not found' });
    }
    const [hasRedemptions] = await db.execute(
      'SELECT COUNT(*) AS count FROM redemptions WHERE reward_id = ?', [req.params.id]
    );
    if (hasRedemptions[0].count > 0) {
      return res.status(400).json({
        error: 'Cannot delete reward with existing redemptions. Deactivate it instead.'
      });
    }
    await db.execute('DELETE FROM rewards WHERE id = ?', [req.params.id]);
    res.json({ message: 'Reward deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Attendance scan
router.post('/attendance/scan', async (req, res) => {
  try {
    const { task_id, token } = req.body;

    if (!task_id || !token) {
      return res.status(400).json({ error: 'task_id and token are required' });
    }

    const cleanToken = String(token).trim().replace(/^RA:/i, '');

    const [taskRows] = await db.execute('SELECT * FROM tasks WHERE id = ?', [task_id]);
    const task = taskRows[0];
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    if (!task.is_active) {
      return res.status(400).json({ error: 'Task is not active' });
    }

    const [studentRows] = await db.execute("SELECT * FROM users WHERE qr_token = ? AND role = 'student'", [cleanToken]);
    const student = studentRows[0];
    if (!student) {
      return res.status(404).json({ error: 'No student found for this QR code' });
    }

    const today = db.todayLocalDate();

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [existing] = await conn.execute(
        'SELECT * FROM attendances WHERE user_id = ? AND task_id = ? AND attended_date = ?',
        [student.id, task_id, today]
      );
      if (existing.length) {
        await conn.rollback();
        return res.status(409).json({
          error: 'Already checked in today',
          message: `${student.full_name} already attended "${task.title}" today. No points awarded.`,
          student_name: student.full_name,
          already_attended: true
        });
      }

      await conn.execute(
        'INSERT INTO attendances (user_id, task_id, points_awarded, logged_by, attended_date, attended_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [student.id, task_id, task.points_reward, req.user.id, today]
      );
      await conn.execute('UPDATE users SET total_points = total_points + ? WHERE id = ?', [task.points_reward, student.id]);
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    // Keep the live CSV for this event up to date (written BEFORE responding, so 0s delay)
    try {
      await attendanceCsv.writeTaskCsv(task_id);
      const [updated] = await db.execute('SELECT total_points FROM users WHERE id = ?', [student.id]);
      realtime.notifyPoints(student.id, updated[0].total_points);
      realtime.notifyAdmins({ type: 'attendance', task_id, action: 'checked_in' });
    } catch (e) {
      // Attendance is already committed - never fail the scan over CSV/notifications.
      console.error('[scan] post-commit step failed:', e.message);
    }
    const [nowRows] = await db.execute("SELECT NOW() AS t");
    const [updatedPoints] = await db.execute('SELECT total_points FROM users WHERE id = ?', [student.id]);
    return res.status(201).json({
      message: `Attendance logged! +${task.points_reward} points for ${student.full_name}`,
      student_name: student.full_name,
      user_id: student.user_id,
      task_title: task.title,
      points_awarded: task.points_reward,
      total_points: updatedPoints[0].total_points,
      attended_at: nowRows[0].t
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Attendance log for a specific task
router.get('/attendance/task/:taskId', async (req, res) => {
  try {
    const [taskRows] = await db.execute('SELECT * FROM tasks WHERE id = ?', [req.params.taskId]);
    const task = taskRows[0];
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const [entries] = await db.execute(
      `SELECT a.id, a.points_awarded, a.attended_at,
              u.full_name, u.user_id, u.total_points, u.qr_token
       FROM attendances a
       JOIN users u ON a.user_id = u.id
       WHERE a.task_id = ? AND a.attended_date = ?
       ORDER BY a.attended_at DESC`,
      [req.params.taskId, db.todayLocalDate()]
    );

    const [totalStudents] = await db.execute("SELECT COUNT(*) AS count FROM users WHERE role = 'student'");
    const [today] = await db.execute(
      "SELECT COUNT(*) AS count FROM attendances WHERE task_id = ? AND DATE(attended_at) = CURDATE()",
      [req.params.taskId]
    );

    res.json({ task, entries, totalStudents: totalStudents[0].count, today: today[0].count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// Cancel/undo today's attendance scan (fixes a mistaken scan)
router.post('/attendance/:id/cancel', async (req, res) => {
  try {
    const attendanceId = Number(req.params.id);
    if (!Number.isInteger(attendanceId) || attendanceId <= 0) {
      return res.status(400).json({ error: 'Invalid attendance id' });
    }
    const [rows] = await db.execute(
      'SELECT id, user_id, task_id, points_awarded, attended_date FROM attendances WHERE id = ?',
      [attendanceId]
    );
    const att = rows[0];
    if (!att) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
    if (att.attended_date !== db.todayLocalDate()) {
      return res.status(400).json({ error: 'Only today\'s scans can be cancelled' });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute('DELETE FROM attendances WHERE id = ?', [attendanceId]);
      await conn.execute('UPDATE users SET total_points = total_points - ? WHERE id = ?', [att.points_awarded, att.user_id]);
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    await attendanceCsv.writeTaskCsv(att.task_id);

    const [updated] = await db.execute('SELECT total_points FROM users WHERE id = ?', [att.user_id]);
    realtime.notifyPoints(att.user_id, updated[0].total_points);
    realtime.notifyAdmins({ type: 'attendance', task_id: att.task_id, action: 'cancelled' });

    res.json({
      success: true,
      message: 'Attendance cancelled and points refunded',
      user_id: att.user_id,
      total_points: updated[0].total_points
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// All recent attendance across tasks
router.get('/attendance/log', async (req, res) => {
  try {
    const [entries] = await db.execute(
      `SELECT a.id, a.points_awarded, a.attended_at,
              u.full_name, u.user_id,
              t.title AS task_title
       FROM attendances a
       JOIN users u ON a.user_id = u.id
       JOIN tasks t ON a.task_id = t.id
       ORDER BY a.attended_at DESC
       LIMIT 200`
    );
    res.json(entries);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Task approvals (legacy manual flow)
router.get('/pending-approvals', async (req, res) => {
  try {
    const [pending] = await db.execute(
      `SELECT st.*, u.full_name, u.user_id, t.title AS task_title, t.points_reward
       FROM student_tasks st
       JOIN users u ON st.user_id = u.id
       JOIN tasks t ON st.task_id = t.id
       WHERE st.status = 'pending'
       ORDER BY st.completed_at DESC`
    );
    res.json(pending);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/approve/:studentTaskId', async (req, res) => {
  try {
    const [stRows] = await db.execute('SELECT * FROM student_tasks WHERE id = ?', [req.params.studentTaskId]);
    const studentTask = stRows[0];
    if (!studentTask) {
      return res.status(404).json({ error: 'Student task not found' });
    }
    if (studentTask.status !== 'pending') {
      return res.status(400).json({ error: 'Task is not pending' });
    }

    const [taskRows] = await db.execute('SELECT * FROM tasks WHERE id = ?', [studentTask.task_id]);
    const task = taskRows[0];

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(
        "UPDATE student_tasks SET status = 'approved', verified_at = CURRENT_TIMESTAMP, verified_by = ? WHERE id = ?",
        [req.user.id, req.params.studentTaskId]
      );
      await conn.execute('UPDATE users SET total_points = total_points + ? WHERE id = ?', [task.points_reward, studentTask.user_id]);
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    const [studentRows] = await db.execute('SELECT * FROM users WHERE id = ?', [studentTask.user_id]);
    const student = studentRows[0];
    realtime.notifyPoints(student.id, student.total_points);
    res.json({ message: 'Task approved', total_points: student.total_points });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/reject/:studentTaskId', async (req, res) => {
  try {
    const [stRows] = await db.execute('SELECT * FROM student_tasks WHERE id = ?', [req.params.studentTaskId]);
    const studentTask = stRows[0];
    if (!studentTask) {
      return res.status(404).json({ error: 'Student task not found' });
    }
    await db.execute(
      "UPDATE student_tasks SET status = 'rejected', verified_at = CURRENT_TIMESTAMP, verified_by = ? WHERE id = ?",
      [req.user.id, req.params.studentTaskId]
    );
    res.json({ message: 'Task rejected' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Redemptions management
router.get('/redemptions', async (req, res) => {
  try {
    const [redemptions] = await db.execute(
      `SELECT r.id, r.points_spent, r.status, r.redeemed_at, r.claimed_at,
              u.full_name, u.user_id,
              rew.title AS reward_title
       FROM redemptions r
       JOIN users u ON r.user_id = u.id
       JOIN rewards rew ON r.reward_id = rew.id
       ORDER BY r.redeemed_at DESC`
    );
    res.json(redemptions);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/redemptions/:id/claim', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM redemptions WHERE id = ?', [req.params.id]);
    if (!rows.length) {
      return res.status(404).json({ error: 'Redemption not found' });
    }
    await db.execute("UPDATE redemptions SET status = 'claimed', claimed_at = CURRENT_TIMESTAMP WHERE id = ?", [req.params.id]);
    res.json({ message: 'Redemption marked as claimed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/redemptions/:id/cancel', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM redemptions WHERE id = ?', [req.params.id]);
    const redemption = rows[0];
    if (!redemption) {
      return res.status(404).json({ error: 'Redemption not found' });
    }
    if (redemption.status === 'cancelled') {
      return res.status(400).json({ error: 'Redemption is already cancelled' });
    }
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute("UPDATE redemptions SET status = 'cancelled' WHERE id = ?", [req.params.id]);
      await conn.execute('UPDATE users SET total_points = total_points + ? WHERE id = ?', [redemption.points_spent, redemption.user_id]);
      await conn.execute('UPDATE rewards SET stock_quantity = stock_quantity + 1 WHERE id = ?', [redemption.reward_id]);
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
    const [refundRows] = await db.execute('SELECT total_points FROM users WHERE id = ?', [redemption.user_id]);
    realtime.notifyPoints(redemption.user_id, refundRows[0].total_points);
    res.json({ message: 'Redemption cancelled, points and stock refunded' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Count of current auto-claims
router.get('/claims/count', async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT COUNT(*) AS n FROM redemptions WHERE status = 'claimed'");
    res.json({ count: rows[0].n });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Students list
router.get('/students', async (req, res) => {
  try {
    const [students] = await db.execute(
      "SELECT id, username, full_name, email, user_id, total_points, qr_token, created_at, is_student FROM users WHERE role = 'student' ORDER BY total_points DESC"
    );
    res.json(students);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// Student detail: profile + attendance history (opened from the Students tab)
router.get('/students/:id', async (req, res) => {
  try {
    const studentId = Number(req.params.id);
    if (!Number.isInteger(studentId) || studentId <= 0) {
      return res.status(400).json({ error: 'Invalid student id' });
    }
    const [students] = await db.execute(
      "SELECT id, username, full_name, email, user_id, total_points, qr_token, created_at, is_student FROM users WHERE id = ? AND role = 'student'",
      [studentId]
    );
    if (!students.length) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const [history] = await db.execute(
      'SELECT a.id, a.attended_date, a.attended_at, a.points_awarded, t.title ' +
      'FROM attendances a JOIN tasks t ON a.task_id = t.id ' +
      'WHERE a.user_id = ? ORDER BY a.attended_at DESC',
      [studentId]
    );
    res.json({ student: students[0], history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
router.patch('/users/:id/student-status', async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    const raw = req.body && req.body.is_student;
    if (raw !== 0 && raw !== 1 && raw !== '0' && raw !== '1') {
      return res.status(400).json({ error: 'is_student must be 0 or 1' });
    }
    const isStudent = Number(raw);
    const [rows] = await db.execute("SELECT id FROM users WHERE id = ? AND role = 'student'", [userId]);
    if (!rows.length) {
      return res.status(404).json({ error: 'Student not found' });
    }
    await db.execute('UPDATE users SET is_student = ? WHERE id = ?', [isStudent, userId]);
    const [updated] = await db.execute(
      'SELECT id, username, full_name, user_id, total_points, is_student FROM users WHERE id = ?',
      [userId]
    );
    res.json({ success: true, user: updated[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Attendance CSV files
router.get('/attendance/csvfiles', async (req, res) => {
  try {
    res.json(await attendanceCsv.listEvents());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/attendance/csvdates/:taskId', async (req, res) => {
  try {
    res.json(await attendanceCsv.listDates(parseInt(req.params.taskId, 10)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/attendance/csv/:taskId/:date', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    const date = req.params.date.replace(/[^a-zA-Z0-9_-]/g, '');
    const [rows] = await db.execute('SELECT * FROM tasks WHERE id = ?', [taskId]);
    const task = rows[0];
    if (!task) return res.status(404).json({ error: 'Task not found' });
    await attendanceCsv.writeTaskCsv(taskId);
    const file = attendanceCsv.csvPathFor(task, date);
    if (!fs.existsSync(file)) return res.status(404).json({ error: 'No attendance file for that date' });
    const safeTitle = attendanceCsv.safeFileName(task.title);
    const name = `${safeTitle}-${date}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    res.sendFile(file);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
