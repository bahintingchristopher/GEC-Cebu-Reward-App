let todayStudentsCache = [];
// ---- Overview ----
async function loadOverview() {
    try {
        const f = getOverviewFilter();
        const stats = await apiFetch(`${API}/admin/stats?month=${f.month}&year=${f.year}`);
        document.getElementById('statStudents').textContent = stats.totalStudents;
        document.getElementById('statPending').textContent = stats.totalToday;
        document.getElementById('statPoints').textContent = stats.totalPointsDistributed;
        document.getElementById('statRedemptions').textContent = stats.totalRedemptions;
        todayStudentsCache = stats.todayStudents || [];
    } catch (e) { console.error(e); }
    loadOverviewCharts();
}

// ---- Overview charts ----
async function loadOverviewCharts() {
    try {
        const f = getOverviewFilter();
        const data = await apiFetch(`${API}/admin/overview/charts?month=${f.month}&year=${f.year}`);
        renderDailyBarChart(data.daily || []);
        renderWeeklyPie(data.weekly || []);
        renderInstituteChart(data.institute || []);
        renderFridayNightChart(data.fridayNight || []);
        renderDevotionalChart(data.devotional || []);
        renderSkeddaChart(data.skedda || []);
    } catch (e) { console.error(e); }
}

async function loadTopAttendees() {
    const list = document.getElementById('topAttendeesList');
    if (!list) return;
    try {
        const f = getOverviewFilter();
        const rows = await apiFetch(`${API}/admin/top-attendees?month=${f.month}&year=${f.year}`);
        list.innerHTML = rows.map(r =>
            `<li><span class="ta-name">${escapeHtml(r.full_name)}</span>` +
            `<span class="ta-meta">${r.days} day${r.days === 1 ? '' : 's'}</span></li>`)
            .join('');
    } catch (e) { console.error(e); }
}
function buildBarColumns(items) {
    const max = Math.max.apply(null, items.map(i => i.value).concat(1));
    return items.map(it => {
        const h = it.value > 0 ? Math.max((it.value / max) * 100, 4) : 0;
        return `
            <div class="bar-col" data-date="${it.date || ''}" data-kw="${it.kw || ''}" data-value="${it.value}" title="${escapeHtml(it.label)}: ${it.value}">
                <span class="bar-value">${it.value > 0 ? it.value : ''}</span>
                <div class="bar" style="height:${h}%;${it.color ? 'background:' + it.color + ';' : ''}"></div>
                <span class="bar-label">${escapeHtml(it.label)}</span>
            </div>`;
    }).join('');
}

function renderLegend(el, items) {
    el.innerHTML = items.map(it =>
        `<span class="legend-item"><span class="legend-swatch" style="background:${it.color}"></span>${escapeHtml(it.label)}${it.value != null ? ' &middot; ' + it.value : ''}</span>`
    ).join('');
}

function renderDailyBarChart(days) {
    const wrap = document.getElementById('dailyBarChart');
    const empty = document.getElementById('dailyChartEmpty');
    const f = getOverviewFilter();
    const y = f.year;
    const m = f.month;
    const daysInMonth = new Date(y, m, 0).getDate();
    const byDate = new Map(days.map(d => [d.date, d.count]));
    const items = [];
    for (let day = 1; day <= daysInMonth; day++) {
        const key = y + '-' + String(m).padStart(2, '0') + '-' + String(day).padStart(2, '0');
        items.push({ label: String(day), value: byDate.get(key) || 0, color: '#4D49FF', date: key, kw: 'all' });
    }
    const monthSel = document.getElementById('monthSelect');
    const monthLabel = monthSel.options[monthSel.selectedIndex].text;
    document.getElementById('dailyChartPeriod').textContent = monthLabel + ' ' + y;
    wrap.innerHTML = buildBarColumns(items);
    const hasData = days.length > 0;
    wrap.style.display = hasData ? 'flex' : 'none';
    empty.style.display = hasData ? 'none' : 'block';
    renderLegend(document.getElementById('dailyChartLegend'), [{ label: 'Students attending per day', color: '#4D49FF' }]);
}
const CHART_COLORS = ['#4D49FF', '#FF8566', '#28a745', '#ffc107', '#17a2b8', '#e83e8c', '#6f42c1', '#fd7e14', '#20c997', '#6c757d'];

function chartColor(i) { return CHART_COLORS[i % CHART_COLORS.length]; }

const WEEKLY_CATEGORY_ORDER = ['Weekly Devotional', 'Friday Night Activity', 'SKEDDA', 'Career Workshop', 'Institute', 'Others'];
let weeklyPieData = [];
function renderWeeklyPie(weekly) {
    const pie = document.getElementById('weeklyPieChart');
    const empty = document.getElementById('weeklyPieEmpty');
    const legend = document.getElementById('weeklyPieLegend');

    const pieF = getOverviewFilter();
    const pieSel = document.getElementById('monthSelect');
    document.getElementById('weeklyPiePeriod').textContent = pieSel.options[pieSel.selectedIndex].text + ' ' + pieF.year;
    const active = weekly.filter(w => w.count > 0)
        .sort((a, b) => WEEKLY_CATEGORY_ORDER.indexOf(a.title) - WEEKLY_CATEGORY_ORDER.indexOf(b.title));
    weeklyPieData = active;
    const hasData = active.length > 0;
    pie.style.display = hasData ? 'block' : 'none';
    empty.style.display = hasData ? 'none' : 'block';
    if (hasData) {
        const itemHtml = (w, i) =>
            `<span class="legend-item"><span class="legend-swatch" style="background:${chartColor(i)}"></span>${escapeHtml(w.title)} &middot; ${w.count}</span>`;
        legend.innerHTML = active.map(itemHtml).join('');
    } else {
        legend.innerHTML = '';
    }
    if (!hasData) return;
    const total = active.reduce((s, w) => s + w.count, 0);
    pie.style.background = `conic-gradient(${weeklyPieStops(active, total)})`;

}

function weeklyPieStops(weeks, total) {
    let cumulative = 0;
    return weeks.map((w, i) => {
        const start = (cumulative / total) * 100;
        cumulative += w.count;
        const end = (cumulative / total) * 100;
        return `${chartColor(i)} ${start}% ${end}%`;
    }).join(', ');
}

function openWeeklyPieModal() {
    const weeks = weeklyPieData;
    if (!weeks || weeks.length === 0) return;
    const modalPie = document.getElementById('weeklyPieModalChart');

    const modalPeriod = document.getElementById('weeklyPieModalPeriod');
    const total = weeks.reduce((s, w) => s + w.count, 0);
    modalPie.style.background = `conic-gradient(${weeklyPieStops(weeks, total)})`;

    const pieSel2 = document.getElementById('monthSelect');
    modalPeriod.textContent = pieSel2.options[pieSel2.selectedIndex].text + ' ' + getOverviewFilter().year;
    document.getElementById('weeklyPieModalLegend').innerHTML = weeks.map((w, i) =>
        `<span class="legend-item"><span class="legend-swatch" style="background:${chartColor(i)}"></span>${escapeHtml(w.title)} &middot; ${w.count}</span>`
    ).join('');
    document.getElementById('weeklyPieModal').classList.add('show');
}

function closeWeeklyPieModal() {
    document.getElementById('weeklyPieModal').classList.remove('show');
}

document.getElementById('weeklyPieChart').addEventListener('click', openWeeklyPieModal);
function weekStartFrom(d) {
    const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = date.getDay() || 7;
    date.setDate(date.getDate() - day + 1);
    return date;
}

function renderInstituteChart(institutes) {
    const chart = document.getElementById('instituteBarChart');
    const empty = document.getElementById('instituteBarEmpty');
    const legend = document.getElementById('instituteLegend');
    const f = getOverviewFilter();
    const y = f.year;
    const m = f.month;
    const daysInMonth = new Date(y, m, 0).getDate();
    const byDay = new Map(institutes.map(r => [r.dayStart, r.count]));
    const monthSel = document.getElementById('monthSelect');
    document.getElementById('institutePeriod').textContent = monthSel.options[monthSel.selectedIndex].text + ' ' + y;
    const items = [];
    for (let day = 1; day <= daysInMonth; day++) {
        const key = y + '-' + String(m).padStart(2, '0') + '-' + String(day).padStart(2, '0');
        items.push({ label: String(day), value: byDay.get(key) || 0, color: '#28a745', date: key, kw: 'institute' });
    }
    const total = items.reduce((s, it) => s + it.value, 0);
    const hasData = total > 0;
    chart.innerHTML = buildBarColumns(items);
    chart.style.display = hasData ? 'flex' : 'none';
    empty.style.display = hasData ? 'none' : 'block';
    legend.innerHTML = '<span class="legend-item"><span class="legend-swatch" style="background:#28a745"></span>Institute &middot; ' + total + '</span>';
}
function renderFridayNightChart(fridays) {
    const chart = document.getElementById('fridayBarChart');
    const empty = document.getElementById('fridayBarEmpty');
    const legend = document.getElementById('fridayLegend');
    const f = getOverviewFilter();
    const y = f.year;
    const m = f.month;
    const daysInMonth = new Date(y, m, 0).getDate();
    const byDay = new Map(fridays.map(r => [r.dayStart, r.count]));
    const monthSel = document.getElementById('monthSelect');
    document.getElementById('fridayPeriod').textContent = monthSel.options[monthSel.selectedIndex].text + ' ' + y;
    const items = [];
    for (let day = 1; day <= daysInMonth; day++) {
        const key = y + '-' + String(m).padStart(2, '0') + '-' + String(day).padStart(2, '0');
        items.push({ label: String(day), value: byDay.get(key) || 0, color: '#FF8566', date: key, kw: 'fridayNight' });
    }
    const total = items.reduce((s, it) => s + it.value, 0);
    const hasData = total > 0;
    chart.innerHTML = buildBarColumns(items);
    chart.style.display = hasData ? 'flex' : 'none';
    empty.style.display = hasData ? 'none' : 'block';
    legend.innerHTML = '<span class="legend-item"><span class="legend-swatch" style="background:#FF8566"></span>Friday Night &middot; ' + total + '</span>';
}
function renderDevotionalChart(weeks) {
    const chart = document.getElementById('devotionalBarChart');
    const empty = document.getElementById('devotionalBarEmpty');
    const legend = document.getElementById('devotionalLegend');
    const f = getOverviewFilter();
    const y = f.year;
    const m = f.month;
    const daysInMonth = new Date(y, m, 0).getDate();
    const byDay = new Map(weeks.map(r => [r.dayStart, r.count]));
    const monthSel = document.getElementById('monthSelect');
    document.getElementById('devotionalPeriod').textContent = monthSel.options[monthSel.selectedIndex].text + ' ' + y;
    const items = [];
    for (let day = 1; day <= daysInMonth; day++) {
        const key = y + '-' + String(m).padStart(2, '0') + '-' + String(day).padStart(2, '0');
        items.push({ label: String(day), value: byDay.get(key) || 0, color: '#4C8BFF', date: key, kw: 'devotional' });
    }
    const total = items.reduce((s, it) => s + it.value, 0);
    const hasData = total > 0;
    chart.innerHTML = buildBarColumns(items);
    chart.style.display = hasData ? 'flex' : 'none';
    empty.style.display = hasData ? 'none' : 'block';
    legend.innerHTML = '<span class="legend-item"><span class="legend-swatch" style="background:#4C8BFF"></span>Weekly Devotional &middot; ' + total + '</span>';
}

function renderSkeddaChart(weeks) {
    const chart = document.getElementById('skeddaBarChart');
    const empty = document.getElementById('skeddaBarEmpty');
    const legend = document.getElementById('skeddaLegend');
    const f = getOverviewFilter();
    const y = f.year;
    const m = f.month;
    const daysInMonth = new Date(y, m, 0).getDate();
    const byDay = new Map(weeks.map(r => [r.dayStart, r.count]));
    const monthSel = document.getElementById('monthSelect');
    document.getElementById('skeddaPeriod').textContent = monthSel.options[monthSel.selectedIndex].text + ' ' + y;
    const items = [];
    for (let day = 1; day <= daysInMonth; day++) {
        const key = y + '-' + String(m).padStart(2, '0') + '-' + String(day).padStart(2, '0');
        items.push({ label: String(day), value: byDay.get(key) || 0, color: '#F4A340', date: key, kw: 'skedda' });
    }
    const total = items.reduce((s, it) => s + it.value, 0);
    const hasData = total > 0;
    chart.innerHTML = buildBarColumns(items);
    chart.style.display = hasData ? 'flex' : 'none';
    empty.style.display = hasData ? 'none' : 'block';
    legend.innerHTML = '<span class="legend-item"><span class="legend-swatch" style="background:#F4A340"></span>SKEDDA &middot; ' + total + '</span>';
}
const barNamesCache = {};
const BAR_KW_TITLES = { all: 'Daily Attendance', institute: 'Institute', fridayNight: 'Friday Night', devotional: 'Weekly Devotional', skedda: 'SKEDDA' };
let barHoverModal = null;
function getBarHoverModal() {
    if (!barHoverModal) {
        barHoverModal = document.createElement('div');
        barHoverModal.className = 'hover-modal';
        barHoverModal.style.display = 'none';
        document.body.appendChild(barHoverModal);
    }
    return barHoverModal;
}
function hideBarTooltip() {
    if (barHoverModal) barHoverModal.style.display = 'none';
}
function positionBarTooltip(col, x, y) {
    const m = barHoverModal;
    const r = col.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    const mw = m.offsetWidth, mh = m.offsetHeight;
    let left = (typeof x === 'number' ? x : r.right) + 14;
    let top = (typeof y === 'number' ? y : r.top) - 10;
    if (left + mw > vw - 8) left = (typeof x === 'number' ? x - mw : r.left) - 14;
    if (top + mh > vh - 8) top = vh - mh - 8;
    if (left < 8) left = 8;
    if (top < 8) top = 8;
    m.style.left = left + 'px';
    m.style.top = top + 'px';
}
async function showBarTooltip(col, px, py) {
    const date = col.dataset.date;
    const kw = col.dataset.kw;
    const m = getBarHoverModal();
    const key = kw + '::' + date;
    m.style.display = 'block';
    m.innerHTML = '<div class="hm-loading">Loading names\u2026</div>';
    positionBarTooltip(col, px, py);
    let names = barNamesCache[key];
    if (!names) {
        try {
            const r = await apiFetch(`${API}/admin/chart-names?kw=${encodeURIComponent(kw)}&date=${encodeURIComponent(date)}`);
            names = (r && r.names) || [];
            barNamesCache[key] = names;
        } catch (e) {
            m.innerHTML = '<div class="hm-title">Error loading</div>' +
                '<div class="hm-count" style="color:#d33">' + escapeHtml(e && e.message ? e.message : String(e)) + '</div>';
            positionBarTooltip(col, px, py);
            return;
        }
    }
    const label = col.querySelector('.bar-label');
    const subtitle = (label ? label.textContent : date) + ' &middot; ' + names.length + ' student' + (names.length === 1 ? '' : 's');
    m.innerHTML =
        '<div class="hm-title">' + escapeHtml(BAR_KW_TITLES[kw] || kw) + '</div>' +
        '<div class="hm-count">' + subtitle + '</div>' +
        '<div class="hm-list">' + (names.length ? names.map(n => '<div class="hm-name">' + escapeHtml(n) + '</div>').join('') : '<div class="hm-empty">No students</div>') + '</div>';
    positionBarTooltip(col, px, py);
}
function initBarHoverModals() {
    document.addEventListener('mouseover', (e) => {
        const col = e.target.closest('.bar-col');
        if (!col || !col.dataset.date) { hideBarTooltip(); return; }
        if (Number(col.dataset.value) <= 0) { hideBarTooltip(); return; }
        showBarTooltip(col, e.clientX, e.clientY);
    }, true);
    document.addEventListener('mouseout', (e) => {
        const col = e.target.closest('.bar-col');
        const to = e.relatedTarget;
        if (to && to.nodeType === 1) {
            if (to.closest('.bar-col') || (barHoverModal && barHoverModal.contains(to))) return;
        }
        hideBarTooltip();
    }, true);
}
// ---- Checked In Today hover list ----
function initTodayHover() {
    const el = document.getElementById('statPending');
    if (!el) return;
    el.addEventListener('mouseenter', (e) => {
        if (!todayStudentsCache.length) { hideBarTooltip(); return; }
        const m = getBarHoverModal();
        const rows = todayStudentsCache.map(s =>
            '<div class="hm-name">' + escapeHtml(s.full_name) +
            (s.attended_at ? ' <span style="color:var(--muted)">' +
                new Date(s.attended_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) +
                '</span>' : '') +
            '</div>'
        ).join('');
        m.innerHTML =
            '<div class="hm-title">Checked in today ÂÂ· ' + todayStudentsCache.length + '</div>' +
            '<div class="hm-count">' + new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) + '</div>' +
            '<div class="hm-list">' + rows + '</div>';
        m.style.display = 'block';
        positionBarTooltip(el, e.clientX, e.clientY);
    });
    el.addEventListener('mouseleave', hideBarTooltip);
}
initTodayHover();
