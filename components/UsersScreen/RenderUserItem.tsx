import {Profile} from "@/models/ProfileModel";
import {Text, View} from "react-native";
import { MotionPressable, Reveal } from '@/components/ui/Shared/Motion';
import {Ionicons} from "@expo/vector-icons";
import React from "react";
import { styles } from "./UsersListScreen";
import {router} from "expo-router";
import { useTheme } from "@/context/ThemeContext";

const getRoleLabel = (roles: string[] | null) => {
    const role = roles?.[0];
    switch (role) {
        case 'Admin': return 'Админ';
        case 'Deputy': return 'Депутат';
        case 'Helper': return 'Помощник';
        default: return 'Сотрудник';
    }
};

export const UserItem = ({ item }: { item: Profile }) => {
    const { colors } = useTheme();
    const roleLabel = getRoleLabel(item.roles);

    return (
        <Reveal><MotionPressable
            accessibilityLabel={`Профиль: ${item.full_name || item.email}`}
            style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push({ pathname: '/(screens)/ProfileScreen', params: { id: item.id } })}
        >
            <View style={[styles.avatar, { backgroundColor: colors.roleBadge }]}>
                <Text style={[styles.avatarText, { color: colors.roleText }]}>
                    {(item.full_name || item.email || '?').split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join('').toUpperCase()}
                </Text>
            </View>

            <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                    {item.full_name || 'Без имени'}
                </Text>
                <Text style={[styles.jobText, { color: colors.subtext }]} numberOfLines={1}>
                    {item.job_title || item.email}
                </Text>
            </View>

            <View style={[styles.roleBadge, { backgroundColor: colors.iconBox }]}>
                <Text style={[styles.roleBadgeText, { color: colors.subtext }]}>
                    {roleLabel}
                </Text>
            </View>

            <Ionicons name="chevron-forward" size={18} color={colors.subtext} style={{ marginLeft: 8 }} />
        </MotionPressable></Reveal>
    );
};

export const renderUserItem = ({ item }: { item: Profile }) => <UserItem item={item} />;
