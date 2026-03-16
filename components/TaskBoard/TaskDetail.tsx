import React, { useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Alert,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import {
    ArrowLeft,
    Edit,
    Trash2,
    User, Users,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { taskService } from '@/api/taskService';
import { Task, priorityMap } from '@/models/TaskBoardModel'; // Импорт твоих моделей
import { styles } from './task-detail-style';
import {Ionicons} from "@expo/vector-icons";

interface TaskStatusServer {
    name: string;
    isDefault: boolean;
}

export function TaskDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();

    const [task, setTask] = useState<Task | null>(null);
    const [statuses, setStatuses] = useState<TaskStatusServer[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isStatusSelectOpen, setIsStatusSelectOpen] = useState(false);

    const loadData = useCallback(async () => {
        if (!id) return;
        try {
            // Загружаем задачу и список доступных статусов параллельно
            const [taskData, statusesData] = await Promise.all([
                taskService.getTaskById(id),
                taskService.getStatuses()
            ]);

            setTask(taskData);
            setStatuses(statusesData);
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: 'Ошибка загрузки',
                text2: error.message
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id]);

    useEffect(() => { loadData(); }, [loadData]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleStatusChange = async (newStatusName: string) => {
        if (!task || !id) return;

        try {
            setIsStatusSelectOpen(false);

            const updatePayload = {
                title: task.title,
                description: task.description,
                expected_end_date: task.expected_end_date,
                priority: task.priority,
                status: newStatusName
            };

            await taskService.updateTask(id as string, updatePayload);

            setTask(prev => prev ? { ...prev, status: newStatusName } : null);

            Toast.show({
                type: 'success',
                text1: 'Успешно',
                text2: `Статус изменен на "${newStatusName}"`
            });
        } catch (e: any) {
            console.error(e);
            Toast.show({
                type: 'error',
                text1: 'Ошибка обновления',
                text2: e.message || 'Не удалось сохранить статус на сервере'
            });
        }
    };

    const handleDelete = () => {
        Alert.alert('Удаление', 'Вы уверены?', [
            { text: 'Отмена', style: 'cancel' },
            {
                text: 'Удалить',
                style: 'destructive',
                onPress: async () => {
                    await taskService.deleteTask(id as string);
                    router.back();
                }
            },
        ]);
    };

    if (loading) return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2A6E3F" />
        </View>
    );

    if (!task) return (
        <View style={styles.container}>
            <Text style={{ textAlign: 'center', marginTop: 50 }}>Задача не найдена</Text>
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            <StatusBar barStyle="light-content" />

            <ScrollView
                style={styles.container}
                contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2A6E3F" />}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <LinearGradient
                    colors={['#2A6E3F', '#349339']}
                    style={[styles.header, { paddingTop: insets.top + 15 }]}
                >
                    <View style={styles.headerTopRow}>
                        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                            <ArrowLeft size={24} color="white" />
                        </TouchableOpacity>

                        <View style={styles.headerActions}>
                            <TouchableOpacity
                                style={styles.iconButton}
                                onPress={() => router.push({pathname: '/(forms)/NewTaskScreen', params: { id: task.task_id, isEdit: 1 }})}
                            >
                                <Edit size={20} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.iconButton, { marginLeft: 10 }]} onPress={handleDelete}>
                                <Trash2 size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.headerContent}>
                        <Text style={styles.headerTitle} numberOfLines={3}>{task.title}</Text>
                        <View style={[styles.statusTag, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                            <Text style={[styles.statusTagText, { color: 'white' }]}>{task.status}</Text>
                        </View>
                    </View>
                </LinearGradient>

                <View style={styles.content}>
                    {/* Сроки — работаем напрямую с полями из JSON */}
                    <View style={styles.card}>
                        <View style={styles.timeRow}>
                            <View style={styles.timeContent}>
                                <Text style={styles.label}>Создано</Text>
                                <Text style={styles.value}>
                                    {task.created_at ? new Date(task.created_at).toLocaleDateString('ru-RU') : '-'}
                                </Text>
                            </View>
                            <View style={styles.timeDividerVertical} />
                            <View style={styles.timeContent}>
                                <Text style={styles.label}>Крайний срок</Text>
                                <Text style={styles.value}>
                                    {task.expected_end_date ? new Date(task.expected_end_date).toLocaleDateString('ru-RU') : 'Не указан'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>Текущий статус</Text>
                    <View style={[styles.selectWrapper, { zIndex: 1000 }]}>
                        <TouchableOpacity
                            style={styles.selectTrigger}
                            onPress={() => setIsStatusSelectOpen(!isStatusSelectOpen)}
                        >
                            <Text style={styles.selectValue}>{task.status}</Text>
                            <Ionicons
                                name={isStatusSelectOpen ? "chevron-up" : "chevron-down"}
                                size={20}
                                color="#6b7280"
                            />
                        </TouchableOpacity>

                        {isStatusSelectOpen && (
                            <View style={styles.selectDropdown}>
                                {statuses.map((item) => (
                                    <TouchableOpacity
                                        key={item.name}
                                        style={[
                                            styles.selectItem,
                                            task.status === item.name && styles.selectItemSelected
                                        ]}
                                        onPress={() => handleStatusChange(item.name)}
                                    >
                                        <Text style={[
                                            styles.selectItemText,
                                            task.status === item.name && styles.selectItemTextSelected
                                        ]}>
                                            {item.name}
                                        </Text>
                                        {task.status === item.name && (
                                            <Ionicons name="checkmark" size={18} color="#0f6319" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Описание */}
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Описание</Text>
                        <Text style={styles.description}>{task.description || 'Описание отсутствует'}</Text>

                        <View style={styles.priorityBadge}>
                            {/* Используем priorityMap из твоей модели */}
                            <View style={[styles.dot, { backgroundColor: '#64748b' }]} />
                            <Text style={styles.priorityText}>
                                Приоритет: {priorityMap[task.priority] || task.priority}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Постановщик</Text>
                        </View>
                        <View style={styles.attendeeRow}>
                            <View style={[styles.avatar, { backgroundColor: '#e2e8f0' }]}>
                                <User size={18} color="#64748b" />
                            </View>
                            <View style={styles.attendeeInfo}>
                                <Text style={styles.attendeeName}>{task.author_name}</Text>
                                <Text style={styles.statusText}>Автор задачи</Text>
                            </View>
                        </View>
                    </View>

                    {/* Исполнители */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Исполнители</Text>
                        </View>
                        {task.users.map((user) => (
                            <View key={user.id} style={styles.attendeeRow}>
                                <View style={[styles.avatar, {backgroundColor: '#dcfce7'}]}>
                                    <Text style={styles.avatarText}>
                                        {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                                <View style={styles.attendeeInfo}>
                                    <Text style={styles.attendeeName}>{user.full_name || user.email}</Text>
                                    <Text style={styles.statusText}>{user.job_title || 'Сотрудник'}</Text>
                                </View>
                            </View>
                        ))}

                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
