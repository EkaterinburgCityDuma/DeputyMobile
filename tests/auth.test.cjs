const { test } = require('node:test');
const assert = require('node:assert/strict');
const { harness, deferred, login, success, unauthorized, user } = require('./helpers.cjs');

test('cold start waits for stored credentials before sending a protected request', async () => {
    const gate = deferred();
    const h = harness({ storageGate: gate, storage: new Map([
        ['authToken', 'stored-access'], ['refreshToken', 'stored-refresh'], ['userId', user.id],
    ]) });
    const loading = h.AuthManager.loadTokensFromStorage();
    let header;
    h.apiClient.defaults.adapter = async (config) => {
        header = config.headers.Authorization;
        return { status: 200, data: {}, config, headers: {} };
    };
    const request = h.apiClient.get('/api/Auth/current');
    await new Promise(setImmediate);
    gate.resolve();
    await Promise.all([loading, request]);
    assert.equal(header, 'Bearer stored-access');
});

for (const mode of ['offline', 'server error']) {
    test(`refresh ${mode} keeps the session and does not trigger logout listeners`, async () => {
        const h = harness({ fetch: async () => {
            if (mode === 'offline') throw new TypeError('Network unavailable');
            return { ok: false, status: 503 };
        } });
        await login(h);
        let logouts = 0;
        h.AuthManager.addListener((token) => { if (!token) logouts++; });
        h.apiClient.defaults.adapter = unauthorized;
        await assert.rejects(h.apiClient.get('/api/Notify/my'));
        assert.equal(h.AuthManager.getToken(), 'old-access');
        assert.equal(h.storage.get('refreshToken'), 'old-refresh');
        assert.equal(logouts, 0);
        assert.equal(h.redirects.length, 0);
    });
}

test('parallel refresh callers share one token rotation', async () => {
    let calls = 0;
    const gate = deferred();
    const h = harness({ fetch: async () => { calls++; await gate.promise; return success(); } });
    await login(h);
    const first = h.AuthManager.refreshAuthTokens();
    const second = h.AuthManager.refreshAuthTokens();
    gate.resolve();
    assert.deepEqual(await Promise.all([first, second]), ['new-access', 'new-access']);
    assert.equal(calls, 1);
});

test('a refresh that finishes after logout cannot restore the session', async () => {
    const started = deferred(), finish = deferred();
    const h = harness({ fetch: async () => { started.resolve(); await finish.promise; return success(); } });
    await login(h);
    const pending = h.AuthManager.refreshAuthTokens();
    await started.promise;
    await h.AuthManager.clearAuth();
    finish.resolve();
    await pending.catch(() => {});
    assert.equal(h.AuthManager.getToken(), null);
    assert.equal(h.storage.has('authToken'), false);
});

test('a bad password does not refresh or clear an existing session', async () => {
    let refreshes = 0;
    const h = harness({ fetch: async () => { refreshes++; return { ok: false, status: 401 }; } });
    await login(h);
    h.apiClient.defaults.adapter = unauthorized;
    await assert.rejects(h.apiClient.post('/api/Auth/login', { email: 'test', password: 'wrong' }));
    assert.equal(refreshes, 0);
    assert.equal(h.AuthManager.getToken(), 'old-access');
});

test('invalid refresh credentials clear the session once for concurrent requests', async () => {
    let refreshes = 0;
    const h = harness({ fetch: async () => { refreshes++; return { ok: false, status: 401 }; } });
    await login(h);
    h.apiClient.defaults.adapter = unauthorized;
    const results = await Promise.allSettled([h.apiClient.get('/api/Notify/my'), h.apiClient.get('/api/Auth/current')]);
    assert.ok(results.every((result) => result.status === 'rejected'));
    assert.equal(refreshes, 1);
    assert.equal(h.AuthManager.getToken(), null);
    assert.equal(h.redirects.length, 1);
});



test('tabs sharing storage serialize refresh and use the rotated pair', async () => {
    let tail = Promise.resolve(), refreshes = 0;
    const navigator = { locks: { request: (_, action) => {
        const pending = tail.then(action);
        tail = pending.catch(() => {});
        return pending;
    } } };
    const storage = new Map();
    const fetch = async () => { refreshes++; return success(); };
    const first = harness({ fetch, navigator, storage });
    await login(first);
    const second = harness({ fetch, navigator, storage });
    await second.AuthManager.initialize();
    const tokens = await Promise.all([
        first.AuthManager.refreshAuthTokens('old-access'),
        second.AuthManager.refreshAuthTokens('old-access'),
    ]);
    assert.deepEqual(tokens, ['new-access', 'new-access']);
    assert.equal(refreshes, 1);
    assert.equal(second.AuthManager.getRefreshToken(), 'new-refresh');
});

test('a late 401 reuses the new token instead of rotating again', async () => {
    let refreshes = 0;
    const delayed = deferred();
    const h = harness({ fetch: async () => { refreshes++; return success(); } });
    await login(h);
    h.apiClient.defaults.adapter = async (config) => {
        if (config.headers.Authorization === 'Bearer old-access') {
            if (config.url === '/api/Notify/my') await delayed.promise;
            return unauthorized(config);
        }
        return { status: 200, data: {}, headers: {}, config };
    };
    const late = h.apiClient.get('/api/Notify/my');
    await h.apiClient.get('/api/Auth/current');
    delayed.resolve();
    await late;
    assert.equal(refreshes, 1);
});

test('a retried request that still returns 401 is not refreshed again', async () => {
    let refreshes = 0, attempts = 0;
    const h = harness({ fetch: async () => { refreshes++; return success(); } });
    await login(h);
    h.apiClient.defaults.adapter = (config) => { attempts++; return unauthorized(config); };
    await assert.rejects(h.apiClient.get('/api/Notify/my'));
    assert.equal(refreshes, 1);
    assert.equal(attempts, 2);
});

test('malformed refresh data does not replace valid stored credentials', async () => {
    const h = harness({ fetch: async () => ({ ok: true, status: 200, json: async () => ({ token: 'broken' }) }) });
    await login(h);
    h.apiClient.defaults.adapter = unauthorized;
    await assert.rejects(h.apiClient.get('/api/Notify/my'));
    assert.equal(h.AuthManager.getToken(), 'old-access');
    assert.equal(h.storage.get('refreshToken'), 'old-refresh');
});

test('a tab reloads another tab account change and notifies its listeners', async () => {
    const storage = new Map();
    const first = harness({ storage });
    await login(first);
    const second = harness({ storage });
    await second.AuthManager.loadTokensFromStorage();
    const changes = [];
    second.AuthManager.addListener((token) => changes.push(token));
    await first.AuthManager.setAuth('other-access', 'other-refresh', 'user-2', []);
    await second.AuthManager.loadTokensFromStorage();
    assert.equal(second.AuthManager.getUserId(), 'user-2');
    assert.equal(second.AuthManager.getToken(), 'other-access');
    assert.deepEqual(changes, ['other-access']);
    await first.AuthManager.clearAuth();
    await second.AuthManager.loadTokensFromStorage();
    assert.equal(second.AuthManager.getToken(), null);
    assert.deepEqual(changes, ['other-access', null]);
});

test('a refresh cannot restore a session logged out in another tab', async () => {
    const storage = new Map(), started = deferred(), finish = deferred();
    const first = harness({ storage });
    await login(first);
    const second = harness({ storage, fetch: async () => {
        started.resolve(); await finish.promise; return success();
    } });
    await second.AuthManager.loadTokensFromStorage();
    const refresh = second.AuthManager.refreshAuthTokens();
    await started.promise;
    await first.AuthManager.clearAuth();
    await second.AuthManager.loadTokensFromStorage();
    finish.resolve();
    await assert.rejects(refresh);
    assert.equal(second.AuthManager.getToken(), null);
    assert.equal(storage.has('authToken'), false);
});
