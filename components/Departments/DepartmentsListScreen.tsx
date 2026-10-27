import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    RefreshControl,
    Alert, Platform,
    ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {apiClient} from "@/api/api";
import { Department } from "@/models/DepartmentModel";
import Toast from "react-native-toast-message";
import {Building2, Plus, Trash2} from "lucide-react-native";
import {CreateDepartmentPopup} from "@/components/Departments/CreateDepartmentPopup";
import { declOfNum } from '@/utils';
import {Search} from "@/components/ui/Shared/Search";
import { useTheme } from '@/context/ThemeContext';

import { useDepartmentsStore } from '@/store/useDepartmentsStore';
import {SkeletonLoader} from "@/components/ui/Shared/SkeletonLoader";

const DepartmentsListScreen = () => {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const { departments, isLoading: loading, fetchDepartments } = useDepartmentsStore();
    const [filteredDepartments, setFilteredDepartments] = useState<Department[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [modalVisible, setModalVisible] = useState(false);
    const [creating, setCreating] = useState(false);

    const applyFilters = useCallback((allDepartments: Department[], query: string) => {
        if (!query.trim()) {
            setFilteredDepartments(allDepartments);
            return;
        }

        const lowerQuery = query.toLowerCase();
        const result = allDepartments.filter(dept =>
            dept.name.toLowerCase().includes(lowerQuery)
        );
        setFilteredDepartments(result);
    }, []);

    const createDepartment = async (name: string) => {
        setCreating(true);
        try {
            await apiClient.post('/api/Department/create', null, {
                params: {
                    department: name.trim()
                },
                headers: {
                    'Accept': 'application/json'
                }
            });

            Toast.show({ type: 'success', text1: 'Успешно', text2: 'Отдел создан' });
            await fetchDepartments(true);
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Ошибка', text2: 'Не удалось создать отдел' });
            throw error;
        } finally {
            setCreating(false);
        }
    };

    const deleteDepartment = (departmentId: string, departmentName: string) => {
        Alert.alert(
            'Удаление отдела',
            `Вы уверены, что хотите удалить отдел "${departmentName}"?`,
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiClient.delete(`/api/Department/delete/${departmentId}`);

                            Toast.show({
                                type: 'success',
                                text1: 'Успешно',
                                text2: 'Отдел удален'
                            });
                            await fetchDepartments(true);
                        } catch (error) {
                            console.error("Ошибка при удалении отдела:", error);
                            Toast.show({
                                type: 'error',
                                text1: 'Ошибка',
                                text2: 'Не удалось удалить отдел'
                            });
                        }
                    }
                }
            ]
        );
    };

    useEffect(() => {
        fetchDepartments();
    }, []);

    useEffect(() => {
        applyFilters(departments, searchQuery);
    }, [departments, searchQuery, applyFilters]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchDepartments(true);
        setRefreshing(false);
    };

    const renderDepartmentItem = ({ item }: { item: Department }) => (
        <TouchableOpacity
            style={[styles.departmentCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push({
                pathname: '/(screens)/DepartmentsScreen/DepartmentDetailsScreen',
                params: { id: item.id, name: item.name }
            })}
        >
            <View style={[styles.departmentIcon, { backgroundColor: isDark ? colors.primary + '20' : '#ebfdeb' }]}>
                <Building2 size={22} color={isDark ? colors.roleText : "#2A6E3F"} />
            </View>

            <View style={styles.departmentInfo}>
                <Text style={[styles.departmentName, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.departmentId, { color: colors.subtext }]}>ID: {item.id.slice(0, 8)}...</Text>
            </View>

            <TouchableOpacity
                onPress={() => deleteDepartment(item.id, item.name)}
                style={styles.deleteButton}
            >
                <View pointerEvents={"none"}>
                    <Trash2 size={16} color={isDark ? colors.subtext : "#000"} />
                </View>
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <StatusBar barStyle="light-content" translucent />

            <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingTop: insets.top + 15 }]}
            >
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Отделы</Text>
                    <Text style={styles.headerSubtitle}>
                        {loading ? 'Загрузка...' : `${filteredDepartments.length} ${declOfNum(filteredDepartments.length, ['отдел', 'отдела', 'отделов'])}`}
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.newTaskButton}
                    onPress={() => setModalVisible(true)}
                >
                    <View pointerEvents={"none"}>
                        <Plus size={20} color="white" />
                    </View>
                </TouchableOpacity>
            </LinearGradient>
            <Search
                placeholder={"Название отдела"}
                searchQuery={searchQuery}
                onChangeText={(t) => {
                    setSearchQuery(t);
                    applyFilters(departments, t);
                }}
            />

            {loading && !refreshing ? (
                <ScrollView
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
                    }
                >
                    <SkeletonLoader count={6} itemHeight={70} itemMargin={12} />
                </ScrollView>
            ) : (
                <FlatList
                    data={filteredDepartments}
                    keyExtractor={(item) => item.id}
                    renderItem={renderDepartmentItem}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
                    }
                    ListEmptyComponent={
                        <View style={[styles.emptyState, { backgroundColor: colors.card, marginHorizontal: 20, padding: 30, borderRadius: 20 }]}>
                            <Ionicons name="business-outline" size={48} color={colors.subtext} />
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>Нет отделов</Text>
                            <Text style={[styles.emptySubtitle, { color: colors.subtext }]}>Создайте первый отдел</Text>
                        </View>
                    }
                />
            )}

            <CreateDepartmentPopup
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onCreate={createDepartment}
                loading={creating}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        paddingBottom: 40, // Увеличил padding, чтобы фильтр красиво перекрывал градиент
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
    },
    headerContent: {
        marginLeft: 10
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 1,
    },
    newTaskButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: "auto"
    },
    taskList: { padding: 15, paddingTop: 10 },
    listContainer: { padding: 15, paddingTop: 10 },
    departmentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
    },
    departmentIcon: {
        width: 40,
        height: 40,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    departmentInfo: { flex: 1 },
    departmentName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
    departmentId: { fontSize: 12 },
    deleteButton: {
        padding: 8,
        borderRadius: 8,
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyState: { alignItems: 'center', marginTop: 60 },
    emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 12 },
    emptySubtitle: { fontSize: 14, marginTop: 4 },

    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        width: '90%',
        maxWidth: 400,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    modalTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
    modalBody: { padding: 20 },
    inputLabel: { fontSize: 14, fontWeight: '500', color: '#64748b', marginBottom: 8 },
    modalInput: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    modalFooter: {
        flexDirection: 'row',
        padding: 20,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    modalButton: {
        flex: 1,
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    cancelButton: { backgroundColor: '#f1f5f9' },
    cancelButtonText: { color: '#64748b', fontWeight: '500' },
    createButton: { backgroundColor: '#2A6E3F' },
    createButtonText: { color: '#fff', fontWeight: '500' },
});

export default DepartmentsListScreen;
