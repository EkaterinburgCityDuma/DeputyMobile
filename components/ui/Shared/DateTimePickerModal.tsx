import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    ScrollView,
} from 'react-native';
import DateTimePicker from 'react-native-ui-datepicker';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { MotionPressable } from './Motion';
import { useReducedMotion } from 'react-native-reanimated';

// Настройка dayjs на русский
dayjs.locale('ru');

type DateTimePickerModalProps = {
    isVisible: boolean;
    mode: 'date' | 'time' | 'datetime';
    onConfirm: (date: Date) => void;
    onCancel: () => void;
    date?: Date;
};

export default function DateTimePickerModal({
                                                isVisible,
                                                mode,
                                                onConfirm,
                                                onCancel,
                                                date,
                                            }: DateTimePickerModalProps) {
    const { colors } = useTheme();
    const reducedMotion = useReducedMotion();
    const styles = createStyles(colors);
    const [selectedDate, setSelectedDate] = useState<Date>(date || new Date());
    const [pickerMode, setPickerMode] = useState<'date' | 'time'>(mode === 'time' ? 'time' : 'date');
    const [selectedHours, setSelectedHours] = useState<number>(date ? date.getHours() : new Date().getHours());
    const [selectedMinutes, setSelectedMinutes] = useState<number>(date ? date.getMinutes() : new Date().getMinutes());

    const hoursScrollRef = useRef<ScrollView>(null);
    const minutesScrollRef = useRef<ScrollView>(null);

    useEffect(() => {
        if (isVisible && date) {
            setSelectedDate(date);
            setSelectedHours(date.getHours());
            setSelectedMinutes(date.getMinutes());
        } else if (isVisible && !date) {
            const now = new Date();
            setSelectedDate(now);
            setSelectedHours(now.getHours());
            setSelectedMinutes(now.getMinutes());
        }
        if (isVisible) {
            setPickerMode(mode === 'time' ? 'time' : 'date');
        }
    }, [isVisible, date, mode]);

    // Автопрокрутка к выбранному времени
    useEffect(() => {
        if (pickerMode === 'time' && isVisible) {
            const timeout = setTimeout(() => {
                hoursScrollRef.current?.scrollTo({
                    y: selectedHours * 44,
                    animated: !reducedMotion
                });
                minutesScrollRef.current?.scrollTo({
                    y: (selectedMinutes / 5) * 44,
                    animated: !reducedMotion
                });
            }, 100);
            return () => clearTimeout(timeout);
        }
    }, [pickerMode, isVisible, selectedHours, selectedMinutes, reducedMotion]);

    const handleConfirm = () => {
        const finalDate = new Date(selectedDate);
        finalDate.setHours(selectedHours, selectedMinutes, 0, 0);
        onConfirm(finalDate);
    };

    const handleDateChange = (params: { date: Date | any }) => {
        if (params.date) {
            const newDate = params.date instanceof Date ? params.date : dayjs(params.date).toDate();
            setSelectedDate(newDate);

            if (mode === 'datetime' && pickerMode === 'date') {
                setPickerMode('time');
            }
        }
    };

    const formatTime = (value: number) => String(value).padStart(2, '0');

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

    return (
        <Modal
            visible={isVisible}
            transparent
            animationType={reducedMotion ? 'none' : 'fade'}
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <MotionPressable onPress={onCancel} style={styles.headerButton}>
                            <Ionicons name="close" size={24} color={colors.subtext} />
                        </MotionPressable>
                        <Text style={styles.title}>
                            {pickerMode === 'date' ? 'Выберите дату' : 'Выберите время'}
                        </Text>
                        <View style={styles.headerButton} />
                    </View>

                    {/* Mode Tabs для datetime */}
                    {mode === 'datetime' && (
                        <View style={styles.tabContainer}>
                            <MotionPressable
                                style={[styles.tab, pickerMode === 'date' && styles.tabActive]}
                                onPress={() => setPickerMode('date')}
                            >
                                <Ionicons
                                    name="calendar-outline"
                                    size={18}
                                    color={pickerMode === 'date' ? colors.roleText : colors.subtext}
                                />
                                <Text style={[styles.tabText, pickerMode === 'date' && styles.tabTextActive]}>
                                    Дата
                                </Text>
                            </MotionPressable>
                            <MotionPressable
                                style={[styles.tab, pickerMode === 'time' && styles.tabActive]}
                                onPress={() => setPickerMode('time')}
                            >
                                <Ionicons
                                    name="time-outline"
                                    size={18}
                                    color={pickerMode === 'time' ? colors.roleText : colors.subtext}
                                />
                                <Text style={[styles.tabText, pickerMode === 'time' && styles.tabTextActive]}>
                                    Время
                                </Text>
                            </MotionPressable>
                        </View>
                    )}

                    {/* Content */}
                    <View style={styles.content}>
                        {pickerMode === 'date' ? (
                            <View style={styles.calendarWrapper}>
                                <DateTimePicker
                                    mode="single"
                                    date={selectedDate}
                                    onChange={handleDateChange}
                                    locale="ru"
                                    firstDayOfWeek={1}
                                    components={{
                                        IconPrev: <Ionicons name="chevron-back" size={22} color={colors.roleText} />,
                                        IconNext: <Ionicons name="chevron-forward" size={22} color={colors.roleText} />,
                                    }}
                                    styles={{
                                        day_label: styles.calendarText,
                                        weekday_label: styles.weekDayText,
                                        month_selector_label: styles.calendarHeaderText,
                                        year_selector_label: styles.calendarHeaderText,
                                        month_label: styles.calendarText,
                                        year_label: styles.calendarText,
                                        today: { borderColor: colors.roleText, borderWidth: 1, borderRadius: 10 },
                                        today_label: { color: colors.roleText },
                                        selected: { backgroundColor: colors.primary, borderRadius: 10 },
                                        selected_label: { color: '#fff', fontWeight: '600' },
                                        selected_month: { backgroundColor: colors.primary, borderRadius: 10 },
                                        selected_month_label: { color: '#fff' },
                                        selected_year: { backgroundColor: colors.primary, borderRadius: 10 },
                                        selected_year_label: { color: '#fff' },
                                        active_year: { backgroundColor: colors.roleBadge, borderRadius: 10 },
                                        active_year_label: { color: colors.roleText },
                                        outside_label: { color: colors.subtext, opacity: 0.5 },
                                        disabled_label: { color: colors.subtext, opacity: 0.4 },
                                    }}
                                />
                            </View>
                        ) : (
                            <View style={styles.timePickerWrapper}>
                                <View style={styles.timePickerContainer}>
                                    {/* Часы */}
                                    <View style={styles.timeColumn}>
                                        <Text style={styles.timeColumnTitle}>Часы</Text>
                                        <View style={styles.timeScrollContainer}>
                                            <ScrollView
                                                ref={hoursScrollRef}
                                                style={styles.timeScroll}
                                                showsVerticalScrollIndicator={false}
                                                snapToInterval={44}
                                                decelerationRate="fast"
                                            >
                                                {/* Padding top для центрирования */}
                                                <View style={{ height: 80 }} />
                                                {hours.map((hour) => (
                                                    <MotionPressable
                                                        key={hour}
                                                        style={[
                                                            styles.timeItem,
                                                            selectedHours === hour && styles.timeItemSelected,
                                                        ]}
                                                        onPress={() => setSelectedHours(hour)}
                                                    >
                                                        <Text style={[
                                                            styles.timeItemText,
                                                            selectedHours === hour && styles.timeItemTextSelected,
                                                        ]}>
                                                            {formatTime(hour)}
                                                        </Text>
                                                    </MotionPressable>
                                                ))}
                                                {/* Padding bottom для центрирования */}
                                                <View style={{ height: 80 }} />
                                            </ScrollView>
                                            {/* Градиентные затемнения сверху и снизу */}
                                            <View pointerEvents="none" style={styles.scrollFadeTop} />
                                            <View pointerEvents="none" style={styles.scrollFadeBottom} />
                                        </View>
                                    </View>

                                    <Text style={styles.timeSeparator}>:</Text>

                                    {/* Минуты */}
                                    <View style={styles.timeColumn}>
                                        <Text style={styles.timeColumnTitle}>Минуты</Text>
                                        <View style={styles.timeScrollContainer}>
                                            <ScrollView
                                                ref={minutesScrollRef}
                                                style={styles.timeScroll}
                                                showsVerticalScrollIndicator={false}
                                                snapToInterval={44}
                                                decelerationRate="fast"
                                            >
                                                <View style={{ height: 80 }} />
                                                {minutes.map((minute) => (
                                                    <MotionPressable
                                                        key={minute}
                                                        style={[
                                                            styles.timeItem,
                                                            selectedMinutes === minute && styles.timeItemSelected,
                                                        ]}
                                                        onPress={() => setSelectedMinutes(minute)}
                                                    >
                                                        <Text style={[
                                                            styles.timeItemText,
                                                            selectedMinutes === minute && styles.timeItemTextSelected,
                                                        ]}>
                                                            {formatTime(minute)}
                                                        </Text>
                                                    </MotionPressable>
                                                ))}
                                                <View style={{ height: 80 }} />
                                            </ScrollView>
                                            <View pointerEvents="none" style={styles.scrollFadeTop} />
                                            <View pointerEvents="none" style={styles.scrollFadeBottom} />
                                        </View>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Selected Date Display */}
                    {pickerMode === 'time' && (
                        <View style={styles.selectedDateDisplay}>
                            <Ionicons name="calendar-outline" size={16} color={colors.subtext} />
                            <Text style={styles.selectedDateText}>
                                {dayjs(selectedDate).locale('ru').format('DD MMMM YYYY')}
                            </Text>
                        </View>
                    )}

                    {/* Footer */}
                    <View style={styles.footer}>
                        <MotionPressable
                            style={styles.cancelButton}
                            onPress={onCancel}
                        >
                            <Text style={styles.cancelButtonText}>Отмена</Text>
                        </MotionPressable>
                        <MotionPressable
                            style={styles.confirmButton}
                            onPress={handleConfirm}
                        >
                            <Text style={styles.confirmButtonText}>Готово</Text>
                        </MotionPressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        backgroundColor: colors.card,
        borderRadius: 20,
        width: '100%',
        maxWidth: 400,
        maxHeight: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    headerButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 17,
        fontWeight: '600',
        color: colors.text,
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 5,
        gap: 10,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: colors.background,
        gap: 6,
    },
    tabActive: {
        backgroundColor: colors.roleBadge,
    },
    tabText: {
        fontSize: 14,
        color: colors.subtext,
        fontWeight: '500',
    },
    tabTextActive: {
        color: colors.roleText,
        fontWeight: '600',
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    calendarWrapper: {
        minHeight: 350,
    },
    calendarHeaderText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    weekDayText: {
        fontSize: 13,
        fontWeight: '500',
        color: colors.subtext,
    },
    calendarText: {
        fontSize: 15,
        color: colors.text,
    },
    todayContainer: {
        backgroundColor: colors.roleBadge,
        borderRadius: 8,
    },
    todayText: {
        color: colors.primary,
        fontWeight: '600',
    },
    timePickerWrapper: {
        height: 260,
        justifyContent: 'center',
    },
    timePickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 220,
        paddingVertical: 10,
    },
    timeColumn: {
        flex: 1,
        alignItems: 'center',
    },
    timeColumnTitle: {
        fontSize: 12,
        color: colors.subtext,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    timeScrollContainer: {
        height: 180,
        width: '100%',
        position: 'relative',
    },
    timeScroll: {
        flex: 1,
        width: '100%',
    },
    timeItem: {
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 2,
        marginHorizontal: 10,
        borderRadius: 10,
    },
    timeItemSelected: {
        backgroundColor: colors.primary,
    },
    timeItemText: {
        fontSize: 20,
        color: colors.text,
        fontWeight: '500',
    },
    timeItemTextSelected: {
        color: '#fff',
        fontWeight: '600',
    },
    timeSeparator: {
        fontSize: 24,
        fontWeight: '300',
        color: colors.text,
        marginHorizontal: 10,
        marginBottom: 20,
    },
    scrollFadeTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 30,
        backgroundColor: colors.card + 'E6',
    },
    scrollFadeBottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 30,
        backgroundColor: colors.card + 'E6',
    },
    selectedDateDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        gap: 6,
        backgroundColor: colors.background,
        marginHorizontal: 20,
        borderRadius: 8,
    },
    selectedDateText: {
        fontSize: 14,
        color: colors.subtext,
    },
    footer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 15,
        gap: 10,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: colors.background,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        color: colors.subtext,
        fontWeight: '500',
    },
    confirmButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: colors.primary,
        alignItems: 'center',
    },
    confirmButtonText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '600',
    },
});
