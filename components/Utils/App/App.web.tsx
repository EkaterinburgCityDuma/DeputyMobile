import React, {useEffect, useState} from 'react';
import {AuthManager} from "@/api/auth";
import {useRouter, usePathname} from 'expo-router';
import {View} from "react-native";
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
        init();

        return AuthManager.addListener((token) => {
            setIsAuthenticated(!!token);
        });
    }, []);

    useProtectedRoute(isAuthenticated);

    return <View />;
};

export default AppWeb;
