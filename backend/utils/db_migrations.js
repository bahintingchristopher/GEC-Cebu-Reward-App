// Non-destructive, idempotent schema migrations.
// Runs once at startup; safe to run again any time.

const db = require('../config/database');

async function ensureIsStudentColumn() {
  // Read-only check: does the column already exist?
  const [cols] = await db.execute(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
     WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'is_student'`
  );
  if (Number(cols[0].n) === 0) {
    // Additive change only: appends a new column, existing rows stay intact.
    await db.query('ALTER TABLE users ADD COLUMN is_student TINYINT(1) NOT NULL DEFAULT 1');
  }
  // The admin account is never counted as a student.
  await db.execute("UPDATE users SET is_student = 0 WHERE role != 'student'");
}

// Adds the student email column and the unique index that enforces one account
// per address. Every pre-existing row gets email = NULL, and MySQL lets a UNIQUE
// index hold any number of NULLs, so this can never fail on a populated table.
async function ensureEmailColumn() {
  const [cols] = await db.execute(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
     WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'email'`
  );
  if (Number(cols[0].n) === 0) {
    await db.query('ALTER TABLE users ADD COLUMN email VARCHAR(191) NULL');
  }

  // Declared separately from the column so a database created from the newer
  // DDL in config/database.js (which already inlines UNIQUE) is left alone.
  const [idx] = await db.execute(
    `SELECT COUNT(*) AS n FROM information_schema.STATISTICS
     WHERE table_schema = DATABASE() AND table_name = 'users' AND index_name = 'uq_users_email'`
  );
  if (Number(idx[0].n) === 0) {
    await db.query('ALTER TABLE users ADD UNIQUE INDEX uq_users_email (email)');
  }
}

async function ensureSchemaMigrations() {
  await ensureIsStudentColumn();
  await ensureEmailColumn();
}

module.exports = { ensureSchemaMigrations };