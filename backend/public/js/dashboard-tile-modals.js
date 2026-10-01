// ---- Overview tile detail modals (Institute, Friday Night, Weekly Devotional, SKEDDA) ----
const TILE_CONFIG = {
    institute: { title: 'Institute', chartId: 'instituteBarChart', periodId: 'institutePeriod', color: '#28a745' },
    fridayNight: { title: 'Friday Night', chartId: 'fridayBarChart', periodId: 'fridayPeriod', color: '#FF8566' },
    devotional: { title: 'Weekly Devotional', chartId: 'devotionalBarChart', periodId: 'devotionalPeriod', color: '#4C8BFF' },
    skedda: { title: 'SKEDDA', chartId: 'skeddaBarChart', periodId: 'skeddaPeriod', color: '#F4A340' }
};
const TILE_EL_TO_KW = {
    tileTask2: 'institute',
    tileTask3: 'fridayNight',
    tileTask4: 'devotional',
    tileTask5: 'skedda'
};

function closeTileModal() {
    document.getElementById('tileModal').classList.remove('show');
}

function openTileModal(kw) {
    const cfg = TILE_CONFIG[kw];
    if (!cfg) return;
    const chartEl = document.getElementById(cfg.chartId);
    if (!chartEl) return;
    const items = Array.prototype.map.call(chartEl.querySelectorAll('.bar-col'), col => {
        const lbl = col.querySelector('.bar-label');
        return {
            label: lbl ? lbl.textContent : '',
            value: Number(col.dataset.value) || 0,
            color: cfg.color,
            date: col.dataset.date || '',
            kw: kw
        };
    });
    const hasData = items.some(it => it.value > 0);
    if (!hasData) return;
    const total = items.reduce((s, it) => s + it.value, 0);
    document.getElementById('tileModalTitle').textContent = cfg.title;
    document.getElementById('tileModalPeriod').textContent = document.getElementById(cfg.periodId).textContent;
    document.getElementById('tileModalChart').innerHTML = buildBarColumns(items);
    document.getElementById('tileModalLegend').innerHTML =
        '<span class="legend-item"><span class="legend-swatch" style="background:' + cfg.color + '"></span>' +
        cfg.title + ' &middot; ' + total + '</span>';
    document.getElementById('tileModal').classList.add('show');
}

document.querySelectorAll('#tileTask2, #tileTask3, #tileTask4, #tileTask5').forEach(tile => {
    tile.addEventListener('click', (e) => {
        const kw = TILE_EL_TO_KW[tile.id];
        if (kw) openTileModal(kw);
    });
});

document.getElementById('tileModalClose').addEventListener('click', closeTileModal);
document.getElementById('tileModal').addEventListener('click', (e) => {
    if (e.target.id === 'tileModal') closeTileModal();
});
