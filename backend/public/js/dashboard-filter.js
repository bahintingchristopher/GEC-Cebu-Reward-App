const OVERVIEW_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function overviewDefaultFilter() {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
}

function getOverviewFilter() {
    return {
        month: Number(document.getElementById('monthSelect').value),
        year: Number(document.getElementById('yearSelect').value)
    };
}

function populateMonthSelect() {
    const sel = document.getElementById('monthSelect');
    OVERVIEW_MONTHS.forEach(function (name, i) {
        const opt = document.createElement('option');
        opt.value = String(i + 1);
        opt.textContent = name;
        sel.appendChild(opt);
    });
}

function populateYearSelect() {
    const sel = document.getElementById('yearSelect');
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= currentYear - 2; y--) {
        const opt = document.createElement('option');
        opt.value = String(y);
        opt.textContent = String(y);
        sel.appendChild(opt);
    }
}

function onOverviewFilterChange() {
    if (typeof loadOverview === 'function') loadOverview();
    if (typeof loadTopAttendees === 'function') loadTopAttendees();
}

function initOverviewFilter() {
    populateMonthSelect();
    populateYearSelect();
    const def = overviewDefaultFilter();
    document.getElementById('monthSelect').value = String(def.month);
    document.getElementById('yearSelect').value = String(def.year);
    document.getElementById('monthSelect').addEventListener('change', onOverviewFilterChange);
    document.getElementById('yearSelect').addEventListener('change', onOverviewFilterChange);
    document.getElementById('resetFilterBtn').addEventListener('click', function () {
        const d = overviewDefaultFilter();
        document.getElementById('monthSelect').value = String(d.month);
        document.getElementById('yearSelect').value = String(d.year);
        onOverviewFilterChange();
    });
}

initOverviewFilter();