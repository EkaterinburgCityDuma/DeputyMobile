import React, {useEffect, useState} from 'react';
import {AuthManager} from "@/api/auth";
import {useRouter, usePathname} from 'expo-router';
import { syncDeviceToken } from '@/api/fcmService.web';

function useProtectedRoute(isAuthenticated: boolean | null) {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (isAuthenticated === null) return;
        if (!isAuthenticated && pathname !== '/login') {
            router.replace('/login');
        } else if (isAuthenticated && pathname === '/') {
            router.replace('/(screens)/DashboardScreen');
        }
    }, [isAuthenticated, pathname, router]);
}

const AppWeb: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

    useEffect(() => {
        const init = async () => {
            await AuthManager.loadTokensFromStorage();
            setIsAuthenticated(!!AuthManager.getToken());
            syncDeviceToken().catch(console.error);
        };
        init().catch(console.error);

        const removeAuthListener = AuthManager.addListener((token) => {
            setIsAuthenticated(!!token);
        });
        const onStorage = (event: StorageEvent) => {
            if (!event.key || ['authToken', 'refreshToken', 'userId', 'userRole'].includes(event.key)) {
                AuthManager.loadTokensFromStorage().catch(console.error);
            }
        };
        window.addEventListener('storage', onStorage);
        return () => {
            removeAuthListener();
            window.removeEventListener('storage', onStorage);
        };
    }, []);

    useProtectedRoute(isAuthenticated);

    return null;
};

export default AppWeb;
