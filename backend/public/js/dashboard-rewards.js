// ---- Rewards ----
async function loadRewards() {
    const tbody = document.querySelector('#rewardsTable tbody');
    try {
        const rewards = await apiFetch(`${API}/admin/rewards`);
        rewardCache = new Map(rewards.map(r => [r.id, r]));
        if (rewards.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No rewards found</td></tr>';
            return;
        }
        tbody.innerHTML = rewards.map(r => `
            <tr>
                <td><strong>${escapeHtml(r.title)}</strong></td>
                <td>${escapeHtml(r.description || '')}</td>
                <td>${r.points_required} pts</td>
                <td>${r.stock_quantity}</td>
                <td><span class="status-badge ${r.is_active ? 'status-active' : 'status-inactive'}">${r.is_active ? 'Active' : 'Inactive'}</span></td>
                <td class="actions">
                    <button class="btn-edit" data-action="edit-reward" data-reward-id="${r.id}">Edit</button>
                    <button class="btn-danger" data-action="delete-reward" data-reward-id="${r.id}">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (e) { tbody.innerHTML = `<tr><td colspan="6">Error: ${escapeHtml(e.message)}</td></tr>`; }
}

function openRewardModal(reward = null) {
    document.getElementById('rewardModalTitle').textContent = reward ? 'Edit Reward' : 'Add Reward';
    document.getElementById('rewardId').value = reward ? reward.id : '';
    document.getElementById('rewardTitle').value = reward ? reward.title : '';
    document.getElementById('rewardDescription').value = reward ? (reward.description || '') : '';
    document.getElementById('rewardPoints').value = reward ? reward.points_required : '';
    document.getElementById('rewardStock').value = reward ? reward.stock_quantity : '';
    document.getElementById('rewardActive').value = reward ? reward.is_active : '1';
    document.getElementById('rewardModal').classList.add('show');
}

function closeRewardModal() { document.getElementById('rewardModal').classList.remove('show'); }

document.getElementById('rewardForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('rewardId').value;
    const payload = {
        title: document.getElementById('rewardTitle').value.trim(),
        description: document.getElementById('rewardDescription').value.trim(),
        points_required: parseInt(document.getElementById('rewardPoints').value),
        stock_quantity: parseInt(document.getElementById('rewardStock').value),
        is_active: parseInt(document.getElementById('rewardActive').value)
    };
    try {
        if (id) {
            await apiFetch(`${API}/admin/rewards/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        } else {
            await apiFetch(`${API}/admin/rewards`, { method: 'POST', body: JSON.stringify(payload) });
        }
        closeRewardModal();
        loadRewards();
        loadOverview();
    } catch (err) { alert(err.message); }
});

async function deleteReward(id) {
    if (!confirm('Delete this reward?')) return;
    try {
        await apiFetch(`${API}/admin/rewards/${id}`, { method: 'DELETE' });
        loadRewards();
    } catch (err) { alert(err.message); }
}
