import "@/store/netinfo-config";
import { Stack } from "expo-router"
import Toast from "react-native-toast-message";
import {toastConfig} from "@/components/Toast/toastConfig";
import React, { useEffect, useRef, useState } from "react";
import { ThemeProvider } from "@/context/ThemeContext";
import {SafeAreaProvider} from "react-native-safe-area-context";
import { Platform } from "react-native";
import { NotificationPermissionPrompt } from '@/components/Utils/App/NotificationPermissionPrompt';
import App from '@/components/Utils/App/App';

const StackLayout = () => {
    const [permissionPromptVisible, setPermissionPromptVisible] = useState(false);
    const enableWebNotifications = useRef<(() => Promise<void>) | null>(null);
    useEffect(() => {
        if (Platform.OS !== 'web') return;
        let disposed = false;
        let cleanup: (() => void) | undefined;
        import('@/api/fcmService.web').then(({ setupWebNotifications, requestUserPermission, syncDeviceToken }) => {
            if (disposed) return;
            enableWebNotifications.current = async () => {
                if (await requestUserPermission()) await syncDeviceToken();
            };
            cleanup = setupWebNotifications(setPermissionPromptVisible);
        }).catch(console.error);
        return () => { disposed = true; enableWebNotifications.current = null; cleanup?.(); };
    }, []);
    const handleEnableNotifications = () => {
        // Invoke the loaded handler synchronously within the button press on iOS.
        const request = enableWebNotifications.current?.();
        setPermissionPromptVisible(false);
        request?.catch((error) => {
            console.error('Web notification registration failed:', error);
            Toast.show({ type: 'error', text1: 'Не удалось подключить уведомления', text2: 'Попробуем снова при следующем открытии приложения' });
        });
    };
    return (
        <SafeAreaProvider>
            <App />
            <ThemeProvider>
                <Stack>
                    <Stack.Screen
                        name="(screens)"
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="index"
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="login"
                        options={{ headerShown: false }}
                    />
                </Stack>
                <NotificationPermissionPrompt
                    visible={permissionPromptVisible}
                    onAllow={handleEnableNotifications}
                    onDismiss={() => setPermissionPromptVisible(false)}
                />
                <Toast
                    config={toastConfig}
                    position="top"
                    topOffset={Platform.OS === 'ios' ? 50 : 30}
                    visibilityTime={3000}
                />
            </ThemeProvider>
        </SafeAreaProvider>
    );
}

export default StackLayout;
