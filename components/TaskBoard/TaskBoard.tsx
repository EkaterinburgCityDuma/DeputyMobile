import { ScreenHeader } from '@/components/ui/Shared/ScreenHeader';
import { Button } from '@/components/ui/Shared/Button';
import { ListTodo, AlertCircle, Clock, RotateCcw } from 'lucide-react-native';

import { TaskCard } from "@/components/TaskBoard/TaskCard";
import { Select } from "@/components/ui/Shared/Select";
import { SkeletonLoader } from "@/components/ui/Shared/SkeletonLoader";
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, router } from 'expo-router';


import React, { useEffect, useState, useCallback, useRef } from 'react';
import { FlatList, Text, TouchableOpacity, View, RefreshControl, ScrollView } from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from './task-board-style';
import { AuthManager } from "@/api/auth";
import { declOfNum } from '@/utils';
import { Filters } from '../ui/Shared/Filters';
import { useTheme } from '@/context/ThemeContext';

import { useTaskStore } from '@/store/useTaskStore';

type TaskMode = 'all' | 'my_tasks' | 'assigned' | 'authored';
type StatusItem = { name: string; isDefault: boolean };

export function TaskBoard() {
    const { colors, isDark } = useTheme();
    const userRole = AuthManager.getRole();
    const params = useLocalSearchParams<{ isMine?: string }>();

    // Используем ref для хранения предыдущего состояния параметра
    const prevIsMineParamRef = useRef<string | undefined>(undefined);

    const [taskMode, setTaskMode] = useState<TaskMode>('all'); // По умолчанию все задачи
    const [filterStatus, setFilterStatus] = useState<string | 'all'>('all');
    const [sortBy, setSortBy] = useState<'date' | 'priority'>('date');

    const { tasks, statuses, isLoading: loading, error, fetchTasks, fetchStatuses } = useTaskStore();
    const [refreshing, setRefreshing] = useState(false);
    const insets = useSafeAreaInsets();

    // Функция для определения начального режима при заходе на экран
    const getInitialTaskMode = useCallback((): TaskMode => {
        // Если параметр isMine = "true" ИЛИ пользователь не админ, показываем только мои задачи
        const isMineActive = params.isMine === "true";

        if (isMineActive || userRole !== 'Admin') {
            return 'my_tasks';
        }

        // Иначе (админ и нет параметра isMine) показываем все задачи
        return 'all';
    }, [params.isMine, userRole]);

    // Эффект для обновления режима при изменении параметров (каждый фокус)
    useFocusEffect(
        useCallback(() => {
            const newTaskMode = getInitialTaskMode();

            // Проверяем, изменился ли режим
            setTaskMode(prevMode => {
                if (prevMode !== newTaskMode) {
                    return newTaskMode;
                }
                return prevMode;
            });

            // Сбрасываем фильтр статуса при каждом заходе (опционально)
            // setFilterStatus('all');
        }, [getInitialTaskMode])
    );

    useEffect(() => {
        fetchStatuses();
    }, [fetchStatuses]);

    const loadTasks = useCallback(async (isSilentRefresh = false) => {
        if (isSilentRefresh) setRefreshing(true);
        await fetchTasks(taskMode, userRole || '', isSilentRefresh);
        setRefreshing(false);
    }, [taskMode, userRole, fetchTasks]);

    useFocusEffect(
        useCallback(() => {
            loadTasks(true);
        }, [loadTasks])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadTasks(true);
    }, [loadTasks]);


    // Фильтрация
    let filteredTasks = filterStatus === 'all'
        ? [...tasks]
        : tasks.filter(task => task.status.toLowerCase() === filterStatus.toLowerCase());

    // Сортировка
    if (sortBy === 'priority') {
        filteredTasks.sort((a, b) => a.priority - b.priority);
    } else {
        filteredTasks.sort((a, b) => new Date(a.expected_end_date).getTime() - new Date(b.expected_end_date).getTime());
    }

    const handleTaskPress = (id: string) => {
        router.push({ pathname: '/(screens)/TaskBoardScreen/TaskDetailScreen', params: { id: id } });
    };

    const handleNewTask = () => {
        router.push('/(screens)/TaskBoardScreen/NewTaskScreen');
    };

    // Формируем список режимов (все доступные варианты)
    const taskModeItems = [
        ...(userRole === 'Admin' ? [{ label: 'Все', value: 'all' }] : []),
        { label: 'Мои задачи', value: 'my_tasks' },
        { label: 'Назначенные мной', value: 'assigned' },
        { label: 'Созданные мной', value: 'authored' },
    ];

    // Динамически формируем список статусов для селекта
    const statusItems = [
        { label: 'Все', value: 'all' },
        ...statuses.map(s => ({ label: s.name, value: s.name }))
    ];

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScreenHeader title="Задачи" icon={ListTodo}
                subtitle={loading ? 'Загрузка…' : `${filteredTasks.length} ${declOfNum(filteredTasks.length, ['задача', 'задачи', 'задач'])}`}
                actions={<Button solid iconName="Plus" label="Создать задачу" onClick={handleNewTask} />} />

            {!error && (
                <Filters
                    title1={"Источник"}
                    title2={"Статус"}
                    selectComponent1={
                        <Select
                            value={taskMode}
                            onValueChange={(v) => setTaskMode(v as TaskMode)}
                            items={taskModeItems}
                            placeholder="Источник"
                        />
                    }
                    selectComponent2={
                        <Select
                            value={filterStatus}
                            onValueChange={(v) => setFilterStatus(v as string | 'all')}
                            items={statusItems}
                            placeholder="Статус"
                        />
                    }
                />
            )}

            {error ? (
                <ScrollView
                    contentContainerStyle={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
                    }
                >
                    <AlertCircle size={48} color={isDark ? "#f87171" : "#EF4444"} style={{ marginBottom: 16 }} />
                    <Text style={{ fontSize: 16, fontWeight: '600', textAlign: 'center', color: colors.text }}>Ошибка загрузки</Text>
                    <Text style={{ fontSize: 14, color: colors.subtext, textAlign: 'center', marginVertical: 8 }}>{error}</Text>
                    <TouchableOpacity
                        onPress={() => loadTasks()}
                        style={{
                            backgroundColor: colors.primary,
                            paddingHorizontal: 20,
                            paddingVertical: 10,
                            borderRadius: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginTop: 8
                        }}
                    >
                        <RotateCcw size={16} color="#fff" />
                        <Text style={{ color: '#fff', fontWeight: '600', marginLeft: 8 }}>Повторить</Text>
                    </TouchableOpacity>
                </ScrollView>
            ) : loading && !refreshing ? (
                <ScrollView
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
                    }
                >
                    <SkeletonLoader count={5} itemHeight={96} itemMargin={12} />
                </ScrollView>
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
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                        />
                    }
                    ListEmptyComponent={
                        <View style={[styles.emptyState, { backgroundColor: colors.card, marginHorizontal: 20, borderRadius: 20, paddingVertical: 40 }]}>
                            <View style={[styles.emptyIcon, { backgroundColor: isDark ? colors.iconBox : '#F3F4F6' }]}>
                                <Clock size={32} color={colors.subtext} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>Задач не найдено</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
