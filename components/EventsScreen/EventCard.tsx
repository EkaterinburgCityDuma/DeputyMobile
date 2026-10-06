import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotionPressable, Reveal } from '@/components/ui/Shared/Motion';
import { MapPin } from 'lucide-react-native';
import { Event } from "@/models/EventModel";
import { useTheme } from '@/context/ThemeContext';

const getEventTypeStyles = (type: string, isPast: boolean, isDark: boolean) => {
    if (isPast) return { label: 'Завершено', color: isDark ? '#94a3b8' : '#6e7378', bg: isDark ? '#334155' : '#f1f5f9' };
    switch (type) {
        case 'Meeting': return { label: 'Заседание', color: isDark ? '#60a5fa' : '#6e7378', bg: isDark ? '#1e3a8a33' : '#E5F1FF' };
        case 'Commission': return { label: 'Комиссия', color: isDark ? '#fbbf24' : '#6e7378', bg: isDark ? '#78350f33' : '#FFF4E5' };
        default: return { label: 'Событие', color: isDark ? '#34d399' : '#6e7378', bg: isDark ? '#064e3b33' : '#EBFDEB' };
    }
};

interface EventCardProps {
    event: Event;
    index?: number;
    onPress?: (event: Event) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, index = 0, onPress }) => {
    const { colors, isDark } = useTheme();

    const isPast = useMemo(() => new Date(event.end_at) < new Date(), [event.end_at]);
    const typeStyle = getEventTypeStyles(event.type, isPast, isDark);


    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const startTime = useMemo(() => formatTime(event.start_at), [event.start_at]);
    const endTime = useMemo(() => formatTime(event.end_at), [event.end_at]);

    return (
        <Reveal index={index} style={styles.cardContainer}>
            <MotionPressable
                accessibilityLabel={`${event.title}, ${startTime}`}
                onPress={() => onPress?.(event)}
                style={[
                    styles.cardInner,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    isPast && { backgroundColor: colors.background }
                ]}
            >
                {/* Левая часть: Время */}
                <View style={[styles.timeSection, { backgroundColor: colors.iconBox }]}>
                    <Text style={[styles.timeText, { color: colors.text }, isPast && styles.pastText]}>{startTime}</Text>
                    <View style={[styles.timeDivider, { backgroundColor: colors.border }]} />
                    <Text style={[styles.timeTextEnd, { color: colors.subtext }, isPast && styles.pastText]}>{endTime}</Text>
                </View>

                {/* Основная часть: Инфо */}
                <View style={styles.infoSection}>
                    <Text style={[styles.title, { color: colors.text }, isPast && styles.pastText]} numberOfLines={2}>
                        {event.title}
                    </Text>
                    <View style={styles.headerRow}>
                        <View style={[styles.typeBadge, { backgroundColor: typeStyle.bg }]}>
                            <Text style={[styles.typeText, { color: typeStyle.color }]}>
                                {typeStyle.label}
                            </Text>
                        </View>
                    </View>
                    {event.location && (
                        <View style={styles.locationRow}>
                        <MapPin size={13} color={colors.subtext} />
                        <Text style={[styles.location, { color: colors.subtext }]} numberOfLines={1}>
                            {event.location.split('|')[0].trim()}
                        </Text>
                        </View>
                    )}
                </View>
            </MotionPressable>
        </Reveal>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        marginBottom: 12,
    },
    cardInner: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    pastCard: {
        backgroundColor: '#f8fafc',
        borderColor: '#f1f5f9',
    },
    timeSection: {
        width: 64,
        minHeight: 72,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderRightColor: '#f1f5f9',
        marginRight: 14,
    },
    timeText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0b2340',
    },
    timeTextEnd: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '500',
    },
    timeDivider: {
        height: 1,
        width: 10,
        backgroundColor: '#e2e8f0',
        marginVertical: 2,
    },
    infoSection: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        marginBottom: 6,
    },
    typeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 7,
    },
    typeText: {
        fontSize: 11,
        fontWeight: '500',

    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1e293b',
        lineHeight: 20,
        marginBottom: 6,
    },
    location: {
        flex: 1,
        fontSize: 12,
        color: '#64748b',
    },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    pastText: {
        color: '#94a3b8',
    },
});
