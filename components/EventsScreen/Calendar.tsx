import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, LinearTransition, ReduceMotion } from 'react-native-reanimated';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { MotionPressable } from '@/components/ui/Shared/Motion';
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
    const { colors } = useTheme();

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
        <Animated.View layout={LinearTransition.duration(220).reduceMotion(ReduceMotion.System)} style={[styles.calendar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.container}>
                <View style={styles.calendarHeader}>
                    <MotionPressable
                        accessibilityLabel="Предыдущий месяц"
                        onPress={() => onMonthChange(-1)}
                        style={[styles.navButton, { backgroundColor: colors.iconBox }]}
                    >
                        <View pointerEvents="none">
                            <ChevronLeft size={20} color={colors.text} />
                        </View>
                    </MotionPressable>

                    <Text style={[styles.calendarTitle, { color: colors.text }]}>{`${months[currentMonth]} ${currentYear}`}</Text>

                    <MotionPressable
                        accessibilityLabel="Следующий месяц"
                        onPress={() => onMonthChange(1)}
                        style={[styles.navButton, { backgroundColor: colors.iconBox }]}
                    >
                        <View pointerEvents="none">
                            <ChevronRight size={20} color={colors.text} />
                        </View>
                    </MotionPressable>
                </View>

                <Animated.View
                    key={`grid-${currentMonth}-${currentYear}`}
                    entering={FadeIn.duration(180).reduceMotion(ReduceMotion.System)}
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
                                        <MotionPressable
                                            accessibilityLabel={`${day} ${months[currentMonth]} ${currentYear}, событий: ${dayEvents.length}`}
                                            accessibilityState={{ selected: isSelected }}
                                            style={[styles.daySquare, { borderWidth: 1, borderColor: dateStr === todayKey ? colors.accent : 'transparent' }, isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                                            onPress={() => onSelectDate(dateStr)}
                                        >
                                            <Text style={[styles.calendarDateText, { color: colors.text }, isSelected && { color: '#ffffff', fontWeight: '700' }]}>
                                                {day}
                                            </Text>
                                            {hasEvents && (
                                                <View style={[
                                                    styles.eventDot,
                                                    { backgroundColor: isSelected ? '#ffffff' : isDayPast ? colors.subtext : colors.accent },
                                                ]} />
                                            )}
                                        </MotionPressable>
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
        borderRadius: 20,
        borderWidth: 1,
        width: '90%',
        maxWidth: 560,
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
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
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
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    calendarDayText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#9ca3af',
    },
    daySquare: {
        width: '90%',
        maxWidth: 44,
        height: 44,
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
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#13b626',
        position: 'absolute',
        bottom: 5,
    },
    eventDotPast: {
        backgroundColor: '#9ca3af', // Серый цвет (slate-400) для прошедших
    },
});
