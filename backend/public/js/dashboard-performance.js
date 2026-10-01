// ---- Monthly Performance (numbers only) ----
async function loadMonthlyPerformance() {
    try {
        const f = getOverviewFilter();
        const data = await apiFetch(`${API}/admin/overview/monthly-performance?month=${f.month}&year=${f.year}`);
        const monthSel = document.getElementById('monthSelect');
        const monthLabel = monthSel.options[monthSel.selectedIndex].text;
        document.getElementById('monthlyPerfPeriod').textContent = monthLabel + ' ' + f.year;
        document.getElementById('perfNewUsers').textContent = data.newUsers;
        document.getElementById('perfMonthlyAttendance').textContent = data.monthlyAttendance;
        document.getElementById('perfActiveUsers').textContent = data.activeUsers;
    } catch (e) { console.error(e); }
}

document.getElementById('monthSelect').addEventListener('change', loadMonthlyPerformance);
document.getElementById('yearSelect').addEventListener('change', loadMonthlyPerformance);
loadMonthlyPerformance();
