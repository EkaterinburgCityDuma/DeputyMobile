const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, deferred } = require('./helpers.cjs');
const tick = () => new Promise(setImmediate);

function harness({ getToken, deleteToken } = {}) {
    let userId = 'user-a', accessToken = 'access-a';
    const authListeners = [], events = new Map(), documentEvents = new Map(), registrations = [];
    const auth = {
        getToken: () => accessToken, getUserId: () => userId,
        loadTokensFromStorage: async () => {},
        addListener: (callback) => { authListeners.push(callback); return () => {}; },
    };
    const document = {
        visibilityState: 'visible',
        addEventListener: (name, callback) => documentEvents.set(name, callback),
        removeEventListener: (name) => documentEvents.delete(name),
    };
    const service = load('api/fcmService.web.ts', {
        'firebase/app': { getApps: () => [{ name: 'pwa' }], initializeApp: () => ({}) },
        'firebase/messaging': {
            getMessaging: () => ({}), isSupported: async () => true,
            getToken: getToken || (async () => 'push-token'),
            deleteToken: deleteToken || (async () => true), onMessage: () => () => {},
        },
        'react-native-toast-message': { show: () => {} },
        './api': { apiClient: { post: async (path, body) => registrations.push({ userId, path, ...body }) } },
        './auth': { AuthManager: auth },
    }, {
        window: {
            isSecureContext: true,
            addEventListener: (name, callback) => events.set(name, callback),
            removeEventListener: (name) => events.delete(name),
        },
        document, URLSearchParams,
        navigator: { serviceWorker: { register: async () => ({ active: {} }) } },
        Notification: { permission: 'granted' },
        process: { env: {
            EXPO_PUBLIC_FIREBASE_API_KEY: 'key', EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'project',
            EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: 'sender', EXPO_PUBLIC_FIREBASE_APP_ID: 'app',
            EXPO_PUBLIC_FIREBASE_VAPID_KEY: 'vapid',
        } },
    });
    return {
        ...service, registrations, documentEvents,
        switchUser: (id) => { userId = id; accessToken = id ? `access-${id}` : null; authListeners.forEach((callback) => callback(accessToken)); },
    };
}

test('switching users during token generation registers the new user without waiting for focus', async () => {
    const started = deferred(), finish = deferred();
    let calls = 0;
    const h = harness({ getToken: async () => {
        calls++;
        if (calls === 1) { started.resolve(); await finish.promise; }
        return `push-${calls}`;
    } });
    const first = h.syncDeviceToken();
    await started.promise;
    h.switchUser('user-b');
    const second = h.syncDeviceToken();
    finish.resolve();
    await Promise.all([first, second]);
    assert.equal(calls, 2);
    assert.equal(h.registrations.length, 1);
    assert.equal(h.registrations[0].userId, 'user-b');
});

test('quick logout and login finish deleting the old token before registering a new one', async () => {
    const deleting = deferred(), finishDelete = deferred();
    let token = 'old-push';
    const h = harness({
        getToken: async () => token,
        deleteToken: async () => { deleting.resolve(); await finishDelete.promise; token = 'fresh-push'; return true; },
    });
    const cleanup = h.setupWebNotifications();
    await tick();
    await h.syncDeviceToken();
    h.registrations.length = 0;
    h.switchUser(null);
    await deleting.promise;
    h.switchUser('user-a');
    await tick();
    finishDelete.resolve();
    await tick();
    await h.syncDeviceToken();
    assert.ok(h.registrations.length > 0);
    assert.ok(h.registrations.every((record) => record.token === 'fresh-push'));
    cleanup();
});

test('returning to a visible PWA resynchronizes its device token', async () => {
    let calls = 0;
    const h = harness({ getToken: async () => { calls++; return 'push'; } });
    const cleanup = h.setupWebNotifications();
    await tick();
    const before = calls;
    h.documentEvents.get('visibilitychange')?.();
    await tick();
    assert.equal(calls, before + 1);
    cleanup();
    assert.equal(h.documentEvents.has('visibilitychange'), false);
});

test('missing FCM token reports registration failure', async () => {
    const h = harness({ getToken: async () => '' });
    await assert.rejects(h.syncDeviceToken(), /Не удалось получить токен/);
    assert.equal(h.registrations.length, 0);
});
