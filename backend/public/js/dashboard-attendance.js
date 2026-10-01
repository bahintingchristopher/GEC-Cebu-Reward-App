// ---- Attendance CSV Folder (events -> event folders -> daily files) ----
let attendanceEventsCache = new Map();
let attendanceFilesCache = new Map();

async function loadAttendance() {
    document.getElementById('attendanceDailyView').style.display = 'none';
    document.getElementById('attendanceEventsView').style.display = '';
    const tbody = document.querySelector('#attendanceFilesTable tbody');
    try {
        const events = await apiFetch(`${API}/admin/attendance/csvfiles`);
        attendanceEventsCache = new Map(events.map(f => [f.task_id, f]));
        if (events.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No events yet. Create a task to start recording attendance.</td></tr>';
            return;
        }
        tbody.innerHTML = events.map(f => {
            const status = f.is_active
                ? '<span class="status-badge status-active">Active</span>'
                : '<span class="status-badge status-inactive">Inactive</span>';
            const updated = f.has_csv
                ? formatDate(f.modified)
                : '<span style="color:#888">not generated yet</span>';
            return `
                <tr>
                    <td><strong>${escapeHtml(f.title)}</strong></td>
                    <td>${status}</td>
                    <td>${f.total_records} record${f.total_records === 1 ? '' : 's'}</td>
                    <td>${f.total_days} day${f.total_days === 1 ? '' : 's'}</td>
                    <td>${updated}</td>
                    <td class="actions">
                        <button class="btn-edit" data-action="open-attendance-event" data-task-id="${f.task_id}">Open</button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (e) { tbody.innerHTML = `<tr><td colspan="6">Error: ${escapeHtml(e.message)}</td></tr>`; }
}

async function openAttendanceEvent(taskId, title) {
    console.log('[Attendance] Open button clicked for:', title, '(taskId:', taskId, ')');
    document.getElementById('attendanceEventTitle').textContent = title;
    document.getElementById('attendanceEventsView').style.display = 'none';
    document.getElementById('attendanceDailyView').style.display = '';
    const tbody = document.querySelector('#attendanceDatesTable tbody');
    try {
        const files = await apiFetch(`${API}/admin/attendance/csvdates/${taskId}`);
        attendanceFilesCache = new Map(files.map(f => [`${f.task_id}:${f.date}`, f]));
        if (files.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No attendance recorded for this event yet.</td></tr>';
            return;
        }
        tbody.innerHTML = files.map(f => {
            const dateLabel = new Date(f.date + 'T00:00:00').toLocaleDateString();
            const updated = f.has_csv
                ? formatDate(f.modified)
                : '<span style="color:#888">not generated yet</span>';
            return `
                <tr>
                    <td><strong>${escapeHtml(f.date)}</strong> <span class="muted-small">(${dateLabel})</span></td>
                    <td>${f.row_count} record${f.row_count === 1 ? '' : 's'}</td>
                    <td>${updated}</td>
                    <td class="actions">
                        <button class="btn-success" data-action="download-attendance-csv" data-task-id="${f.task_id}" data-date="${f.date}">Download</button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (e) { tbody.innerHTML = `<tr><td colspan="4">Error: ${escapeHtml(e.message)}</td></tr>`; }
}

function backToEvents() {
    loadAttendance();
}

async function downloadAttendanceCsvFile(taskId, date, title) {
    try {
        const res = await fetch(`${API}/admin/attendance/csv/${taskId}/${date}`, { headers: getHeaders() });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || `Download failed (${res.status})`);
        }
        const csv = await res.text();
        const safeTitle = String(title || 'event').replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        const filename = `${safeTitle}-${date}.csv`;
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 100);
    } catch (err) {
        alert('CSV download failed: ' + err.message);
    }
}
