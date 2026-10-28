const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const axios = require('axios');

function deferred() {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}
function load(file, mocks, globals = {}) {
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const exports = {};
    vm.runInNewContext(source, {
        exports, require: (id) => id in mocks ? mocks[id] : require(id),
        process: { env: {} }, console, URL, setTimeout, clearTimeout, ...globals,
    }, { filename: file });
    return exports;
}
function harness({ fetch, storageGate, storage = new Map(), navigator = {} } = {}) {
    const toasts = [], redirects = [];
    const localStorage = {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, String(value)),
        removeItem: (key) => storage.delete(key),
    };
    const asyncStorage = {
        getItem: async (key) => { await storageGate?.promise; return localStorage.getItem(key); },
        multiSet: async (entries) => entries.forEach(([key, value]) => localStorage.setItem(key, value)),
        multiRemove: async (keys) => keys.forEach((key) => localStorage.removeItem(key)),
    };
    const auth = load('api/auth.ts', {
        'react-native': { Platform: { OS: storageGate ? 'android' : 'web' } },
        '@react-native-async-storage/async-storage': asyncStorage,
    }, { window: { localStorage }, localStorage, navigator, fetch });
    const { apiClient } = load('api/api.ts', {
        './auth': auth, 'react-native-toast-message': { show: (value) => toasts.push(value) },
        'expo-router': { router: { push: (path) => redirects.push(path), replace: (path) => redirects.push(path) } },
    });
    return { ...auth, apiClient, storage, toasts, redirects };
}
const user = { id: 'user-1', user_roles: [{ role: { name: 'Admin' } }] };
const success = (token = 'new-access', refresh_token = 'new-refresh') => ({
    ok: true, status: 200, json: async () => ({ token, refresh_token, user }),
});
function unauthorized(config) {
    throw new axios.AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, {}, {
        status: 401, statusText: 'Unauthorized', headers: {}, data: {}, config,
    });
}
async function login(h) {
    await h.AuthManager.setAuth('old-access', 'old-refresh', user.id, user.user_roles);
}


module.exports = { harness, deferred, load, login, success, unauthorized, user };
