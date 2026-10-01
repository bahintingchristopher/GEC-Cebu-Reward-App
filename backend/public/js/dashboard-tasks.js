// ---- Tasks ----
async function loadTasks() {
    const tbody = document.querySelector('#tasksTable tbody');
    try {
        const tasks = await apiFetch(`${API}/admin/tasks`);
        taskCache = new Map(tasks.map(t => [t.id, t]));
        if (tasks.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No tasks found</td></tr>';
            return;
        }
        tbody.innerHTML = tasks.map(t => `
            <tr>
                <td><strong>${escapeHtml(t.title)}</strong></td>
                <td>${escapeHtml(t.description || '')}</td>
                <td>${t.points_reward} pts</td>
                <td>${t.start_time && t.end_time ? escapeHtml(t.start_time) + ' - ' + escapeHtml(t.end_time) : '<span style="color:#888">any time</span>'}</td>
                <td><span class="status-badge ${t.is_active ? 'status-active' : 'status-inactive'}">${t.is_active ? 'Active' : 'Inactive'}</span></td>
                <td><button class="btn-edit" data-action="show-event-qr" data-task-id="${t.id}">Show QR</button></td>
                <td class="actions">
                    <button class="btn-edit" data-action="edit-task" data-task-id="${t.id}">Edit</button>
                    <button class="btn-danger" data-action="delete-task" data-task-id="${t.id}">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (e) { tbody.innerHTML = `<tr><td colspan="7">Error: ${escapeHtml(e.message)}</td></tr>`; }
}

function openTaskModal(task = null) {
    document.getElementById('taskModalTitle').textContent = task ? 'Edit Task' : 'Add Task';
    document.getElementById('taskId').value = task ? task.id : '';
    document.getElementById('taskTitle').value = task ? task.title : '';
    document.getElementById('taskDescription').value = task ? (task.description || '') : '';
    document.getElementById('taskPoints').value = task ? task.points_reward : '';
    document.getElementById('taskCategory').value = task ? (task.category || 'QR') : 'QR';
    document.getElementById('taskStartTime').value = task ? (task.start_time || '') : '';
    document.getElementById('taskEndTime').value = task ? (task.end_time || '') : '';
    document.getElementById('taskSelfCheckin').value = task ? (task.allow_self_checkin) : '1';
    document.getElementById('taskActive').value = task ? task.is_active : '1';
    document.getElementById('taskModal').classList.add('show');
}

function closeTaskModal() { document.getElementById('taskModal').classList.remove('show'); }

document.getElementById('taskForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('taskId').value;
    const payload = {
        title: document.getElementById('taskTitle').value.trim(),
        description: document.getElementById('taskDescription').value.trim(),
        points_reward: parseInt(document.getElementById('taskPoints').value),
        category: document.getElementById('taskCategory').value.trim() || 'QR',
        start_time: document.getElementById('taskStartTime').value || null,
        end_time: document.getElementById('taskEndTime').value || null,
        allow_self_checkin: parseInt(document.getElementById('taskSelfCheckin').value),
        is_active: parseInt(document.getElementById('taskActive').value)
    };
    try {
        if (id) {
            await apiFetch(`${API}/admin/tasks/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        } else {
            await apiFetch(`${API}/admin/tasks`, { method: 'POST', body: JSON.stringify(payload) });
        }
        closeTaskModal();
        loadTasks();
        loadOverview();
    } catch (err) { alert(err.message); }
});

async function deleteTask(id) {
    if (!confirm('Delete this task?')) return;
    try {
        await apiFetch(`${API}/admin/tasks/${id}`, { method: 'DELETE' });
        loadTasks();
    } catch (err) { alert(err.message); }
}
// ---- Event QR (student self check-in code) ----
function showEventQr(task) {
    document.getElementById('eventQrTitle').textContent = `Event QR: ${task.title}`;
    const code = task.event_code || '';
    const hint = document.getElementById('eventQrHint');
    hint.textContent = code
        ? `Code: ${code}  |  Points: +${task.points_reward}${task.start_time && task.end_time ? '  |  Window: ' + task.start_time + ' - ' + task.end_time : ''}  |  Display on screen at the venue. Students scan it in the app to check in (once per day).`
        : 'This task has no event code yet. Save it first, then reopen this QR.';
    renderEventQr(code ? `EV:${code}` : '');
    document.getElementById('eventQrModal').classList.add('show');
}

function renderEventQr(text) {
    const container = document.getElementById('eventQrCanvas');
    container.innerHTML = '';
    if (!text) return;
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const count = qr.getModuleCount();
    const size = 200;
    const scale = size / (count + 8);
    const quiet = 4;
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', size + 40);
    svg.setAttribute('height', size + 40);
    svg.setAttribute('viewBox', `0 0 ${size + 40} ${size + 40}`);
    const rect = document.createElementNS(svgNS, 'rect');
    rect.setAttribute('x', 0); rect.setAttribute('y', 0);
    rect.setAttribute('width', size + 40); rect.setAttribute('height', size + 40);
    rect.setAttribute('fill', '#ffffff');
    svg.appendChild(rect);
    for (let row = 0; row < count; row++) {
        for (let col = 0; col < count; col++) {
            if (qr.isDark(row, col)) {
                const r = document.createElementNS(svgNS, 'rect');
                r.setAttribute('x', (quiet + col) * scale);
                r.setAttribute('y', (quiet + row) * scale);
                r.setAttribute('width', Math.ceil(scale));
                r.setAttribute('height', Math.ceil(scale));
                r.setAttribute('fill', '#000000');
                svg.appendChild(r);
            }
        }
    }
    container.appendChild(svg);
    const codeText = document.createElement('div');
    codeText.style.fontSize = '12px';
    codeText.style.color = '#888';
    codeText.style.marginTop = '8px';
    codeText.textContent = text;
    container.appendChild(codeText);
}

function closeEventQrModal() { document.getElementById('eventQrModal').classList.remove('show'); }

function printEventQr() {
    const html = document.getElementById('eventQrCanvas').innerHTML;
    const title = document.getElementById('eventQrTitle').textContent;
    const w = window.open('', '', 'width=800,height=600');
    w.document.write(`<html><head><title>${escapeHtml(title)}</title></head>`);
    w.document.write('<body style="text-align:center;font-family:sans-serif;"><h2>' + title + '</h2>');
    w.document.write(html);
    w.document.write('</body></html>');
    w.document.close();
    w.focus();
    w.print();
}
