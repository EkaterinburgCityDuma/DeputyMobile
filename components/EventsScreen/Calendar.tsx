import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { MoveLeft, MoveRight } from 'lucide-react-native';
import { Event } from "@/models/EventModel";
import {getLocalDateKey, getTodayLocalKey} from "@/utils";
import { useTheme } from '@/context/ThemeContext';

interface CalendarProps {
    selectedDate: string | undefined;
    onSelectDate: (date: string) => void;
    events: Event[];
    currentYear: number;
    currentMonth: number;
    onMonthChange: (direction: number) => void;
}

export const Calendar: React.FC<CalendarProps> = ({ selectedDate, onSelectDate, events, currentYear, currentMonth, onMonthChange }) => {
    const { colors, isDark } = useTheme();

    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

    const eventsByDate = useMemo(() => {
        const map: Record<string, Event[]> = {};
        if (!events) return map;
        events.forEach((event) => {
            // Используем локальную дату
            const dateKey = getLocalDateKey(event.start_at);
            if (!map[dateKey]) map[dateKey] = [];
            map[dateKey].push(event);
        });
        return map;
    }, [events]);

    const calendarWeeks = useMemo(() => {
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        let firstDay = new Date(currentYear, currentMonth, 1).getDay();
        firstDay = firstDay === 0 ? 7 : firstDay;

        const weeks = [];
        let currentWeek = Array(firstDay - 1).fill(null);

        for (let day = 1; day <= daysInMonth; day++) {
            currentWeek.push(day);
            if (currentWeek.length === 7) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
        }
        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) currentWeek.push(null);
            weeks.push(currentWeek);
        }
        return weeks;
    }, [currentMonth, currentYear]);

    const todayKey = getTodayLocalKey();

    return (
        <Animated.View layout={LinearTransition} style={[styles.calendar, { backgroundColor: colors.card }]}>
            <View style={styles.container}>
                <View style={styles.calendarHeader}>
                    <TouchableOpacity
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        onPress={() => onMonthChange(-1)}
                        style={styles.navButton}
                    >
                        <View pointerEvents="none">
                            <MoveLeft size={22} color={isDark ? colors.roleText : "#0f6319"} />
                        </View>
                    </TouchableOpacity>

                    <Text style={[styles.calendarTitle, { color: colors.text }]}>{`${months[currentMonth]} ${currentYear}`}</Text>

                    <TouchableOpacity
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        onPress={() => onMonthChange(1)}
                        style={styles.navButton}
                    >
                        <View pointerEvents="none">
                            <MoveRight size={22} color={isDark ? colors.roleText : "#0f6319"} />
                        </View>
                    </TouchableOpacity>
                </View>

                <Animated.View
                    key={`grid-${currentMonth}-${currentYear}`}
                    entering={FadeIn.duration(300)}
                    style={styles.gridContainer}
                >
                    <View style={styles.weekRow}>
                        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => (
                            <View key={day} style={styles.dayWrapper}>
                                <Text style={[styles.calendarDayText, { color: colors.subtext }]}>{day}</Text>
                            </View>
                        ))}
                    </View>

                    {calendarWeeks.map((week, weekIdx) => (
                        <View key={`week-${weekIdx}`} style={styles.weekRow}>
                            {week.map((day, dayIdx) => {
                                if (!day) return <View key={`empty-${dayIdx}`} style={styles.dayWrapper} />;

                                const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                                const isSelected = selectedDate === dateStr;
                                const dayEvents = eventsByDate[dateStr] || [];
                                const hasEvents = dayEvents.length > 0;
                                const isDayPast = dateStr < todayKey;

                                return (
                                    <View key={day} style={styles.dayWrapper}>
                                        <TouchableOpacity
                                            style={[styles.daySquare, isSelected && { backgroundColor: isDark ? colors.primary + '40' : '#e6ecff' }]}
                                            onPress={() => onSelectDate(dateStr)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.calendarDateText, { color: colors.text }, isSelected && { color: colors.primary, fontWeight: '700' }]}>
                                                {day}
                                            </Text>
                                            {hasEvents && (
                                                <View style={[
                                                    styles.eventDot,
                                                    { backgroundColor: isDark ? colors.roleText : '#13b626' },
                                                    isDayPast && styles.eventDotPast
                                                ]} />
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                        </View>
                    ))}
                </Animated.View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    calendar: {
        backgroundColor: '#fff',
        borderRadius: 24,
        width: '90%',
        alignSelf: 'center',
    },
    container: {
        padding: 16,
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',

    },
    navButton: {
        padding: 8,
    },
    calendarTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#0b2340',
        textTransform: 'capitalize',
    },
    gridContainer: {
        width: '100%',
    },
    weekRow: {
        flexDirection: 'row',
        width: '100%',
    },
    dayWrapper: {
        width: '14.28%',
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    calendarDayText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#9ca3af',
    },
    daySquare: {
        width: '80%',
        height: '80%',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,

    },
    calendarDateText: {
        fontSize: 15,
        fontWeight: '500',
        color: '#1f2937',
    },
    eventDot: {
        width: 7,
        height: 7,
        borderRadius: "50%",
        backgroundColor: '#13b626',
        position: 'absolute',
        bottom: 0,
    },
    eventDotPast: {
        backgroundColor: '#9ca3af', // Серый цвет (slate-400) для прошедших
    },
});
