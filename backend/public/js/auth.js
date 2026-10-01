const API = '/api';

var loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        var username = document.getElementById('username').value.trim();
        var password = document.getElementById('password').value;
        var errorEl = document.getElementById('loginError');

        errorEl.style.display = 'none';

        try {
            var res = await fetch(API + '/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username, password: password })
            });

            var data = await res.json();

            if (!res.ok) {
                errorEl.textContent = data.error || 'Login failed';
                errorEl.style.display = 'block';
                return;
            }

            if (data.user.role !== 'admin') {
                errorEl.textContent = 'Not an admin account';
                errorEl.style.display = 'block';
                return;
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = window.location.origin + '/dashboard.html';
        } catch (err) {
            errorEl.textContent = 'Network error. Check server connection.';
            errorEl.style.display = 'block';
        }
    });
}
