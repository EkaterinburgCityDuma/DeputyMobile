import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { MotionPressable, Reveal } from '@/components/ui/Shared/Motion';
import { Calendar, CircleDotDashed, Layers, Users } from "lucide-react-native";
import { Task } from "@/models/TaskBoardModel";
import { useTheme } from "@/context/ThemeContext";

interface TaskCardProps {
    task: Task;
    onPress: () => void;
    index?: number;
}

const priorityConfig = {
    1: { label: 'Низкий' },
    2: { label: 'Средний' },
    3: { label: 'Высокий' },
    4: { label: 'Срочный' },
    5: { label: 'Критический' }
};

export function TaskCard({ task, onPress, index = 0 }: TaskCardProps) {
    const { colors, isDark } = useTheme();
    const expectedEndDate = new Date(task.expected_end_date);
    const isOverdue = new Date() > expectedEndDate && task.status !== 'completed';

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    };

    const priorityLabel = priorityConfig[task.priority as keyof typeof priorityConfig]?.label || 'Средний';
    const urgent = task.priority >= 4;

    return (
        <Reveal index={index}>
        <MotionPressable
            accessibilityLabel={task.title}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={onPress}
        >
            <View style={styles.content}>
                <View style={styles.topRow}>
                    <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                        {task.title}
                    </Text>
                    <View style={[styles.deadlineBlock, { backgroundColor: isOverdue ? colors.dangerSurface : colors.iconBox }]}>
                        <Calendar size={13} color={isOverdue ? colors.danger : colors.subtext} />
                        <Text style={[styles.deadlineText, { color: isOverdue ? colors.danger : colors.subtext }]}>
                            {formatDate(expectedEndDate)}
                        </Text>
                    </View>
                </View>

                <Text style={[styles.description, { color: colors.subtext }]} numberOfLines={1}>
                    {task.description || "Нет описания задачи"}
                </Text>

                {/* Инфо-панель: теги переносятся, assignees всегда справа */}
                <View style={styles.infoPanel}>
                    <View style={styles.tagGroup}>
                        <View style={[styles.statusTag, { backgroundColor: colors.roleBadge, borderColor: colors.roleBadge }]}>
                            <CircleDotDashed size={12} color={isDark ? colors.roleText : "#2A6E3F"} />
                            <Text style={[styles.statusLabel, { color: isDark ? colors.roleText : "#2a6e4f" }]}>
                                {task.status}
                            </Text>
                        </View>
                        <View style={[styles.priorityTag, { backgroundColor: urgent ? colors.dangerSurface : colors.iconBox, borderColor: urgent ? colors.dangerSurface : colors.iconBox }]}>
                            <Layers size={12} color={urgent ? colors.danger : colors.subtext} />
                            <Text style={[styles.priorityLabel, { color: urgent ? colors.danger : colors.subtext }]} numberOfLines={1}>
                                {priorityLabel}
                            </Text>
                        </View>

                        {isOverdue && (
                            <View style={[styles.overdueTag, { backgroundColor: colors.dangerSurface, borderColor: colors.dangerSurface }]}>
                                <Text style={[styles.overdueTagText, { color: colors.danger }]}>Просрочено</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.assignees}>
                        {task.users && task.users.length > 0 ? (
                            <View style={[styles.userBadge, { backgroundColor: isDark ? colors.iconBox : '#F3F4F6' }]}>
                                <Users size={12} color={colors.subtext} />
                                <Text style={[styles.userCount, { color: colors.text }]}>{task.users.length}</Text>
                            </View>
                        ) : (
                            <Text style={[styles.noAssignee, { color: colors.subtext }]}>Не назначен</Text>
                        )}
                    </View>
                </View>
            </View>
        </MotionPressable>
        </Reveal>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 18,
        marginBottom: 12,
    },
    content: {
        padding: 16,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        lineHeight: 21,
        color: '#1F2937',
        flex: 1,
        marginRight: 10,
    },
    deadlineBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 8,
    },
    deadlineText: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '500',
    },
    deadlineBlockOverdue: {
        backgroundColor: '#FEE2E2',
        borderColor: '#FECACA',
        borderWidth: 1,
    },
    deadlineTextOverdue: {
        color: '#B91C1C',
        fontWeight: '700',
    },
    description: {
        fontSize: 13,
        lineHeight: 19,
        color: '#6B7280',
        marginBottom: 10,
    },
    infoPanel: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'nowrap', // запрещаем перенос всей панели
    },
    tagGroup: {
        flexDirection: 'row',
        flexWrap: 'wrap', // теги переносятся внутри этой группы
        gap: 6,
        rowGap: 6,
        flex: 1, // занимает всё доступное пространство
        marginRight: 8, // отступ от assignees
    },
    priorityTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F0FDF4',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#DCFCE7',
    },
    priorityLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#2A6E3F',
        textTransform: 'lowercase',
        flexShrink: 1, // обрезаем длинный текст
    },
    statusTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#f0fdfd',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#DCFCE7',
    },
    statusLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#2a6e4f',
        textTransform: 'lowercase',
    },
    overdueTag: {
        backgroundColor: '#F9FAFB',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    overdueTagText: {
        fontSize: 11,
        color: '#374151',
        fontWeight: '600',
    },
    assignees: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 0, // НЕ сжимается, всегда справа
    },
    userBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    userCount: {
        fontSize: 11,
        fontWeight: '600',
        color: '#4B5563',
    },
    noAssignee: {
        fontSize: 11,
        color: '#9CA3AF',
    },
    dateText: {
        fontSize: 12,
        color: '#2A6E3F',
    },
});
