import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const xAppSecret = process.env.EXPO_PUBLIC_X_APP_SECRET || "AAUMisSb1yxKapDSZbWKvNCUEFQJaM7Zwa4ViPSxMhGsi9bWk7mJBjOlvc9w";
const apiUrl = (process.env.EXPO_PUBLIC_API_URL || "https://ddc.egd.ru").replace(/\/+$/, "");

class StorageAdapter {
    private static isWeb = Platform.OS === 'web';

    static async getItem(key: string): Promise<string | null> {
        if (this.isWeb && typeof window !== 'undefined' && window.localStorage) {
            return localStorage.getItem(key);
        }
        return await AsyncStorage.getItem(key);
    }

    static async setItem(key: string, value: string): Promise<void> {
        if (this.isWeb && typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem(key, value);
            return;
        }
        await AsyncStorage.setItem(key, value);
    }

    static async multiSet(keyValuePairs: [string, string][]): Promise<void> {
        if (this.isWeb && typeof window !== 'undefined' && window.localStorage) {
            keyValuePairs.forEach(([key, value]) => localStorage.setItem(key, value));
            return;
        }
        await AsyncStorage.multiSet(keyValuePairs);
    }

    static async multiRemove(keys: string[]): Promise<void> {
        if (this.isWeb && typeof window !== 'undefined' && window.localStorage) {
            keys.forEach(key => localStorage.removeItem(key));
            return;
        }
        await AsyncStorage.multiRemove(keys);
    }
}

export class TokenRefreshError extends Error {
    constructor(message: string, public readonly status?: number) {
        super(message);
        this.name = 'TokenRefreshError';
    }
}

type UserRole = string | { role?: { name?: string } | null };

export class AuthManager {
    private static token: string | null = null;
    private static refreshToken: string | null = null;
    private static role: string | null = null;
    private static userId: string | null = null;
    private static listeners: ((token: string | null) => void)[] = [];
    private static initPromise: Promise<void> | null = null;
    private static refreshPromise: Promise<string | null> | null = null;
    private static sessionVersion = 0;

    private static async readStorage() {
        const version = this.sessionVersion;
        const [token, refreshToken, role, userId] = await Promise.all([
            StorageAdapter.getItem('authToken'),
            StorageAdapter.getItem('refreshToken'),
            StorageAdapter.getItem('userRole'),
            StorageAdapter.getItem('userId'),
        ]);
        if (version !== this.sessionVersion) return;
        this.token = token;
        this.refreshToken = refreshToken;
        this.role = role;
        this.userId = userId;
    }

    static loadTokensFromStorage() {
        return this.initialize();
    }

    static getToken() { return this.token; }
    static getRefreshToken() { return this.refreshToken; }
    static getRole() { return this.role; }
    static getUserId() { return this.userId; }

    static isInitialized() {
        return this.initPromise !== null;
    }

    static initialize() {
        if (!this.initPromise) {
            this.initPromise = this.readStorage().catch((error) => {
                this.initPromise = null;
                throw error;
            });
        }
        return this.initPromise;
    }

    static addListener(listener: (token: string | null) => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter((item) => item !== listener);
        };
    }

    static async setAuth(token: string, refreshToken: string, userId: string, roles: UserRole[], expectedVersion?: number) {
        await this.initialize();
        // Ignore a response belonging to a session that was logged out or replaced.
        if (expectedVersion !== undefined && expectedVersion !== this.sessionVersion) return false;
        if (!token || !refreshToken || !userId) throw new TokenRefreshError('Incomplete authentication response');
        const version = ++this.sessionVersion;
        this.token = token;
        this.refreshToken = refreshToken;
        this.userId = userId;
        const firstRole = roles[0];
        this.role = typeof firstRole === 'string' ? firstRole : firstRole?.role?.name || null;

        await StorageAdapter.multiSet([
            ['authToken', token],
            ['refreshToken', refreshToken],
            ['userId', userId],
            ['userRole', this.role || ''],
        ]);
        if (version === this.sessionVersion) this.notifyListeners();
        return true;
    }

    static async clearAuth() {
        await this.initialize();
        const version = ++this.sessionVersion;
        this.token = null;
        this.refreshToken = null;
        this.role = null;
        this.userId = null;
        await StorageAdapter.multiRemove(['authToken', 'refreshToken', 'userRole', 'userData', 'userId']);
        if (version === this.sessionVersion) this.notifyListeners();
    }

    static refreshAuthTokens(failedAccessToken?: string): Promise<string | null> {
        if (!this.refreshPromise) {
            const refresh = async () => {
                await this.initialize();
                // The other tab may already have rotated the pair while we waited for the lock.
                if (Platform.OS === 'web') await this.readStorage();
                if (!this.token || !this.refreshToken) return null;
                if (failedAccessToken && failedAccessToken !== this.token) return this.token;
                const version = this.sessionVersion;
                const accessToken = this.token;
                const refreshToken = this.refreshToken;
                const response = await fetch(`${apiUrl}/api/Auth/refresh`, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'X-App-Secret': xAppSecret,
                    },
                    body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken }),
                });
                if (version !== this.sessionVersion) throw new TokenRefreshError('Session changed during refresh');
                if (!response.ok) throw new TokenRefreshError('Token refresh failed', response.status);
                const data = await response.json();
                const saved = await this.setAuth(
                    data.token,
                    data.refresh_token,
                    data.user?.id || this.userId,
                    data.user?.user_roles || (this.role ? [this.role] : []),
                    version,
                );
                return saved ? this.token : null;
            };
            // Web Locks serialize rotating refresh tokens across tabs of this origin.
            const pending = (async () => {
                if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.locks) {
                    return await navigator.locks.request('deputy-auth-refresh', refresh);
                }
                return await refresh();
            })();
            this.refreshPromise = pending.finally(() => { this.refreshPromise = null; });
        }
        return this.refreshPromise;
    }

    private static notifyListeners() {
        this.listeners.forEach((listener) => listener(this.token));
    }
}
