// ---- Students ----
// Search + client-side pagination over the full student list.
// State lives at module scope so a realtime tab refresh (dashboard-scan.js
// calls refreshActiveTabData -> loadStudents) keeps the admin's current page
// and search text instead of snapping back to the top.

// Responsive rows per page based on window height
function calculateStudentsPerPage() {
    try {
        const tableContainer = document.querySelector('#studentsTable');
        const rowHeight = 48;
        const headerHeight = 120;
        const viewportHeight = window.innerHeight;
        const available = viewportHeight - headerHeight;
        let rows = Math.floor(available / rowHeight);
        if (rows < 5) rows = 5;
        return rows;
    } catch (e) {
        return 10;
    }
}
let STUDENTS_PER_PAGE = calculateStudentsPerPage();
let allStudents = [];    // last API result, unfiltered
let studentQuery = '';   // current search text
let studentPage = 1;     // 1-based

function filterStudents(list, query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter(s =>
        String(s.full_name || '').toLowerCase().includes(q) ||
        String(s.username || '').toLowerCase().includes(q) ||
        String(s.user_id || '').toLowerCase().includes(q) ||
        String(s.email || '').toLowerCase().includes(q)
    );
}

function studentPageCount(total) {
    return Math.max(1, Math.ceil(total / STUDENTS_PER_PAGE));
}

function studentRows(list) {
    if (list.length === 0) {
        // The search term is escaped; the quotes around it are intentional markup.
        const msg = studentQuery.trim()
            ? 'No students match &ldquo;' + escapeHtml(studentQuery.trim()) + '&rdquo;'
            : 'No students registered yet';
        return '<tr><td colspan="6" class="empty-state">' + msg + '</td></tr>';
    }
    return list.map(s => `
            <tr>
                <td><button class="btn-edit" data-action="show-student-detail" data-student-id="${s.id}">${escapeHtml(s.full_name)}</button></td>
                <td>${escapeHtml(s.user_id || 'N/A')}</td>
                <td>${escapeHtml(s.username)}</td>
                <td>${escapeHtml(s.email || 'N/A')}</td>
                <td>
                    <select class="student-toggle" data-user-id="${s.id}" aria-label="Is student?">
                        <option value="1"${s.is_student ? ' selected' : ''}>Yes</option>
                        <option value="0"${!s.is_student ? ' selected' : ''}>No</option>
                    </select>
                </td>
                <td><span class="status-badge status-active">${s.total_points} pts</span></td>
            </tr>
        `).join('');
}

// Windowed page numbers, e.g. 1 ... 4 5 6 ... 16
function studentPageWindow(current, pages) {
    const wanted = new Set([1, pages]);
    for (let p = current - 1; p <= current + 1; p++) {
        if (p >= 1 && p <= pages) wanted.add(p);
    }
    const out = [];
    let prev = 0;
    for (const p of [...wanted].sort((a, b) => a - b)) {
        if (prev && p - prev > 1) out.push('...');
        out.push(p);
        prev = p;
    }
    return out;
}

function renderStudentsPager(total, from, to) {
    const el = document.getElementById('studentsPager');
    if (!el) return;
    if (total === 0) { el.innerHTML = ''; return; }

    const pages = studentPageCount(total);
    const nav = (label, page, disabled) =>
        `<button class="page-btn" data-page="${page}"${disabled ? ' disabled' : ''}>${label}</button>`;

    const numbers = studentPageWindow(studentPage, pages).map(p =>
        p === '...'
            ? '<span class="page-ellipsis">...</span>'
            : `<button class="page-btn${p === studentPage ? ' active' : ''}" data-page="${p}">${p}</button>`
    ).join('');

    el.innerHTML =
        `<span class="pager-info">Showing ${from}&ndash;${to} of ${total}</span>` +
        '<span class="pager-controls">' +
            nav('&lsaquo; Prev', studentPage - 1, studentPage <= 1) +
            numbers +
            nav('Next &rsaquo;', studentPage + 1, studentPage >= pages) +
        '</span>';
}

function renderStudentsPage() {
    const tbody = document.querySelector('#studentsTable tbody');
    if (!tbody) return;
    const filtered = filterStudents(allStudents, studentQuery);
    const pages = studentPageCount(filtered.length);
    if (studentPage > pages) studentPage = pages;
    if (studentPage < 1) studentPage = 1;
    var perPage = STUDENTS_PER_PAGE;
    var start = (studentPage - 1) * perPage;
    var slice = filtered.slice(start, start + perPage);
    tbody.innerHTML = studentRows(slice);
    renderStudentsPager(filtered.length, filtered.length ? start + 1 : 0, start + slice.length);
}

function changeStudentPage(page) {
    studentPage = page;
    renderStudentsPage();
}

function onStudentSearch(value) {
    studentQuery = value || '';
    studentPage = 1;   // a new search always starts from the first page
    renderStudentsPage();
}

async function loadStudents() {
    const tbody = document.querySelector('#studentsTable tbody');
    try {
        allStudents = await apiFetch(`${API}/admin/students`);
        renderStudentsPage();
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6">Error: ${escapeHtml(e.message)}</td></tr>`;
        const el = document.getElementById('studentsPager');
        if (el) el.innerHTML = '';
    }
}

// Auto-save the isStudent dropdown without a full page reload.
document.getElementById('studentsTable').addEventListener('change', async (event) => {
    const select = event.target.closest('select[data-user-id]');
    if (!select) return;
    const previous = select.dataset.previous;
    select.dataset.previous = select.value;
    try {
        await apiFetch(`${API}/admin/users/${select.dataset.userId}/student-status`, {
            method: 'PATCH',
            body: JSON.stringify({ is_student: Number(select.value) })
        });
    } catch (e) {
        if (previous !== undefined) select.value = previous;
        alert('Failed to update student status: ' + e.message);
    }
});

// Search box and pager are wired with delegated listeners, so re-rendering the
// pager contents (or the table body) never drops them.
document.getElementById('studentSearch').addEventListener('input', (event) => {
    onStudentSearch(event.target.value);
});

document.getElementById('studentsPager').addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-page]');
    if (!btn || btn.disabled) return;
    const page = Number(btn.dataset.page);
    if (Number.isInteger(page)) changeStudentPage(page);
});

window.addEventListener('resize', function () {
    var newPerPage = calculateStudentsPerPage();
    if (newPerPage !== STUDENTS_PER_PAGE) {
        STUDENTS_PER_PAGE = newPerPage;
        studentPage = 1;
        renderStudentsPage();
    }
});
