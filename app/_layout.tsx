import "@/store/netinfo-config";
import { Stack } from "expo-router"
import Toast from "react-native-toast-message";
import {toastConfig} from "@/components/Toast/toastConfig";
import React, { useEffect } from "react";
import { ThemeProvider } from "@/context/ThemeContext";
import {SafeAreaProvider} from "react-native-safe-area-context";
import { Platform } from "react-native";

const StackLayout = () => {
    useEffect(() => {
        if (Platform.OS !== 'web') return;
        let disposed = false;
        let cleanup: (() => void) | undefined;
        import('@/api/fcmService.web').then(({ setupWebNotifications }) => {
            if (!disposed) cleanup = setupWebNotifications();
        }).catch(console.error);
        return () => { disposed = true; cleanup?.(); };
    }, []);
    return (
        <SafeAreaProvider>
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
