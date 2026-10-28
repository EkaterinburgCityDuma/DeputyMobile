import React, {useEffect, useState} from 'react';
import {AuthManager} from "@/api/auth";
import {useRouter, usePathname} from 'expo-router';
import {requestUserPermission, registerDeviceToken, getFCMToken} from "@/api/fcmService"
import { getMessaging, onMessage, onTokenRefresh } from '@react-native-firebase/messaging';
import {YamapInstance} from "react-native-yamap-plus";
import Toast from "react-native-toast-message";

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

const messagingInstance = getMessaging();

const AppNative: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

    useEffect(() => {
        YamapInstance.setLocale('ru_RU');
        YamapInstance.init(process.env.EXPO_PUBLIC_YAMAP_API_KEY!);

        const init = async () => {
            await AuthManager.loadTokensFromStorage();
            setIsAuthenticated(!!AuthManager.getToken());
        };
        init();

        return AuthManager.addListener((token) => {
            setIsAuthenticated(!!token);
        });
    }, []);

    useEffect(() => {
        if (!isAuthenticated) return;

        let disposed = false;
        let unsubscribeOnMessage: (() => void) | undefined;
        let unsubscribeOnTokenRefresh: (() => void) | undefined;

        const setupNotifications = async () => {
            const hasPermission = await requestUserPermission();
            if (!hasPermission || disposed) return;

            const fcmToken = await getFCMToken();
            if (disposed) return;
            const authToken = AuthManager.getToken();

            if (fcmToken && authToken) {
                await registerDeviceToken(fcmToken);
            }
            if (disposed) return;

            unsubscribeOnMessage = onMessage(messagingInstance, async (remoteMessage) => {
                try {
                    let headerTitle = remoteMessage.notification?.title || 'Новое уведомление';
                    let mainText = remoteMessage.notification?.body || 'Текст отсутствует';
                    let subText = '';

                    if (remoteMessage.data && typeof remoteMessage.data.payload === 'string') {
                        try {
                            const payload = JSON.parse(remoteMessage.data.payload);
                            const eventData = payload.data || {};
                            headerTitle = payload.type === 'event' ? 'Напоминание о событии' : 'Напоминание о дедлайне';
                            mainText = eventData.Title || mainText;
                            subText = eventData.StartAt || '';
                        } catch (e) {}
                    }

                    Toast.show({
                        type: 'customNotification',
                        text1: headerTitle,
                        props: { title: mainText, time: subText },
                    });
                } catch (e) {
                    console.error("Critical error in onMessage:", e);
                }
            });

            unsubscribeOnTokenRefresh = onTokenRefresh(messagingInstance, async (newFcmToken) => {
                const authToken = AuthManager.getToken();
                if (authToken) {
                    await registerDeviceToken(newFcmToken);
                }
            });
        };

        setupNotifications().catch((error) => console.error('Notification setup failed:', error));

        return () => {
            disposed = true;
            if (unsubscribeOnMessage) unsubscribeOnMessage();
            if (unsubscribeOnTokenRefresh) unsubscribeOnTokenRefresh();
        };
    }, [isAuthenticated]);

    useProtectedRoute(isAuthenticated);

    return null;
};

export default AppNative;
