import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    StatusBar,
    Modal,
    FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {useLocalSearchParams, useRouter} from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Profile } from "@/models/ProfileModel";
import { AuthManager } from "@/api/auth";
import { SelectionPopup } from "@/components/UsersScreen/SelectionPopup";
import Toast from "react-native-toast-message";
import {ArrowLeft, Building2, X} from "lucide-react-native";
import { apiClient } from '@/api/api';
import { useTheme } from '@/context/ThemeContext';

const CreateUserScreen = () => {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams<{ id: string }>();
    const isEditMode = !!id;

    // Состояния формы
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [jobTitle, setJobTitle] = useState('');
    const [password, setPassword] = useState('');
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [selectedDeputy, setSelectedDeputy] = useState<Profile | null>(null);
    const [selectedDepartments, setSelectedDepartments] = useState<{id: string, name: string}[]>([]);

    // Состояния UI
    const [isLoading, setIsLoading] = useState(isEditMode);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRoleSelectOpen, setIsRoleSelectOpen] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [deputies, setDeputies] = useState<Profile[]>([]);
    const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);

    const [deputyPopupVisible, setDeputyPopupVisible] = useState(false);
    const [departmentPopupVisible, setDepartmentPopupVisible] = useState(false);
    const [tempSelectedDepartments, setTempSelectedDepartments] = useState<{id: string, name: string}[]>([]);

    const token = AuthManager.getToken();
    const roles = ['Admin', 'Deputy', 'Helper'];

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // 1. Загружаем справочники параллельно
                const [depsRes, deptsRes] = await Promise.all([
                    apiClient.get('/api/Auth/role/Deputy'),
                    apiClient.get('/api/Department/get-all')
                ]);

                const fetchedDeputies = depsRes.data;
                const fetchedDepartments = deptsRes.data;

                setDeputies(fetchedDeputies);
                setDepartments(fetchedDepartments);

                // 2. Если режим редактирования, подтягиваем данные пользователя
                if (isEditMode) {
                    const profileRes = await apiClient.get(`/api/Auth/${id}`);
                    const profileData = profileRes.data;

                    setFullName(profileData.full_name || '');
                    setEmail(profileData.email || '');
                    setJobTitle(profileData.job_title || '');

                    if (profileData.roles && profileData.roles.length > 0) {
                        setSelectedRole(profileData.roles[0]);
                    }

                    // Загружаем отделы пользователя (если есть)
                    if (profileData.departments && Array.isArray(profileData.departments)) {
                        const userDepartments = fetchedDepartments.filter((d: any) =>
                            profileData.departments.includes(d.id) || profileData.departments.includes(d.name)
                        );
                        setSelectedDepartments(userDepartments);
                    } else if (profileData.department_id) {
                        // Fallback для старой структуры
                        const foundDept = fetchedDepartments.find(
                            (d: any) => d.id === profileData.department_id || d.name === profileData.department
                        );
                        if (foundDept) setSelectedDepartments([foundDept]);
                    }

                    // Пытаемся привязать депутата (если он помощник)
                    if (profileData.deputy_id) {
                        const foundDeputy = fetchedDeputies.find((d: any) => d.id === profileData.deputy_id);
                        if (foundDeputy) setSelectedDeputy(foundDeputy);
                    }
                }
            } catch (error) {
                console.error("Ошибка при загрузке данных:", error);
                Toast.show({
                    type: 'error',
                    text1: 'Ошибка',
                    text2: 'Не удалось загрузить данные',
                });
            } finally {
                setIsLoading(false);
            }
        };

        loadInitialData();
    }, [id, isEditMode, token]);

    const generatePassword = () => {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let newPassword = "";
        for (let i = 0; i < 12; i++) {
            newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setPassword(newPassword);
        setIsPasswordVisible(true);
    };

    const copyPassword = async () => {
        if (!password) return;
        await Clipboard.setStringAsync(password);
        Toast.show({
            type: "success",
            text1: 'Скопировано',
            visibilityTime: 1000
        });
    };

    const handleSubmit = async () => {
        // 1. Валидация
        const isPasswordValid = isEditMode ? true : !!password;
        if (!fullName || !email || !isPasswordValid || !selectedRole) {
            Toast.show({
                type: 'error',
                text1: 'Ошибка заполнения',
                text2: 'Заполните все обязательные поля (*)',
                position: 'bottom'
            });
            return;
        }

        setIsSubmitting(true);

        // 2. Формируем Payload строго по схемам
        let payload: any;
        const endpoint = isEditMode ? '/api/Auth/update' : '/api/Auth/create';

        // Массив ID отделов (всегда массив)
        const departmentIds = selectedDepartments.map(dept => dept.id);

        if (isEditMode) {
            // Схема для РЕДАКТИРОВАНИЯ
            payload = {
                id: id,
                email,
                job_title: jobTitle,
                full_name: fullName,
                deputy_id: selectedRole === 'Helper' ? selectedDeputy?.id : null,
                department_id: departmentIds, // Всегда массив
                user_roles: [selectedRole]
            };
        } else {
            // Схема для СОЗДАНИЯ
            payload = {
                email,
                job_title: jobTitle,
                full_name: fullName,
                password,
                roles: [selectedRole],
                deputy_id: selectedRole === 'Helper' ? selectedDeputy?.id : null,
                department_id: departmentIds, // Всегда массив
            };
        }

        try {
            await apiClient.post(endpoint, payload);

            Toast.show({
                type: 'success',
                text1: 'Успешно',
                text2: isEditMode ? 'Профиль обновлен' : 'Пользователь создан',
            });
            setTimeout(() => router.back(), 1500);
        } catch (error: any) {
            console.error("Ошибка API:", error);

            const errorMessage = error.response?.data?.message || 'Что-то пошло не так';
            Toast.show({
                type: 'error',
                text1: 'Ошибка сервера',
                text2: errorMessage,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const openDepartmentModal = () => {
        setTempSelectedDepartments([...selectedDepartments]);
        setDepartmentPopupVisible(true);
    };

    const toggleDepartmentSelection = (department: {id: string, name: string}) => {
        const exists = tempSelectedDepartments.some(d => d.id === department.id);
        if (exists) {
            setTempSelectedDepartments(tempSelectedDepartments.filter(d => d.id !== department.id));
        } else {
            setTempSelectedDepartments([...tempSelectedDepartments, department]);
        }
    };

    const confirmDepartmentSelection = () => {
        setSelectedDepartments(tempSelectedDepartments);
        setDepartmentPopupVisible(false);
    };

    const removeDepartment = (departmentId: string) => {
        setSelectedDepartments(selectedDepartments.filter(d => d.id !== departmentId));
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: colors.background }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <ScrollView
                contentContainerStyle={[styles.container, { paddingBottom: 24 }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <LinearGradient
                    colors={[colors.primary, colors.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.header, { paddingTop: insets.top + 20 }]}
                >
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <View pointerEvents="none">
                            <ArrowLeft size={24} color="white" />
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>
                        {isEditMode ? 'Редактирование профиля' : 'Регистрация'}
                    </Text>
                </LinearGradient>

                <View style={styles.card}>
                    {/* ФИО, Email, Должность */}
                    <TextInput style={[styles.input, { backgroundColor: isDark ? colors.card : '#f7f7f7', borderColor: colors.border, color: colors.text }]} value={fullName} onChangeText={setFullName} placeholder="ФИО *" placeholderTextColor={colors.subtext} />
                    <TextInput style={[styles.input, { backgroundColor: isDark ? colors.card : '#f7f7f7', borderColor: colors.border, color: colors.text }]} value={email} onChangeText={setEmail} placeholder="Email *" placeholderTextColor={colors.subtext} />
                    <TextInput style={[styles.input, { backgroundColor: isDark ? colors.card : '#f7f7f7', borderColor: colors.border, color: colors.text }]} value={jobTitle} onChangeText={setJobTitle} placeholder="Должность" placeholderTextColor={colors.subtext} />

                    {/* Выбор отделов (множественный) */}
                    <TouchableOpacity style={[styles.selectTrigger, { backgroundColor: isDark ? colors.card : '#f7f7f7', borderColor: colors.border }]} onPress={openDepartmentModal}>
                        <Text style={[selectedDepartments.length > 0 ? styles.selectValue : styles.placeholderText, selectedDepartments.length > 0 && { color: colors.text }]}>
                            {selectedDepartments.length > 0
                                ? `Выбрано отделов: ${selectedDepartments.length}`
                                : 'Выберите отделы'}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color={colors.subtext} />
                    </TouchableOpacity>

                    {/* Список выбранных отделов */}
                    {selectedDepartments.length > 0 && (
                        <View style={styles.selectedDepartmentsContainer}>
                            {selectedDepartments.map((dept) => (
                                <View key={dept.id} style={[styles.selectedDepartmentChip, { backgroundColor: isDark ? colors.primary + '40' : '#e8f5e9' }]}>
                                    <Text style={[styles.selectedDepartmentText, { color: isDark ? colors.roleText : '#2A6E3F' }]}>{dept.name}</Text>
                                    <TouchableOpacity onPress={() => removeDepartment(dept.id)}>
                                        <X size={16} color={isDark ? colors.roleText : "#2A6E3F"} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* ПАРОЛЬ: Показываем только если НЕ режим редактирования */}
                    {!isEditMode && (
                        <View style={[styles.passwordContainer, { backgroundColor: isDark ? colors.card : '#f7f7f7', borderColor: colors.border }]}>
                            <TextInput
                                style={[styles.passwordInput, { color: colors.text }]}
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Пароль *"
                                placeholderTextColor={colors.subtext}
                                secureTextEntry={!isPasswordVisible}
                            />
                            <View style={styles.passwordActions}>
                                <TouchableOpacity onPress={generatePassword} style={styles.iconButton}>
                                    <Ionicons name="refresh-outline" size={20} color={colors.subtext} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={copyPassword} style={styles.iconButton}>
                                    <Ionicons name="copy-outline" size={20} color={colors.subtext} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.iconButton}>
                                    <Ionicons name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} size={20} color={colors.subtext} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Выбор Роли */}
                    <View style={[styles.selectWrapper, { zIndex: 1000 }]}>
                        <TouchableOpacity
                            style={[styles.selectTrigger, { backgroundColor: isDark ? colors.card : '#f7f7f7', borderColor: colors.border }]}
                            onPress={() => setIsRoleSelectOpen(!isRoleSelectOpen)}
                        >
                            <Text style={[!selectedRole ? styles.placeholderText : styles.selectValue, selectedRole && { color: colors.text }]}>
                                {selectedRole || 'Выберите роль *'}
                            </Text>
                            <Ionicons
                                name={isRoleSelectOpen ? "chevron-up" : "chevron-down"}
                                size={20}
                                color={colors.subtext}
                            />
                        </TouchableOpacity>

                        {isRoleSelectOpen && (
                            <View style={[styles.selectDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                {roles.map((role) => (
                                    <TouchableOpacity
                                        key={role}
                                        style={[
                                            styles.selectItem,
                                            { borderBottomColor: colors.divider },
                                            selectedRole === role && [styles.selectItemSelected, { backgroundColor: isDark ? colors.primary + '20' : '#f0f7f0' }]
                                        ]}
                                        onPress={() => {
                                            setSelectedRole(role);
                                            setIsRoleSelectOpen(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.selectItemText,
                                            { color: colors.text },
                                            selectedRole === role && [styles.selectItemTextSelected, { color: colors.primary }]
                                        ]}>
                                            {role}
                                        </Text>
                                        {selectedRole === role && (
                                            <Ionicons name="checkmark" size={18} color={colors.primary} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Выбор Депутата (только для Helper) */}
                    {selectedRole === 'Helper' && (
                        <TouchableOpacity
                            style={[styles.selectTrigger, { backgroundColor: isDark ? colors.card : '#f7f7f7', borderColor: colors.border }]}
                            onPress={() => setDeputyPopupVisible(true)}
                        >
                            <View style={{ flex: 1 }}>
                                <Text
                                    style={[selectedDeputy ? styles.selectValue : styles.placeholderText, selectedDeputy && { color: colors.text }]}
                                    numberOfLines={1}
                                >
                                    {selectedDeputy
                                        ? (selectedDeputy.full_name || selectedDeputy.email)
                                        : 'Привязать к депутату'}
                                </Text>
                            </View>
                            <Ionicons name="chevron-down" size={20} color={colors.subtext} />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={[styles.publishButton, { backgroundColor: colors.primary }, isSubmitting && styles.publishButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.publishButtonText}>
                                {isEditMode ? 'Сохранить изменения' : 'Создать пользователя'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Модальное окно выбора отделов (множественный выбор) */}
            <Modal
                visible={departmentPopupVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setDepartmentPopupVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Выберите отделы</Text>
                            <TouchableOpacity onPress={() => setDepartmentPopupVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={departments}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => {
                                const isSelected = tempSelectedDepartments.some(d => d.id === item.id);
                                return (
                                    <TouchableOpacity
                                        style={[styles.modalDeptItem, { borderBottomColor: colors.divider }, isSelected && [styles.modalDeptItemSelected, { backgroundColor: colors.primary }] ]}
                                        onPress={() => toggleDepartmentSelection(item)}
                                    >
                                        <View style={[styles.modalDeptIcon, { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : (isDark ? colors.primary + '20' : '#f0fdf4') }]}>
                                            <Building2 size={20} color={isSelected ? "#fff" : (isDark ? colors.roleText : "#2A6E3F")} />
                                        </View>
                                        <Text style={[styles.modalDeptName, { color: colors.text }, isSelected && styles.modalDeptNameSelected]}>
                                            {item.name}
                                        </Text>
                                        {isSelected && (
                                            <Ionicons name="checkmark-circle" size={24} color="#fff" />
                                        )}
                                    </TouchableOpacity>
                                );
                            }}
                            style={styles.modalList}
                        />

                        <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
                            <TouchableOpacity
                                style={[styles.modalCancelButton, { backgroundColor: isDark ? colors.iconBox : '#f3f4f6' }]}
                                onPress={() => setDepartmentPopupVisible(false)}
                            >
                                <Text style={[styles.modalCancelText, { color: colors.subtext }]}>Отмена</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalConfirmButton, { backgroundColor: colors.primary }]}
                                onPress={confirmDepartmentSelection}
                            >
                                <Text style={styles.modalConfirmText}>
                                    Подтвердить ({tempSelectedDepartments.length})
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Попап выбора депутата */}
            <SelectionPopup
                visible={deputyPopupVisible}
                title="Выберите депутата"
                onClose={() => setDeputyPopupVisible(false)}
                data={deputies}
                keyExtractor={(item) => item.id}
                onSelect={(deputy) => setSelectedDeputy(deputy)}
                renderItem={(item: Profile) => (
                    <View style={styles.deputyItem}>
                        <View style={styles.deputyAvatar}>
                            <Text style={styles.deputyAvatarText}>
                                {(item.full_name || item.email || "?")[0].toUpperCase()}
                            </Text>
                        </View>
                        <View>
                            <Text style={styles.deputyName}>
                                {item.full_name || (item as any).fullName || item.email}
                            </Text>
                            <Text style={styles.deputyJob}>{item.job_title || 'Депутат'}</Text>
                        </View>
                    </View>
                )}
            />
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flexGrow: 1 },
    header: { flexDirection: 'row', alignItems: 'center', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingBottom: 25, paddingHorizontal: 20 },
    backButton: { marginRight: 15, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: "700", color: "#fff" },
    card: { borderRadius: 16, padding: 20, marginBottom: 20 },
    input: {
        backgroundColor: "#f7f7f7",
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        marginBottom: 14,
        marginTop: 8,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: "#f7f7f7",
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 10,
        paddingHorizontal: 12,
        marginBottom: 14,
        marginTop: 8,
    },
    passwordInput: {
        flex: 1,
        paddingVertical: 10,
        fontSize: 15,
    },
    passwordActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        padding: 6,
        marginLeft: 4,
    },
    placeholderText: { fontSize: 15, color: "#9ca3af", flex: 1 },
    selectValue: { fontSize: 15, color: "#333", flex: 1 },
    publishButton: {
        backgroundColor: "#0f6319",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        borderRadius: 10,
        marginTop: 25,
    },
    publishButtonDisabled: { backgroundColor: "#9ca3af" },
    publishButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    selectWrapper: { marginBottom: 14, position: 'relative' },
    selectTrigger: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#f7f7f7",
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 14,
        marginTop: 8,
    },
    selectDropdown: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        marginTop: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        maxHeight: 200,
    },
    selectItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    selectItemSelected: { backgroundColor: '#f0f7f0' },
    selectItemText: { fontSize: 15, color: '#333' },
    selectItemTextSelected: { color: '#0f6319', fontWeight: '500' },
    inputLabel: { fontSize: 15, color: '#9ca3af' },
    deputyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    deputyAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ebfdeb', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    deputyAvatarText: { color: '#2A6E3F', fontWeight: '700' },
    deputyName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
    deputyJob: { fontSize: 12, color: '#64748b' },
    deptItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9'
    },
    deptIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#f0f9f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    deptName: {
        fontSize: 16,
        color: '#1e293b',
        fontWeight: '500'
    },
    // Новые стили для множественного выбора отделов
    selectedDepartmentsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 14,
        marginTop: -8,
    },
    selectedDepartmentChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e8f5e9',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginRight: 8,
        marginBottom: 8,
    },
    selectedDepartmentText: {
        color: '#2A6E3F',
        fontSize: 14,
        marginRight: 6,
    },
    // Стили для модального окна
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
    },
    modalList: {
        maxHeight: 400,
    },
    modalDeptItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    modalDeptItemSelected: {
        backgroundColor: '#2A6E3F',
    },
    modalDeptIcon: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: '#f0fdf4',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    modalDeptName: {
        flex: 1,
        fontSize: 16,
        color: '#374151',
    },
    modalDeptNameSelected: {
        color: '#fff',
        fontWeight: '500',
    },
    modalFooter: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        gap: 12,
    },
    modalCancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
    },
    modalCancelText: {
        color: '#6b7280',
        fontSize: 16,
        fontWeight: '500',
    },
    modalConfirmButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: '#2A6E3F',
        alignItems: 'center',
    },
    modalConfirmText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default CreateUserScreen;
