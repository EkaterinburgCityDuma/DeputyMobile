import { ScreenHeader } from '@/components/ui/Shared/ScreenHeader';

import { MotionPressable, Reveal } from '@/components/ui/Shared/Motion';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Bell, Calendar, ChevronRight, ClipboardList } from 'lucide-react-native';
import { styles } from './notifications-page';
import { router } from 'expo-router';
import { Select } from "@/components/ui/Shared/Select";
import { Notification, NotificationType } from "@/models/NotificationModel";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NotificationSkeletonItem } from "@/components/NotificationsPage/NotificationSkeletonItem";
import { Filters } from '../ui/Shared/Filters';
import { apiClient } from "@/api/api";
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

    const fetchNotifications = useCallback(async () => {
        try {
            if (!refreshing) setLoading(true);
            setError(null);

            const { data } = await apiClient.get('/api/Notify/my');
            setNotifications(data);
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Не удалось загрузить уведомления';
            setError(errorMessage);
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
            <Reveal><MotionPressable
                onPress={() => handleNotificationClick(item)}
                style={[
                    styles.notificationItem,
                    { backgroundColor: colors.card, borderColor: colors.border, borderBottomColor: colors.border }
                ]}
            >
                <View style={styles.row}>

                    {/* Иконка */}
                    <View style={[styles.iconWrapper, { backgroundColor: colors.roleBadge }]}>
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
            </MotionPressable></Reveal>
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
        <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: isDark ? '#f87171' : '#ef4444' }]}>{error}</Text>
            <MotionPressable style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={fetchNotifications}>
                <Text style={styles.retryButtonText}>Повторить</Text>
            </MotionPressable>
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
            <View style={[styles.container, {paddingBottom: insets.bottom + 15, backgroundColor: colors.background}]}>
                <ScreenHeader title="Уведомления" onBack={() => navigation.goBack()} />

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
            <ScreenHeader title="Уведомления" onBack={() => navigation.goBack()} />

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

            {/* Список уведомлений */}
            {error ? renderError() : (
                <FlatList
                    data={filteredNotifications}
                    renderItem={renderNotificationItem}
                    keyExtractor={(item) => item.id}
                    ListEmptyComponent={renderEmptyList}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                />
            )}
        </View>
    );
}
