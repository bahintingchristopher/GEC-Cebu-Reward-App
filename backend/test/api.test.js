/*
 * Reward App - Backend API integration tests
 * ------------------------------------------
 * Tests the public HTTP API of the Express + MySQL backend using only Node's
 * built-in test runner (`node:test`) and global `fetch`. No external test
 * framework or extra dependency is required.
 *
 * PREREQUISITES
 *   - The Reward App backend (server.js) and its MySQL database must be
 *     running and reachable (see README Quick Start).
 *
 * USAGE (from the repo root)
 *   node --test backend/test/api.test.js
 *
 * CONFIGURATION (environment variables, all optional)
 *   BASE_URL        http://localhost:5000   server root
 *   ADMIN_USERNAME  admin                   admin login username
 *   ADMIN_PASSWORD  <password>              admin password (enables admin tests)
 *   ADMIN_TOKEN     a valid admin JWT       alternative to ADMIN_PASSWORD
 *
 * NOTE
 *   - Student tests create throwaway accounts via the public /register
 *     endpoint, so they run against whatever DB the server uses.
 *   - Admin-dependent tests are auto-skipped when no admin credentials/token
 *     are available.
 */
'use strict';

const { test, before } = require('node:test');
const assert = require('node:assert');

// ---- Configuration (overridable via environment variables) ----
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

// ---- Small helper to run HTTP requests ----
async function api(method, path, { body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* non-JSON body */ }
  return { status: res.status, data };
}

// ---- Shared test state ----
let studentToken = null;
let adminToken = null;
let adminAvailable = false;
const uniq = `t${Date.now()}`;
const studentUsername = `test_${uniq}`;
const studentPassword = `pass${Date.now()}`;
const ADMIN_SKIP = 'Admin tests skipped: set ADMIN_TOKEN or admin password to enable.';

// Skip a test body when admin credentials are unavailable.
async function requireAdmin(t) {
  if (!adminAvailable) {
    t.skip(ADMIN_SKIP);
    return false;
  }
  return true;
}

// Register a fresh throwaway student + resolve an admin token up front.
before(async () => {
  const reg = await api('POST', '/api/auth/register', {
    body: { username: studentUsername, password: studentPassword, full_name: 'Test Student' }
  });
  if (reg.status !== 201) {
    throw new Error(`Setup: could not register student (${reg.status}): ` + JSON.stringify(reg.data));
  }
  studentToken = reg.data.token;

  const supplied = process.env.ADMIN_TOKEN;
  if (supplied) {
    adminToken = supplied;
    adminAvailable = true;
  } else {
    const login = await api('POST', '/api/auth/login', {
      body: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD }
    });
    if (login.status === 200 && login.data && login.data.token) {
      adminToken = login.data.token;
      adminAvailable = true;
    }
  }
  console.log(`\n  Base URL: ${BASE_URL}`);
  console.log(`  Test student: ${studentUsername}`);
  console.log(`  Admin tests: ${adminAvailable ? 'ON' : 'SKIPPED'}\n`);
});

// ====================================================================
// HEALTH
// ====================================================================
test('GET /api/health returns ok', async () => {
  const r = await api('GET', '/api/health');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.data.status, 'ok');
});

// ====================================================================
// AUTH
// ====================================================================
test('register creates a student account with a QR token', async () => {
  const un = `reg_${uniq}`;
  const r = await api('POST', '/api/auth/register', {
    body: { username: un, password: 'secret123', full_name: 'Registered User' }
  });
  assert.strictEqual(r.status, 201);
  assert.ok(r.data.token);
  assert.strictEqual(r.data.user.role, 'student');
  assert.strictEqual(r.data.user.total_points, 0);
  assert.ok(r.data.user.qr_token, 'qr_token should be generated');
});

test('register rejects a duplicate username (409)', async () => {
  const r = await api('POST', '/api/auth/register', {
    body: { username: studentUsername, password: 'whatever1', full_name: 'Dup' }
  });
  assert.strictEqual(r.status, 409);
  assert.ok(r.data.error);
});

test('register requires username, password and full name (400)', async () => {
  const r = await api('POST', '/api/auth/register', { body: { username: 'x' } });
  assert.strictEqual(r.status, 400);
});

test('login succeeds for the test student', async () => {
  const r = await api('POST', '/api/auth/login', {
    body: { username: studentUsername, password: studentPassword }
  });
  assert.strictEqual(r.status, 200);
  assert.ok(r.data.token);
  assert.strictEqual(r.data.user.username, studentUsername);
  assert.strictEqual(r.data.user.role, 'student');
});

test('login rejects a wrong password (401)', async () => {
  const r = await api('POST', '/api/auth/login', {
    body: { username: studentUsername, password: 'wrong-password' }
  });
  assert.strictEqual(r.status, 401);
});

test('login rejects an unknown user (401)', async () => {
  const r = await api('POST', '/api/auth/login', {
    body: { username: 'no_such_user_xyz', password: 'whatever1' }
  });
  assert.strictEqual(r.status, 401);
});

test('login requires username and password (400)', async () => {
  const r = await api('POST', '/api/auth/login', { body: {} });
  assert.strictEqual(r.status, 400);
});

test('forgot-password guards identity with a mismatched user id', async () => {
  const r = await api('POST', '/api/auth/forgot-password', {
    body: { username: studentUsername, user_id: 'WRONG-ID' }
  });
  // 401 (mismatch) or 404 (no account) both prove identity is guarded.
  assert.ok(r.status === 401 || r.status === 404, `unexpected status ${r.status}`);
});

test('forgot-password requires username and user_id (400)', async () => {
  const r = await api('POST', '/api/auth/forgot-password', { body: { username: studentUsername } });
  assert.strictEqual(r.status, 400);
});

test('reset-password requires a token (400)', async () => {
  const r = await api('POST', '/api/auth/reset-password', { body: { new_password: 'abcdef1' } });
  assert.strictEqual(r.status, 400);
});

test('reset-password rejects a short password (400)', async () => {
  const r = await api('POST', '/api/auth/reset-password', { body: { reset_token: 'x', new_password: 'abc' } });
  assert.strictEqual(r.status, 400);
});

// ====================================================================
// PROTECTED ROUTES (auth guard + role guard)
// ====================================================================
test('student endpoint returns 401 without a token', async () => {
  const r = await api('GET', '/api/student/profile');
  assert.strictEqual(r.status, 401);
});

test('admin endpoint returns 401 without a token', async () => {
  const r = await api('GET', '/api/admin/stats');
  assert.strictEqual(r.status, 401);
});

test('a student token cannot access admin endpoints (403)', async () => {
  const r = await api('GET', '/api/admin/stats', { token: studentToken });
  assert.strictEqual(r.status, 403);
});

test('an invalid token is rejected (403)', async () => {
  const r = await api('GET', '/api/student/profile', { token: 'not-a-real-jwt' });
  assert.strictEqual(r.status, 403);
});

// ====================================================================
// STUDENT ENDPOINTS
// ====================================================================
test('profile returns the student plus a QR token', async () => {
  const r = await api('GET', '/api/student/profile', { token: studentToken });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.data.username, studentUsername);
  assert.ok(r.data.qr_token);
  assert.strictEqual(typeof r.data.total_points, 'number');
});

test('update profile changes full_name', async () => {
  const r = await api('PUT', '/api/student/profile', {
    token: studentToken,
    body: { full_name: 'Updated Test Name' }
  });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.data.full_name, 'Updated Test Name');
});

test('tasks endpoint returns an array of active tasks', async () => {
  const r = await api('GET', '/api/student/tasks', { token: studentToken });
  assert.strictEqual(r.status, 200);
  assert.ok(Array.isArray(r.data));
  for (const t of r.data) assert.ok(t.title !== undefined, 'task should have a title');
});

test('attendance endpoint returns an array', async () => {
  const r = await api('GET', '/api/student/attendance', { token: studentToken });
  assert.strictEqual(r.status, 200);
  assert.ok(Array.isArray(r.data));
});

test('student rewards catalog returns an array', async () => {
  const r = await api('GET', '/api/student/rewards', { token: studentToken });
  assert.strictEqual(r.status, 200);
  assert.ok(Array.isArray(r.data));
});

test('redemption history returns an array', async () => {
  const r = await api('GET', '/api/student/history', { token: studentToken });
  assert.strictEqual(r.status, 200);
  assert.ok(Array.isArray(r.data));
});

// ====================================================================
// ADMIN ENDPOINTS (auto-skipped when no admin credentials are provided)
// ====================================================================

test('admin: GET /api/admin/stats returns dashboard numbers', async (t) => {
  if (!(await requireAdmin(t))) return;
  const r = await api('GET', '/api/admin/stats', { token: adminToken });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(typeof r.data.totalStudents, 'number');
  assert.strictEqual(typeof r.data.totalPointsDistributed, 'number');
  assert.strictEqual(typeof r.data.totalRedemptions, 'number');
  assert.strictEqual(typeof r.data.totalToday, 'number');
});

test('admin: GET /api/admin/tasks lists tasks', async (t) => {
  if (!(await requireAdmin(t))) return;
  const r = await api('GET', '/api/admin/tasks', { token: adminToken });
  assert.strictEqual(r.status, 200);
  assert.ok(Array.isArray(r.data));
});

test('admin: full tasks CRUD (create, list, update, delete)', async (t) => {
  if (!(await requireAdmin(t))) return;
  const created = await api('POST', '/api/admin/tasks', {
    token: adminToken,
    body: { title: `Test Task ${uniq}`, description: 'created by tests', points_reward: 10 }
  });
  assert.strictEqual(created.status, 201);
  assert.ok(created.data.id);
  const taskId = created.data.id;

  const listed = await api('GET', '/api/admin/tasks', { token: adminToken });
  assert.ok(listed.data.some(t => t.id === taskId), 'created task should appear in the list');

  const updated = await api('PUT', `/api/admin/tasks/${taskId}`, {
    token: adminToken,
    body: { points_reward: 25 }
  });
  assert.strictEqual(updated.status, 200);
  assert.strictEqual(updated.data.points_reward, 25);

  const del = await api('DELETE', `/api/admin/tasks/${taskId}`, { token: adminToken });
  assert.strictEqual(del.status, 200);
  assert.strictEqual(del.data.message, 'Task deleted');
});

test('admin: task create/update requires a valid task (400/404)', async (t) => {
  if (!(await requireAdmin(t))) return;
  const noTitle = await api('POST', '/api/admin/tasks', { token: adminToken, body: { points_reward: 1 } });
  assert.strictEqual(noTitle.status, 400);
  const missing = await api('PUT', '/api/admin/tasks/99999999', { token: adminToken, body: { points_reward: 1 } });
  assert.strictEqual(missing.status, 404);
  const delMissing = await api('DELETE', '/api/admin/tasks/99999999', { token: adminToken });
  assert.strictEqual(delMissing.status, 404);
});

test('admin: GET /api/admin/rewards lists rewards', async (t) => {
  if (!(await requireAdmin(t))) return;
  const r = await api('GET', '/api/admin/rewards', { token: adminToken });
  assert.strictEqual(r.status, 200);
  assert.ok(Array.isArray(r.data));
});

test('admin: full rewards CRUD (create, update, delete)', async (t) => {
  if (!(await requireAdmin(t))) return;
  const created = await api('POST', '/api/admin/rewards', {
    token: adminToken,
    body: { title: `Test Reward ${uniq}`, points_required: 50, stock_quantity: 3 }
  });
  assert.strictEqual(created.status, 201);
  assert.ok(created.data.id);
  const rewardId = created.data.id;

  const updated = await api('PUT', `/api/admin/rewards/${rewardId}`, {
    token: adminToken,
    body: { points_required: 60 }
  });
  assert.strictEqual(updated.status, 200);
  assert.strictEqual(updated.data.points_required, 60);

  const del = await api('DELETE', `/api/admin/rewards/${rewardId}`, { token: adminToken });
  assert.strictEqual(del.status, 200);
  assert.strictEqual(del.data.message, 'Reward deleted');
});

test('admin: reward create validates required fields (400)', async (t) => {
  if (!(await requireAdmin(t))) return;
  const r = await api('POST', '/api/admin/rewards', { token: adminToken, body: { title: 'Only title' } });
  assert.strictEqual(r.status, 400);
});

test('admin: GET /api/admin/students includes the test student', async (t) => {
  if (!(await requireAdmin(t))) return;
  const r = await api('GET', '/api/admin/students', { token: adminToken });
  assert.strictEqual(r.status, 200);
  assert.ok(Array.isArray(r.data));
  assert.ok(r.data.some(s => s.username === studentUsername), 'test student should be listed');
});

test('admin: GET /api/admin/redemptions lists redemptions', async (t) => {
  if (!(await requireAdmin(t))) return;
  const r = await api('GET', '/api/admin/redemptions', { token: adminToken });
  assert.strictEqual(r.status, 200);
  assert.ok(Array.isArray(r.data));
});

test('admin: GET /api/admin/attendance/log returns recent entries', async (t) => {
  if (!(await requireAdmin(t))) return;
  const r = await api('GET', '/api/admin/attendance/log', { token: adminToken });
  assert.strictEqual(r.status, 200);
  assert.ok(Array.isArray(r.data));
});

test('role guard: an admin token cannot access student endpoints (403)', async (t) => {
  if (!(await requireAdmin(t))) return;
  const r = await api('GET', '/api/student/profile', { token: adminToken });
  assert.strictEqual(r.status, 403);
});

// ====================================================================
// END-TO-END: admin scan -> student redeems -> admin cancels (refund)
// Requires admin credentials. Creates and cleans up its own data.
// ====================================================================
test('E2E: scan awards points, student redeems, cancel refunds + restocks', async (t) => {
  if (!(await requireAdmin(t))) return;

  // Reward worth 5 points, stock 5; task worth 10 points.
  const reward = await api('POST', '/api/admin/rewards', {
    token: adminToken,
    body: { title: `E2E Reward ${uniq}`, points_required: 5, stock_quantity: 5 }
  });
  assert.strictEqual(reward.status, 201);
  const rewardId = reward.data.id;

  const task = await api('POST', '/api/admin/tasks', {
    token: adminToken,
    body: { title: `E2E Task ${uniq}`, points_reward: 10, allow_self_checkin: 0 }
  });
  assert.strictEqual(task.status, 201);
  const taskId = task.data.id;

  try {
    const students = await api('GET', '/api/admin/students', { token: adminToken });
    assert.strictEqual(students.status, 200);
    const student = students.data.find(s => s.username === studentUsername);
    assert.ok(student, 'test student should be present');

    // Admin scans the student QR -> attendance logged, +10 points.
    const scan = await api('POST', '/api/admin/attendance/scan', {
      token: adminToken,
      body: { task_id: taskId, token: student.qr_token }
    });
    assert.strictEqual(scan.status, 201);
    assert.strictEqual(scan.data.points_awarded, 10);
    assert.strictEqual(scan.data.total_points, 10);

    // Scanning the same task again the same day must be rejected.
    const dupScan = await api('POST', '/api/admin/attendance/scan', {
      token: adminToken,
      body: { task_id: taskId, token: student.qr_token }
    });
    assert.strictEqual(dupScan.status, 409);

    // Student redeems the 5-point reward -> 5 points remain.
    const redeem = await api('POST', `/api/student/rewards/${rewardId}/redeem`, { token: studentToken });
    assert.strictEqual(redeem.status, 201);
    assert.strictEqual(redeem.data.remaining_points, 5);

    // Stock drops from 5 to 4.
    const afterRedeem = (await api('GET', '/api/admin/rewards', { token: adminToken })).data;
    const updatedReward = afterRedeem.find(x => x.id === rewardId);
    assert.strictEqual(updatedReward.stock_quantity, 4);

    // Redemption is auto-claimed and visible to the admin.
    const redemptions = (await api('GET', '/api/admin/redemptions', { token: adminToken })).data;
    const redemption = redemptions.find(x => x.reward_title === `E2E Reward ${uniq}` && x.user_id === student.user_id);
    assert.ok(redemption, 'redemption should appear in the admin list');
    assert.strictEqual(redemption.points_spent, 5);
    assert.strictEqual(redemption.status, 'claimed');

    // Cancel -> points refunded to 10 and stock restocked to 5.
    const cancel = await api('POST', `/api/admin/redemptions/${redemption.id}/cancel`, { token: adminToken });
    assert.strictEqual(cancel.status, 200);

    const afterCancelReward = (await api('GET', '/api/admin/rewards', { token: adminToken })).data.find(x => x.id === rewardId);
    assert.strictEqual(afterCancelReward.stock_quantity, 5);
    const profile = await api('GET', '/api/student/profile', { token: studentToken });
    assert.strictEqual(profile.data.total_points, 10);
  } finally {
    // Clean up created task & reward (already gone -> 404 is fine).
    const d1 = await api('DELETE', `/api/admin/tasks/${taskId}`, { token: adminToken });
    const d2 = await api('DELETE', `/api/admin/rewards/${rewardId}`, { token: adminToken });
    assert.ok([200, 404].includes(d1.status), `task cleanup got ${d1.status}`);
    assert.ok([200, 404].includes(d2.status), `reward cleanup got ${d2.status}`);
  }
});

