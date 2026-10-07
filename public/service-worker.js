self.addEventListener('notificationclick', (event) => {
    event.stopImmediatePropagation();
    event.notification.close();
    const target = new URL('/pwa/NotificationScreen', self.location.origin).href;
    event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
        const client = clients.find((item) => new URL(item.url).pathname.startsWith('/pwa/'));
        if (client) {
            await client.navigate(target);
            return client.focus();
        }
        return self.clients.openWindow(target);
    }));
});

// The app passes public Firebase config when registering this existing worker.
const firebaseConfig = new URL(self.location.href).searchParams.get('firebase');
if (firebaseConfig) {
    importScripts('https://www.gstatic.com/firebasejs/12.0.0/firebase-app-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging-compat.js');
    firebase.initializeApp(JSON.parse(firebaseConfig));
    firebase.messaging().onBackgroundMessage((message) => {
        // Notification payloads are displayed by Firebase automatically.
        if (message.notification) return;
        let title = message.data?.title || 'Новое уведомление';
        let body = message.data?.body || '';
        try {
            const payload = JSON.parse(message.data?.payload || '{}');
            if (payload.type) title = payload.type === 'event' ? 'Напоминание о событии' : 'Напоминание о дедлайне';
            body = payload.data?.Title || body;
        } catch { /* Standard data message. */ }
        return self.registration.showNotification(title, { body, icon: '/pwa/favicon.png' });
    });
}

const CACHE_NAME = 'my-pwa-cache-v2';
const urlsToCache = [
    '/pwa/',
    '/pwa/index.html',
    '/pwa/favicon.png',
    '/pwa/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache).then(() => self.skipWaiting());
        })
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (event.request.method !== 'GET' || url.origin !== self.location.origin ||
        !url.pathname.startsWith('/pwa/') || event.request.headers.has('Authorization')) return;
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request).then(
                    (networkResponse) => {
                        if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }
                        const responseToCache = networkResponse.clone();
                        if (url.pathname.startsWith('/pwa/_expo/') || /\.(png|ico|woff2?)$/.test(url.pathname)) caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        return networkResponse;
                    }
                );
            })
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName.startsWith('my-pwa-cache-') && cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});
