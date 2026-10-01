const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'reward',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'reward_app',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  multipleStatements: true,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

const nativeGetConnection = pool.getConnection.bind(pool);

// ---- Connection health: auto-recover from stale MySQL connections ----
pool.on('connection', (connection) => {
  connection.on('error', (err) => {
    console.error('[DB] Connection error:', err.code || err.message);
  });
});

pool.on('error', (err) => {
  console.error('[DB] Pool error:', err.code || err.message);
});

async function validatedGetConnection() {
  return nativeGetConnection();
}

let keepAliveInterval = null;

function startKeepAlive() {
  if (keepAliveInterval) return;
  keepAliveInterval = setInterval(async () => {
    try {
      await pool.query('SELECT 1');
    } catch (err) {
      console.error('[DB] Keep-alive ping failed:', err.code || err.message);
    }
  }, 5 * 60 * 1000);
}

function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}


// Query directly against the pool instead of holding onto a single connection
async function getConn() {
  return pool;
}

// ---- Schema (idempotent, runs at startup) ----
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(191) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(191) NOT NULL,
  email         VARCHAR(191) UNIQUE,
  role          VARCHAR(20) NOT NULL DEFAULT 'student',
  user_id       VARCHAR(191) UNIQUE,
  total_points  INT DEFAULT 0,
  qr_token      VARCHAR(191) UNIQUE,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tasks (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  title              VARCHAR(191) NOT NULL,
  description        TEXT,
  points_reward      INT NOT NULL DEFAULT 0,
  is_active          TINYINT(1) DEFAULT 1,
  created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  event_code         VARCHAR(191),
  category           VARCHAR(50) DEFAULT 'QR',
  start_time         VARCHAR(10),
  end_time           VARCHAR(10),
  allow_self_checkin TINYINT(1) DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS student_tasks (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  task_id      INT NOT NULL,
  status       VARCHAR(20) DEFAULT 'pending',
  completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  verified_at  DATETIME,
  verified_by  INT,
  UNIQUE KEY uq_student_task (user_id, task_id),
  CONSTRAINT fk_st_task_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_st_task_task FOREIGN KEY (task_id) REFERENCES tasks(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS rewards (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  title           VARCHAR(191) NOT NULL,
  description     TEXT,
  points_required INT NOT NULL,
  stock_quantity  INT DEFAULT 0,
  is_active       TINYINT(1) DEFAULT 1,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS redemptions (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  reward_id    INT NOT NULL,
  points_spent INT NOT NULL,
  status       VARCHAR(20) DEFAULT 'pending',
  redeemed_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  claimed_at   DATETIME,
  CONSTRAINT fk_red_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_red_reward FOREIGN KEY (reward_id) REFERENCES rewards(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attendances (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  user_id        INT NOT NULL,
  task_id        INT NOT NULL,
  points_awarded INT NOT NULL DEFAULT 0,
  attended_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  logged_by      INT,
  attended_date  VARCHAR(10) NOT NULL,
  UNIQUE KEY uq_att_student_task_day (user_id, task_id, attended_date),
  CONSTRAINT fk_att_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_att_task FOREIGN KEY (task_id) REFERENCES tasks(id)
) ENGINE=InnoDB;
`;

// ---- Background functions ----
function generateToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = '';
  for (let i = 0; i < 8; i++) token += chars[Math.floor(Math.random() * chars.length)];
  return token;
}

async function generateUnique(table, column, gen) {
  let token = gen();
  while (true) {
    const [rows] = await pool.execute(`SELECT id FROM ${table} WHERE ${column} = ?`, [token]);
    if (rows.length === 0) return token;
    token = gen();
  }
}

async function generateNextUserId() {
  let maxId = 0;
  const [rows] = await pool.execute('SELECT user_id FROM users WHERE user_id IS NOT NULL');
  for (const row of rows) {
    const n = parseInt(String(row.user_id), 10);
    if (Number.isInteger(n) && n > maxId) maxId = n;
  }
  let candidate = maxId + 1;
  while (true) {
    const [existing] = await pool.execute('SELECT id FROM users WHERE user_id = ?', [String(candidate)]);
    if (existing.length === 0) return String(candidate);
    candidate += 1;
  }
}

function todayLocalDate() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function toHHMM(d) {
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

// ---- Backfill one-off values (qr_token, event_code) ----
async function backfill() {
  let [rows] = await pool.execute('SELECT id FROM users WHERE qr_token IS NULL');
  for (const u of rows) {
    const t = await generateUnique('users', 'qr_token', generateToken);
    await pool.execute('UPDATE users SET qr_token = ? WHERE id = ?', [t, u.id]);
  }
  [rows] = await pool.execute("SELECT id FROM tasks WHERE event_code IS NULL OR event_code = ''");
  for (const t of rows) {
    const code = await generateUnique('tasks', 'event_code', generateToken);
    await pool.execute('UPDATE tasks SET event_code = ? WHERE id = ?', [code, t.id]);
  }
}

async function init() {
  await pool.query(SCHEMA);
  await backfill();
  startKeepAlive();
  return pool;
}

// Exports
module.exports = pool;
module.exports.getConnection = validatedGetConnection;
module.exports.query = pool.query.bind(pool);
module.exports.execute = pool.execute.bind(pool);
module.exports.getConn = getConn;
module.exports.init = init;
module.exports.generateToken = generateToken;
module.exports.generateQrToken = generateToken;
module.exports.generateUnique = generateUnique;
module.exports.generateNextUserId = generateNextUserId;
module.exports.todayLocalDate = todayLocalDate;
module.exports.toHHMM = toHHMM;
module.exports.stopKeepAlive = stopKeepAlive;
