import React, {useState, useEffect, useMemo, useCallback} from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
    ArrowLeft,
    Bell,
    BellOff,
    Calendar, ChevronRight,
    ClipboardList,
    RefreshCw,
} from 'lucide-react-native';
import { styles } from './notifications-page';
import { router } from 'expo-router';
import { LinearGradient } from "expo-linear-gradient";
import { Select } from "@/components/ui/Shared/Select";
import {Notification, NotificationType} from "@/models/NotificationModel";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {NotificationSkeletonItem} from "@/components/NotificationsPage/NotificationSkeletonItem";
import { Filters } from '../ui/Shared/Filters';
import {apiClient} from "@/api/api";
import { useTheme } from '@/context/ThemeContext';

const notificationConfig: Record<NotificationType, { icon: any; iconColor: string }> = {
    Task: {
        icon: ClipboardList,
        iconColor: '#268356',
    },
    Event: {
        icon: Calendar,
        iconColor: '#8B5CF6',
    },
};

const filterOptions = [
    { label: 'Все', value: 'all' },
    { label: 'Задачи', value: 'Task' },
    { label: 'События', value: 'Event' },
];

export function Notifications() {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [filterType, setFilterType] = useState<NotificationType | 'all'>('all');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const insets = useSafeAreaInsets();
    const [pushBusy, setPushBusy] = useState(false);
    const [pushStatus, setPushStatus] = useState('');
    const enablePush = async () => {
        setPushBusy(true);
        try {
            // Ask within the user gesture, before loading the Firebase client.
            if (typeof window === 'undefined' || !('Notification' in window)) throw new Error('Браузер не поддерживает уведомления');
            if (await window.Notification.requestPermission() !== 'granted') throw new Error('Разрешите уведомления в настройках браузера');
            const { syncDeviceToken } = await import('@/api/fcmService.web');
            await syncDeviceToken();
            setPushStatus('Push-уведомления включены');
        } catch (error) {
            setPushStatus(error instanceof Error ? error.message : 'Не удалось подключить уведомления');
        } finally { setPushBusy(false); }
    };

    const fetchNotifications = useCallback(async () => {
        try {
            if (!refreshing) setLoading(true);
            setError(null);

            const { data } = await apiClient.get('/api/Notify/my');
            setNotifications(data);
        } catch (err: any) {
            setError('Проверьте подключение к интернету и попробуйте ещё раз.');
            console.error('Fetch Error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [refreshing]);

    const parseDescription = (desc: any): string => {
        if (typeof desc !== 'string') return '';
        if (desc.startsWith('{')) {
            try {
                const parsed = JSON.parse(desc);
                return parsed.message || parsed.text || 'Новое уведомление';
            } catch (e) {
                return 'Новое уведомление';
            }
        }
        return desc;
    };

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        fetchNotifications();
    }, [fetchNotifications]);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Только что';
        if (diffMins < 60) return `${diffMins} мин назад`;
        if (diffHours < 24) return `${diffHours} ч назад`;
        if (diffDays < 7) return `${diffDays} дн назад`;

        return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const handleNotificationClick = (notification: Notification) => {
        if (notification.notify_type === 'Task') {
            router.push({ pathname: '/(screens)/TaskBoardScreen/TaskDetailScreen', params: { id: notification.notifable_id }});
        } else {
            router.push({ pathname: '/(screens)/EventsScreen/EventDetailsScreen', params: { id: notification.notifable_id }});
        }
    };

    const filteredNotifications = useMemo(() => {
        if (filterType === 'all') return notifications;
        return notifications.filter(n => n.notify_type === filterType);
    }, [notifications, filterType]);

    const renderNotificationItem = ({ item }: { item: Notification }) => {
        const config = notificationConfig[item.notify_type] || { icon: Bell };
        const Icon = config.icon;

        return (
            <TouchableOpacity
                onPress={() => handleNotificationClick(item)}
                style={[
                    styles.notificationItem,
                    { backgroundColor: colors.card, borderBottomColor: colors.divider }
                ]}
            >
                <View style={styles.row}>

                    {/* Иконка */}
                    <View style={[styles.iconWrapper, { backgroundColor: isDark ? colors.primary + '20' : '#ebfdeb' }]}>
                        <Icon size={20} color={isDark ? colors.roleText : "#268356"} />
                    </View>

                    {/* Контент */}
                    <View style={styles.content}>

                        {/* Верхняя строка */}
                        <View style={styles.topRow}>
                            <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                                {item.title}
                            </Text>

                            <Text style={[styles.time, { color: colors.subtext }]}>
                                {formatTime(item.notify_date)}
                            </Text>
                        </View>

                        {/* Описание */}
                        <Text style={[styles.description, { color: colors.subtext }]} numberOfLines={2}>
                            {typeof item.description === 'string' &&
                            item.description.startsWith('{')
                                ? 'Новое уведомление'
                                : item.description}
                        </Text>
                    </View>

                    {/* Стрелка */}
                    <ChevronRight size={18} color={colors.subtext} />
                </View>
            </TouchableOpacity>
        );
    };

    const renderEmptyList = () => (
        <View style={[styles.emptyContainer, { backgroundColor: colors.card, marginHorizontal: 20, borderRadius: 20, paddingVertical: 40 }]}>
            <View style={[styles.emptyIcon, { backgroundColor: isDark ? colors.iconBox : '#F3F4F6' }]}>
                <Bell size={32} color={colors.subtext} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Нет уведомлений</Text>
            <Text style={[styles.emptySubtitle, { color: colors.subtext }]}>
                {filterType === 'all'
                    ? 'У вас пока нет уведомлений'
                    : 'Нет уведомлений этого типа'}
            </Text>
        </View>
    );

    const renderError = () => (
        <View style={[styles.errorContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.iconBox }]}>
                <BellOff size={28} color={colors.subtext} />
            </View>
            <Text accessibilityRole="header" style={[styles.errorTitle, { color: colors.text }]}>
                Не удалось загрузить уведомления
            </Text>
            <Text accessibilityLiveRegion="polite" style={[styles.errorText, { color: colors.subtext }]}>{error}</Text>
            <TouchableOpacity
                accessibilityRole="button"
                style={[styles.retryButton, { backgroundColor: colors.roleBadge }]}
                onPress={fetchNotifications}
            >
                <RefreshCw size={18} color={colors.roleText} />
                <Text style={[styles.retryButtonText, { color: colors.roleText }]}>Попробовать снова</Text>
            </TouchableOpacity>
        </View>
    );

    const NotificationsSkeleton = () => {
        return (
            <View>
                {Array.from({ length: 6 }).map((_, index) => (
                    <NotificationSkeletonItem key={index} />
                ))}
            </View>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, {backgroundColor: colors.background}]}>
                <LinearGradient
                    colors={[colors.primary, colors.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.header, {paddingTop: insets.top + 15}]}
                >
                    <View style={styles.headerContent}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                            <View pointerEvents="none">
                                <ArrowLeft size={24} color="white" />
                            </View>
                        </TouchableOpacity>
                        <View style={styles.headerTitleContainer}>
                            <Text style={styles.headerTitle}>Уведомления</Text>
                        </View>
                    </View>
                </LinearGradient>

                <Filters
                    title1={'Фильтр'}
                    selectComponent1={
                        <View style={{ height: 40, backgroundColor: isDark ? colors.card : '#F3F4F6', borderRadius: 8 }} />
                    }
                />

                <NotificationsSkeleton />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, {paddingTop: insets.top + 15}]}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <View pointerEvents="none">
                            <ArrowLeft size={24} color="white" />
                        </View>
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Уведомления</Text>
                    </View>
                </View>
            </LinearGradient>

            <Filters
            title1={'Фильтр'}
            selectComponent1={
                <Select
                    value={filterType}
                    onValueChange={(value) => setFilterType(value as NotificationType | 'all')}
                    items={filterOptions}
                    placeholder="Выберите тип уведомлений"
                />
            }
            />

            {Platform.OS === 'web' && <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                <TouchableOpacity onPress={enablePush} disabled={pushBusy} accessibilityRole="button"
                    style={{ padding: 12, borderRadius: 8, backgroundColor: colors.primary }}>
                    <Text style={{ color: 'white', textAlign: 'center' }}>{pushBusy ? 'Подключение…' : 'Включить push-уведомления'}</Text>
                </TouchableOpacity>
                {!!pushStatus && <Text accessibilityLiveRegion="polite" style={{ color: colors.text, marginTop: 8 }}>{pushStatus}</Text>}
            </View>}
            {/* Список уведомлений */}
                <FlatList
                    data={error ? [] : filteredNotifications}
                    renderItem={renderNotificationItem}
                    keyExtractor={(item) => item.id}
                    ListEmptyComponent={error ? renderError : renderEmptyList}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                />
        </View>
    );
}
