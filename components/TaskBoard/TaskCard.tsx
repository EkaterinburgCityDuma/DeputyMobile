import React from "react";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import {Calendar, CircleDotDashed, Layers, Users} from "lucide-react-native";
import { Task } from "@/models/TaskBoardModel";

interface TaskCardProps {
    task: Task;
    onPress: () => void;
}

export function TaskCard({ task, onPress }: TaskCardProps) {
    const expectedEndDate = new Date(task.expected_end_date);
    const isOverdue = new Date() > expectedEndDate && task.status !== 'completed';

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    };

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <View style={styles.content}>
                <View style={styles.topRow}>
                    <Text style={styles.title} numberOfLines={1}>
                        {task.title}
                    </Text>
                    {/* ОБНОВЛЕНО: Используем styles.deadlineBlockOverdue вместо inline массива стилей для чистоты */}
                    <View style={[styles.deadlineBlock, isOverdue && styles.deadlineBlockOverdue]}>
                        <Calendar size={12} color={isOverdue ? "#B91C1C" : "#6B7280"} />
                        <Text style={[styles.deadlineText, isOverdue && styles.deadlineTextOverdue]}>
                            {formatDate(expectedEndDate)}
                        </Text>
                    </View>
                </View>

                {/* Описание — максимально сжато */}
                <Text style={styles.description} numberOfLines={1}>
                    {task.description || "Нет описания задачи"}
                </Text>

                {/* Инфо-панель: Приоритет и Исполнители */}
                <View style={styles.infoPanel}>
                    <View style={styles.tagGroup}>
                        <View style={styles.statusTag}>
                            <CircleDotDashed size={12} color="#2A6E3F" />
                            <Text style={styles.statusLabel}>
                                {task.status}
                            </Text>
                        </View>
                        <View style={styles.priorityTag}>
                            <Layers size={12} color="#2A6E3F" />
                            <Text style={styles.priorityLabel}>
                                {priorityConfig[task.priority as keyof typeof priorityConfig]?.label || 'medium'}
                            </Text>
                        </View>

                        {isOverdue && (
                            <View style={styles.overdueTag}>
                                <Text style={styles.overdueTagText}>просрочено</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.assignees}>
                        {task.users && task.users.length > 0 ? (
                            <View style={styles.userBadge}>
                                <Users size={12} color="#6B7280" />
                                <Text style={styles.userCount}>{task.users.length}</Text>
                            </View>
                        ) : (
                            <Text style={styles.noAssignee}>Не назначен</Text>
                        )}
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const priorityConfig = {
    1: { label: 'Низкий' },
    2: { label: 'Средний' },
    3: { label: 'Высокий' },
    4: { label: 'Срочный' },
    5: { label: 'Критический' }
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 14,
        marginBottom: 8,
    },
    content: {
        paddingVertical: 12,
        paddingHorizontal: 14,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1F2937',
        flex: 1,
        marginRight: 10,
    },
    deadlineBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 6,
        borderRadius: 6,
    },
    deadlineText: {
        fontSize: 10,
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
        color: '#6B7280',
        marginBottom: 10,
    },
    infoPanel: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    tagGroup: {
        flexDirection: 'row',
        gap: 6,
    },
    priorityTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F0FDF4', // Очень легкий зеленый фон
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
        fontStyle: 'italic',
    },
    dateText: {
        fontSize: 12,
        color: '#2A6E3F',
    },
});
