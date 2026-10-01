// ---- Scan QR (Attendance) ----
let html5Qr = null;
let activeTaskId = null;
let currentAttendanceEntries = [];

async function loadScan() {
    await populateTaskSelect();
    onTaskChange();
}

async function populateTaskSelect() {
    try {
        const tasks = await apiFetch(`${API}/admin/tasks`);
        const active = tasks.filter(t => t.is_active);
        const sel = document.getElementById('scanTaskSelect');
        sel.innerHTML = '<option value="">-- Choose task for attendance --</option>' + active.map(t =>
            `<option value="${t.id}">${escapeHtml(t.title)} (+${t.points_reward} pts)</option>`
        ).join('');
    } catch (e) { console.error(e); }
}

function onTaskChange() {
    const val = document.getElementById('scanTaskSelect').value;
    activeTaskId = val ? parseInt(val) : null;
    if (activeTaskId) {
        loadAttendanceLog(activeTaskId);
    } else {
        document.querySelector('#attendanceTable tbody').innerHTML = '';
        document.getElementById('attendanceCount').textContent = '';
    }
}

async function loadAttendanceLog(taskId) {
    const tbody = document.querySelector('#attendanceTable tbody');
    try {
        const data = await apiFetch(`${API}/admin/attendance/task/${taskId}`);
        currentAttendanceEntries = data.entries;
        document.getElementById('attLogTitle').textContent = `Attendance for: ${data.task.title}`;
        document.getElementById('attendanceCount').textContent = `${data.today} checked in today (${data.totalStudents} students)`;
        if (data.entries.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No one has checked in for this task today</td></tr>';
            return;
        }
        tbody.innerHTML = data.entries.map(e => `
            <tr>
                <td><strong>${escapeHtml(e.full_name)}</strong></td>
                <td>${escapeHtml(e.user_id || 'N/A')}</td>
                <td><span class="status-badge status-approved">+${e.points_awarded}</span></td>
                <td>${formatDate(e.attended_at)}</td>
                <td><button class="btn-danger" data-action="cancel-attendance" data-attendance-id="${e.id}">Cancel</button></td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5">Error: ${escapeHtml(err.message)}</td></tr>`;
    }
}

async function cancelAttendance(id) {
    if (!confirm('Cancel this scan? It will be removed from attendance and the CSV, and the points will be refunded from the student.')) return;
    try {
        await apiFetch(`${API}/admin/attendance/${id}/cancel`, { method: 'POST' });
        if (activeTaskId) loadAttendanceLog(activeTaskId);
        loadOverview();
    } catch (err) {
        alert(err.message);
    }
}

function downloadAttendanceCSV() {
    if (currentAttendanceEntries.length === 0) {
        alert('No attendance rows to export. Load a task attendance log first.');
        return;
    }
    const taskTitle = (document.getElementById('attLogTitle').textContent || 'attendance').replace(/Attendance for: /i, '').trim();
    const headers = ['task_title', 'full_name', 'user_id', 'points_awarded', 'attended_at'];
    const escapeCell = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    const lines = currentAttendanceEntries.map(e => [
        escapeCell(taskTitle),
        escapeCell(e.full_name),
        escapeCell(e.user_id),
        e.points_awarded,
        escapeCell(e.attended_at)
    ].join(','));
    const csv = headers.join(',') + '\n' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `attendance-${taskTitle.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 100);
}
function startScanner() {
    if (motorolaActive) stopMotorolaScanner();
    if (!activeTaskId) {
        alert('Please select a task first.');
        return;
    }
    if (!html5Qr) {
        html5Qr = new Html5Qrcode('qr-reader');
    }
    if (!window.isSecureContext) {
        document.getElementById('scanResult').innerHTML =
            '<span style="color:var(--red)">Camera is blocked:</span> this page is not served over HTTPS or localhost. Open the dashboard from <b>http://localhost:5000</b> on the machine with the camera, or use a secure (https) connection.';
        return;
    }
    Html5Qrcode.getCameras().then(devices => {
        let cameraId = null;
        if (devices && devices.length > 1) {
            const usb = devices.find(d => /usb|external|logitech|webcam|hd pro|c920|c922|e2e/i.test(d.label));
            cameraId = (usb || devices[devices.length - 1]).id;
        } else if (devices && devices.length === 1) {
            cameraId = devices[0].id;
        }
        startWithDevice(cameraId, 0);
    }).catch(() => {
        startWithDevice(null, 0);
    });
}

function startWithDevice(cameraId, attempt) {
    const config = cameraId
        ? { deviceId: cameraId }
        : { facingMode: 'environment' };
    html5Qr.start(
        config,
        { fps: 15, qrbox: { width: 420, height: 180 },
            formatsToSupport: [
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.CODE_39,
            ],
            aspectRatio: 1.5,
        },
        rawText => {
            handleScan(rawText);
            if (html5Qr.isScanning) {
                html5Qr.stop().then(() => { html5Qr.clear(); }).catch(() => {});
            }
        },
        () => {}
    ).then(() => {
        document.getElementById('startScanBtn').style.display = 'none';
        document.getElementById('stopScanBtn').style.display = 'inline-block';
        document.getElementById('scanResult').innerHTML = '';
    }).catch(err => {
        if (attempt === 0) {
            startWithDevice(null, 1);
            return;
        }
        document.getElementById('scanResult').innerHTML =
            '<span style="color:var(--red)">Camera error: ' + escapeHtml(err) +
            '</span><div class="scan-tip">Troubleshooting: 1) close other apps using the camera (Zoom/Teams/Meet/browser tab), 2) click the lock icon in the address bar and allow Camera, 3) open from <b>http://localhost:5000</b> (camera is blocked over plain http on a LAN IP), 4) if you have both a built-in and a USB camera, disable the one not in use.</div>';
        stopScanner();
    });
}
function stopScanner() {
    if (html5Qr && html5Qr.isScanning) {
        html5Qr.stop().then(() => { html5Qr.clear(); }).catch(() => {});
    }
    document.getElementById('startScanBtn').style.display = 'inline-block';
    document.getElementById('stopScanBtn').style.display = 'none';
}

// ---- USB Barcode Scanner (Motorola keyboard-wedge) ----
let motorolaActive = false;
let motorolaBuffer = "";
let motorolaTimer = null;
let motorolaStart = null;

function toggleMotorolaScanner() {
    if (motorolaActive) stopMotorolaScanner();
    else startMotorolaScanner();
}

function startMotorolaScanner() {
    if (!activeTaskId) {
        alert("Please select a task first.");
        return;
    }
    motorolaActive = true;
    document.getElementById("motorolaBtn").style.display = "none";
    document.getElementById("motorolaStopBtn").style.display = "inline-block";
    document.getElementById("motorolaStatus").style.display = "";
    stopScanner();
    const cap = document.getElementById("motorolaCapture");
    cap.value = "";
    cap.focus();
    document.addEventListener("keydown", handleMotorolaKey);
    showScanResult('<span style="color:var(--green)"><strong>USB scanner ready.</strong> Scan a student barcode.</span>', "", false);
}

function stopMotorolaScanner() {
    motorolaActive = false;
    motorolaBuffer = "";
    motorolaStart = null;
    if (motorolaTimer) { clearTimeout(motorolaTimer); motorolaTimer = null; }
    document.removeEventListener("keydown", handleMotorolaKey);
    document.getElementById("motorolaBtn").style.display = "inline-block";
    document.getElementById("motorolaStopBtn").style.display = "none";
    document.getElementById("motorolaStatus").style.display = "none";
    document.getElementById("motorolaCapture").value = "";
}

function handleMotorolaKey(e) {
    const now = Date.now();

    if (e.key === "Enter") {
        if (!motorolaBuffer) return;
        e.preventDefault();
        const raw = motorolaBuffer;
        motorolaBuffer = "";
        motorolaStart = null;
        if (motorolaTimer) { clearTimeout(motorolaTimer); motorolaTimer = null; }
        if (raw.trim()) handleScan(raw.trim());
        return;
    }

    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key === "Backspace") {
        motorolaBuffer = motorolaBuffer.slice(0, -1);
        return;
    }

    if (e.key && e.key.length === 1) {
        if (!motorolaStart) motorolaStart = now;
        if (now - motorolaStart > 80) {
            if (document.activeElement !== document.getElementById("motorolaCapture")) {
                motorolaStart = null;
                return;
            }
        }
        motorolaBuffer += e.key;
        motorolaStart = now;
        if (motorolaTimer) clearTimeout(motorolaTimer);
        motorolaTimer = setTimeout(() => {
            const raw = motorolaBuffer;
            motorolaBuffer = "";
            motorolaStart = null;
            if (raw.trim()) handleScan(raw.trim());
        }, 120);
    }
}

function cleanToken(text) {
    return String(text || '').trim().replace(/^RA:/i, '').replace(/^EV:/i, '').substring(0, 32);
}

async function handleScan(rawText) {
    const token = cleanToken(rawText);
    if (!token) { showScanResult('Empty QR', '', true); return; }
    const res = await checkIn(token);
    if (res === null) return;
    if (res.already_attended) {
        showScanResult(`${escapeHtml(res.student_name)} already attended today. No points.`, res.task_title || '', true);
    } else {
        showScanResult(`${escapeHtml(res.student_name)} checked in: <strong>+${res.points_awarded} pts</strong> (total ${res.total_points})`, `${escapeHtml(res.task_title)} - ${new Date().toLocaleTimeString()}`, false);
    }
    if (activeTaskId) loadAttendanceLog(activeTaskId);
    loadOverview();
}

async function checkIn(token) {
    if (!activeTaskId) { showScanResult('Select a task first', '', true); return null; }
    try {
        return await apiFetch(`${API}/admin/attendance/scan`, {
            method: 'POST',
            body: JSON.stringify({ task_id: activeTaskId, token })
        });
    } catch (err) {
        showScanResult(`${escapeHtml(err.message)}`, '', true);
        return null;
    }
}

async function manualScan() {
    const inp = document.getElementById('manualToken');
    const token = cleanToken(inp.value);
    if (!token) { alert('Enter a code first'); return; }
    await handleScan(token);
    inp.value = '';
    inp.focus();
}

function showScanResult(html, sub, isError) {
    document.getElementById('scanResult').innerHTML = `<strong>${html}</strong>${sub ? `<div class="scan-sub">${sub}</div>` : ''}`;
}

document.getElementById('scanTaskSelect').addEventListener('change', onTaskChange);

// ---- Live admin WebSocket refresh (attendance pushes) ----
let adminWs = null;

function initAdminRealtime() {
    const token = getToken();
    if (!token) return;
    const proto = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    const url = proto + window.location.host + '/ws?token=' + encodeURIComponent(token);
    adminWs = new WebSocket(url);
    adminWs.onmessage = (event) => {
        let msg = null;
        try { msg = JSON.parse(event.data); } catch (e) { return; }
        if (!msg || msg.type !== 'attendance') return;
        if (activeTaskId && msg.task_id === activeTaskId) loadAttendanceLog(activeTaskId);
        refreshActiveTabData();
        loadTopAttendees();
        updateClaimsBadge();
    };
    adminWs.onclose = (ev) => {
        if (ev.code === 4001) return;
        setTimeout(initAdminRealtime, 3000);
    };
    adminWs.onerror = () => {};
}

window.addEventListener('load', initAdminRealtime);
