import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Alert,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import {
    UserX,
    Mail,
    Shield,
    Calendar,
    ChevronRight,
    LogOut, ListTodo
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {apiUrl} from '@/api/api'
import {AuthManager} from '@/components/LoginScreen/LoginScreen';
import { styles } from './style';
import {ProfileScreenDto} from '@/models/ProfileModel';
import { LinearGradient } from 'expo-linear-gradient';
import {router, useLocalSearchParams} from "expo-router";


interface AvatarProps {
    style?: any;
    children: React.ReactNode;
}

const Avatar: React.FC<AvatarProps> = ({ style, children }) => (
    <View style={[styles.avatarBase, style]}>
        {children}
    </View>
);

const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name[0].toUpperCase();
};

export function ProfileScreen() {
    const { id } = useLocalSearchParams<{ id?: string }>();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const [profile, setProfile] = useState<ProfileScreenDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Логика загрузки данных (вынесена в useCallback для стабильности)
    const loadProfile = useCallback(async () => {
        try {
            const token = AuthManager.getToken();
            const url = id ? `${apiUrl}/api/Auth/${id}` : `${apiUrl}/api/Auth/current`;

            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            });

            const data = await response.json();

            setProfile(data);
        } catch (error) {
            console.error('Profile load error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Единый эффект для подписки на токен и первичной загрузки
    useEffect(() => {
        loadProfile(); // Начальная загрузка
    }, [loadProfile]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadProfile();
    };

    const handleLogout = () => {
        Alert.alert('Выход', 'Вы уверены, что хотите выйти?', [
            { text: 'Отмена', style: 'cancel' },
            {
                text: 'Выйти',
                style: 'destructive',
                onPress: async () => {
                    await AuthManager.clearAuth()
                    router.push("/login")
                }
            },
        ]);
    };

    if (loading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2A6E3F" />
                </View>
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.errorContainer}>
                    <UserX size={48} color="#9CA3AF" />
                    <Text style={styles.errorTitle}>Профиль не найден</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('login' as never)} style={styles.errorButton}>
                        <Text>Войти</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={['#2A6E3F']}
                        tintColor="#2A6E3F"
                    />
                }
            >
                <LinearGradient
                    colors={['#2A6E3F', '#349339']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.header, {paddingTop: insets.top + 20}]}
                >
                    <View style={styles.headerContent}>
                        <Text style={styles.headerTitle}>Профиль</Text>
                        <TouchableOpacity
                            style={styles.logoutButton}
                            onPress={handleLogout}
                        >
                            <LogOut size={20} color="#2A6E3F" />
                        </TouchableOpacity>
                    </View>
                </LinearGradient>

                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                        <Avatar>
                            <Text style={styles.avatarText}>
                                {getInitials(profile.full_name)}
                            </Text>
                        </Avatar>
                    </View>

                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{profile.full_name}</Text>
                        <Text style={styles.userTitle}>{profile.job_title}</Text>
                    </View>

                    <View style={styles.divider} />

                    {/* Основная информация */}
                    <View style={styles.infoSection}>
                        <View style={styles.infoRow}>
                            <Mail size={20} color="#2A6E3F" style={styles.infoIcon} />
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Email</Text>
                                <Text style={styles.infoValue}>{profile.email}</Text>
                            </View>
                        </View>
                        <View style={styles.infoRow}>
                            <Shield size={20} color="#2A6E3F" style={styles.infoIcon} />
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Роли в системе</Text>
                                <View style={styles.rolesList}>
                                    {profile.roles.map((userRole, index) => (
                                        <View key={index} style={styles.roleBadge}>
                                            <Text style={styles.roleText}>{userRole}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Быстрые действия */}
                <View style={styles.actionsCard}>
                    <View style={styles.actionsHeader}>
                        <Text style={styles.actionsTitle}>Быстрые действия</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.actionItem}
                        onPress={() => navigation.navigate('EventsScreen' as never)}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: '#F5F3FF' }]}>
                            <Calendar size={20} color="#7C3AED" />
                        </View>
                        <View style={styles.actionContent}>
                            <Text style={styles.actionTitle}>Мои события</Text>
                            <Text style={styles.actionSubtitle}>
                                {profile.event_count} мероприятий
                            </Text>
                        </View>
                        <ChevronRight size={20} color="#9CA3AF" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionItem}
                        onPress={() => navigation.navigate('CatalogScreen' as never)}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: '#F0FDF9' }]}>
                            <ListTodo size={20} color="#0D9488" />
                        </View>
                        <View style={styles.actionContent}>
                            <Text style={styles.actionTitle}>Текущих задач</Text>
                            <Text style={styles.actionSubtitle}>
                                {profile.task_count} задачи
                            </Text>
                        </View>
                        <ChevronRight size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}
