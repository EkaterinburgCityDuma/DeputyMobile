import React, { useMemo, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
    Platform,
    ScrollView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import { Calendar } from '@/components/EventsScreen/Calendar';
import { EventCard } from '@/components/EventsScreen/EventCard';
import { Event } from '@/models/EventModel';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {apiClient} from "@/api/api";
import { Plus } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Select } from "@/components/ui/Shared/Select";
import { SchedulePopup } from "@/components/EventsScreen/SchedulePopup";
import { formatDate, getLocalDateKey, getTodayLocalKey } from "@/utils";
import { Filters } from '../ui/Shared/Filters';
import { useTheme } from '@/context/ThemeContext';

import { useEventsStore } from '@/store/useEventsStore';
import {SkeletonLoader} from "@/components/ui/Shared/SkeletonLoader";

const EventsScreen: React.FC = () => {
    const { colors, isDark } = useTheme();
    const params = useLocalSearchParams<{ isMine?: string }>();
    const isMineMode = params.isMine === 'true';

    const now = new Date();
    const [viewDate, setViewDate] = useState({ year: now.getFullYear(), month: now.getMonth() });
    const [selectedDate, setSelectedDate] = useState<string | undefined>();

    const { events, isLoading: loading, fetchEvents } = useEventsStore();
    const [refreshing, setRefreshing] = useState(false);
    const [isDayModalVisible, setIsDayModalVisible] = useState(false);
    const [selectedDayEvents, setSelectedDayEvents] = useState<Event[]>([]);

    // Если isMineMode = true, то принудительно устанавливаем режим 'list' и фильтр 'mine'
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
    const [eventsFilter, setEventsFilter] = useState<'all' | 'mine' | 'past'>(
        isMineMode ? 'mine' : 'all'
    );

    const insets = useSafeAreaInsets();

    // Функция для получения названия месяца в родительном падеже
    const getMonthInGenitive = useCallback((year: number, month: number): string => {
        const monthsGenitive = [
            'январе', 'феврале', 'марте', 'апреле', 'мае', 'июне',
            'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'
        ];
        return monthsGenitive[month];
    }, []);

    const currMonth = useMemo(() =>
            getMonthInGenitive(viewDate.year, viewDate.month),
        [viewDate.year, viewDate.month, getMonthInGenitive]
    );

    const handleMonthChange = useCallback((direction: number) => {
        setSelectedDate(undefined);
        setViewDate(previous => {
            const next = new Date(previous.year, previous.month + direction, 1);
            return { year: next.getFullYear(), month: next.getMonth() };
        });
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchEvents(viewDate.year, viewDate.month, false, eventsFilter === 'mine');
        }, [viewDate.year, viewDate.month, eventsFilter, fetchEvents])
    );

    // Обработка смены режима отображения
    const handleViewModeChange = useCallback((mode: 'calendar' | 'list') => {
        setViewMode(mode);
        const today = new Date();

        if (mode === 'calendar' && eventsFilter === 'past') {
            setEventsFilter('all');
        }

        if (mode === 'list') {
            setSelectedDate(undefined);
            if (viewDate.month !== today.getMonth() || viewDate.year !== today.getFullYear()) {
                setViewDate({ year: today.getFullYear(), month: today.getMonth() });
            }
        }
    }, [eventsFilter, viewDate.month, viewDate.year]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await fetchEvents(viewDate.year, viewDate.month, true, eventsFilter === 'mine');
        } finally {
            setRefreshing(false);
        }
    }, [viewDate.year, viewDate.month, eventsFilter, fetchEvents]);

    const todayKey = useMemo(() => getTodayLocalKey(), []);

    const filteredEvents = useMemo(() => {
        if (!events || !Array.isArray(events)) {
            return [];
        }

        if (viewMode === 'calendar' && selectedDate) {
            return events.filter(ev => getLocalDateKey(ev.start_at) === selectedDate);
        }

        return events.filter(ev => {
            const eventDateKey = getLocalDateKey(ev.start_at);

            if (eventsFilter === 'past') {
                return eventDateKey < todayKey;
            }
            return eventDateKey >= todayKey;
        });
    }, [events, selectedDate, viewMode, todayKey]);

    const grouped = useMemo(() => {
        const map: Record<string, Event[]> = {};
        filteredEvents.forEach(event => {
            const dateKey = getLocalDateKey(event.start_at);
            if (!map[dateKey]) map[dateKey] = [];
            map[dateKey].push(event);
        });
        return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
    }, [filteredEvents]);

    const handleDateSelect = useCallback((date: string) => {
        setSelectedDate(date);

        const dayEvents = events.filter(ev => getLocalDateKey(ev.start_at) === date);

        if (dayEvents.length > 0) {
            setSelectedDayEvents(dayEvents);
            setIsDayModalVisible(true);
        }
    }, [events]);

    const filterItems = useMemo(() => {
        if (viewMode === 'calendar') {
            return [
                { label: 'Все', value: 'all' },
                { label: 'Мои', value: 'mine' },
            ];
        } else {
            return [
                { label: 'Предстоящие', value: 'all' },
                { label: 'Прошедшие', value: 'past' },
                { label: 'Мои', value: 'mine' },
            ];
        }
    }, [viewMode]);

    const headerSubtitleText = useMemo(() => {
        if (viewMode !== 'calendar') {
            return `Предстоит: ${filteredEvents.length}`;
        }
        return `Запланировано в ${currMonth}: ${filteredEvents.length}`;
    }, [viewMode, filteredEvents.length, currMonth]);


    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingTop: insets.top + 15 }]}
            >
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>События</Text>
                    <Text style={styles.headerSubtitle}>{headerSubtitleText}</Text>
                </View>
                <TouchableOpacity style={styles.newTaskButton} onPress={() => router.push("/(screens)/EventsScreen/CreateEventScreen")}>
                    <View pointerEvents="none">
                        <Plus size={20} color="white" />
                    </View>
                </TouchableOpacity>
            </LinearGradient>

            <Filters
                title1={"Отображение"}
                title2={"События"}
                selectComponent1={
                    <Select
                        value={viewMode}
                        onValueChange={(v) => handleViewModeChange(v as 'calendar' | 'list')}
                        items={[
                            { label: 'Календарь', value: 'calendar' },
                            { label: 'Список', value: 'list' },
                        ]}
                    />
                }
                selectComponent2={
                    <Select
                        value={eventsFilter}
                        onValueChange={(v) => setEventsFilter(v as any)}
                        items={filterItems}
                    />
                }
            />

            {viewMode === 'calendar' ? (
                <ScrollView
                    style={styles.calendarScrollView}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                        />
                    }
                >
                    <View style={styles.calendarContainer}>
                        {loading && !refreshing ? (
                            <View style={{ width: '100%', padding: 20 }}>
                                <SkeletonLoader count={1} itemHeight={350} />
                            </View>
                        ) : (
                            <Calendar
                                selectedDate={selectedDate}
                                onSelectDate={handleDateSelect}
                                events={events}
                                currentYear={viewDate.year}
                                currentMonth={viewDate.month}
                                onMonthChange={handleMonthChange}
                            />
                        )}
                    </View>
                </ScrollView>
            ) : (
                // Список выводится ТОЛЬКО в режиме 'list'
                <View style={[styles.contentSection, { marginTop: 16 }]}>
                    {loading && !refreshing ? (
                        <ScrollView
                            refreshControl={
                                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
                            }
                        >
                            <SkeletonLoader count={5} itemHeight={90} itemMargin={12} />
                        </ScrollView>
                    ) : (
                        <FlatList
                            data={grouped}
                            keyExtractor={([date]) => date}
                            renderItem={({ item }) => {
                                const [date, dayEvents] = item;
                                const formattedDate = formatDate(date);
                                return (
                                    <View style={styles.groupBlock}>
                                        <View style={[styles.dateBadge, { backgroundColor: isDark ? '#334155' : '#f1f5f9', borderWidth: 1, borderColor: isDark ? '#475569' : '#e2e8f0' }]}>
                                            <Text style={[styles.dateBadgeText, { color: isDark ? '#cbd5e1' : '#475569' }]}>{formattedDate}</Text>
                                        </View>
                                        {dayEvents.map(ev => (
                                            <EventCard
                                                key={ev.id}
                                                event={ev}
                                                onPress={() => router.push({
                                                    pathname: '/(screens)/EventsScreen/EventDetailsScreen',
                                                    params: { id: ev.id }
                                                })}
                                            />
                                        ))}
                                    </View>
                                );
                            }}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    colors={[colors.primary]}
                                    tintColor={colors.primary}
                                />
                            }
                        />
                    )}
                </View>
            )}

            {/* Попап расписания дня */}
            <SchedulePopup
                visible={isDayModalVisible}
                onClose={() => setIsDayModalVisible(false)}
                events={selectedDayEvents}
                date={selectedDate}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        paddingBottom: 40,
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

    filtersSection: {
        padding: 12,
        marginTop: -24,
        borderRadius: 20,
        marginHorizontal: 15,
        backgroundColor: "rgb(250,254,250)",
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 3,
        zIndex: 10,
        overflow: 'visible',
    },
    filtersGrid: {
        flexDirection: 'row',
        gap: 8,
        zIndex: 15,
        overflow: 'visible'
    },
    filterGroup: {
        flex: 1,
        zIndex: 11,
        overflow: 'visible'
    },
    filterLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 4,
        marginLeft: 2,
    },

    calendarScrollView: {
        flex: 1,
    },
    calendarContainer: {
        marginTop: 10,
        alignItems: 'center',
        paddingBottom: 20,
    },
    contentSection: {
        flex: 1,
        paddingHorizontal: 16,
    },
    emptyText: {
        fontSize: 15,
        color: '#6b7280',
        textAlign: 'center',
        marginTop: 20,
    },
    groupBlock: {
        marginBottom: 20,
    },
    dateBadge: {
        backgroundColor: '#e6ecff',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    dateBadgeText: {
        fontSize: 13,
        color: '#0f6119',
        textTransform: 'capitalize',
    },
    listContent: {
        paddingBottom: 100,
        paddingTop: 10,
    },
});

export default EventsScreen;
