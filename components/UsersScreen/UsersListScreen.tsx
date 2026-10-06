import { ScreenHeader } from '@/components/ui/Shared/ScreenHeader';
import { Button } from '@/components/ui/Shared/Button';
import { Users } from 'lucide-react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, StatusBar, RefreshControl, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Profile } from "@/models/ProfileModel";
import { renderUserItem } from "@/components/UsersScreen/RenderUserItem";
import { declOfNum } from "@/utils";

import { Search } from "@/components/ui/Shared/Search";
import { useTheme } from '@/context/ThemeContext';

import { useUsersStore } from '@/store/useUsersStore';
import { SkeletonLoader } from "@/components/ui/Shared/SkeletonLoader";
import { AuthManager } from '@/api/auth';

const UsersListScreen = () => {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [currentRole, setCurrentRole] = useState(() => AuthManager.getRole());
    const canCreateUser = currentRole === 'Admin';

    useEffect(() => {
        return AuthManager.addListener(() => setCurrentRole(AuthManager.getRole()));
    }, []);

    const { users, isLoading: loading, fetchUsers } = useUsersStore();
    const [filteredUsers, setFilteredUsers] = useState<Profile[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    // Добавляем недостающие состояния для фильтрации
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    // Выносим фильтрацию в отдельную функцию, чтобы не дублировать логику
    const applyFilters = useCallback((allUsers: Profile[], query: string, role: string) => {
        let result = [...allUsers];

        if (role !== 'all') {
            result = result.filter(u => u.roles && u.roles.includes(role));
        }

        if (query.trim()) {
            const lowerQuery = query.toLowerCase();
            result = result.filter(u =>
                u.full_name?.toLowerCase().includes(lowerQuery) ||
                u.email?.toLowerCase().includes(lowerQuery)
            );
        }

        setFilteredUsers(result);
    }, []);

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        applyFilters(users, searchQuery, roleFilter);
    }, [users, searchQuery, roleFilter, applyFilters]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchUsers(true);
        setRefreshing(false);
    };


    return (
        <View style={{ flex: 1, backgroundColor: colors.background, paddingBottom: insets.bottom + 50 }}>
            <StatusBar barStyle="light-content" translucent />

            <ScreenHeader title="Аккаунты" icon={Users}
                subtitle={loading ? 'Загрузка…' : `${filteredUsers.length} ${declOfNum(filteredUsers.length, ['человек', 'человека', 'человек'])}`}
                actions={canCreateUser ? <Button solid iconName="Plus" label="Создать пользователя" onClick={() => router.push('/(screens)/UsersScreen/CreateUserScreen')} /> : undefined} />

            <Search
                placeholder={"Имя или email"}
                searchQuery={searchQuery}
                onChangeText={(t) => {
                    setSearchQuery(t);
                    applyFilters(users, t, roleFilter);
                }}
            />

            {loading && !refreshing ? (
                <ScrollView
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
                    }
                >
                    <SkeletonLoader count={6} itemHeight={70} itemMargin={12} />
                </ScrollView>
            ) : (
                <FlatList
                    data={filteredUsers}
                    keyExtractor={(item) => item.id}
                    renderItem={renderUserItem}
                    contentContainerStyle={styles.taskList}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
                    }
                    ListEmptyComponent={
                        <View style={[styles.emptyState, { backgroundColor: colors.card, marginHorizontal: 20, padding: 30, borderRadius: 20 }]}>
                            <Ionicons name="people-outline" size={48} color={colors.subtext} />
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>Никого не нашли</Text>
                            <Text style={[styles.emptySubtitle, { color: colors.subtext }]}>Измените параметры поиска</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};

export const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        paddingBottom: 40, // Увеличил padding, чтобы фильтр красиво перекрывал градиент
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
    },
    headerContent: {
        marginLeft: 10
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 1,
    },
    newTaskButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: "auto"
    },
    taskList: { padding: 15, paddingTop: 10 },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 18,
        marginBottom: 12,
        borderWidth: 1,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: { fontWeight: '700', fontSize: 16 },
    userInfo: { flex: 1 },
    userName: { fontSize: 15, fontWeight: '600' },
    jobText: { fontSize: 12, lineHeight: 18, marginTop: 3 },
    roleBadge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, marginLeft: 8 },
    roleBadgeText: { fontSize: 11, fontWeight: '700' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyState: { alignItems: 'center', marginTop: 60 },
    emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 12 },
    emptySubtitle: { fontSize: 14, marginTop: 4 },
});

export default UsersListScreen;
