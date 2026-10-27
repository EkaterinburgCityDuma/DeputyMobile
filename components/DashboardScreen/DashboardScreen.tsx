import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
    CheckCircle2,
    Bell,
    AlertCircle, Phone
} from 'lucide-react-native';
import { styles } from './style';
import Animated, { FadeInDown} from 'react-native-reanimated';
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {Event} from "@/models/EventModel"
import {EventCard} from "@/components/EventsScreen/EventCard";
import {Task} from "@/models/TaskBoardModel";
import {formatDateToDay} from "@/utils";
import {TaskCard} from "@/components/TaskBoard/TaskCard";
import {StatCard} from './StatCard';
import {HeaderSkeleton} from "@/components/DashboardScreen/HeaderSkeleton";
import {apiClient} from "@/api/api";
import {useDashboardStore} from '@/store/useDashboardStore';
import {useTheme} from '@/context/ThemeContext';
import {SkeletonItem} from "@/components/ui/Shared/SkeletonLoader";

export function Dashboard() {
    const insets = useSafeAreaInsets();
    const {colors, isDark} = useTheme();

    const {data, isLoading, error, fetchDashboardData} = useDashboardStore();
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchDashboardData(false);
    }, []);

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
            <View style={{ flex: 1, backgroundColor: colors.background }}>
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
                        <TouchableOpacity
                            onPress={() => router.push("/login")}
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
                                Войти
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
            </View>
        );
    }

    const allUpcomingEvents = data.urgent_events || [];
    const displayTasks : Task[] = data.urgent_tasks || [];

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{height: insets.top}}
            >
            </LinearGradient>

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
                <LinearGradient
                    colors={[colors.primary, colors.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.header, { paddingTop: 15 }]}
                >
                    <View style={styles.headerContent}>
                        <View style={styles.userInfoRow}>
                            <TouchableOpacity style={styles.userProfileButton} onPress={() => router.push({ pathname: '/(screens)/ProfileScreen', params: { id: null }})}>
                                <View style={styles.avatarContainer}>
                                    <View style={[styles.avatar, { backgroundColor: colors.card }]}>
                                        <Text style={[styles.avatarText, { color: colors.roleText }]}>
                                            {getInitials(data.user_name)}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.userInfo}>
                                    <Text style={styles.greeting}>Добрый день,</Text>
                                    <Text style={styles.userName}>{data.user_name}</Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.notificationButton} onPress={() => router.push("/NotificationScreen")}>
                                <View pointerEvents={"none"}>
                                    <Bell size={20} color="white" />
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.notificationButton} onPress={() => router.push("/PhonebookScreen")}>
                                <View pointerEvents={"none"}>
                                    <Phone size={20} color="white" />
                                </View>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.jobTitle}>{data?.job_title || 'Сотрудник'}</Text>
                        <Text style={styles.organization}>Екатеринбургская городская дума</Text>
                    </View>
                </LinearGradient>

                <View style={styles.content}>
                    <View style={styles.statsGrid}>
                        <StatCard iconName={"Calendar"}
                                  count={data.event_count || 0}
                                  labels={['Мероприятие', 'Мероприятия', 'Мероприятий']}
                                  delay={200}
                        />
                        <StatCard iconName={"CheckCircle2"}
                                  count={data.task_count || 0}
                                  labels={['Задача', 'Задачи', 'Задач']}
                                  delay={400}
                        />
                        <StatCard iconName={"AlertCircle"}
                                  count={data.urgent_tasks_count || 0}
                                  labels={['Срочная задача', 'Срочных задачи', 'Срочных задач']}
                                  delay={600}
                        />
                    </View>
                    {displayTasks.length > 0 && (
                        <Animated.View
                            entering={FadeInDown.delay(700).duration(600)}
                            style={styles.section}
                        >
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Мои задачи</Text>
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
                        </Animated.View>
                    )}

                    {allUpcomingEvents.length > 0 && (
                        <Animated.View
                            entering={FadeInDown.delay(displayTasks.length > 0 ? 1000 : 700).duration(600)}
                            style={styles.section}
                        >
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Предстоящие мероприятия</Text>
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
                        </Animated.View>
                    )}

                    {displayTasks.length === 0 && allUpcomingEvents.length === 0 && (
                        <Animated.View
                            entering={FadeInDown.delay(700).duration(600)}
                            style={[styles.section]}
                        >
                            <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <CheckCircle2 size={48} color={isDark ? "#4ade80" : "#3bb625"} />
                                <Text style={[styles.emptyMainTitle, { color: colors.text }]}>Нет активных задач</Text>
                                <Text style={[styles.emptyMainSubtitle, { color: colors.subtext }]}>
                                    Идеальный момент, чтобы просто побыть в покое и насладиться тишиной
                                </Text>
                            </View>
                        </Animated.View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
