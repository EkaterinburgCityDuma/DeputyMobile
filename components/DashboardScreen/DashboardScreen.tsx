import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Calendar,
    Clock,
    ChevronRight,
    CheckCircle2,
    Bell,
    AlertCircle,
    RefreshCw
} from 'lucide-react-native';
import { styles } from './style';
import Animated, { FadeInDown, FadeInRight} from 'react-native-reanimated';
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {AuthManager} from "@/components/LoginScreen/LoginScreen";
import { apiUrl } from '@/api/api';
import {Event} from "@/models/EventModel"
import {EventCard} from "@/components/EventsScreen/EventCard";
import {Task} from "@/models/TaskBoardModel";
import {formatDate, formatDateToDay, getDaysUntilDue} from "@/utils";

interface DashboardData {
    user_name: string;
    roles: string[];
    event_count: number;
    urgent_event_count: number;
    task_count: number;
    urgent_tasks_count: number;
    tasks: any[];
    urgent_tasks: any[];
    urgent_events: any[];
    events_by_status: {
        Going: any[];
        NotGoing: any[];
        Unknown: any[];
        NotAnswered: any[];
    };
}



export function Dashboard() {
    const insets = useSafeAreaInsets();

    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const token = AuthManager.getToken();

            if (!token) {
                setError('Не найден токен авторизации');
                return;
            }

            const response = await fetch(`${apiUrl}/api/Dashboard/get`, {
                method: 'GET',
                headers: {
                    'accept': '*/*',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    setError('Сессия истекла. Пожалуйста, войдите снова');
                } else {
                    setError(`Ошибка сервера: ${response.status}`);
                }
                return;
            }

            const json = await response.json();
            console.log(json.urgent_tasks);
            setData(json);
        } catch (error) {
            console.error(error);
            setError('Не удалось загрузить данные дашборда. Проверьте подключение к интернету');
        } finally {
            setIsLoading(false);
        }
    };

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



    // Отображение загрузки
    if (isLoading) {
        return (
            <View style={[styles.content, { flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#2A6E3F" />
                <Text style={{ marginTop: 10, color: '#666' }}>Загрузка данных...</Text>
            </View>
        );
    }

    // Отображение ошибки
    if (error || !data) {
        return (
            <ScrollView showsVerticalScrollIndicator={false}>
                <View>
                    <LinearGradient
                        colors={['#2A6E3F', '#349339']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.header, { paddingTop: insets.top + 15 }]}
                    >
                        <View style={styles.headerContent}>
                            <View style={styles.userInfoRow}>
                                <TouchableOpacity style={styles.userProfileButton} onPress={() => router.push("/ProfileScreen")}>
                                    <View style={styles.avatarContainer}>
                                        <View style={styles.avatar}>
                                            <Text style={styles.avatarText}>?</Text>
                                        </View>
                                    </View>
                                    <View style={styles.userInfo}>
                                        <Text style={styles.greeting}>Добрый день,</Text>
                                        <Text style={styles.userName}>Гость</Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.notificationButton} onPress={() => router.push("/NotificationScreen")}>
                                    <Bell size={20} color="white" />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.jobTitle}>Сотрудник</Text>
                            <Text style={styles.organization}>Городская Дума Екатеринбурга</Text>
                        </View>
                    </LinearGradient>
                </View>

                <View style={[styles.content, { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 300 }]}>
                    <View style={{
                        backgroundColor: '#FEF2F2',
                        padding: 20,
                        borderRadius: 12,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: '#FEE2E2',
                        marginHorizontal: 20
                    }}>
                        <AlertCircle size={48} color="#DC2626" />
                        <Text style={{ fontSize: 18, fontWeight: '600', color: '#991B1B', marginTop: 10, textAlign: 'center' }}>
                            Ошибка загрузки
                        </Text>
                        <Text style={{ fontSize: 14, color: '#B91C1C', marginTop: 5, textAlign: 'center' }}>
                            {error || 'Не удалось загрузить данные'}
                        </Text>
                        <TouchableOpacity
                            onPress={fetchDashboardData}
                            style={{
                                backgroundColor: '#2A6E3F',
                                paddingHorizontal: 20,
                                paddingVertical: 10,
                                borderRadius: 8,
                                marginTop: 15,
                                flexDirection: 'row',
                                alignItems: 'center'
                            }}
                        >
                            <RefreshCw size={18} color="white" />
                            <Text style={{ color: 'white', marginLeft: 8, fontSize: 14, fontWeight: '500' }}>
                                Повторить попытку
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        );
    }

    const allUpcomingEvents = [...(data.events_by_status?.Going || [])].slice(0, 3);
    const displayTasks : Task[] = data.tasks?.slice(0, 3) || [];

    return (
        <ScrollView showsVerticalScrollIndicator={false}>
            <View>
                <LinearGradient
                    colors={['#2A6E3F', '#349339']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.header, { paddingTop: insets.top + 15 }]}
                >
                    <View style={styles.headerContent}>
                        <View style={styles.userInfoRow}>
                            <TouchableOpacity style={styles.userProfileButton} onPress={() => router.push("/ProfileScreen")}>
                                <View style={styles.avatarContainer}>
                                    <View style={styles.avatar}>
                                        <Text style={styles.avatarText}>
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
                                <Bell size={20} color="white" />
                            </TouchableOpacity>
                        </View>
                        {/* Берем первую роль из массива как должность */}
                        <Text style={styles.jobTitle}>{data.roles?.[0] || 'Сотрудник'}</Text>
                        <Text style={styles.organization}>Городская Дума Екатеринбурга</Text>
                    </View>
                </LinearGradient>
            </View>

            <View style={styles.content}>
                <View style={styles.statsGrid}>

                    {/* --- КАРТОЧКА 1 --- */}
                    <Animated.View style={styles.statCardContainer} entering={FadeInDown.delay(200).duration(600).springify()}>
                        <LinearGradient colors={['#ffffff', '#fffafa']} style={styles.statCard}>
                            <View style={styles.statIcon}><Calendar size={20} color="black" /></View>
                            <Text style={styles.statNumber}>{data.event_count || 0}</Text>
                            <Text style={styles.statLabel}>Мероприятий</Text>
                        </LinearGradient>
                    </Animated.View>

                    {/* --- КАРТОЧКА 2 --- */}
                    <Animated.View style={styles.statCardContainer} entering={FadeInDown.delay(400).duration(600).springify()}>
                        <LinearGradient colors={['#ffffff', '#fffafa']} style={styles.statCard}>
                            <View style={styles.statIcon}><CheckCircle2 size={20} color="black" /></View>
                            <Text style={styles.statNumber}>{data.task_count || 0}</Text>
                            <Text style={styles.statLabel}>Задач</Text>
                        </LinearGradient>
                    </Animated.View>

                    {/* --- КАРТОЧКА 3 --- */}
                    <Animated.View style={styles.statCardContainer} entering={FadeInDown.delay(600).duration(600).springify()}>
                        <LinearGradient colors={['#ffffff', '#fffafa']} style={styles.statCard}>
                            <View style={styles.statIcon}><AlertCircle size={20} color="black" /></View>
                            <Text style={styles.statNumber}>{data.urgent_tasks_count || 0}</Text>
                            <Text style={styles.statLabel}>Срочных задач</Text>
                        </LinearGradient>
                    </Animated.View>
                </View>

                {displayTasks.length > 0 && (
                    <Animated.View
                        entering={FadeInDown.delay(700).duration(600)}
                        style={styles.section}
                    >
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Мои задачи</Text>
                        </View>

                        <View style={styles.cardsContainer}>
                            {displayTasks.map((task: any, index: number) => {
                                const daysLeft = getDaysUntilDue(task.dueDate);
                                const isUrgent = daysLeft <= 2 && daysLeft >= 0;
                                const isOverdue = daysLeft < 0;

                                return (
                                    <Animated.View
                                        key={task.id || index}
                                        entering={FadeInRight.delay(800 + index * 100).duration(500).springify()}
                                    >
                                        <TouchableOpacity style={styles.card}>
                                            <View style={styles.cardContent}>
                                                <View style={styles.cardTextContainer}>
                                                    <Text style={styles.cardTitle} numberOfLines={2}>
                                                        {task.title}
                                                    </Text>
                                                    <View style={styles.cardTags}>
                                                        <View style={styles.tag}>
                                                            <Text style={styles.tagText}>
                                                                {task.status}
                                                            </Text>
                                                        </View>
                                                        <View style={styles.timeTag}>
                                                            <Clock size={14} color={isOverdue ? '#dc2626' : isUrgent ? '#f97316' : '#6b7280'} />
                                                            <Text style={[styles.timeText, { color: isOverdue ? '#dc2626' : isUrgent ? '#f97316' : '#6b7280', fontWeight: '500' }]}>
                                                                {isOverdue ? `Просрочено ${Math.abs(daysLeft)} дн.` : daysLeft === 0 ? 'Сегодня' : `${daysLeft} дн.`}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                </View>
                                                <ChevronRight size={20} color="#9ca3af" />
                                            </View>
                                        </TouchableOpacity>
                                    </Animated.View>
                                );
                            })}
                        </View>
                    </Animated.View>
                )}

                {/* --- СЕКЦИЯ: ПРЕДСТОЯЩИЕ МЕРОПРИЯТИЯ (показываем всегда, если есть события) --- */}
                {allUpcomingEvents.length > 0 && (
                    <Animated.View
                        entering={FadeInDown.delay(displayTasks.length > 0 ? 1000 : 700).duration(600)}
                        style={styles.section}
                    >
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Предстоящие мероприятия</Text>
                        </View>

                        <View style={styles.cardsContainer}>
                            {allUpcomingEvents.map((event: Event, index: number) => {
                            const showDate = index === 0 ||
                            formatDate(event.start_at) !== formatDate(allUpcomingEvents[index - 1].start_at);

                            return (
                            <View key={event.id}>
                            {showDate && (
                                <Text style={styles.eventDate}>{formatDateToDay(event.start_at)}</Text>
                            )}
                            <EventCard
                                event={event}
                                index={index}
                                onPress={() => router.push({
                                    pathname: '/(screens)/EventDetailsScreen',
                                    params: { id: event.id }
                                })}
                            />
                        </View>
                        );
                        })}
                        </View>
                    </Animated.View>
                )}

                {/* --- ЗАГЛУШКА (когда нет ни задач, ни событий) --- */}
                {displayTasks.length === 0 && allUpcomingEvents.length === 0 && (
                    <Animated.View
                        entering={FadeInDown.delay(700).duration(600)}
                        style={[styles.section]}
                    >
                        <View style={styles.emptyContainer}>
                            <CheckCircle2 size={48} color="#3bb625" />
                            <Text style={styles.emptyMainTitle}>Нет активных задач</Text>
                            <Text style={styles.emptyMainSubtitle}>
                                Идеальный момент, чтобы просто побыть в покое и насладиться тишиной
                            </Text>
                        </View>
                    </Animated.View>
                )}
            </View>
        </ScrollView>
    );
}
