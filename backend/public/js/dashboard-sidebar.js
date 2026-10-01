// ---- Mobile sidebar drawer ----
(function () {
    var hamburger = document.getElementById('hamburgerBtn');
    var sidebar = document.querySelector('.sidebar');
    var overlay = document.getElementById('sidebarOverlay');

    function isMobile() { return window.innerWidth <= 768; }
    function openSidebar() {
        if (!isMobile()) return;
        sidebar.classList.add('open');
        overlay.classList.add('show');
        hamburger.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
        hamburger.classList.remove('open');
        document.body.style.overflow = '';
    }
    function toggleSidebar() {
        if (sidebar.classList.contains('open')) closeSidebar();
        else openSidebar();
    }

    hamburger.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', closeSidebar);

    document.querySelectorAll('.nav-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            if (isMobile()) closeSidebar();
        });
    });

    var touchStartX = 0;
    var touchStartY = 0;
    document.addEventListener('touchstart', function (e) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', function (e) {
        if (!isMobile()) return;
        var dx = e.changedTouches[0].clientX - touchStartX;
        var dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(dy) > Math.abs(dx)) return;
        if (dx > 60 && touchStartX < 40) openSidebar();
        else if (dx < -60 && sidebar.classList.contains('open')) closeSidebar();
    }, { passive: true });

    window.addEventListener('resize', function () {
        if (!isMobile()) closeSidebar();
    });
})();
