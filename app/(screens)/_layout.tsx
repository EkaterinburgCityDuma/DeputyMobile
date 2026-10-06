import { Stack, useRouter } from "expo-router";
import { ActivityIndicator, Platform, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthManager } from "@/api/auth";
import { CustomBottomTabBar } from "@/components/ui/Shared/CustomBottomTabBar";

export default function AppLayout() {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const router = useRouter();
    const reducedMotion = useReducedMotion();
    const [authReady, setAuthReady] = useState(false);
    const [role, setRole] = useState(AuthManager.getRole());

    useEffect(() => {
        const updateRole = async () => {
            await AuthManager.loadTokensFromStorage();
            setRole(AuthManager.getRole());
            if (AuthManager.getToken()) setAuthReady(true);
            else router.replace('/login');
        };
        updateRole();

        return AuthManager.addListener(() => {
            setRole(AuthManager.getRole());
        });
    }, [router]);

    if (!authReady) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}><ActivityIndicator color={colors.accent} /></View>;

    return (
        <View style={{ flex: 1, width: '100%', maxWidth: Platform.OS === 'web' ? 960 : undefined, alignSelf: 'center', backgroundColor: colors.background }}>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: reducedMotion ? 'none' : 'slide_from_right', animationDuration: 240 }} />
            <CustomBottomTabBar insets={insets} role={role} />
        </View>
    );
}
