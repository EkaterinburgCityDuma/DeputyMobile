import React, {useCallback, useEffect, useMemo, useState} from 'react';
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
    Platform, InteractionManager
} from 'react-native';
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import {
    ArrowLeft,
    Edit,
    Trash2,
    User,
    Users,
    Search,
    X
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";

import { taskService } from '@/api/taskService';
import { Task, priorityMap } from '@/models/TaskBoardModel';
import { styles } from './task-detail-style';
import { AuthManager } from "@/components/LoginScreen/LoginScreen";
import { apiUrl } from '@/api/api';
import {SkeletonLoader, SkeletonItem} from "@/components/ui/SkeletonLoader";

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

export function TaskDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();

    const [task, setTask] = useState<Task | null>(null);
    const [statuses, setStatuses] = useState<TaskStatusServer[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isStatusSelectOpen, setIsStatusSelectOpen] = useState(false);

    const [isAddUserModalVisible, setIsAddUserModalVisible] = useState(false);
    const [allUsers, setAllUsers] = useState<ApiUser[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isUsersLoading, setIsUsersLoading] = useState(false);
    const [addingUserId, setAddingUserId] = useState<string | null>(null);
    const [removingUserId, setRemovingUserId] = useState<string | null>(null);
    const [isCompleting, setIsCompleting] = useState(false);

    const userRole = AuthManager.getRole();
    const userId = AuthManager.getUserId();
    const token = AuthManager.getToken ? AuthManager.getToken() : '';

    const loadData = useCallback(async () => {
        if (!id) return;
        try {
            const [taskData, statusesData] = await Promise.all([
                taskService.getTaskById(id),
                taskService.getStatuses()
            ]);

            // @ts-ignore
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

    const fetchAllUsers = async () => {
        setIsUsersLoading(true);
        try {
            const response = await fetch(`${apiUrl}/api/Auth/all`, {
                method: 'GET',
                headers: {
                    'accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            setAllUsers(data);
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Ошибка', text2: 'Не удалось загрузить список пользователей' });
        } finally {
            setIsUsersLoading(false);
        }
    };

    const handleOpenAddUserModal = () => {
        setIsAddUserModalVisible(true);
        setSearchQuery('');

        if (allUsers.length === 0) {
            InteractionManager.runAfterInteractions(() => {
                fetchAllUsers();
            });
        }
    };

    const handleAddUserToTask = async (selectedUser: ApiUser) => {
        if (!task) return;
        setAddingUserId(selectedUser.id);

        try {
            const response = await fetch(`${apiUrl}/api/task/add-user-task/${task.task_id}?userId=${selectedUser.id}`, {
                method: 'POST',
                headers: {
                    'accept': '*/*',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Ошибка сервера');

            setTask(prev => prev ? {
                ...prev,
                users: [...(prev.users || []), {
                    id: selectedUser.id,
                    email: selectedUser.email,
                    full_name: selectedUser.full_name,
                    job_title: selectedUser.job_title
                } as any]
            } : null);

            Toast.show({ type: 'success', text1: 'Успешно', text2: `${selectedUser.full_name || selectedUser.email} добавлен в задачу` });
            setIsAddUserModalVisible(false);
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Ошибка', text2: 'Не удалось добавить пользователя' });
        } finally {
            setAddingUserId(null);
        }
    };

    const handleRemoveUser = (targetUserId: string, targetUserName: string) => {
        Alert.alert('Удаление исполнителя', `Удалить ${targetUserName} из задачи?`, [
            { text: 'Отмена', style: 'cancel' },
            {
                text: 'Удалить',
                style: 'destructive',
                onPress: async () => {
                    setRemovingUserId(targetUserId);
                    try {
                        const response = await fetch(`${apiUrl}/api/task/remove-user-task/${task?.task_id}?userId=${targetUserId}`, {
                            method: 'DELETE',
                            headers: {
                                'accept': '*/*',
                                'Authorization': `Bearer ${token}`
                            }
                        });

                        if (!response.ok) throw new Error('Ошибка сервера');

                        setTask(prev => prev ? {
                            ...prev,
                            users: prev.users?.filter(u => u.id !== targetUserId)
                        } : null);

                        Toast.show({ type: 'success', text1: 'Успешно', text2: 'Исполнитель удален' });
                    } catch (error) {
                        Toast.show({ type: 'error', text1: 'Ошибка', text2: 'Не удалось удалить исполнителя' });
                    } finally {
                        setRemovingUserId(null);
                    }
                }
            }
        ]);
    };

    const handleArchiveTask = () => {
        Alert.alert('Завершение задачи', 'Перенести задачу в архив?', [
            { text: 'Отмена', style: 'cancel' },
            {
                text: 'Завершить',
                onPress: async () => {
                    setIsCompleting(true);
                    try {
                        const response = await fetch(`${apiUrl}/api/task/set-tasks-archived-status/${task?.task_id}?archive=true`, {
                            method: 'POST',
                            headers: {
                                'accept': '*/*',
                                'Authorization': `Bearer ${token}`
                            }
                        });

                        if (!response.ok) throw new Error('Ошибка сервера');

                        Toast.show({ type: 'success', text1: 'Успешно', text2: 'Задача завершена и перенесена в архив' });
                        router.back();
                    } catch (error) {
                        Toast.show({ type: 'error', text1: 'Ошибка', text2: 'Не удалось завершить задачу' });
                        setIsCompleting(false);
                    }
                }
            }
        ]);
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

    const renderSkeleton = () => (
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={['#2A6E3F', '#349339']}
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
                <View style={[styles.card, { padding: 16 }]}>
                    <View style={styles.timeRow}>
                        <View style={styles.timeContent}>
                            <SkeletonItem width={60} height={12} borderRadius={4} marginBottom={8} />
                            <SkeletonItem width={80} height={16} borderRadius={4} />
                        </View>
                        <View style={styles.timeDividerVertical} />
                        <View style={styles.timeContent}>
                            <SkeletonItem width={60} height={12} borderRadius={4} marginBottom={8} />
                            <SkeletonItem width={80} height={16} borderRadius={4} />
                        </View>
                    </View>
                </View>

                {/* Статус */}
                <SkeletonItem width={100} height={16} borderRadius={4} marginBottom={12} />
                <View style={[styles.selectTrigger, { marginBottom: 20 }]}>
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

                        {(userRole === "Admin" || userId===task.author_id) && (
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
                        <View style={[styles.cardHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                            <Text style={styles.cardTitle}>Исполнители</Text>
                            {(userRole === "Admin" || userId === task.author_id) && (
                                <TouchableOpacity onPress={handleOpenAddUserModal}>
                                    <Ionicons name="add-circle" size={24} color="#000" />
                                </TouchableOpacity>
                            )}
                        </View>
                        {task.users?.length === 0 && (
                            <Text style={styles.emptyText}>Нет назначенных исполнителей</Text>
                        )}
                        {task.users?.map((user) => (
                            <TouchableOpacity key={user.id} style={styles.attendeeRow} onPress={() => router.push({ pathname: '/(screens)/ProfileScreen', params: { id: user.id } })}>
                                <View style={[styles.avatar, {backgroundColor: '#dcfce7'}]} >
                                    <Text style={styles.avatarText}>
                                        {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                                <View style={styles.attendeeInfo}>
                                    <Text style={styles.attendeeName}>{user.full_name || user.email}</Text>
                                    <Text style={styles.statusText}>{user.job_title || 'Сотрудник'}</Text>
                                </View>

                                {(userRole === "Admin" || userId === task.author_id) && task.users?.length > 1 && (
                                    <TouchableOpacity
                                        style={styles.removeUserBtn}
                                        onPress={() => handleRemoveUser(user.id, user.full_name || user.email)}
                                        disabled={removingUserId === user.id}
                                    >
                                        {removingUserId === user.id ? (
                                            <ActivityIndicator size="small" color="#ef4444" />
                                        ) : (
                                            <X size={18} color="#000" />
                                        )}
                                    </TouchableOpacity>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>

                    {(userRole === "Admin" || userId === task.author_id) && (
                        <TouchableOpacity
                            style={styles.completeTaskBtn}
                            onPress={handleArchiveTask}
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
                    <View style={[styles.modalContent, { paddingBottom: insets.bottom || 24 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Добавить исполнителя</Text>
                            <TouchableOpacity onPress={() => setIsAddUserModalVisible(false)} style={styles.closeModalBtn}>
                                <X size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchContainer}>
                            <Search size={20} color="#94a3b8" style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Поиск по имени или email..."
                                placeholderTextColor="#94a3b8"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <X size={16} color="#94a3b8" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {isUsersLoading ? (
                            <ActivityIndicator size="large" color="#2A6E3F" style={{ marginTop: 40 }} />
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
                                    <Text style={styles.emptyListText}>
                                        {searchQuery ? 'Сотрудники не найдены' : 'Список пуст'}
                                    </Text>
                                }
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.userListItem}
                                        onPress={() => handleAddUserToTask(item)}
                                        disabled={addingUserId !== null}
                                    >
                                        <View style={styles.attendeeRow}>
                                            <View style={[styles.avatar, { backgroundColor: '#f1f5f9' }]}>
                                                <Text style={[styles.avatarText, { color: '#475569' }]}>
                                                    {(item.full_name || item.email || '?').charAt(0).toUpperCase()}
                                                </Text>
                                            </View>
                                            <View style={styles.attendeeInfo}>
                                                <Text style={styles.attendeeName}>{item.full_name || item.email}</Text>
                                                <Text style={styles.statusText}>{item.job_title || 'Сотрудник'}</Text>
                                            </View>
                                        </View>

                                        {addingUserId === item.id ? (
                                            <ActivityIndicator size="small" color="#2A6E3F" />
                                        ) : (
                                            <View style={styles.addButtonIcon}>
                                                <Ionicons name="add" size={20} color="#2A6E3F" />
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
