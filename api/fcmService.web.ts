import { getApps, initializeApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage, deleteToken } from 'firebase/messaging';
import Toast from 'react-native-toast-message';
import { apiClient } from './api';
import { AuthManager } from './auth';

const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
const vapidKey = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY;
let workerPromise: Promise<ServiceWorkerRegistration> | undefined;

export function registerServiceWorker() {
    if (!workerPromise) {
        const query = new URLSearchParams();
        if (Object.values(firebaseConfig).every(Boolean)) query.set('firebase', JSON.stringify(firebaseConfig));
        workerPromise = navigator.serviceWorker.register(`/pwa/service-worker.js?${query}`, { scope: '/pwa/', updateViaCache: 'none' })
            .then(async (registration) => {
                if (!registration.active) {
                    const worker = registration.installing || registration.waiting;
                    if (!worker) throw new Error('Service worker недоступен');
                    await new Promise<void>((resolve, reject) => {
                        const check = () => {
                            if (worker.state === 'activated') { worker.removeEventListener('statechange', check); resolve(); }
                            if (worker.state === 'redundant') { worker.removeEventListener('statechange', check); reject(new Error('Ошибка активации service worker')); }
                        };
                        worker.addEventListener('statechange', check);
                        check();
                    });
                }
                return registration;
            }).catch((error) => { workerPromise = undefined; throw error; });
    }
    return workerPromise;
}

async function getWebMessaging() {
    if (!window.isSecureContext || !(await isSupported())) throw new Error('Push недоступен в этом браузере. На iOS откройте PWA с главного экрана');
    if (!Object.values(firebaseConfig).every(Boolean) || !vapidKey) throw new Error('Не настроены Firebase Web config и VAPID-ключ');
    const app = getApps().find((item) => item.name === 'pwa') || initializeApp(firebaseConfig, 'pwa');
    return getMessaging(app);
}

let permissionRequestPromise: Promise<boolean> | undefined;
export async function requestUserPermission() {
    if (typeof Notification === 'undefined') throw new Error('Браузер не поддерживает уведомления');
    if (Notification.permission !== 'default') return Notification.permission === 'granted';
    if (!permissionRequestPromise) {
        // Call before any await so Safari keeps the user's activation.
        permissionRequestPromise = Notification.requestPermission()
            .then((permission) => permission === 'granted')
            .finally(() => { permissionRequestPromise = undefined; });
    }
    return permissionRequestPromise;
}

export async function getFCMToken() {
    const messaging = await getWebMessaging();
    return getToken(messaging, { vapidKey, serviceWorkerRegistration: await registerServiceWorker() });
}

export async function registerDeviceToken(token: string) {
    return apiClient.post('/api/device/register', { token, platform: 'web' });
}

let syncPromise: Promise<void> | undefined;
export function syncDeviceToken() {
    if (!syncPromise) {
        syncPromise = (async () => {
            if (!AuthManager.getToken() || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
            const userId = AuthManager.getUserId();
            const token = await getFCMToken();
            if (token && AuthManager.getToken() && AuthManager.getUserId() === userId) await registerDeviceToken(token);
        })().finally(() => { syncPromise = undefined; });
    }
    return syncPromise;
}

let permissionPromptShown = false;
// The root layout owns this listener so it survives navigation away from index.
export function setupWebNotifications(onPermissionPrompt?: (visible: boolean) => void) {
    let disposed = false;
    let messagingReady = false;
    let unsubscribe: (() => void) | undefined;
    if ('serviceWorker' in navigator) registerServiceWorker().catch(console.error);
    const sync = () => {
        if (disposed) return;
        if (!AuthManager.getToken() || typeof Notification === 'undefined') {
            onPermissionPrompt?.(false);
            return;
        }
        if (Notification.permission !== 'default') onPermissionPrompt?.(false);
        if (!messagingReady) return;
        if (Notification.permission === 'default' && onPermissionPrompt && !permissionPromptShown) {
            permissionPromptShown = true;
            onPermissionPrompt(true);
        }
        if (Notification.permission === 'granted') syncDeviceToken().catch(console.error);
    };
    const removeAuthListener = AuthManager.addListener((token) => {
        if (!token) {
            onPermissionPrompt?.(false);
            // Invalidate the subscription even without a backend unregister endpoint.
            getWebMessaging().then(deleteToken).catch(console.error);
        }
        if (token) sync();
    });
    Promise.all([getWebMessaging(), AuthManager.loadTokensFromStorage()]).then(([messaging]) => {
        if (disposed) return;
        messagingReady = true;
        unsubscribe = onMessage(messaging, (message) => {
            if (!AuthManager.getToken()) return;
            let headerTitle = message.notification?.title || 'Новое уведомление';
            let mainText = message.notification?.body || message.data?.body || 'Текст отсутствует';
            let subText = '';
            try {
                const payload = JSON.parse(message.data?.payload || '{}');
                if (payload.type) headerTitle = payload.type === 'event' ? 'Напоминание о событии' : 'Напоминание о дедлайне';
                mainText = payload.data?.Title || mainText;
                subText = payload.data?.StartAt || '';
            } catch { /* Standard FCM notification. */ }
            Toast.show({ type: 'customNotification', text1: headerTitle, props: { title: mainText, time: subText } });
        });
        sync();
    }).catch(console.warn);
    window.addEventListener('focus', sync);
    window.addEventListener('online', sync);
    return () => {
        disposed = true;
        unsubscribe?.();
        removeAuthListener();
        window.removeEventListener('focus', sync);
        window.removeEventListener('online', sync);
    };
}
