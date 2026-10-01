// ---- Student detail modal (barcode + profile + attendance history) ----
async function openStudentDetail(id) {
    const modal = document.getElementById('studentDetailModal');
    const body = document.getElementById('studentDetailBody');
    body.innerHTML = '<p class="empty-state">Loading student&hellip;</p>';
    modal.classList.add('show');
    try {
        const data = await apiFetch(`${API}/admin/students/${id}`);
        renderStudentDetail(data);
    } catch (e) {
        body.innerHTML = `<p class="empty-state">Error: ${escapeHtml(e.message)}</p>`;
    }
}

function renderStudentDetail(data) {
    const s = data.student || {};
    const history = data.history || [];
    document.getElementById('studentDetailTitle').textContent = s.full_name || 'Student';

    const rows = history.length
        ? history.map(h => `
            <tr>
                <td>${escapeHtml(formatDate(h.attended_at))}</td>
                <td>${escapeHtml(h.title)}</td>
                <td><span class="status-badge status-active">+${Number(h.points_awarded)} pts</span></td>
            </tr>`).join('')
        : '<tr><td colspan="3" class="empty-state">No activities attended yet</td></tr>';

    document.getElementById('studentDetailBody').innerHTML = `
        <div class="student-detail-grid">
            <div class="scan-card" style="text-align:center;">
                <div id="studentDetailBarcode" style="background:#fff;padding:16px;border-radius:12px;"></div>
                <p class="section-sub" id="studentDetailBarcodeCode" style="margin-top:8px;"></p>
            </div>
            <div class="scan-card">
                <p><strong>Full Name:</strong> ${escapeHtml(s.full_name || 'N/A')}</p>
                <p><strong>User ID:</strong> ${escapeHtml(s.user_id || 'N/A')}</p>
                <p><strong>Username:</strong> ${escapeHtml(s.username || 'N/A')}</p>
                <p><strong>Email:</strong> ${escapeHtml(s.email || 'N/A')}</p>
                <p><strong>Total Points:</strong> ${Number(s.total_points)} pts</p>
                <p><strong>Status:</strong> <span class="status-badge ${s.is_student ? 'status-active' : 'status-inactive'}">${s.is_student ? 'Student' : 'Not a student'}</span></p>
            </div>
        </div>
        <h4 style="margin:20px 0 8px;">Attended Activities</h4>
        <table class="data-table">
            <thead>
                <tr><th>Date</th><th>Activity</th><th>Points</th></tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>`;

    renderStudentBarcode(s.qr_token);
}

// ---- Code39 barcode (same encoding shown to the student at registration) ----
const CODE39_TABLE = {
    '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000', '4': '000110001',
    '5': '100110000', '6': '001110000', '7': '000100101', '8': '100100100', '9': '001100100',
    'A': '100001001', 'B': '001001001', 'C': '101001000', 'D': '000011001', 'E': '100011000',
    'F': '001011000', 'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100',
    'K': '100000011', 'L': '001000011', 'M': '101000010', 'N': '000010011', 'O': '100010010',
    'P': '001010010', 'Q': '000000111', 'R': '100000110', 'S': '001000110', 'T': '000010110',
    'U': '110000001', 'V': '011000001', 'W': '111000000', 'X': '010010001', 'Y': '110010000',
    'Z': '011010000', '-': '010000101', '.': '110000100', ' ': '011000100', '$': '010101000',
    '/': '010100010', '+': '010001010', '%': '000101010', '*': '010010100'
};

function code39Elements(data) {
    const text = String(data || '').toUpperCase();
    if (!text) return null;
    const narrow = 2, wide = 6, gap = 2;
    const elements = [];
    for (let c = 0; c < text.length; c++) {
        const pattern = CODE39_TABLE[text[c]];
        if (!pattern) return null;
        for (let i = 0; i < 9; i++) {
            elements.push({
                kind: i % 2 === 0 ? 'bar' : 'space',
                width: pattern[i] === '1' ? wide : narrow
            });
        }
        if (c < text.length - 1) elements.push({ kind: 'space', width: gap });
    }
    return elements;
}

function renderStudentBarcode(token) {
    const container = document.getElementById('studentDetailBarcode');
    const codeText = document.getElementById('studentDetailBarcodeCode');
    container.innerHTML = '';
    if (!token) {
        codeText.textContent = '';
        container.innerHTML = '<p class="empty-state">No barcode token assigned</p>';
        return;
    }
    const elements = code39Elements('*' + token + '*');
    if (!elements) {
        codeText.textContent = token;
        container.innerHTML = '<p class="empty-state">This token cannot be encoded as a barcode</p>';
        return;
    }
    const height = 90;
    let x = 0;
    const totalWidth = elements.reduce((s, e) => s + e.width, 0);
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', totalWidth);
    svg.setAttribute('height', height + 8);
    svg.setAttribute('viewBox', '0 0 ' + totalWidth + ' ' + (height + 8));
    const bg = document.createElementNS(svgNS, 'rect');
    bg.setAttribute('x', 0); bg.setAttribute('y', 0);
    bg.setAttribute('width', totalWidth); bg.setAttribute('height', height + 8);
    bg.setAttribute('fill', '#ffffff');
    svg.appendChild(bg);
    for (const el of elements) {
        if (el.kind === 'bar') {
            const r = document.createElementNS(svgNS, 'rect');
            r.setAttribute('x', x);
            r.setAttribute('y', 0);
            r.setAttribute('width', el.width);
            r.setAttribute('height', height);
            r.setAttribute('fill', '#000000');
            svg.appendChild(r);
        }
        x += el.width;
    }
    container.appendChild(svg);
    codeText.textContent = token;
}

function closeStudentDetail() { document.getElementById('studentDetailModal').classList.remove('show'); }