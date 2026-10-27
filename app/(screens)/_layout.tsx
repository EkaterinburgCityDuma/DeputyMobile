import { Stack } from "expo-router";
import { View } from 'react-native';
import React, { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthManager } from "@/api/auth";
import { CustomBottomTabBar } from "@/components/ui/Shared/CustomBottomTabBar";

export default function AppLayout() {
    const insets = useSafeAreaInsets();
    const [role, setRole] = useState(AuthManager.getRole());

    useEffect(() => {
        const updateRole = async () => {
            await AuthManager.loadTokensFromStorage();
            setRole(AuthManager.getRole());
        };
        updateRole();

        return AuthManager.addListener(() => {
            setRole(AuthManager.getRole());
        });
    }, []);

    return (
        <View style={{ flex: 1 }}>
            <View style={{ flex: 1, minHeight: 0 }}>
                <Stack screenOptions={{ headerShown: false }} />
            </View>
            <CustomBottomTabBar insets={insets} role={role} />
        </View>
    );
}
