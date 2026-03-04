import { taskService } from '@/api/taskService';
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { Task, TaskPriority, TaskStatus } from '@/data/types';
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import {
    AlertCircle,
    ArrowLeft,
    Calendar,
    ChevronLeft,
    Clock,
    Edit,
    RotateCcw,
    Trash2,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StatusBar,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Toast from 'react-native-toast-message';
import { styles } from './task-detail-style';
import {priorityConfig, statusConfig} from '@/consts';


const StatusButton = ({
                          status,
                          isActive,
                          onPress,
                      }: {
    status: TaskStatus;
    isActive: boolean;
    onPress: () => void;
}) => {
    const config = statusConfig[status];

    return (
        <TouchableOpacity
            style={[
                styles.statusButton,
                isActive
                    ? {
                        backgroundColor: config.bgColor,
                        borderColor: config.borderColor,
                        borderWidth: 2,
                    }
                    : {
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E5E7EB',
                        borderWidth: 2,
                    },
            ]}
            onPress={onPress}
        >
            <Text
                style={[
                    styles.statusButtonText,
                    isActive
                        ? { color: config.textColor, fontWeight: '600' }
                        : { color: '#6B7280' },
                ]}
            >
                {config.label}
            </Text>
        </TouchableOpacity>
    );
};

export function TaskDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentStatus, setCurrentStatus] = useState<TaskStatus>('created');

    const loadTask = useCallback(async () => {
        if (!id) {
            setLoading(false);
            setError('ID задачи не найден');
            return;
        }

        console.log('[TaskDetail] Загрузка задачи с ID:', id);
        setLoading(true);
        setError(null);
        try {
            const apiData = await taskService.getTaskById(id);
            console.log('[TaskDetail] Данные задачи получены:', apiData);
            const adaptedTask: Task = {
                id: apiData.id,
                authorName: apiData.authorName,
                authorId: apiData.authorId,
                title: apiData.title,
                description: apiData.description,
                status: (apiData.status || 'created') as TaskStatus,
                priority: (apiData.priority === 0 ? 'low' : apiData.priority === 1 ? 'medium' : apiData.priority === 2 ? 'high' : 'urgent') as TaskPriority,
                createdAt: apiData.startDate || new Date().toISOString(),
                dueDate: apiData.expectedEndDate || new Date().toISOString(),
                tags: apiData.tags || [],
                users: apiData.users || [],
            };
            setTask(adaptedTask);
            setCurrentStatus(adaptedTask.status);
            console.log('[TaskDetail] Задача успешно загружена');
        } catch (error: any) {
            console.error('[TaskDetail] Ошибка при загрузке задачи:', error);
            const errorMessage = error?.message || 'Не удалось загрузить задачу';
            setError(errorMessage);
            setTask(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadTask();
    }, [loadTask]);

    if (loading) {
        return (
            <View style={styles.container}>
                <StatusBar backgroundColor="#2A6E3F" barStyle="light-content" />
                <View style={[styles.header, { backgroundColor: '#2A6E3F' }]}>
                    <TouchableOpacity onPress={() => router.push("/TaskBoardScreen")}>
                        <ChevronLeft size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.taskTitle}>Загрузка...</Text>
                </View>
                <SkeletonLoader count={3} itemHeight={80} itemMargin={16} />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <StatusBar backgroundColor="#2A6E3F" barStyle="light-content" />
                <View style={[styles.header, { backgroundColor: '#2A6E3F' }]}>
                    <TouchableOpacity onPress={() => router.push("/TaskBoardScreen")}>
                        <ChevronLeft size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.taskTitle}>Ошибка</Text>
                </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
                    <AlertCircle size={48} color="#EF4444" style={{ marginBottom: 16 }} />
                    <Text style={{ fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 8 }}>Ошибка загрузки</Text>
                    <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 }}>{error}</Text>
                    <TouchableOpacity
                        style={{
                            backgroundColor: '#2A6E3F',
                            paddingHorizontal: 24,
                            paddingVertical: 12,
                            borderRadius: 8,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: 12,
                        }}
                        onPress={loadTask}
                    >
                        <RotateCcw size={16} color="#fff" />
                        <Text style={{ color: '#fff', fontWeight: '600' }}>Повторить</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{
                            borderWidth: 2,
                            borderColor: '#2A6E3F',
                            paddingHorizontal: 24,
                            paddingVertical: 12,
                            borderRadius: 8,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                        }}
                        onPress={() => router.push("/TaskBoardScreen")}
                    >
                        <ChevronLeft size={16} color="#2A6E3F" />
                        <Text style={{ color: '#2A6E3F', fontWeight: '600' }}>Назад</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (!task) {
        return (
            <View style={styles.container}>
                <StatusBar backgroundColor="#2A6E3F" barStyle="light-content" />
                <View style={[styles.header, { backgroundColor: '#2A6E3F' }]}>
                    <TouchableOpacity onPress={() => router.push("/TaskBoardScreen")}>
                        <ChevronLeft size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.taskTitle}>Задача не найдена</Text>
                </View>
            </View>
        );
    }

    const dueDate = new Date(task.dueDate || '');
    const createdDate = new Date(task.createdAt || '');
    const today = new Date();
    const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isOverdue = daysLeft < 0 && currentStatus !== 'completed';

    const getInitials = (name: string) => {
        const parts = name.split(' ');
        return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name[0];
    };

    const formatDateTime = (date: Date) => {
        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleStatusChange = (newStatus: TaskStatus) => {
        setCurrentStatus(newStatus);
        Toast.show({
            type: 'success',
            text1: 'Статус изменён',
            text2: `Задача теперь "${statusConfig[newStatus].label}"`,
        });
    };

    const handleEdit = () => {
        router.push({pathname: '/NewTaskScreen', params: { id: task.id, isEdit: 1 }});
    };

    const handleDelete = () => {
        Alert.alert(
            'Удалить задачу',
            'Вы уверены, что хотите удалить эту задачу? Это действие нельзя отменить.',
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: () => {
                        Toast.show({
                            type: 'success',
                            text1: 'Задача удалена',
                        });
                        router.push('/TaskBoardScreen');
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                style={styles.header}
                colors={['#2A6E3F', '#349339']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => router.push("/TaskBoardScreen")}>
                        <ArrowLeft size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text
                            style={styles.taskTitle}
                            numberOfLines={5}
                            ellipsizeMode="tail"
                        >
                            {task.title}
                        </Text>
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusBadgeText}>

                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={handleEdit}
                    >
                        <Edit size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>


            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Описание */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Описание</Text>
                    <Text style={styles.descriptionText}>{task.description}</Text>
                </View>

                {/* Блок метаданных */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Метаданные</Text>

                    {/* Приоритет */}
                    <View style={styles.metadataItem}>
                        <View
                            style={[
                                styles.priorityDot,
                                { backgroundColor: priorityConfig[task.priority].dotColor },
                            ]}
                        />
                        <View style={styles.metadataContent}>
                            <Text style={styles.metadataLabel}>Приоритет</Text>
                            <Text
                                style={[
                                    styles.metadataValue,
                                    { color: priorityConfig[task.priority].textColor },
                                ]}
                            >
                                {priorityConfig[task.priority].label}
                            </Text>
                        </View>
                    </View>

                    {/* Даты */}
                    <View style={styles.metadataRow}>
                        <View style={styles.dateItem}>
                            <Calendar size={16} color="#9CA3AF" />
                            <View style={styles.dateContent}>
                                <Text style={styles.dateLabel}>Дата создания</Text>
                                <Text style={styles.dateValue}>
                                    {formatDateTime(createdDate)}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.dateItem}>
                            <Clock size={16} color={isOverdue ? '#EF4444' : '#9CA3AF'} />
                            <View style={styles.dateContent}>
                                <Text style={styles.dateLabel}>Крайний срок</Text>
                                <Text style={[styles.dateValue, isOverdue && styles.overdueText]}>
                                    {formatDateTime(dueDate)}
                                    {isOverdue && (
                                        <Text style={styles.overdueDays}>
                                            {' '}(Просрочено на {Math.abs(daysLeft)} дн.)
                                        </Text>
                                    )}
                                </Text>
                            </View>
                        </View>

                        {task.completedAt && (
                            <View style={styles.dateItem}>
                                <Clock size={16} color="#10B981" />
                                <View style={styles.dateContent}>
                                    <Text style={styles.dateLabel}>Дата завершения</Text>
                                    <Text style={[styles.dateValue, { color: '#065F46' }]}>
                                        {formatDateTime(new Date(task.completedAt))}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                {/* Сегментированный контрол для смены статуса */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Изменить статус задачи</Text>
                    <View style={styles.statusGrid}>
                        <StatusButton
                            status="created"
                            isActive={currentStatus === 'created'}
                            onPress={() => handleStatusChange('created')}
                        />
                        <StatusButton
                            status="in_progress"
                            isActive={currentStatus === 'in_progress'}
                            onPress={() => handleStatusChange('in_progress')}
                        />
                        <StatusButton
                            status="approval"
                            isActive={currentStatus === 'approval'}
                            onPress={() => handleStatusChange('approval')}
                        />
                        <StatusButton
                            status="completed"
                            isActive={currentStatus === 'completed'}
                            onPress={() => handleStatusChange('completed')}
                        />
                    </View>
                </View>

                {/* Участники */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Участники</Text>

                    <View style={styles.participantsContainer}>
                        {/* Исполнители из массива users */}
                        {task.users && task.users.length > 0 && (
                            <>
                                {task.users.map((user: any, index: number) => (
                                    <View key={`user-${index}`} style={styles.participantItem}>
                                        <View style={[styles.avatar, { backgroundColor: '#2A6E3F' }]}>
                                            <Text style={styles.avatarText}>
                                                {getInitials(user.fullName || user.name || '')}
                                            </Text>
                                        </View>
                                        <View style={styles.participantInfo}>
                                            <Text style={styles.participantName}>
                                                {user.fullName || user.name}
                                            </Text>
                                            <Text style={styles.participantRole}>Исполнитель</Text>
                                        </View>
                                    </View>
                                ))}
                            </>
                        )}

                        {/* Постановщик */}
                        <View style={styles.participantItem}>
                            <View style={[styles.avatar, { backgroundColor: '#E5E7EB' }]}>
                                <Text style={[styles.avatarText, { color: '#6B7280' }]}>
                                    {getInitials(task.authorName || '')}
                                </Text>
                            </View>
                            <View style={styles.participantInfo}>
                                <Text style={styles.participantName}>
                                    {task.authorName}
                                </Text>
                                <Text style={styles.participantRole}>Постановщик</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Действия */}
            <View style={styles.actionsContainer}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={handleDelete}
                >
                    <Trash2 size={16} color="#DC2626" />
                    <Text style={styles.deleteButtonText}>Удалить задачу</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
