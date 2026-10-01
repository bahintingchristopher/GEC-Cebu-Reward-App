// Reward App: SQLite -> MySQL migration script
// Usage:
//   node scripts/migrate_sqlite_to_mysql.js [path/to/source.db]
// Reads every row from a SQLite file and inserts it into the MySQL database
// configured via DB_* env vars (or defaults). Preserves primary keys so that
// foreign-key relationships remain intact.
//
// Handles the username UNIQUE (case-insensitive) collision in MySQL: if the
// source SQLite contains case-variant usernames (e.g. 'labidabs' and
// 'Labidabs'), the second+ occurrence is renamed with a numeric suffix so no
// student's data is lost. Renames are reported.
//
// Requires better-sqlite3 (devDependency) and mysql2 (dependency).

const path = require('path');
const Database = require('better-sqlite3');
const mysql = require('mysql2/promise');

const env = Object.assign({}, require('dotenv').config().parsed || {});

const SQLITE_PATH = process.argv[2] || path.join(__dirname, '..', 'reward_app.db');
const MYSQL_CONF = {
  host: env.DB_HOST || '127.0.0.1',
  port: Number(env.DB_PORT || 3306),
  user: env.DB_USER || 'reward',
  password: env.DB_PASSWORD || '',
  database: env.DB_NAME || 'reward_app',
  multipleStatements: true
};

const TABLES = ['users', 'tasks', 'student_tasks', 'rewards', 'redemptions', 'attendances'];

const COLUMNS = {
  users: ['id', 'username', 'password_hash', 'full_name', 'role', 'user_id', 'total_points', 'qr_token', 'created_at'],
  tasks: ['id', 'title', 'description', 'points_reward', 'is_active', 'created_at', 'updated_at', 'event_code', 'category', 'start_time', 'end_time', 'allow_self_checkin'],
  student_tasks: ['id', 'user_id', 'task_id', 'status', 'completed_at', 'verified_at', 'verified_by'],
  rewards: ['id', 'title', 'description', 'points_required', 'stock_quantity', 'is_active', 'created_at'],
  redemptions: ['id', 'user_id', 'reward_id', 'points_spent', 'status', 'redeemed_at', 'claimed_at'],
  attendances: ['id', 'user_id', 'task_id', 'points_awarded', 'attended_at', 'logged_by', 'attended_date']
};

// Pre-process users so MySQL-wide duplicate usernames (case-insensitive) get a
// numeric suffix, mirroring what better-sqlite3 allows but MySQL's collation does not.
function deDupeUsernames(rows) {
  const used = new Set();
  const renamed = [];
  for (const row of rows) {
    let uname = String(row.username);
    let lower = uname.toLowerCase();
    let n = 2;
    while (used.has(lower)) {
      const suffix = uname + n;
      if (!used.has(suffix.toLowerCase())) {
        renamed.push(`${row.username} -> ${suffix}`);
        uname = suffix;
        lower = suffix.toLowerCase();
      } else {
        n += 1;
      }
    }
    used.add(lower);
    row.username = uname;
  }
  return renamed;
}

async function main() {
  if (!require('fs').existsSync(SQLITE_PATH)) {
    console.error(`SQLite file not found: ${SQLITE_PATH}`);
    process.exit(1);
  }
  console.log(`Reading SQLite: ${SQLITE_PATH}`);

  const s = new Database(SQLITE_PATH);
  const m = await mysql.createConnection(MYSQL_CONF);

  await m.query('SET FOREIGN_KEY_CHECKS = 0');

  for (const table of TABLES) {
    const t = s.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table);
    if (!t) {
      console.log(`- ${table}: SKIP (not present in sqlite)`);
      continue;
    }
    const rows = s.prepare(`SELECT * FROM ${table}`).all();
    if (rows.length === 0) {
      console.log(`- ${table}: 0 rows (skipped)`);
      continue;
    }

    let renamed = [];
    if (table === 'users') renamed = deDupeUsernames(rows);

    await m.query(`DELETE FROM ${table}`);

    const cols = COLUMNS[table];
    const ph = cols.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${ph})`;

    let inserted = 0;
    for (const row of rows) {
      const vals = cols.map(c => (row[c] === undefined ? null : row[c]));
      try {
        await m.query(sql, vals);
        inserted++;
      } catch (e) {
        console.error(`  ERROR inserting into ${table} (id=${row.id}): ${e.message}`);
      }
    }
    if (renamed.length) {
      console.log(`  username renames (case-duplicate):`);
      renamed.forEach(r => console.log(`    ${r}`));
    }
    console.log(`- ${table}: ${inserted}/${rows.length} rows imported`);
  }

  await m.query('SET FOREIGN_KEY_CHECKS = 1');
  await m.end();
  s.close();
  console.log('\nDone. Verify the data in MySQL Workbench at 127.0.0.1:3306 / DB ' + MYSQL_CONF.database);
}

main().catch(e => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
