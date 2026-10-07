import React from "react";
import { Platform, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { BlurView } from "expo-blur";
import {Building2, Calendar, Folder, House, ListTodo, User} from "lucide-react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useTheme } from "@/context/ThemeContext";
import { usePathname, useRouter, useSegments } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';

const menuItems = [
    { name: 'DashboardScreen', href: '/(screens)/DashboardScreen', Icon: House, label: 'главная' },
    { name: 'EventsScreen', href: '/(screens)/EventsScreen', Icon: Calendar, label: 'события' },
    { name: 'TaskBoardScreen', href: '/(screens)/TaskBoardScreen', Icon: ListTodo, label: 'задачи' },
    { name: 'CatalogScreen', href: '/(screens)/CatalogScreen', Icon: Folder, label: 'каталог' },
    { name: 'UsersScreen', href: '/(screens)/UsersScreen', Icon: User, label: 'аккаунты' },
    { name: 'DepartmentsScreen', href: '/(screens)/DepartmentsScreen', Icon: Building2, label: 'отделы' },
] as const;

const SPRING_CONFIG = {
    damping: 15, // Затухание
    stiffness: 150, // Жесткость
    mass: 0.5, // Масса
};

function TabButton({ isFocused, onPress, color, Icon, label }: {
    isFocused: boolean;
    onPress: () => void;
    color: string;
    Icon: LucideIcon;
    label: string;
}) {
    const scaleValue = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scaleValue.value }],
        };
    });

    const handlePressIn = () => {
        scaleValue.value = withSpring(0.8, SPRING_CONFIG); // Уменьшаем до 0.9
    };

    const handlePressOut = () => {
        scaleValue.value = withSpring(1, SPRING_CONFIG);
    };

    return (
        <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={styles.tabItem}
            activeOpacity={1}
        >
            <Animated.View style={[styles.tabContentWrapper, animatedStyle]}>
                <View pointerEvents="none">
                    <Icon size={22} color={color} />
                </View>
                <Text style={[styles.labelStyle, { color }]} numberOfLines={1}>
                    {label}
                </Text>
            </Animated.View>
        </TouchableOpacity>
    );
}

export function CustomBottomTabBar({ insets, role }: { insets: EdgeInsets; role: string | null }) {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const pathname = usePathname();
    const segments = useSegments();

    return (
        <View nativeID="app-bottom-navigation" style={[styles.tabBarContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 20 }]}>
            <BlurView
                intensity={isDark ? 50 : 30}
                tint={isDark ? "dark" : "light"}
                style={[
                    styles.blurView,
                    {
                        backgroundColor: Platform.OS === "android"
                            ? (isDark ? "rgba(30, 41, 59, 0.85)" : "rgba(255,255,255,0.85)")
                            : (isDark ? "rgba(30, 41, 59, 0.4)" : "rgba(255,255,255,0.4)"),
                        borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                    }
                ]}
            >
                {menuItems.map(({ name, href, Icon, label }) => {
                    if (name === 'DepartmentsScreen' && role !== 'Admin') return null;
                    const isFocused = segments[1] === name;
                    const activeColor = isDark ? "#4ade80" : "#2A6E3F";
                    const color = isFocused ? activeColor : colors.subtext;

                    return (
                        <TabButton
                            key={name}
                            isFocused={isFocused}
                            onPress={() => {
                                if (pathname !== `/${name}`) router.push(href);
                            }}
                            color={color}
                            Icon={Icon}
                            label={label}
                        />
                    );
                })}
            </BlurView>
        </View>
    );
}

const styles = StyleSheet.create({
    tabBarContainer: {
        // Панель закреплена в контейнере приложения, вне прокручиваемого экрана.
        position: "absolute",
        bottom: 0,
        left: 0, // Добавь это
        right: 0, // И это
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000, // Чтобы быть поверх всего
        // Убираем лишний paddingBottom, если он мешает,
        // но оставляем расчет через insets в самом компоненте
    },
    blurView: {
        flexDirection: "row",
        width: "90%",
        height: 65,
        borderRadius: 25,
        overflow: "hidden",
        backgroundColor: Platform.OS === "android" ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.4)",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.3)", // Легкий контур для эффекта стекла
    },
    tabItem: {
        flex: 1, // Растягиваем тач-зону на всю доступную ширину
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
    },
    // Новый стиль: Оболочка только для контента, который нужно масштабировать
    tabContentWrapper: {
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
    },
    labelStyle: {
        fontSize: 10,
        marginTop: 4,
        fontWeight: "600",
    },
});
