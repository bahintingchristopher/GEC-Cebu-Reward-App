const fs = require('fs');
const path = require('path');
const db = require('../config/database');

const CSV_DIR = path.join(__dirname, '..', 'attendance_csv');
if (!fs.existsSync(CSV_DIR)) fs.mkdirSync(CSV_DIR, { recursive: true });

function escapeCsv(v) {
  const s = String(v == null ? '' : v);
  return '"' + s.replace(/"/g, '""') + '"';
}

function slugify(str) {
  return String(str || 'event')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'event';
}

function folderFor(task) {
  return path.join(CSV_DIR, `${task.id}_${slugify(task.title)}`);
}

function safeFileName(title) {
  return String(title || 'event')
    .replace(/[\\/:*?"<>|\r\n\t]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'event';
}

function csvPathFor(task, date) {
  return path.join(folderFor(task), `${safeFileName(task.title)}-${date}.csv`);
}

async function getRows(taskId, date) {
  const args = [taskId];
  let dateFilter = '';
  if (date) {
    dateFilter = 'AND a.attended_date = ?';
    args.push(date);
  }
  const [rows] = await db.execute(
    `SELECT a.attended_at, a.points_awarded, a.attended_date,
            u.full_name, u.user_id, u.username, u.is_student
     FROM attendances a
     JOIN users u ON a.user_id = u.id
     WHERE a.task_id = ?
     ${dateFilter}
     ORDER BY a.attended_at ASC`,
    args
  );
  return rows;
}

async function distinctDates(taskId) {
  const [rows] = await db.execute(
    'SELECT DISTINCT attended_date AS d FROM attendances WHERE task_id = ? ORDER BY d ASC',
    [taskId]
  );
  return rows.map(r => r.d);
}

async function writeTaskCsv(taskId) {
  const [taskRows] = await db.execute('SELECT * FROM tasks WHERE id = ?', [taskId]);
  const task = taskRows[0];
  if (!task) return null;
  const dates = await distinctDates(taskId);
  const headers = ['attended_date', 'full_name', 'user_id', 'username', 'points_awarded', 'event_title', 'Student? (Y/N)'];
  const written = [];
  for (const date of dates) {
    const rows = await getRows(taskId, date);
    const line = rows.map(r => [
      escapeCsv(r.attended_date),
      escapeCsv(r.full_name),
      escapeCsv(r.user_id),
      escapeCsv(r.username),
      escapeCsv(r.points_awarded),
      escapeCsv(task.title),
      escapeCsv(r.is_student ? 'Yes' : 'No')
    ].join(','));
    const csv = headers.join(',') + '\n' + line.join('\n') + '\n';
    const folder = folderFor(task);
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
    const file = csvPathFor(task, date);
    fs.writeFileSync(file, csv, 'utf8');
    written.push(file);
  }
  pruneStaleFiles(task, dates);
  return written;
}

function pruneStaleFiles(task, dates) {
  const folder = folderFor(task);
  if (!fs.existsSync(folder)) return;
  for (const f of fs.readdirSync(folder)) {
    if (f.endsWith('.csv') && !dates.some(d => f === `${safeFileName(task.title)}-${d}.csv`)) {
      try { fs.unlinkSync(path.join(folder, f)); } catch (e) {}
    }
  }
}

async function refreshTaskCsvIfExists(taskId) {
  const [taskRows] = await db.execute('SELECT id, title FROM tasks WHERE id = ?', [taskId]);
  const task = taskRows[0];
  if (!task) return;
  if (fs.existsSync(folderFor(task))) {
    await writeTaskCsv(taskId);
  }
}

async function listEvents() {
  const [tasks] = await db.execute('SELECT id, title, is_active FROM tasks ORDER BY created_at DESC');
  const result = [];
  for (const t of tasks) {
    const folder = folderFor(t);
    const [cnt] = await db.execute('SELECT COUNT(*) AS n FROM attendances WHERE task_id = ?', [t.id]);
    const dates = await distinctDates(t.id);
    let modified = null;
    if (fs.existsSync(folder)) {
      const entries = dates.map(d => csvPathFor(t, d)).filter(f => fs.existsSync(f));
      if (entries.length) {
        modified = new Date(Math.max(...entries.map(f => fs.statSync(f).mtime.getTime())));
      }
    }
    result.push({
      task_id: t.id,
      title: t.title,
      is_active: t.is_active,
      total_records: cnt[0].n,
      total_days: dates.length,
      folder_name: path.basename(folder),
      has_csv: dates.length > 0 && fs.existsSync(folder),
      modified: modified ? modified.toISOString() : null
    });
  }
  return result;
}

async function listDates(taskId) {
  const [taskRows] = await db.execute('SELECT id, title, is_active FROM tasks WHERE id = ?', [taskId]);
  const task = taskRows[0];
  if (!task) return [];
  const dates = await distinctDates(taskId);
  const result = [];
  for (const date of dates) {
    const file = csvPathFor(task, date);
    const [cnt] = await db.execute(
      'SELECT COUNT(*) AS n FROM attendances WHERE task_id = ? AND attended_date = ?',
      [taskId, date]
    );
    let modified = null;
    if (fs.existsSync(file)) modified = fs.statSync(file).mtime;
    result.push({
      task_id: task.id,
      title: task.title,
      is_active: task.is_active,
      date,
      row_count: cnt[0].n,
      file_name: path.basename(file),
      has_csv: fs.existsSync(file),
      modified: modified ? modified.toISOString() : null
    });
  }
  return result;
}

module.exports = { writeTaskCsv, refreshTaskCsvIfExists, listEvents, listDates, csvPathFor, safeFileName, CSV_DIR, folderFor, getRows };
