import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Building2, Calendar, Folder, House, ListTodo, User, LucideIcon } from 'lucide-react-native';
import Animated, { interpolateColor, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { usePathname, useRouter, useSegments } from 'expo-router';
import type { EdgeInsets } from 'react-native-safe-area-context';
import { MotionPressable } from './Motion';

const menuItems = [
    { name: 'DashboardScreen', href: '/(screens)/DashboardScreen', Icon: House, label: 'Главная' },
    { name: 'EventsScreen', href: '/(screens)/EventsScreen', Icon: Calendar, label: 'События' },
    { name: 'TaskBoardScreen', href: '/(screens)/TaskBoardScreen', Icon: ListTodo, label: 'Задачи' },
    { name: 'CatalogScreen', href: '/(screens)/CatalogScreen', Icon: Folder, label: 'Каталог' },
    { name: 'UsersScreen', href: '/(screens)/UsersScreen', Icon: User, label: 'Аккаунты' },
    { name: 'DepartmentsScreen', href: '/(screens)/DepartmentsScreen', Icon: Building2, label: 'Отделы' },
] as const;

function TabButton({ selected, onPress, Icon, label }: { selected: boolean; onPress: () => void; Icon: LucideIcon; label: string }) {
    const { colors } = useTheme();
    const progress = useSharedValue(selected ? 1 : 0);
    React.useEffect(() => { progress.value = withTiming(selected ? 1 : 0, { duration: 180, reduceMotion: ReduceMotion.System }); }, [selected, progress]);
    const highlight = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(progress.value, [0, 1], ['transparent', colors.roleBadge]) }));
    const color = selected ? colors.roleText : colors.subtext;
    return (
        <MotionPressable accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress} style={styles.tab}>
            <Animated.View style={[styles.icon, highlight]}>
                <Icon size={22} strokeWidth={selected ? 2.2 : 1.8} color={color} />
            </Animated.View>
            <Text numberOfLines={1} style={[styles.label, { color, fontWeight: selected ? '700' : '500' }]}>{label}</Text>
        </MotionPressable>
    );
}

export function CustomBottomTabBar({ insets, role }: { insets: EdgeInsets; role: string | null }) {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const pathname = usePathname();
    const segments = useSegments();
    return (
        <View pointerEvents="box-none" style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={[styles.bar, { backgroundColor: colors.card, borderColor: colors.border, shadowOpacity: isDark ? 0.25 : 0.09 }]}>
                {menuItems.filter(item => item.name !== 'DepartmentsScreen' || role === 'Admin').map(({ name, href, Icon, label }) => (
                    <TabButton key={name} selected={segments[1] === name} Icon={Icon} label={label}
                        onPress={() => { if (pathname !== `/${name}`) router.push(href); }} />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { position: Platform.OS === 'web' ? 'fixed' : 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', zIndex: 1000, paddingHorizontal: 12 },
    bar: { flexDirection: 'row', width: '100%', maxWidth: 640, height: 74, paddingHorizontal: 4, borderRadius: 22, borderWidth: 1, shadowColor: '#10251a', shadowOffset: { width: 0, height: 6 }, shadowRadius: 24, elevation: 8 },
    tab: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 4 },
    icon: { width: 44, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    label: { fontSize: 10, lineHeight: 14 },
});
