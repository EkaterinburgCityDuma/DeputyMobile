import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    RefreshControl,
} from 'react-native';
import { MotionPressable, Reveal } from '@/components/ui/Shared/Motion';
import {
    CheckCircle2,
    Bell,
    AlertCircle, Phone, ChevronRight, Plus, CalendarPlus
} from 'lucide-react-native';
import { styles } from './style';

import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {Event} from "@/models/EventModel"
import {EventCard} from "@/components/EventsScreen/EventCard";
import {Task} from "@/models/TaskBoardModel";
import {formatDateToDay} from "@/utils";
import {TaskCard} from "@/components/TaskBoard/TaskCard";
import {StatCard} from './StatCard';
import {HeaderSkeleton} from "@/components/DashboardScreen/HeaderSkeleton";

import {useDashboardStore} from '@/store/useDashboardStore';
import {useTheme} from '@/context/ThemeContext';
import {SkeletonItem} from "@/components/ui/Shared/SkeletonLoader";

export function Dashboard() {
    const insets = useSafeAreaInsets();
    const {colors} = useTheme();

    const {data, isLoading, error, fetchDashboardData} = useDashboardStore();
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchDashboardData(false);
    }, [fetchDashboardData]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchDashboardData(true);
        setRefreshing(false);
    }, [fetchDashboardData]);

    const getInitials = (name: string) => {
        if (!name) return '';
        const parts = name.split(' ');
        return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name[0];
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) {
            return `Сегодня, ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return `Завтра, ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            return date.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
            });
        }
    };

    if (isLoading && !refreshing) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                <HeaderSkeleton insetsTop={insets.top}/>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
                    }
                >
                    <View style={{ padding: 16 }}>
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                            <SkeletonItem width="31%" height={100} borderRadius={20} />
                            <SkeletonItem width="31%" height={100} borderRadius={20} />
                            <SkeletonItem width="31%" height={100} borderRadius={20} />
                        </View>
                        <SkeletonItem width="50%" height={24} marginBottom={16} borderRadius={4} />
                        <SkeletonItem height={90} marginBottom={12} borderRadius={20} />
                        <SkeletonItem height={90} marginBottom={12} borderRadius={20} />
                        <SkeletonItem height={90} marginBottom={12} borderRadius={20} />
                    </View>
                </ScrollView>
            </View>
        );
    }
    if (error || !data) {
        return (
            <View style={{ flex: 1, paddingBottom: insets.bottom + 15, backgroundColor: colors.background }}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#2A6E3F']}
                        tintColor="#2A6E3F"
                    />
                }
            >
                <HeaderSkeleton insetsTop={insets.top}/>
                <View style={[styles.content, { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 300 }]}>
                    <View style={{
                        padding: 20,
                        borderRadius: 12,
                        alignItems: 'center',
                        marginHorizontal: 20,
                        width: "100%"
                    }}>
                        <AlertCircle size={48} color="#DC2626" />
                        <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 10, textAlign: 'center', color: colors.text }}>
                            Ошибка загрузки
                        </Text>
                        <Text style={{ fontSize: 14, marginTop: 5, textAlign: 'center', color: colors.text }}>
                            {error || 'Не удалось загрузить данные'}
                        </Text>
                        <MotionPressable
                            onPress={() => fetchDashboardData(true)}
                            style={{
                                backgroundColor: '#2A6E3F',
                                paddingHorizontal: 40,
                                paddingVertical: 10,
                                borderRadius: 8,
                                marginTop: 15,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: "center",
                            }}
                        >
                            <Text style={{ color: 'white', marginLeft: 8, fontSize: 14, fontWeight: '500' }}>
                                Повторить
                            </Text>
                        </MotionPressable>
                    </View>
                </View>
            </ScrollView>
            </View>
        );
    }

    const allUpcomingEvents = data.urgent_events || [];
    const displayTasks : Task[] = data.urgent_tasks || [];

    return (
        <View style={{ flex: 1, paddingBottom: insets.bottom + 15, backgroundColor: colors.background }}>
            <View style={{ height: insets.top, backgroundColor: colors.primary }} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                        title="Обновление..."
                        titleColor={colors.subtext}
                    />
                }
            >
                {/* 2. Теперь хедер находится внутри ScrollView и скроллится */}
                <LinearGradient colors={[colors.primary, colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: 20 }]} >
                    <View style={styles.headerContent}>
                        <View style={styles.userInfoRow}>
                            <MotionPressable style={styles.userProfileButton} onPress={() => router.push({ pathname: '/(screens)/ProfileScreen', params: { id: null }})}>
                                <View style={styles.avatarContainer}>
                                    <View style={[styles.avatar, { backgroundColor: "rgba(255,255,255,0.16)" }]}>
                                        <Text style={[styles.avatarText, { color: "#ffffff" }]}>
                                            {getInitials(data.user_name)}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.userInfo}>
                                    <Text style={[styles.greeting, { color: "rgba(255,255,255,0.82)" }]}>{new Date().getHours() < 12 ? 'Доброе утро,' : new Date().getHours() < 18 ? 'Добрый день,' : 'Добрый вечер,'}</Text>
                                    <Text style={[styles.userName, { color: "#ffffff" }]} numberOfLines={2}>{data.user_name}</Text>
                                </View>
                            </MotionPressable>
                            <MotionPressable style={[styles.notificationButton, { backgroundColor: "rgba(255,255,255,0.16)" }]} accessibilityLabel="Уведомления" onPress={() => router.push("/NotificationScreen")}>
                                <View pointerEvents={"none"}>
                                    <Bell size={20} color="#ffffff" />
                                </View>
                            </MotionPressable>
                            <MotionPressable style={[styles.notificationButton, { backgroundColor: "rgba(255,255,255,0.16)" }]} accessibilityLabel="Телефонная книга" onPress={() => router.push("/PhonebookScreen")}>
                                <View pointerEvents={"none"}>
                                    <Phone size={20} color="#ffffff" />
                                </View>
                            </MotionPressable>
                        </View>
                        <Text style={[styles.jobTitle, { color: "#ffffff" }]}>{data?.job_title || 'Сотрудник'}</Text>
                        <Text style={[styles.organization, { color: "rgba(255,255,255,0.78)" }]}>Екатеринбургская городская дума</Text>
                    </View>
                </LinearGradient>

                <View style={styles.content}>
                    <View style={{ marginBottom: 16, marginTop: 24 }}>
                        <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.8 }}>Обзор</Text>
                        <Text style={{ color: colors.subtext, fontSize: 14, marginTop: 4 }}>{new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
                    </View>
                    <View style={styles.statsGrid}>
                        <StatCard iconName={"Calendar"}
                                  count={data.event_count || 0}
                                  labels={['Мероприятие', 'Мероприятия', 'Мероприятий']}
                                  delay={200} onPress={() => router.push({ pathname: '/(screens)/EventsScreen', params: { isMine: 'true' } })}
                        />
                        <StatCard iconName={"CheckCircle2"}
                                  count={data.task_count || 0}
                                  labels={['Задача', 'Задачи', 'Задач']}
                                  delay={400} onPress={() => router.push({ pathname: '/(screens)/TaskBoardScreen', params: { isMine: 'true' } })}
                        />
                        <StatCard iconName={"AlertCircle"}
                                  count={data.urgent_tasks_count || 0}
                                  labels={['Срочная задача', 'Срочные задачи', 'Срочных задач']}
                                  delay={600} onPress={() => router.push({ pathname: '/(screens)/TaskBoardScreen', params: { isMine: 'true' } })}
                        />
                    </View>
                    <Reveal index={2} style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
                        <MotionPressable accessibilityLabel="Создать событие" onPress={() => router.push('/(screens)/EventsScreen/CreateEventScreen')}
                            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, borderRadius: 14, backgroundColor: colors.primary }}>
                            <CalendarPlus size={18} color="#fff" /><Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Событие</Text>
                        </MotionPressable>
                        <MotionPressable accessibilityLabel="Создать задачу" onPress={() => router.push('/(screens)/TaskBoardScreen/NewTaskScreen')}
                            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                            <Plus size={18} color={colors.accent} /><Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>Задача</Text>
                        </MotionPressable>
                    </Reveal>
                    {displayTasks.length > 0 && (
                        <Reveal index={3}
                            style={styles.section}
                        >
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Мои задачи</Text>
                                <MotionPressable style={styles.sectionLink} onPress={() => router.push({ pathname: '/(screens)/TaskBoardScreen', params: { isMine: 'true' } })} accessibilityLabel="Все мои задачи">
                                    <Text style={[styles.linkText, { color: colors.accent }]}>Все</Text><ChevronRight size={16} color={colors.accent} />
                                </MotionPressable>
                            </View>

                            <View style={styles.cardsContainer}>
                                {displayTasks.map((task: any, index: number) => (
                                    <TaskCard
                                        key={task.task_id || index}
                                        task={task}
                                        onPress={() => router.push({
                                            pathname: '/(screens)/TaskBoardScreen/TaskDetailScreen',
                                            params: { id: task.task_id }
                                        })}
                                    />
                                ))}
                            </View>
                        </Reveal>
                    )}

                    {allUpcomingEvents.length > 0 && (
                        <Reveal index={3}
                            style={styles.section}
                        >
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Ближайшие события</Text>
                                <MotionPressable style={styles.sectionLink} onPress={() => router.push('/(screens)/EventsScreen')} accessibilityLabel="Все события">
                                    <Text style={[styles.linkText, { color: colors.accent }]}>Все</Text><ChevronRight size={16} color={colors.accent} />
                                </MotionPressable>
                            </View>

                            <View style={styles.cardsContainer}>
                                {allUpcomingEvents.map((event: Event, index: number) => {
                                    const showDate = index === 0 ||
                                        formatDate(event.start_at) !== formatDate(allUpcomingEvents[index - 1].start_at);

                                    return (
                                        <View key={event.id}>
                                            {showDate && (
                                                <Text style={[styles.eventDate, { color: colors.subtext }]}>{formatDateToDay(event.start_at)}</Text>
                                            )}
                                            <EventCard
                                                event={event}
                                                index={index}
                                                onPress={() => router.push({
                                                    pathname: '/(screens)/EventsScreen/EventDetailsScreen',
                                                    params: { id: event.id }
                                                })}
                                            />
                                        </View>
                                    );
                                })}
                            </View>
                        </Reveal>
                    )}

                    {displayTasks.length === 0 && allUpcomingEvents.length === 0 && (
                        <Reveal index={3}
                            style={[styles.section]}
                        >
                            <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <CheckCircle2 size={40} color={colors.accent} />
                                <Text style={[styles.emptyMainTitle, { color: colors.text }]}>Пока нет активных дел</Text>
                                <Text style={[styles.emptyMainSubtitle, { color: colors.subtext }]}>
                                    Ближайших событий и активных задач пока нет. Новые появятся здесь.
                                </Text>
                            </View>
                        </Reveal>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
