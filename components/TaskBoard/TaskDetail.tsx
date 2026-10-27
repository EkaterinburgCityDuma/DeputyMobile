import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Alert,
    ActivityIndicator,
    RefreshControl,
    Modal,
    KeyboardAvoidingView,
    TextInput,
    FlatList,
    Platform,
} from 'react-native';
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import {
    ArrowLeft,
    Edit,
    Trash2,
    User,
    Search,
    X
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";

import { taskService } from '@/api/taskService';
import { priorityMap } from '@/models/TaskBoardModel';
import { styles } from './task-detail-style';
import { AuthManager } from "@/api/auth";
import {SkeletonItem} from "@/components/ui/Shared/SkeletonLoader";
import { apiClient } from '@/api/api';
import { TaskCommentComponent } from './TaskComment';
import { CommentInput } from './CommentInput';
import { useTheme } from '@/context/ThemeContext';
import { useTaskDetailsStore } from "@/store/useTaskDetailsStore";
import { useTaskStore } from '@/store/useTaskStore';
import { useDashboardStore } from '@/store/useDashboardStore';

interface TaskStatusServer {
    name: string;
    isDefault: boolean;
}

interface ApiUser {
    id: string;
    email: string;
    full_name: string;
    job_title: string;
}

export interface CommentAuthor {
    id: string;
    email: string;
    full_name: string;
    job_title: string;
}

export interface TaskComment {
    id: string;
    task_id: string;
    author_id: string;
    author: CommentAuthor | null;
    text: string;
    date: string;
}

export interface Task {
    task_id: string;
    title: string;
    description: string;
    created_at: string;
    expected_end_date: string;
    priority: number;
    status: string;
    author_id: string;
    author_name: string;
    users?: any[];
    comments?: TaskComment[];
    [key: string]: any;
}

const COMPLETED_STATUS = 'Завершена';

export function TaskDetail() {
    const { colors, isDark } = useTheme();
    const { id } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();

    const { tasks, isLoading: storeLoading, fetchTaskDetails } = useTaskDetailsStore();
    const taskFromStore = tasks[id || ''] as Task | undefined;

    // Используем локальное состояние для оптимистичных обновлений
    const [localTask, setLocalTask] = useState<Task | null>(null);
    const [statuses, setStatuses] = useState<TaskStatusServer[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [isStatusSelectOpen, setIsStatusSelectOpen] = useState(false);

    // Объединяем данные из стора и локальные изменения
    const task = localTask || taskFromStore || null;
    const loading = storeLoading && !task;
    const isTaskCompleted = task?.status?.trim().toLowerCase() === COMPLETED_STATUS.toLowerCase();

    const [isAddUserModalVisible, setIsAddUserModalVisible] = useState(false);
    const [allUsers, setAllUsers] = useState<ApiUser[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isUsersLoading, setIsUsersLoading] = useState(false);
    const [addingUserId, setAddingUserId] = useState<string | null>(null);
    const [removingUserId, setRemovingUserId] = useState<string | null>(null);
    const [isCompleting, setIsCompleting] = useState(false);
    const completionInFlight = useRef(false);

    const [comments, setComments] = useState<TaskComment[]>([]);
    const [sendingComment, setSendingComment] = useState(false);
    const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
    const userRole = AuthManager.getRole();
    const userId = AuthManager.getUserId();

    const loadData = useCallback(async (isRefresh = false) => {
        if (!id) return;

        await fetchTaskDetails(id, isRefresh);
        setRefreshing(false);

        taskService.getStatuses()
            .then(statusesData => {
                setStatuses(statusesData);
            })
            .catch(error => console.error("Ошибка загрузки статусов", error));
    }, [id, fetchTaskDetails]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (taskFromStore?.comments) {
            setComments(taskFromStore.comments);
        }
    }, [taskFromStore]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData(true);
    };

    const fetchAllUsers = async () => {
        setIsUsersLoading(true);
        try {
            const { data } = await apiClient.get('/api/Auth/all');
            setAllUsers(data);
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Ошибка', text2: 'Не удалось загрузить список пользователей' });
        } finally {
            setIsUsersLoading(false);
        }
    };

    const handleAddComment = async (text: string) => {
        if (!task) return;

        setSendingComment(true);
        try {
            const response = await apiClient.post<TaskComment>(
                `/api/task/${task.task_id}/comment`,
                { text }
            );

            const newComment = response.data;
            setComments(prev => [newComment, ...prev]);

            Toast.show({
                type: 'success',
                text1: 'Успешно',
                text2: 'Комментарий добавлен'
            });
        } catch (error: any) {
            console.error('Ошибка добавления комментария:', error);
            Toast.show({
                type: 'error',
                text1: 'Ошибка',
                text2: error.response?.data?.message || 'Не удалось добавить комментарий'
            });
        } finally {
            setSendingComment(false);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        setDeletingCommentId(commentId);
        try {
            await apiClient.delete(`/api/task/comment/${commentId}`);

            setComments(prev => prev.filter(c => c.id !== commentId));

            Toast.show({
                type: 'success',
                text1: 'Успешно',
                text2: 'Комментарий удален'
            });
        } catch (error: any) {
            console.error('Ошибка удаления комментария:', error);
            Toast.show({
                type: 'error',
                text1: 'Ошибка',
                text2: error.response?.data?.message || 'Не удалось удалить комментарий'
            });
        } finally {
            setDeletingCommentId(null);
        }
    };

    const handleOpenAddUserModal = () => {
        setIsAddUserModalVisible(true);
        setSearchQuery('');

        if (allUsers.length === 0) {
            fetchAllUsers();
        }
    };

    const handleAddUserToTask = async (selectedUser: ApiUser) => {
        if (!task) return;
        setAddingUserId(selectedUser.id);

        try {
            await apiClient.post(`/api/task/add-user-task/${task.task_id}`, null, {
                params: { userId: selectedUser.id },
                headers: { 'accept': '*/*' }
            });

            setLocalTask(prev => {
                const updated = prev || taskFromStore;
                if (!updated) return null;
                return {
                    ...updated,
                    users: [...(updated.users || []), {
                        id: selectedUser.id,
                        email: selectedUser.email,
                        full_name: selectedUser.full_name,
                        job_title: selectedUser.job_title
                    } as any]
                };
            });

            Toast.show({ type: 'success', text1: 'Успешно', text2: `${selectedUser.full_name || selectedUser.email} добавлен в задачу` });
            setIsAddUserModalVisible(false);
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Ошибка', text2: 'Не удалось добавить пользователя' });
        }  finally {
            setAddingUserId(null);
        }
    };

    const handleRemoveUser = (targetUserId: string, targetUserName: string, taskId: string) => {
        const confirmMessage = `Удалить ${targetUserName} из задачи?`;

        if (Platform.OS === 'web') {
            if (window.confirm(confirmMessage)) {
                performRemoveUser(targetUserId, taskId);
            }
        } else {
            Alert.alert('Удаление исполнителя', confirmMessage, [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: () => performRemoveUser(targetUserId, taskId)
                }
            ]);
        }
    };

    const handleCompleteTask = () => {
        if (!task || isTaskCompleted || completionInFlight.current) return;
        const confirmMessage = 'Завершить задачу?';

        if (Platform.OS === 'web') {
            if (window.confirm(confirmMessage)) {
                performCompleteTask();
            }
        } else {
            Alert.alert('Завершение задачи', confirmMessage, [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Завершить',
                    onPress: () => performCompleteTask()
                }
            ]);
        }
    };

    const performRemoveUser = async (targetUserId: string, taskId: string) => {
        setRemovingUserId(targetUserId);
        try {
            await apiClient({
                method: 'POST',
                url: `/api/task/remove-user-task/${taskId}`,
                params: { userId: targetUserId },
                headers: { 'accept': 'application/json' }
            });

            setLocalTask(prev => {
                const updated = prev || taskFromStore;
                if (!updated) return null;
                return {
                    ...updated,
                    users: updated.users?.filter(u => u.id !== targetUserId)
                };
            });

            Toast.show({ type: 'success', text1: 'Успешно', text2: 'Исполнитель удален' });
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Ошибка', text2: 'Не удалось удалить исполнителя' });
        } finally {
            setRemovingUserId(null);
        }
    };

    const performCompleteTask = async () => {
        if (!task || isTaskCompleted || completionInFlight.current) return;
        const taskId = task.task_id;
        const completedStatus = statuses.find(({ name }) =>
            name.trim().toLowerCase() === COMPLETED_STATUS.toLowerCase()
        )?.name || COMPLETED_STATUS;

        completionInFlight.current = true;
        setIsCompleting(true);
        try {
            await taskService.updateTask(taskId, {
                title: task.title,
                description: task.description,
                expected_end_date: task.expected_end_date,
                priority: task.priority,
                status: completedStatus,
            });

            setLocalTask({ ...task, status: completedStatus });
            useTaskDetailsStore.setState((state) => ({
                tasks: state.tasks[taskId]
                    ? { ...state.tasks, [taskId]: { ...state.tasks[taskId], status: completedStatus } }
                    : state.tasks,
            }));
            useTaskStore.setState((state) => ({
                tasks: state.tasks.map((item) => item.task_id === taskId
                    ? { ...item, status: completedStatus }
                    : item),
            }));
            useDashboardStore.getState().fetchDashboardData(true).catch(console.error);

            Toast.show({ type: 'success', text1: 'Успешно', text2: 'Задача завершена' });
            router.dismissTo("/(screens)/TaskBoardScreen");
        } catch (error) {
            console.error('Task completion failed:', error);
            Toast.show({ type: 'error', text1: 'Ошибка', text2: 'Не удалось завершить задачу' });
        } finally {
            completionInFlight.current = false;
            setIsCompleting(false);
        }
    };

    const filteredUsers = useMemo(() => {
        return allUsers.filter(u => {
            const isAlreadyAdded = task?.users?.some(tu => tu.id === u.id);
            if (isAlreadyAdded) return false;

            const searchLower = searchQuery.toLowerCase();
            const nameMatch = (u.full_name || '').toLowerCase().includes(searchLower);
            const emailMatch = (u.email || '').toLowerCase().includes(searchLower);

            return nameMatch || emailMatch;
        });
    }, [allUsers, task?.users, searchQuery]);

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

            setLocalTask(prev => {
                const updated = prev || taskFromStore;
                if (!updated) return null;
                return { ...updated, status: newStatusName };
            });

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
        const confirmMessage = 'Вы уверены, что хотите удалить задачу?';

        if (Platform.OS === 'web') {
            if (window.confirm(confirmMessage)) {
                performDelete();
            }
        } else {
            Alert.alert('Удаление', confirmMessage, [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: () => performDelete()
                },
            ]);
        }
    };

    const performDelete = async () => {
        try {
            await taskService.deleteTask(id as string);
            Toast.show({ type: 'success', text1: 'Успешно', text2: 'Задача удалена' });
            router.push("/(screens)/TaskBoardScreen");
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Ошибка', text2: 'Не удалось удалить задачу' });
        }
    };

    const renderSkeleton = () => (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={[colors.primary, colors.secondary]}
                style={[styles.header, { paddingTop: insets.top + 15 }]}
            >
                <View style={styles.headerTopRow}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <ArrowLeft size={24} color="white" />
                    </TouchableOpacity>
                </View>

                <View style={[styles.headerContent, {paddingBottom: 62}]}>
                    <SkeletonItem width="80%" height={28} borderRadius={8} marginBottom={10} />
                    <SkeletonItem width={100} height={24} borderRadius={8} />
                </View>
            </LinearGradient>

            <View style={styles.content}>
                {/* Карточка с датами */}
                <View style={[styles.card, { padding: 16, backgroundColor: colors.card, shadowOpacity: isDark ? 0 : 0.05 }]}>
                    <View style={styles.timeRow}>
                        <View style={styles.timeContent}>
                            <SkeletonItem width={60} height={12} borderRadius={4} marginBottom={8} />
                            <SkeletonItem width={80} height={16} borderRadius={4} />
                        </View>
                        <View style={[styles.timeDividerVertical, { backgroundColor: colors.divider }]} />
                        <View style={styles.timeContent}>
                            <SkeletonItem width={60} height={12} borderRadius={4} marginBottom={8} />
                            <SkeletonItem width={80} height={16} borderRadius={4} />
                        </View>
                    </View>
                </View>

                {/* Статус */}
                <SkeletonItem width={100} height={16} borderRadius={4} marginBottom={12} />
                <View style={[styles.selectTrigger, { marginBottom: 20, backgroundColor: colors.card, borderColor: colors.border }]}>
                    <SkeletonItem width={80} height={16} borderRadius={4} />
                    <SkeletonItem width={20} height={20} borderRadius={10} />
                </View>

                {/* Описание */}
                <View style={[styles.card, { padding: 16 }]}>
                    <SkeletonItem width={80} height={16} borderRadius={4} marginBottom={12} />
                    <SkeletonItem width="100%" height={14} borderRadius={4} marginBottom={8} />
                    <SkeletonItem width="90%" height={14} borderRadius={4} marginBottom={8} />
                    <SkeletonItem width="95%" height={14} borderRadius={4} marginBottom={16} />

                    <View style={styles.priorityBadge}>
                        <SkeletonItem width={100} height={14} borderRadius={4} />
                    </View>
                </View>

                {/* Постановщик */}
                <View style={[styles.card, { padding: 16 }]}>
                    <View style={styles.cardHeader}>
                        <SkeletonItem width={80} height={16} borderRadius={4} />
                    </View>
                    <View style={styles.attendeeRow}>
                        <SkeletonItem width={36} height={36} borderRadius={18} />
                        <View style={styles.attendeeInfo}>
                            <SkeletonItem width={120} height={16} borderRadius={4} marginBottom={6} />
                            <SkeletonItem width={80} height={12} borderRadius={4} />
                        </View>
                    </View>
                </View>

                {/* Исполнители */}
                <View style={[styles.card, { padding: 16 }]}>
                    <View style={[styles.cardHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                        <SkeletonItem width={100} height={16} borderRadius={4} />
                        <SkeletonItem width={24} height={24} borderRadius={12} />
                    </View>

                    {[1, 2, 3].map((item) => (
                        <View key={item} style={styles.attendeeRow}>
                            <SkeletonItem width={36} height={36} borderRadius={18}/>
                            <View style={styles.attendeeInfo}>
                                <SkeletonItem width={`${Math.random() * 30 + 70}%`} height={16} borderRadius={4} marginBottom={6} />
                                <SkeletonItem width="60%" height={12} borderRadius={4} />
                            </View>
                            <SkeletonItem width={18} height={18} borderRadius={9} />
                        </View>
                    ))}
                </View>

                {/* Кнопка завершения */}
                <SkeletonItem width="100%" height={48} borderRadius={16} marginBottom={20} />
            </View>
        </View>
    );

    if (loading) {
        return renderSkeleton();
    }

    if (!task) return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Text style={{ textAlign: 'center', marginTop: 50, color: colors.text }}>Задача не найдена</Text>
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <StatusBar barStyle="light-content" />

            <ScrollView
                style={styles.container}
                contentContainerStyle={{ paddingBottom: 24 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <LinearGradient
                    colors={[colors.primary, colors.secondary]}
                    style={[styles.header, { paddingTop: insets.top + 15 }]}
                >
                    <View style={styles.headerTopRow}>
                        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                            <View pointerEvents="none">
                                <ArrowLeft size={24} color="white" />
                            </View>
                        </TouchableOpacity>

                        {(userRole === "Admin" || userId===task.author_id) && (
                            <View style={styles.headerActions}>
                                <TouchableOpacity
                                    style={styles.iconButton}
                                    onPress={() => router.push({pathname: '/(screens)/TaskBoardScreen/NewTaskScreen', params: { id: task.task_id, isEdit: 1 }})}
                                >
                                    <Edit size={20} color="white" />
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.iconButton, { marginLeft: 10 }]} onPress={handleDelete}>
                                    <Trash2 size={20} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    <View style={styles.headerContent}>
                        <Text style={styles.headerTitle} numberOfLines={3}>{task.title}</Text>
                        <View style={[styles.statusTag, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                            <Text style={[styles.statusTagText, { color: 'white' }]}>{task.status}</Text>
                        </View>
                    </View>
                </LinearGradient>

                <View style={styles.content}>
                    <View style={[styles.card, { backgroundColor: colors.card, shadowOpacity: isDark ? 0 : 0.05 }]}>
                        <View style={styles.timeRow}>
                            <View style={styles.timeContent}>
                                <Text style={[styles.label, { color: colors.subtext }]}>Создано</Text>
                                <Text style={[styles.value, { color: colors.text }]}>
                                    {task.created_at ? new Date(task.created_at).toLocaleDateString('ru-RU') : '-'}
                                </Text>
                            </View>
                            <View style={[styles.timeDividerVertical, { backgroundColor: colors.divider }]} />
                            <View style={styles.timeContent}>
                                <Text style={[styles.label, { color: colors.subtext }]}>Крайний срок</Text>
                                <Text style={[styles.value, { color: colors.text }]}>
                                    {task.expected_end_date ? new Date(task.expected_end_date).toLocaleDateString('ru-RU', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    }) : 'Не указан'}

                                </Text>
                            </View>
                        </View>
                    </View>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Текущий статус</Text>
                    <View style={[styles.selectWrapper, { zIndex: 1000 }]}>
                        <TouchableOpacity
                            style={[styles.selectTrigger, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={() => setIsStatusSelectOpen(!isStatusSelectOpen)}
                        >
                            <Text style={[styles.selectValue, { color: colors.text }]}>{task.status}</Text>
                            <Ionicons
                                name={isStatusSelectOpen ? "chevron-up" : "chevron-down"}
                                size={20}
                                color={colors.subtext}
                            />
                        </TouchableOpacity>

                        {isStatusSelectOpen && (
                            <View style={[styles.selectDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                {statuses.map((item) => (
                                    <TouchableOpacity
                                        key={item.name}
                                        style={[
                                            styles.selectItem,
                                            { borderBottomColor: colors.divider },
                                            task.status === item.name && [styles.selectItemSelected, { backgroundColor: isDark ? colors.primary + '20' : '#f0fdf4' }]
                                        ]}
                                        onPress={() => handleStatusChange(item.name)}
                                    >
                                        <Text style={[
                                            styles.selectItemText,
                                            { color: colors.text },
                                            task.status === item.name && [styles.selectItemTextSelected, { color: colors.primary }]
                                        ]}>
                                            {item.name}
                                        </Text>
                                        {task.status === item.name && (
                                            <Ionicons name="checkmark" size={18} color={colors.primary} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Описание */}
                    <View style={[styles.card, { backgroundColor: colors.card, shadowOpacity: isDark ? 0 : 0.05 }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Описание</Text>
                        <Text style={[styles.description, { color: colors.subtext }]}>{task.description || 'Описание отсутствует'}</Text>

                        <View style={[styles.priorityBadge, { backgroundColor: isDark ? colors.iconBox : '#f1f5f9' }]}>
                            <View style={[styles.dot, { backgroundColor: colors.subtext }]} />
                            <Text style={[styles.priorityText, { color: colors.subtext }]}>
                                Приоритет: {priorityMap[task.priority] || task.priority}
                            </Text>
                        </View>
                    </View>

                    <View style={[styles.card, { backgroundColor: colors.card, shadowOpacity: isDark ? 0 : 0.05 }]}>
                        <View style={styles.cardHeader}>
                            <Text style={[styles.cardTitle, { color: colors.text }]}>Постановщик</Text>
                        </View>
                        <View style={styles.attendeeRow}>
                            <View style={[styles.avatar, { backgroundColor: isDark ? colors.iconBox : '#e2e8f0' }]}>
                                <User size={18} color={colors.subtext} />
                            </View>
                            <View style={styles.attendeeInfo}>
                                <Text style={[styles.attendeeName, { color: colors.text }]}>{task.author_name}</Text>
                                <Text style={[styles.statusText, { color: colors.subtext }]}>Автор задачи</Text>
                            </View>
                        </View>
                    </View>

                    {/* Исполнители */}
                    <View style={[styles.card, { backgroundColor: colors.card, shadowOpacity: isDark ? 0 : 0.05 }]}>
                        <View style={[styles.cardHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                            <Text style={[styles.cardTitle, { color: colors.text }]}>Исполнители</Text>
                            {(userRole === "Admin" || userId === task.author_id) && (
                                <TouchableOpacity onPress={handleOpenAddUserModal}>
                                    <Ionicons name="add-circle" size={24} color={isDark ? colors.subtext : colors.text} />
                                </TouchableOpacity>
                            )}
                        </View>
                        {task.users?.length === 0 && (
                            <Text style={[styles.emptyText, { color: colors.subtext }]}>Нет назначенных исполнителей</Text>
                        )}
                        {task.users?.map((user) => (
                            <TouchableOpacity key={user.id} style={[styles.attendeeRow, { borderBottomColor: colors.divider }]} onPress={() => router.push({ pathname: '/(screens)/ProfileScreen', params: { id: user.id } })}>
                                <View style={[styles.avatar, {backgroundColor: isDark ? colors.primary + '40' : '#dcfce7'}]} >
                                    <Text style={[styles.avatarText, { color: isDark ? colors.roleText : '#166534' }]}>
                                        {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                                <View style={styles.attendeeInfo}>
                                    <Text style={[styles.attendeeName, { color: colors.text }]}>{user.full_name || user.email}</Text>
                                    <Text style={[styles.statusText, { color: colors.subtext }]}>{user.job_title || 'Сотрудник'}</Text>
                                </View>

                                {(userRole === "Admin" || userId === task.author_id) && task.users?.length > 1 && (
                                    <TouchableOpacity
                                        style={styles.removeUserBtn}
                                        onPress={() => handleRemoveUser(user.id, user.full_name || user.email, task.task_id)}
                                        disabled={removingUserId === user.id}
                                    >
                                        {removingUserId === user.id ? (
                                            <ActivityIndicator size="small" color="#ef4444" />
                                        ) : (
                                            <X size={18} color={colors.text} />
                                        )}
                                    </TouchableOpacity>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Комментарии */}
                    <View style={[styles.card, { padding: 0, overflow: 'hidden', backgroundColor: colors.card, shadowOpacity: isDark ? 0 : 0.05 }]}>
                        <View style={[styles.commentsHeader]}>
                            <View style={styles.commentsHeaderLeft}>
                                <Text style={[styles.cardTitle, { color: colors.text }]}>Комментарии</Text>
                                <View style={[styles.commentsCountBadge, { backgroundColor: colors.primary }]}>
                                    <Text style={[styles.commentsCountText, { color: "#fff" }]}>{comments.length}</Text>
                                </View>
                            </View>
                        </View>

                        <CommentInput onSend={handleAddComment} isLoading={sendingComment} />

                        <FlatList
                            style={Platform.OS === 'web' ? { maxHeight: 400, overflowY: 'auto' as const } : undefined}
                            data={comments}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TaskCommentComponent
                                    comment={item}
                                    onDelete={handleDeleteComment}
                                    isDeleting={deletingCommentId === item.id}
                                />
                            )}
                            contentContainerStyle={styles.commentsListContent}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>

                    {(userRole === "Admin" || userId === task.author_id) && !isTaskCompleted && (
                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel="Завершить задачу"
                            accessibilityState={{ disabled: isCompleting, busy: isCompleting }}
                            style={[styles.completeTaskBtn, { backgroundColor: colors.primary }]}
                            onPress={handleCompleteTask}
                            disabled={isCompleting}
                        >
                            {isCompleting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.completeTaskBtnText}>Завершить задачу</Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>

            {/* Модалка добавления исполнителя */}
            <Modal
                visible={isAddUserModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsAddUserModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalContent, { backgroundColor: colors.card, paddingBottom: insets.bottom || 24 }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Добавить исполнителя</Text>
                            <TouchableOpacity onPress={() => setIsAddUserModalVisible(false)} style={styles.closeModalBtn}>
                                <X size={24} color={colors.subtext} />
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.searchContainer, { backgroundColor: isDark ? colors.background : '#f1f5f9' }]}>
                            <Search size={20} color={colors.subtext} style={styles.searchIcon} />
                            <TextInput
                                style={[styles.searchInput, { color: colors.text }]}
                                placeholder="Поиск по имени или email..."
                                placeholderTextColor={colors.subtext}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <X size={16} color={colors.subtext} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {isUsersLoading ? (
                            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
                        ) : (
                            <FlatList
                                data={filteredUsers}
                                keyExtractor={(item) => item.id}
                                initialNumToRender={10}
                                maxToRenderPerBatch={10}
                                windowSize={5}
                                removeClippedSubviews={true}
                                contentContainerStyle={{ paddingVertical: 10 }}
                                showsVerticalScrollIndicator={false}
                                ListEmptyComponent={
                                    <Text style={[styles.emptyListText, { color: colors.subtext }]}>
                                        {searchQuery ? 'Сотрудники не найдены' : 'Список пуст'}
                                    </Text>
                                }
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[styles.userListItem, { borderBottomColor: colors.divider }]}
                                        onPress={() => handleAddUserToTask(item)}
                                        disabled={addingUserId !== null}
                                    >
                                        <View style={styles.attendeeRow}>
                                            <View style={[styles.avatar, { backgroundColor: isDark ? colors.iconBox : '#f1f5f9' }]}>
                                                <Text style={[styles.avatarText, { color: colors.text }]}>
                                                    {(item.full_name || item.email || '?').charAt(0).toUpperCase()}
                                                </Text>
                                            </View>
                                            <View style={styles.attendeeInfo}>
                                                <Text style={[styles.attendeeName, { color: colors.text }]}>{item.full_name || item.email}</Text>
                                                <Text style={[styles.statusText, { color: colors.subtext }]}>{item.job_title || 'Сотрудник'}</Text>
                                            </View>
                                        </View>

                                        {addingUserId === item.id ? (
                                            <ActivityIndicator size="small" color={colors.primary} />
                                        ) : (
                                            <View style={styles.addButtonIcon}>
                                                <Ionicons name="add" size={20} color={colors.primary} />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}
