// ---- Redemptions ----
async function loadRedemptions() {
    const tbody = document.querySelector('#redemptionsTable tbody');
    try {
        const redemptions = await apiFetch(`${API}/admin/redemptions`);
        if (redemptions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No redemptions yet</td></tr>';
            return;
        }
        tbody.innerHTML = redemptions.map(r => {
            const statusClass = { 'pending': 'status-pending', 'claimed': 'status-approved', 'cancelled': 'status-rejected' }[r.status] || 'status-inactive';
            const statusLabel = r.status === 'claimed' ? 'Redeemed' : r.status;
            let actions = r.status === 'cancelled'
                ? '<span style="color:grey;font-size:12px">-</span>'
                : `<button class="btn-danger" data-action="cancel-redemption" data-redemption-id="${r.id}">Cancel</button>`;
            return `
                <tr>
                    <td><strong>${escapeHtml(r.full_name)}</strong></td>
                    <td>${escapeHtml(r.user_id || 'N/A')}</td>
                    <td>${escapeHtml(r.reward_title)}</td>
                    <td>${r.points_spent} pts</td>
                    <td>${formatDate(r.redeemed_at)}</td>
                    <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                    <td class="actions">${actions}</td>
                </tr>
            `;
        }).join('');
    } catch (e) { tbody.innerHTML = `<tr><td colspan="7">Error: ${escapeHtml(e.message)}</td></tr>`; }
}

async function cancelRedemption(id) {
    if (!confirm('Cancel this redemption? Points will be refunded to the student.')) return;
    try {
        await apiFetch(`${API}/admin/redemptions/${id}/cancel`, { method: 'POST' });
        loadRedemptions();
        loadClaims();
        updateClaimsBadge();
        initBarHoverModals();
        loadOverview();
    } catch (err) { alert(err.message); }
}

// ---- Claims (students who auto-redeemed rewards) ----
async function loadClaims() {
    const tbody = document.querySelector('#claimsTable tbody');
    try {
        const redemptions = await apiFetch(`${API}/admin/redemptions`);
        const claimed = redemptions.filter(r => r.status === 'claimed');
        if (claimed.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No rewards claimed yet</td></tr>';
            return;
        }
        const byStudent = {};
        for (const r of claimed) {
            const key = r.user_id || r.full_name;
            if (!byStudent[key]) {
                byStudent[key] = { user_id: r.user_id, full_name: r.full_name, rewards: [], totalPoints: 0, last: '' };
            }
            const s = byStudent[key];
            s.rewards.push(r.reward_title);
            s.totalPoints += r.points_spent;
            if (!s.last || r.redeemed_at > s.last) s.last = r.redeemed_at;
        }
        const rows = Object.values(byStudent).sort((a, b) => b.totalPoints - a.totalPoints);
        updateClaimsBadge();
        initBarHoverModals();
        tbody.innerHTML = rows.map(s => `
            <tr>
                <td><strong>${escapeHtml(s.full_name)}</strong></td>
                <td>${escapeHtml(s.user_id || 'N/A')}</td>
                <td>${s.rewards.map(escapeHtml).join(', ')}</td>
                <td>${s.rewards.length}</td>
                <td>${s.totalPoints} pts</td>
                <td>${formatDate(s.last)}</td>
            </tr>
        `).join('');
    } catch (e) { tbody.innerHTML = `<tr><td colspan="6">Error: ${escapeHtml(e.message)}</td></tr>`; }
}

// ---- Claims badge (sidebar notification) ----
async function updateClaimsBadge() {
    const badge = document.getElementById('claimsBadge');
    if (!badge) return;
    try {
        const data = await apiFetch(`${API}/admin/claims/count`);
        if (data.count > 0) {
            badge.textContent = data.count;
            badge.style.display = 'inline-block';
        } else {
            badge.textContent = '';
            badge.style.display = 'none';
        }
    } catch (e) {
        badge.style.display = 'none';
    }
}
