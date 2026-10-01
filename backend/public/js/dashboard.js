function getToken() { return localStorage.getItem('token'); }
function getHeaders() { return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }; }

function checkAuth() {
    const token = getToken();
    if (!token) return window.location.href = '/adminlogin.html';
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role !== 'admin') return window.location.href = '/adminlogin.html';
    document.getElementById('adminName').textContent = user.full_name || 'Admin';
}

function logout() {
    console.log('[Auth] Logout button clicked');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.clear();
    console.log('[Auth] localStorage cleared, redirecting to login');
    window.location.href = '/adminlogin.html';
}

document.getElementById('logoutBtn').addEventListener('click', logout);

async function apiFetch(url, options = {}) {
    options.headers = getHeaders();
    const res = await fetch(url, options);
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); }
    catch { throw new Error('Server error (' + res.status + '): ' + text.slice(0, 120)); }
    if (!res.ok) throw new Error(data.message || data.error || 'Request failed');
    return data;
}

// ---- Helpers ----
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleString();
}

// ---- Row action delegation ----
// Row buttons only carry numeric data-* ids - record objects are looked up
// from these caches at click time, so no JSON/strings are ever embedded into
// inline onclick attributes (avoids attribute-injection / stored XSS).
let taskCache = new Map();
let rewardCache = new Map();

document.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-action]');
    if (!btn) return;
    switch (btn.dataset.action) {
        case 'show-event-qr': {
            const task = taskCache.get(Number(btn.dataset.taskId));
            if (task) showEventQr(task);
            break;
        }
        case 'edit-task': {
            const task = taskCache.get(Number(btn.dataset.taskId));
            if (task) openTaskModal(task);
            break;
        }
        case 'delete-task':
            deleteTask(btn.dataset.taskId);
            break;
        case 'edit-reward': {
            const reward = rewardCache.get(Number(btn.dataset.rewardId));
            if (reward) openRewardModal(reward);
            break;
        }
        case 'delete-reward':
            deleteReward(btn.dataset.rewardId);
            break;
        case 'cancel-redemption':
            cancelRedemption(btn.dataset.redemptionId);
            break;
        case 'cancel-attendance':
            cancelAttendance(btn.dataset.attendanceId);
            break;
        case 'open-attendance-event': {
            const ev = attendanceEventsCache.get(Number(btn.dataset.taskId));
            if (ev) openAttendanceEvent(ev.task_id, ev.title);
            break;
        }
        case 'download-attendance-csv': {
            const f = attendanceFilesCache.get(btn.dataset.taskId + ':' + btn.dataset.date);
            if (f) downloadAttendanceCsvFile(f.task_id, f.date, f.title);
            break;
        }
        case 'show-student-detail': openStudentDetail(btn.dataset.studentId); break;
        case 'close-student-detail': closeStudentDetail(); break;
        case 'open-task': openTaskModal(); break;
        case 'open-reward': openRewardModal(); break;
        case 'close-task': closeTaskModal(); break;
        case 'close-reward': closeRewardModal(); break;
        case 'close-event-qr': closeEventQrModal(); break;
        case 'close-weekly-pie': closeWeeklyPieModal(); break;
        case 'print-event-qr': printEventQr(); break;
        case 'start-scanner': startScanner(); break;
        case 'stop-scanner': stopScanner(); break;
        case 'toggle-motorola-scanner': toggleMotorolaScanner(); break;
        case 'manual-scan': manualScan(); break;
        case 'download-attendance-csv-all': downloadAttendanceCSV(); break;
        case 'back-to-events': backToEvents(); break;
    }
});

// ---- Shared tab loaders (used by nav clicks and realtime refresh) ----
const TAB_LOADERS = {
    overview: loadOverview,
    tasks: loadTasks,
    rewards: loadRewards,
    scanqr: loadScan,
    students: loadStudents,
    redemptions: loadRedemptions,
    claims: loadClaims,
    attendance: loadAttendance
};

// Refresh whatever dashboard tab is currently visible.
function refreshActiveTabData() {
    const active = document.querySelector('.tab-content.active');
    if (!active) return;
    if (active.id === 'scanqr') return;
    const loader = TAB_LOADERS[active.id];
    if (loader) loader();
}

// ---- Tab navigation ----
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.getElementById(btn.dataset.tab).classList.add('active');

        if (btn.dataset.tab !== 'scanqr' && motorolaActive) stopMotorolaScanner();
        if (TAB_LOADERS[btn.dataset.tab]) TAB_LOADERS[btn.dataset.tab]();
    });
});

// ---- Init ----
checkAuth();
loadOverview();
loadTopAttendees();
updateClaimsBadge();
initBarHoverModals();

