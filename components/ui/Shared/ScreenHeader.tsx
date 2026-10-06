import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, LucideIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { MotionPressable } from './Motion';
import { LinearGradient } from 'expo-linear-gradient';

interface ScreenHeaderProps {
    title: string;
    subtitle?: string;
    icon?: LucideIcon;
    onBack?: () => void;
    actions?: React.ReactNode;
    overlap?: boolean;
    stacked?: boolean;
}

export function ScreenHeader({ title, subtitle, icon: Icon, onBack, actions, overlap = true, stacked = false }: ScreenHeaderProps) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const leading = onBack ? (
                <MotionPressable accessibilityLabel="Назад" onPress={onBack} style={[styles.icon, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
                    <ArrowLeft size={22} color="#ffffff" />
                </MotionPressable>
            ) : Icon ? (
                <View style={[styles.icon, { backgroundColor: 'rgba(255,255,255,0.16)' }]}><Icon size={23} color="#ffffff" /></View>
            ) : null;
    const copy = <View style={styles.copy}>
                <Text accessibilityRole="header" style={[styles.title, { color: '#ffffff' }]}>{title}</Text>
                {!!subtitle && <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.82)' }]}>{subtitle}</Text>}
            </View>;
    return (
        <LinearGradient colors={[colors.primary, colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, stacked && styles.stacked, { paddingTop: insets.top + 20, paddingBottom: overlap ? 44 : 20 }]}>
            {stacked ? <><View style={styles.toolbar}>{leading}<View style={styles.actions}>{actions}</View></View>{copy}</> : <>{leading}{copy}{actions && <View style={styles.actions}>{actions}</View>}</>}
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 12, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
    icon: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    copy: { flex: 1, minWidth: 0 },
    title: { fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.6 },
    subtitle: { fontSize: 13, lineHeight: 19, marginTop: 3 },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    stacked: { flexDirection: 'column', alignItems: 'stretch', gap: 20 },
    toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
