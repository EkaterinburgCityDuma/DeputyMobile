import { AuthManager } from '@/api/auth';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert, Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    UserX,
    LogOut,
    Mail,
    Shield,
    Calendar,
    ListTodo,
    ChevronRight,
    Building2,
    Edit,
    Moon,
    Check,
    Monitor,
    Sun,
    ArrowLeft
} from 'lucide-react-native';
import {declOfNum} from "@/utils";
import { useFocusEffect } from '@react-navigation/native';
import { BottomSheetModal } from '@/components/ui/BottomSheetModal/BottomSheetModal';
import { useTheme } from '@/context/ThemeContext';


const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name[0].toUpperCase();
};

const translateRole = (role: string): string => {
    const roleMap: Record<string, string> = {
        'Admin': 'Администратор',
        'Deputy': 'Депутат',
        'Helper': 'Помощник депутата'
    };
    return roleMap[role] || role;
};


import { useProfileStore } from '@/store/useProfileStore';

export function ProfileScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const { profiles, isLoading: loading, fetchProfile } = useProfileStore();
    const [refreshing, setRefreshing] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const { colors, isDark, mode, theme, setThemeMode } = useTheme();
    const [isThemeSheetVisible, setThemeSheetVisible] = useState(false);

    const [userId, setUserId] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);

    const loadProfile = useCallback(async () => {
        setUserId(AuthManager.getUserId());
        setUserRole(AuthManager.getRole());
        setIsReady(true);

        await fetchProfile(id);
        setRefreshing(false);
    }, [id, fetchProfile]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    useFocusEffect(
        useCallback(() => {
            loadProfile();
        }, [loadProfile])
    );

    const handleRefresh = () => {
        setRefreshing(true);
        loadProfile();
    };

    const profile = profiles[id || 'current'] || null;

    const handleLogout = () => {
        if (Platform.OS === 'web') {
            if (window.confirm('Вы уверены, что хотите выйти?')) {
                AuthManager.clearAuth();
                router.push("/login");
            }
        } else {
            Alert.alert('Выход', 'Вы уверены, что хотите выйти?', [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Выйти',
                    style: 'destructive',
                    onPress: async () => {
                        await AuthManager.clearAuth();
                        router.push("/login");
                    }
                },
            ]);
        }
    };

    const getThemeModeLabel = () => {
        if (mode === 'system') {
            return `Как в системе (${theme === 'dark' ? 'тёмная' : 'светлая'})`;
        }
        return mode === 'dark' ? 'Тёмная' : 'Светлая';
    };

    const handleSelectThemeMode = async (nextMode: 'light' | 'dark' | 'system') => {
        await setThemeMode(nextMode);
        setThemeSheetVisible(false);
    };

    if (loading || !isReady) {
        return (
            <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background, flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={isDark ? colors.text : colors.primary} />
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
                <View style={styles.errorContainer}>
                    <UserX size={48} color={colors.subtext} />
                    <Text style={[styles.errorTitle, { color: colors.text }]}>Профиль не найден</Text>
                    <TouchableOpacity onPress={() => router.push('/login')} style={[styles.errorButton, { backgroundColor: colors.primary }]}>
                        <Text style={styles.errorButtonText}>Войти</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 24 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
            >
                {/* Header */}
                <LinearGradient
                    colors={[colors.primary, colors.secondary]}
                    style={[styles.header, { paddingTop: insets.top + 15 }]}
                >
                    <View style={styles.headerTopRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            {router.canGoBack() && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Назад" onPress={() => router.back()} style={styles.iconButton}>
                                <ArrowLeft size={22} color="white" />
                            </TouchableOpacity>}
                            <Text style={styles.headerTitle}>Профиль</Text>
                        </View>
                        <View style={styles.headerButtons}>
                            {(profile.id === userId || userRole === "Admin") && (
                                <TouchableOpacity
                                    style={styles.iconButton}
                                    onPress={() => router.push({pathname: '/(screens)/UsersScreen/CreateUserScreen', params: { id: profile.id}})}
                                >
                                    <View pointerEvents={"none"}>
                                        <Edit size={20} color="white" />
                                    </View>
                                </TouchableOpacity>
                            )}
                            {!id && (
                                <TouchableOpacity style={styles.iconButton} onPress={handleLogout}>
                                    <View pointerEvents={"none"}>
                                        <LogOut size={20} color="white" />
                                    </View>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </LinearGradient>

                <View style={styles.content}>
                    {/* Profile Card */}
                    <View style={[styles.card, { backgroundColor: colors.card }]}>
                        <View style={styles.avatarContainer}>
                            <View style={[styles.avatarBase, { backgroundColor: colors.primary }]}>
                                <Text style={styles.avatarText}>
                                    {getInitials(profile.full_name || '?')}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.userInfo}>
                            <Text style={[styles.userName, { color: colors.text }]}>{profile.full_name}</Text>
                            <Text style={[styles.userTitle, { color: colors.subtext }]}>{profile.job_title || 'Сотрудник'}</Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

                        {/* Основная информация */}
                        <View style={styles.infoSection}>
                            <View style={styles.infoRow}>
                                <View style={[styles.infoIconBox, { backgroundColor: colors.iconBox }]}>
                                    <Mail size={18} color={colors.subtext} />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={[styles.infoLabel, { color: colors.subtext }]}>Email</Text>
                                    <Text style={[styles.infoValue, { color: colors.text }]}>{profile.email}</Text>
                                </View>
                            </View>

                            <View style={styles.infoRow}>
                                <View style={[styles.infoIconBox, { backgroundColor: colors.iconBox }]}>
                                    <Shield size={18} color={colors.subtext} />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={[styles.infoLabel, { color: colors.subtext }]}>Роли в системе</Text>
                                    <View style={styles.rolesList}>
                                        {profile.roles?.map((userRole: string, index: number) => (
                                            <View key={index} style={[styles.roleBadge, { backgroundColor: colors.roleBadge }]}>
                                                <Text style={[styles.roleText, { color: colors.roleText }]}>{translateRole(userRole)}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Секция: Подразделение (Департамент) */}
                    {profile.department && profile.department?.name !== "unknown"  && (
                        <>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Подразделение</Text>
                            <TouchableOpacity
                                style={[styles.card, styles.departmentCard, { backgroundColor: colors.card }]}
                                onPress={() => router.push({
                                    pathname: '/(screens)/DepartmentsScreen/DepartmentDetailsScreen',
                                    params: { id: profile.department?.id, name: profile.department?.name }
                                })}
                            >
                                <View style={[styles.departmentIcon, { backgroundColor: isDark ? colors.primary + '20' : '#f0fdf4' }]}>
                                    <Building2 size={24} color={isDark ? colors.primary : "#2A6E3F"} />
                                </View>
                                <View style={styles.departmentInfo}>
                                    <Text style={[styles.departmentName, { color: colors.text }]}>{profile.department?.name || profile.department}</Text>
                                    <Text style={[styles.departmentId, { color: colors.subtext }]}>
                                        ID: {profile.department?.id && profile.department.id !== '00000000-0000-0000-0000-000000000000'
                                        ? `${profile.department.id.slice(0, 8)}...`
                                        : 'Не назначен'}
                                    </Text>
                                </View>
                                <ChevronRight size={20} color={colors.subtext} />
                            </TouchableOpacity>
                        </>
                    )}

                    {/* Быстрые действия */}
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Активность</Text>

                    <View style={[styles.card, { padding: 0, overflow: 'hidden', backgroundColor: colors.card }]}>
                        <TouchableOpacity
                            style={styles.actionItem}
                            onPress={() => router.push({pathname: '/EventsScreen', params: {isMine: "true"}})}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: colors.iconBox }]}>
                                <Calendar size={20} color={colors.actionIconColor.tasks} />
                            </View>
                            <View style={styles.actionContent}>
                                <Text style={[styles.actionTitle, { color: colors.text }]}>События</Text>
                                <Text style={[styles.actionSubtitle, { color: colors.subtext }]}>
                                    Участвует в {profile?.events?.length || profile?.event_count || 0} {
                                    declOfNum(
                                        profile?.events?.length || profile?.event_count || 0,
                                        ['мероприятии', 'мероприятиях', 'мероприятиях']
                                    )
                                }
                                </Text>
                            </View>
                            <ChevronRight size={20} color={colors.subtext} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionItem}
                            onPress={() => router.push({pathname: '/TaskBoardScreen', params: {isMine: "true"}})}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: colors.iconBox }]}>
                                <ListTodo size={20} color={colors.actionIconColor.tasks} />
                            </View>
                            <View style={styles.actionContent}>
                                <Text style={[styles.actionTitle, { color: colors.text }]}>Задачи</Text>
                                <Text style={[styles.actionSubtitle, { color: colors.subtext }]}>
                                    Назначено {profile?.tasks?.length || profile?.task_count || 0} {
                                    declOfNum(
                                        profile?.tasks?.length || profile?.task_count || 0,
                                        ['задача', 'задачи', 'задач']
                                    )
                                }
                                </Text>
                            </View>
                            <ChevronRight size={20} color={colors.subtext} />
                        </TouchableOpacity>

                    </View>
                    {!id && <>
                        <Text style={[styles.sectionTitle, {color: colors.text}]}>Настройки</Text>
                        <View style={[styles.card, {padding: 0, overflow: 'hidden', backgroundColor: colors.card}]}>
                    {/* Кнопка переключения темы */}
                    <TouchableOpacity
                        style={styles.actionItem}
                        onPress={() => setThemeSheetVisible(true)}
                    >
                        <View style={[styles.actionIcon, {backgroundColor: colors.iconBox}]}>
                            {mode === 'system' ? (
                                <Monitor size={20} color={colors.actionIconColor.tasks}/>
                            ) : isDark ? (
                                <Moon size={20} color="#6366f1"/>
                            ) : (
                                <Sun size={20} color="#f59e0b"/>
                            )}
                        </View>
                        <View style={styles.actionContent}>
                            <Text style={[styles.actionTitle, {color: colors.text}]}>
                                Тема приложения
                            </Text>
                            <Text style={[styles.actionSubtitle, {color: colors.subtext}]}>
                                {getThemeModeLabel()}
                            </Text>
                        </View>
                        <ChevronRight size={20} color={colors.subtext}/>
                    </TouchableOpacity>
                </View>
                    </>}
                </View>
            </ScrollView>
            <BottomSheetModal
                visible={isThemeSheetVisible}
                onClose={() => setThemeSheetVisible(false)}
                title="Тема приложения"
                heightFraction={0.42}
                scrollEnabled={false}
            >
                <TouchableOpacity
                    style={[
                        styles.themeOption,
                        { borderBottomColor: colors.border },
                        mode === 'system' && [styles.themeOptionActive, { backgroundColor: colors.iconBox }]
                    ]}
                    onPress={() => handleSelectThemeMode('system')}
                >
                    <View style={styles.themeOptionLeft}>
                        <View style={[styles.themeOptionIcon, { backgroundColor: colors.iconBox }]}>
                            <Monitor size={18} color={colors.actionIconColor.tasks} />
                        </View>
                        <View style={styles.themeOptionContent}>
                            <Text style={[styles.themeOptionTitle, { color: colors.text }]}>
                                Как в системе
                            </Text>
                            <Text style={[styles.themeOptionSubtitle, { color: colors.subtext }]}>
                                Определять тему автоматически
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.themeOption,
                        { borderBottomColor: colors.border },
                        mode === 'light' && [styles.themeOptionActive, { backgroundColor: colors.iconBox }]
                    ]}
                    onPress={() => handleSelectThemeMode('light')}
                >
                    <View style={styles.themeOptionLeft}>
                        <View style={[styles.themeOptionIcon, { backgroundColor: colors.iconBox }]}>
                            <Sun size={18} color="#f59e0b" />
                        </View>
                        <View style={styles.themeOptionContent}>
                            <Text style={[styles.themeOptionTitle, { color: colors.text }]}>
                                Дневной режим
                            </Text>
                            <Text style={[styles.themeOptionSubtitle, { color: colors.subtext }]}>
                                Всегда использовать светлую тему
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.themeOption,
                        mode === 'dark' && [styles.themeOptionActive, { backgroundColor: colors.iconBox }]
                    ]}
                    onPress={() => handleSelectThemeMode('dark')}
                >
                    <View style={styles.themeOptionLeft}>
                        <View style={[styles.themeOptionIcon, { backgroundColor: colors.iconBox }]}>
                            <Moon size={18} color="#6366f1" />
                        </View>
                        <View style={styles.themeOptionContent}>
                            <Text style={[styles.themeOptionTitle, { color: colors.text }]}>
                                Ночной режим
                            </Text>
                            <Text style={[styles.themeOptionSubtitle, { color: colors.subtext }]}>
                                Всегда использовать тёмную тему
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </BottomSheetModal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1e293b',
        marginTop: 16,
        marginBottom: 8,
    },
    errorButton: {
        backgroundColor: '#2A6E3F',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 16,
    },
    errorButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },

    // Header
    header: {
        paddingHorizontal: 20,
        paddingBottom: 70, // Оставляем место под карточку
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    headerButtons: {
        flexDirection: 'row',
        gap: 15,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Content wrapper
    content: {
        paddingHorizontal: 16,
        marginTop: -55,
        paddingBottom: 30,
    },

    // Unified Card
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },

    // Profile specifics
    avatarContainer: {
        alignItems: 'center',
        marginTop: -40, // Поднимаем аватар над карточкой
        marginBottom: 12,
    },
    avatarBase: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#2A6E3F',
        borderWidth: 4,
        borderColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 26,
        fontWeight: '700',
    },
    userInfo: {
        alignItems: 'center',
        marginBottom: 4,
    },
    userName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 4,
        textAlign: 'center',
    },
    userTitle: {
        fontSize: 14,
        color: '#64748b',
    },
    divider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginVertical: 16,
    },

    // Info Section
    infoSection: {
        gap: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: '#64748b',
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e293b',
    },
    rolesList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 4,
    },
    roleBadge: {
        backgroundColor: '#dcfce7',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    roleText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#166534',
    },

    // Actions Section
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 12,
        marginLeft: 4,
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    actionIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    actionContent: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1e293b',
    },
    actionSubtitle: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 2,
    },

    departmentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    departmentIcon: {
        width: 36,
        height: 36,
        borderRadius: 14,
        backgroundColor: '#f0fdf4',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    departmentInfo: {
        flex: 1,
    },
    departmentName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 4,
    },
    departmentId: {
        fontSize: 13,
        color: '#94a3b8',
    },
    themeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 4,
        borderRadius: 14,
    },
    themeOptionActive: {
        paddingHorizontal: 12,
    },
    themeOptionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    themeOptionIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    themeOptionContent: {
        flex: 1,
    },
    themeOptionTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    themeOptionSubtitle: {
        fontSize: 13,
        marginTop: 2,
    },
});
