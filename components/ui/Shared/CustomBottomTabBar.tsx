import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import {Building2, Calendar, Folder, House, ListTodo, User} from "lucide-react-native";
import { useTheme } from "@/context/ThemeContext";
import { usePathname, useRouter, useSegments } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';

const menuItems = [
    { name: 'DashboardScreen', href: '/(screens)/DashboardScreen', Icon: House, label: 'Главная' },
    { name: 'EventsScreen', href: '/(screens)/EventsScreen', Icon: Calendar, label: 'События' },
    { name: 'TaskBoardScreen', href: '/(screens)/TaskBoardScreen', Icon: ListTodo, label: 'Задачи' },
    { name: 'CatalogScreen', href: '/(screens)/CatalogScreen', Icon: Folder, label: 'Каталог' },
    { name: 'UsersScreen', href: '/(screens)/UsersScreen', Icon: User, label: 'Аккаунты' },
    { name: 'DepartmentsScreen', href: '/(screens)/DepartmentsScreen', Icon: Building2, label: 'Отделы' },
] as const;

function TabButton({ isFocused, onPress, Icon, label }: {
    isFocused: boolean;
    onPress: () => void;
    Icon: LucideIcon;
    label: string;
}) {
    const { colors } = useTheme();
    const color = isFocused ? colors.actionIconColor.tasks : colors.subtext;

    return (
        <TouchableOpacity
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: isFocused }}
            aria-selected={isFocused}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.65}
        >
            <View pointerEvents="none" style={styles.tabContentWrapper}>
                <View style={styles.iconContainer}>
                    <Icon size={22} color={color} strokeWidth={isFocused ? 2.25 : 1.8} />
                </View>
                <Text style={[styles.labelStyle, { color, fontWeight: isFocused ? '600' : '500' }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                    {label}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

export function CustomBottomTabBar({ insets, role }: { insets: EdgeInsets; role: string | null }) {
    const { colors } = useTheme();
    const router = useRouter();
    const pathname = usePathname();
    const segments = useSegments();

    return (
        <View
            style={[
                styles.tabBarContainer,
                {
                    backgroundColor: colors.card,
                    borderTopColor: colors.border,
                    paddingBottom: Math.max(insets.bottom, 8),
                    paddingLeft: insets.left,
                    paddingRight: insets.right,
                },
            ]}
        >
            <View
                accessibilityRole="tablist"
                accessibilityLabel="Основная навигация"
                style={styles.tabs}
            >
                {menuItems.map(({ name, href, Icon, label }) => {
                    if (name === 'DepartmentsScreen' && role !== 'Admin') return null;
                    const isFocused = segments[1] === name;

                    return (
                        <TabButton
                            key={name}
                            isFocused={isFocused}
                            onPress={() => {
                                if (pathname !== `/${name}`) router.push(href);
                            }}
                            Icon={Icon}
                            label={label}
                        />
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    tabBarContainer: {
        // Панель занимает собственное место под областью экранов.
        flexShrink: 0,
        alignSelf: 'stretch',
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingTop: 6,
        alignItems: "center",
        justifyContent: "center",
    },
    tabs: {
        flexDirection: "row",
        width: "100%",
        maxWidth: 720,
        height: 56,
        paddingHorizontal: 4,
    },
    tabItem: {
        flex: 1,
        minWidth: 0,
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
    },
    tabContentWrapper: {
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
    },
    iconContainer: {
        width: 44,
        height: 30,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
    },
    labelStyle: {
        fontSize: 10,
        lineHeight: 14,
        marginTop: 3,
    },
});
