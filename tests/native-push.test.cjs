const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers.cjs');

function permissions(os, version, granted = false, result = 'granted') {
    const calls = [];
    const service = load('api/fcmService.ts', {
        'react-native': {
            Platform: { OS: os, Version: version },
            PermissionsAndroid: {
                PERMISSIONS: { POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS' },
                RESULTS: { GRANTED: 'granted' },
                check: async () => granted,
                request: async (permission) => { calls.push(permission); return result; },
            },
        },
        '@/api/api': { apiClient: {} },
        '@react-native-firebase/messaging': {
            getMessaging: () => ({}), setBackgroundMessageHandler: () => {},
            AuthorizationStatus: { AUTHORIZED: 1, PROVISIONAL: 2 },
            requestPermission: async () => { calls.push('firebase'); return 1; },
        },
    });
    return { ...service, calls };
}

test('Android 13 requests the OS notification permission', async () => {
    const h = permissions('android', 33);
    assert.equal(await h.requestUserPermission(), true);
    assert.deepEqual(h.calls, ['android.permission.POST_NOTIFICATIONS']);
});

test('Android notification denial is respected', async () => {
    const h = permissions('android', 34, false, 'denied');
    assert.equal(await h.requestUserPermission(), false);
});

test('Android does not prompt again when permission is already granted', async () => {
    const h = permissions('android', 33, true);
    assert.equal(await h.requestUserPermission(), true);
    assert.deepEqual(h.calls, []);
});

test('iOS retains the Firebase permission flow', async () => {
    const h = permissions('ios', '18.0');
    assert.equal(await h.requestUserPermission(), true);
    assert.deepEqual(h.calls, ['firebase']);
});
