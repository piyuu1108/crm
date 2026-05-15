// ─── LabSense Agent — Minimal Login UI ───

const loginView = document.getElementById('login-view');
const sessionView = document.getElementById('session-view');
const loginForm = document.getElementById('login-form');
const loginBtn = document.getElementById('login-btn');
const loginBtnText = document.getElementById('login-btn-text');
const loginSpinner = document.getElementById('login-spinner');
const loginError = document.getElementById('login-error');
const collegeIdInput = document.getElementById('college-id');
const passwordInput = document.getElementById('password');
const logoutBtn = document.getElementById('logout-btn');
const logoutBtnText = document.getElementById('logout-btn-text');
const logoutSpinner = document.getElementById('logout-spinner');

function showLogin() {
    loginView.style.display = 'block';
    sessionView.style.display = 'none';
}

function showSession() {
    loginView.style.display = 'none';
    sessionView.style.display = 'block';
}

// ─── Login ───
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.style.display = 'none';

    const collegeId = collegeIdInput.value.trim();
    const password = passwordInput.value;

    if (!collegeId || !password) {
        showError('Please enter your College ID and password.');
        return;
    }

    setLoading(loginBtn, loginBtnText, loginSpinner, true);

    try {
        const resp = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ collegeId, password }),
        });

        const data = await resp.json();

        if (!resp.ok) {
            showError(data.error || 'Login failed.');
            return;
        }

        passwordInput.value = '';
        showSession();
    } catch (err) {
        showError('Cannot connect to agent.');
    } finally {
        setLoading(loginBtn, loginBtnText, loginSpinner, false);
    }
});

// ─── Logout ───
logoutBtn.addEventListener('click', async () => {
    setLoading(logoutBtn, logoutBtnText, logoutSpinner, true);
    try {
        await fetch('/api/logout', { method: 'POST' });
    } catch (err) { /* go back to login regardless */ }
    finally {
        setLoading(logoutBtn, logoutBtnText, logoutSpinner, false);
        showLogin();
    }
});

// ─── Helpers ───
function showError(msg) {
    loginError.textContent = msg;
    loginError.style.display = 'block';
}

function setLoading(btn, text, spinner, loading) {
    btn.disabled = loading;
    text.style.display = loading ? 'none' : 'inline';
    spinner.style.display = loading ? 'inline-block' : 'none';
}

// ─── On load: check if already logged in ───
(async () => {
    try {
        const resp = await fetch('/api/status');
        const data = await resp.json();
        if (data.state === 'active') showSession();
        else showLogin();
    } catch (err) {
        showLogin();
    }
})();
