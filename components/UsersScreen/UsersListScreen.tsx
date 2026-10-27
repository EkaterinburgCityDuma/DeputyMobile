import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    StatusBar,
    RefreshControl,
    Platform, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Profile } from "@/models/ProfileModel";
import {renderUserItem} from "@/components/UsersScreen/RenderUserItem";
import {declOfNum} from "@/utils";
import {Plus} from "lucide-react-native";
import {Search} from "@/components/ui/Shared/Search";
import { useTheme } from '@/context/ThemeContext';

import { useUsersStore } from '@/store/useUsersStore';
import {SkeletonLoader} from "@/components/ui/Shared/SkeletonLoader";
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
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <StatusBar barStyle="light-content" translucent />

            <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingTop: insets.top + 15 }]}
            >
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Пользователи</Text>
                    <Text style={styles.headerSubtitle}>
                        {loading ? 'Загрузка...' : `${filteredUsers.length} ${declOfNum(filteredUsers.length, ['человек', 'человека', 'человек'])}`}
                    </Text>
                </View>
                {canCreateUser && <TouchableOpacity
                    style={styles.newTaskButton}
                    onPress={() => router.push('/(screens)/UsersScreen/CreateUserScreen')}
                >
                    <View pointerEvents={"none"}>
                        <Plus size={20} color="white" />
                    </View>
                </TouchableOpacity>}
            </LinearGradient>

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
        padding: 8,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: { fontWeight: '700', fontSize: 16 },
    userInfo: { flex: 1 },
    userName: { fontSize: 15, fontWeight: '600' },
    jobText: { fontSize: 13, marginTop: 1 },
    roleBadge: { paddingHorizontal: 4, borderRadius: 4, marginLeft: 8 },
    roleBadgeText: { fontSize: 11, fontWeight: '700' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyState: { alignItems: 'center', marginTop: 60 },
    emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 12 },
    emptySubtitle: { fontSize: 14, marginTop: 4 },
});

export default UsersListScreen;
