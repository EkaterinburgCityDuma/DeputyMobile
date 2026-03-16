import { taskService } from '@/api/taskService';
import { TaskCard } from "@/components/TaskBoard/TaskCard";
import { Select } from "@/components/ui/Select";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { Task } from '@/models/TaskBoardModel';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
    AlertCircle,
    Clock,
    Plus,
    RotateCcw
} from 'lucide-react-native';
import React, { useEffect, useState, useCallback } from 'react';
import {
    FlatList,
    Text,
    TouchableOpacity,
    View,
    RefreshControl
} from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from './task-board-style';
import { AuthManager } from "@/components/LoginScreen/LoginScreen";

type TaskMode = 'all' | 'my_tasks' | 'assigned' | 'authored';

export function TaskBoard() {
    const userRole = AuthManager.getRole();

    // Стейты
    const [taskMode, setTaskMode] = useState<TaskMode>(userRole === 'Admin' ? 'all' : 'my_tasks');
    const [filterStatus, setFilterStatus] = useState<string | 'all'>('all');
    const [sortBy, setSortBy] = useState<'date' | 'priority'>('date');
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const insets = useSafeAreaInsets();

    const loadTasks = useCallback(async (isSilentRefresh = false) => {
        if (!isSilentRefresh) setLoading(true);
        setError(null);

        try {
            let apiData: Task[] = [];

            switch (taskMode) {
                case 'all':
                    apiData = userRole === 'Admin'
                        ? await taskService.getAllTasks()
                        : await taskService.getTasksByCurrentUser();
                    break;
                case 'my_tasks':
                    apiData = await taskService.getTasksByCurrentUser();
                    break;
                case 'assigned':
                    apiData = await taskService.getAssignedTasks();
                    break;
                case 'authored':
                    apiData = await taskService.getAuthorTasks();
                    break;
                default:
                    apiData = await taskService.getTasksByCurrentUser();
            }

            setTasks(apiData);
        } catch (error: any) {
            console.error('Ошибка при загрузке задач:', error);
            const errorMessage = error?.message || 'Не удалось загрузить задачи';
            setError(errorMessage);
            setTasks([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [taskMode, userRole]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadTasks(true);
    }, [loadTasks]);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    useFocusEffect(
        useCallback(() => {
            loadTasks(true);
        }, [loadTasks])
    );

    let filteredTasks = filterStatus === 'all'
        ? [...tasks]
        : tasks.filter(task => task.status === filterStatus);

    if (sortBy === 'priority') {
        const priorityOrder = {
            low: 3,
            medium: 2,
            high: 1,
            urgent: 0,
            critical: -1
        };
        filteredTasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    } else {
        filteredTasks.sort((a, b) => new Date(a.expected_end_date).getTime() - new Date(b.expected_end_date).getTime());
    }

    const handleTaskPress = (id: string) => {
        router.push({ pathname: '/(forms)/TaskDetailScreen', params: { id: id } });
    };

    const handleNewTask = () => {
        router.push('/NewTaskScreen');
    };

    const taskModeItems = [
        ...(userRole === 'Admin' ? [{ label: 'Все', value: 'all' }] : []),
        { label: 'Мои задачи', value: 'my_tasks' },
        { label: 'Назначенные', value: 'assigned' },
        { label: 'Созданные', value: 'authored' },
    ];

    return (
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <LinearGradient
                colors={['#2A6E3F', '#349339']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingTop: insets.top + 15 }]}
            >
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Задачи</Text>
                    <Text style={styles.headerSubtitle}>
                        {loading ? 'Загрузка...' : `${filteredTasks.length} задач`}
                    </Text>
                </View>
                <TouchableOpacity style={styles.newTaskButton} onPress={handleNewTask}>
                    <Plus size={20} color="white" />
                </TouchableOpacity>
            </LinearGradient>

            {!error && (
                <LinearGradient colors={['#ebfdeb', '#fff']} style={styles.filtersSection}>
                    {/* Вернул оригинальную структуру сетки, добавив только еще один блок filterGroup */}
                    <View style={styles.filtersGrid}>
                        <View style={styles.filterGroup}>
                            <Text style={styles.filterLabel}>Источник</Text>
                            <Select
                                value={taskMode}
                                onValueChange={(v) => setTaskMode(v as TaskMode)}
                                items={taskModeItems}
                                placeholder="Источник"
                            />
                        </View>
                        <View style={styles.filterGroup}>
                            <Text style={styles.filterLabel}>Статус</Text>
                            <Select
                                value={filterStatus}
                                onValueChange={(v) => setFilterStatus(v as string | 'all')}
                                items={[
                                    { label: 'Все задачи', value: 'all' },
                                    { label: 'Новые', value: 'created' },
                                    { label: 'В работе', value: 'in_progress' },
                                    { label: 'На согласовании', value: 'approval' },
                                    { label: 'Завершенные', value: 'completed' },
                                ]}
                                placeholder="Статус"
                            />
                        </View>
                    </View>
                </LinearGradient>
            )}

            {error ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
                    <AlertCircle size={48} color="#EF4444" style={{ marginBottom: 16 }} />
                    <Text style={{ fontSize: 16, fontWeight: '600', textAlign: 'center' }}>Ошибка загрузки</Text>
                    <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginVertical: 8 }}>{error}</Text>
                    <TouchableOpacity style={styles.errorButton} onPress={() => loadTasks()}>
                        <RotateCcw size={16} color="#fff" />
                        <Text style={{ color: '#fff', fontWeight: '600', marginLeft: 8 }}>Повторить</Text>
                    </TouchableOpacity>
                </View>
            ) : loading && !refreshing ? (
                <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}>
                    <SkeletonLoader count={5} itemHeight={110} itemMargin={12} />
                </View>
            ) : (
                <FlatList
                    data={filteredTasks}
                    keyExtractor={(item) => item.task_id}
                    renderItem={({ item }) => (
                        <TaskCard
                            task={item}
                            onPress={() => handleTaskPress(item.task_id)}
                        />
                    )}
                    contentContainerStyle={styles.taskList}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#2A6E3F']}
                            tintColor="#2A6E3F"
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIcon}>
                                <Clock size={32} color="#9CA3AF" />
                            </View>
                            <Text style={styles.emptyTitle}>Задач не найдено</Text>
                            <Text style={styles.emptySubtitle}>Попробуйте изменить фильтры</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
