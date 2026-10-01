// ---- Students ----
async function loadStudents() {
    const tbody = document.querySelector('#studentsTable tbody');
    try {
        const students = await apiFetch(`${API}/admin/students`);
        if (students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No students registered yet</td></tr>';
            return;
        }
        tbody.innerHTML = students.map(s => `
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
    } catch (e) { tbody.innerHTML = `<tr><td colspan="6">Error: ${escapeHtml(e.message)}</td></tr>`; }
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
