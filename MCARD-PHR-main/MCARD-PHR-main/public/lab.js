(function () {
    const app = document.getElementById('app');
    let session = null;

    const api = (url, opts = {}) =>
        fetch('/api/lab' + url, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            ...opts
        }).then(r => r.json());

    /* ---------- Auth screen ---------- */
    function renderAuth(mode = 'login') {
        app.innerHTML = `
        <div class="auth-wrap">
            <div class="auth-card">
                <h1><i class="fa-solid fa-flask"></i> Lab Portal</h1>
                <div class="auth-tabs">
                    <button data-mode="login" class="${mode==='login'?'active':''}">Login</button>
                    <button data-mode="register" class="${mode==='register'?'active':''}">Register</button>
                </div>
                ${mode === 'login' ? loginForm() : registerForm()}
            </div>
        </div>`;
        document.querySelectorAll('.auth-tabs button').forEach(b =>
            b.onclick = () => renderAuth(b.dataset.mode));
        mode === 'login' ? bindLogin() : bindRegister();
    }

    function loginForm() {
        return `
        <form id="f-login">
            <input name="email" type="email" placeholder="Email" required />
            <input name="password" type="password" placeholder="Password" required />
            <button class="btn-primary">Login</button>
            <div id="auth-msg" class="msg"></div>
        </form>`;
    }

    function registerForm() {
        return `
        <form id="f-register">
            <input name="lab_name" placeholder="Lab Name" required />
            <input name="email" type="email" placeholder="Email" required />
            <input name="phone" placeholder="Phone" />
            <input name="address" placeholder="Address" />
            <input name="license_number" placeholder="License Number" />
            <input name="password" type="password" placeholder="Password" required minlength="6" />
            <button class="btn-primary">Register</button>
            <div id="auth-msg" class="msg"></div>
        </form>`;
    }

    function bindLogin() {
        document.getElementById('f-login').onsubmit = async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const res = await api('/login', {
                method: 'POST',
                body: JSON.stringify(Object.fromEntries(fd))
            });
            if (res.success) { session = res.lab; renderPortal(); }
            else document.getElementById('auth-msg').textContent = res.message;
        };
    }

    function bindRegister() {
        document.getElementById('f-register').onsubmit = async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const res = await api('/register', {
                method: 'POST',
                body: JSON.stringify(Object.fromEntries(fd))
            });
            document.getElementById('auth-msg').textContent =
                res.success ? 'Registered. Await admin approval.' : res.message;
        };
    }

    /* ---------- Portal ---------- */
    function renderPortal() {
        app.innerHTML = `
        <div class="portal">
            <header class="topbar">
                <h2><i class="fa-solid fa-flask"></i> ${session.name}</h2>
                <button id="btn-logout" class="btn-secondary">Logout</button>
            </header>
            <main class="portal-main">
                <section class="card">
                    <h3>Search Patient by MCard ID</h3>
                    <div class="search-row">
                        <input id="mcard-input" placeholder="e.g. 2026-06-181990" />
                        <button id="btn-search" class="btn-primary">Search</button>
                    </div>
                    <div id="patient-result"></div>
                </section>
                <section class="card">
                    <h3>My Submitted Results</h3>
                    <div id="my-results"></div>
                </section>
            </main>
        </div>`;

        document.getElementById('btn-logout').onclick = () =>
            fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
                .then(() => location.reload());

        document.getElementById('btn-search').onclick = searchPatient;
        document.getElementById('mcard-input').addEventListener('keydown', e => {
            if (e.key === 'Enter') searchPatient();
        });

        loadMyResults();
    }

    async function searchPatient() {
        const id = document.getElementById('mcard-input').value.trim();
        if (!id) return;
        const box = document.getElementById('patient-result');
        box.innerHTML = '<p>Searching…</p>';
        const res = await api('/patient/' + encodeURIComponent(id));
        if (!res.success) { box.innerHTML = `<p class="error">${res.message}</p>`; return; }

        const p = res.patient;
        box.innerHTML = `
            <div class="patient-card">
                <h4>${p.full_name}</h4>
                <p><strong>MCard:</strong> ${p.mcard_id}</p>
                <p><strong>Mobile:</strong> ${p.mobile || '—'}</p>
                <p><strong>Blood Group:</strong> ${p.blood_group || '—'}</p>
                <p><strong>DOB:</strong> ${p.date_of_birth ? p.date_of_birth.slice(0,10) : '—'}</p>
            </div>
            <form id="f-result" class="result-form">
                <input type="hidden" name="patient_id" value="${p.id}" />
                <input name="test_name" placeholder="Test name (e.g. Hemoglobin)" required />
                <input name="test_date" type="date" />
                <input name="result_value" placeholder="Result value" />
                <input name="unit" placeholder="Unit (g/dL)" />
                <input name="reference_range" placeholder="Reference range (12-16)" />
                <select name="status">
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="low">Low</option>
                    <option value="abnormal">Abnormal</option>
                    <option value="critical">Critical</option>
                </select>
                <textarea name="notes" placeholder="Notes (optional)"></textarea>
                <button class="btn-primary">Save Result</button>
                <div id="result-msg" class="msg"></div>
            </form>
            <h5>Existing Results for this patient</h5>
            ${renderResultsTable(res.results, false)}`;

        document.getElementById('f-result').onsubmit = async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const body = Object.fromEntries(fd);
            const out = await api('/results', { method: 'POST', body: JSON.stringify(body) });
            const msg = document.getElementById('result-msg');
            msg.textContent = out.success ? 'Saved ✓' : out.message;
            msg.style.color = out.success ? 'green' : 'red';
            if (out.success) {
                e.target.reset();
                loadMyResults();
                searchPatient(); // refresh list
            }
        };
    }

    function renderResultsTable(rows, showPatient = false) {
        if (!rows.length) return '<p class="muted">No results.</p>';
        return `
        <table class="data-table">
            <thead><tr>
                ${showPatient ? '<th>Patient</th><th>MCard</th>' : ''}
                <th>Test</th><th>Date</th><th>Value</th><th>Range</th><th>Status</th>
            </tr></thead>
            <tbody>${rows.map(r => `
                <tr>
                    ${showPatient ? `<td>${r.patient_name}</td><td>${r.mcard_id || '—'}</td>` : ''}
                    <td>${r.test_name}</td>
                    <td>${r.test_date ? r.test_date.slice(0,10) : '—'}</td>
                    <td>${r.result_value || '—'} ${r.unit || ''}</td>
                    <td>${r.reference_range || '—'}</td>
                    <td><span class="pill pill-${r.status}">${r.status}</span></td>
                </tr>`).join('')}
            </tbody>
        </table>`;
    }

    async function loadMyResults() {
        const box = document.getElementById('my-results');
        const res = await api('/my-results');
        box.innerHTML = res.success ? renderResultsTable(res.results, true) : `<p>${res.message}</p>`;
    }

    /* ---------- Boot ---------- */
    fetch('/api/auth/me', { credentials: 'include' })
        .then(r => r.json())
        .then(me => {
            // Check if a lab session exists via /api/lab/my-results probe
            return api('/my-results').then(r => {
                if (r.success) { session = { name: 'Lab' }; renderPortal(); }
                else renderAuth('login');
            });
        })
        .catch(() => renderAuth('login'));
})();