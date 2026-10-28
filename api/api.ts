import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { AuthManager, TokenRefreshError, xAppSecret } from './auth';
import Toast from 'react-native-toast-message';
import { router } from 'expo-router';

export { xAppSecret } from './auth';

export const apiUrl = (process.env.EXPO_PUBLIC_API_URL || 'https://ddc.egd.ru').replace(/\/+$/, '');

export const apiClient: AxiosInstance = axios.create({
    baseURL: apiUrl,
    headers: { 'X-App-Secret': xAppSecret, 'Content-Type': 'application/json' },
});

type AuthRequest = InternalAxiosRequestConfig & { _retry?: boolean; _authUserId?: string | null };
const isAuthRequest = (url?: string) => /\/Auth\/(login|refresh)(?:[?#]|$)/i.test(url || '');

apiClient.interceptors.request.use(async (config: AuthRequest) => {
    await AuthManager.initialize();
    const token = AuthManager.getToken();
    if (token && !isAuthRequest(config.url)) config.headers.Authorization = `Bearer ${token}`;
    else delete config.headers.Authorization;
    if (!config._retry) config._authUserId = AuthManager.getUserId();
    return config;
});

let logoutPromise: Promise<void> | null = null;
function expireSession() {
    if (!logoutPromise) {
        logoutPromise = (async () => {
            await AuthManager.clearAuth();
            Toast.show({ type: 'error', text1: 'Сессия истекла', text2: 'Пожалуйста, войдите снова' });
            router.replace('/login');
        })().finally(() => { logoutPromise = null; });
    }
    return logoutPromise;
}

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const request: AuthRequest | undefined = error.config;
        if (!error.response) {
            Toast.show({ type: 'error', text1: 'Ошибка сети', text2: 'Проверьте подключение к интернету' });
            return Promise.reject(error);
        }
        if (error.response.status !== 401 || !request || request._retry || isAuthRequest(request.url)) {
            return Promise.reject(error);
        }
        request._retry = true;
        const failedToken = String(request.headers.Authorization || '').replace(/^Bearer /, '');
        const userId = request._authUserId;
        let newToken: string | null;
        try {
            newToken = await AuthManager.refreshAuthTokens(failedToken);
            if (!newToken) throw new TokenRefreshError('No refresh credentials', 401);
        } catch (refreshError) {
            // Network failures, 5xx and malformed responses must not destroy a recoverable session.
            const invalid = refreshError instanceof TokenRefreshError &&
                (refreshError.status === 401 || refreshError.status === 403);
            if (invalid && AuthManager.getToken() && AuthManager.getUserId() === userId) {
                await expireSession();
            }
            return Promise.reject(refreshError);
        }
        // Never replay a previous user's request after switching accounts.
        if (AuthManager.getUserId() !== userId) return Promise.reject(error);
        request.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(request);
    },
);
