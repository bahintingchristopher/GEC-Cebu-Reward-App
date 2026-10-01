const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

// Map of student DB id -> Set of open WebSocket connections for that student.
const clients = new Map();
// Map of DB id -> Set of open WebSocket connections for that admin.
const adminClients = new Map();

// Attach a WebSocket server to the existing HTTP server on the /ws path.
// Students connect with ?token=<jwt>. Only valid student tokens are accepted.
function initRealtime(server) {
  const wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    let decoded = null;
    try {
      const url = new URL(req.url, 'http://localhost');
      decoded = jwt.verify((url.searchParams.get('token') || ''), JWT_SECRET);
    } catch (e) {
      decoded = null;
    }
    if (!decoded) {
      ws.close(4001, 'Unauthorized');
      return;
    }
    // Re-check the account against the DB asynchronously so a stale token can't
    // open a student socket after a role change or account removal.
    const db = require('../config/database');
    db.execute('SELECT id, role FROM users WHERE id = ?', [decoded.id])
      .then(([rows]) => {
        const user = rows[0];
        if (!user) {
          ws.close(4001, 'Unauthorized');
          return;
        }
        const bucket = user.role === 'admin' ? adminClients : (user.role === 'student' ? clients : null);
        if (!bucket) {
          ws.close(4001, 'Unauthorized');
          return;
        }
        const uid = user.id;
        if (!bucket.has(uid)) bucket.set(uid, new Set());
        bucket.get(uid).add(ws);

        ws.on('close', () => {
          const set = bucket.get(uid);
          if (set) {
            set.delete(ws);
            if (set.size === 0) bucket.delete(uid);
          }
        });
        ws.on('error', () => {});
      })
      .catch(() => {
        ws.close(4001, 'Unauthorized');
      });
  });

  return wss;
}

// Push a points-updated event to a student's open connections.
function notifyPoints(studentId, totalPoints) {
  notify(studentId, { type: 'points', total: totalPoints });
}

// Push an arbitrary JSON event to a student's open connections.
function notify(studentId, data) {
  const set = clients.get(studentId);
  if (!set || set.size === 0) return;
  const msg = JSON.stringify(data);
  for (const ws of set) {
    if (ws.readyState !== WebSocket.OPEN) continue;
    try { ws.send(msg); } catch (e) {}
  }
}

// Broadcast an event to every connected admin dashboard.
function notifyAdmins(data) {
  const msg = JSON.stringify(data);
  for (const set of adminClients.values()) {
    for (const ws of set) {
      if (ws.readyState !== WebSocket.OPEN) continue;
      try { ws.send(msg); } catch (e) {}
    }
  }
}
module.exports = { initRealtime, notifyPoints, notify, notifyAdmins };
