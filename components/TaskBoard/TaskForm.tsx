import React, { useState, useEffect } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StatusBar, Text, TextInput, View, StyleSheet } from 'react-native';
import { ScreenHeader } from '@/components/ui/Shared/ScreenHeader';
import { MotionPressable } from '@/components/ui/Shared/Motion';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from "@/components/ui/Shared/DateTimePickerModal";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { router, useLocalSearchParams } from "expo-router";
import { taskService } from '@/api/taskService';
import { formatDateForDisplay } from "@/utils";

import { useTheme } from '@/context/ThemeContext';


const PRIORITY_MAP = [
    { id: 1, label: 'Низкий' },
    { id: 2, label: 'Средний' },
    { id: 3, label: 'Высокий' },
    { id: 4, label: 'Срочный' },
    { id: 5, label: 'Критический' },
];

export function TaskForm() {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams<{ id: string }>();
    const isEditMode = !!id; // Если id есть, значит мы в режиме редактирования

    // Поля формы
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<number | null>(null);
    const [dueDate, setDueDate] = useState<Date | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string>("");

    // Статусы
    const [statuses, setStatuses] = useState<{name: string}[]>([]);

    // Состояния UI
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    const [isStatusSelectOpen, setIsStatusSelectOpen] = useState(false);
    const [isPrioritySelectOpen, setIsPrioritySelectOpen] = useState(false);

    useEffect(() => {
        const initForm = async () => {
            setIsLoading(true);
            try {
                // 1. Сначала всегда грузим список статусов
                const statusesData = await taskService.getStatuses();
                setStatuses(statusesData);

                // 2. Если есть ID, подгружаем данные задачи
                if (isEditMode) {
                    const task = await taskService.getTaskById(id);
                    setTitle(task.title);
                    setDescription(task.description);
                    setPriority(task.priority);
                    setSelectedStatus(task.status);
                    if (task.expected_end_date) {
                        setDueDate(new Date(task.expected_end_date));
                    }
                }
            } catch (e) {
                Toast.show({ type: 'error', text1: 'Ошибка при инициализации формы' });
            } finally {
                setIsLoading(false);
            }
        };

        initForm();
    }, [id]);

    const handleSubmit = async () => {
        if (!title.trim() || !description.trim() || !dueDate || !selectedStatus) {
            Toast.show({ type: 'error', text1: 'Заполните все обязательные поля' });
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                title: title.trim(),
                description: description.trim(),
                expected_end_date: dueDate.toISOString(),
                priority: priority,
                status: selectedStatus,
            };

            if (isEditMode) {
                await taskService.updateTask(id, payload);
                Toast.show({ type: 'success', text1: 'Задача обновлена' });
                router.push({ pathname: '/(screens)/TaskBoardScreen/TaskDetailScreen', params: { id: id } });
            } else {
                const response = await taskService.createTask(payload);
                if (response && response.errors) {
                    const errorMessages = Object.entries(response.errors)
                        .map(([field, errors]) => `${field}: ${(errors as string[]).join(', ')}`)
                        .join('\n');

                    Toast.show({
                        type: 'error',
                        text1: 'Ошибка валидации',
                        text2: errorMessages
                    });
                    return;
                }
                const taskId = response;
                console.log(taskId);
                Toast.show({ type: 'success', text1: 'Задача создана' });
                router.push({ pathname: '/(screens)/TaskBoardScreen/TaskDetailScreen', params: { id: taskId } });
            }
        } catch (error: any) {
            if (error.response?.data?.errors) {
                Toast.show({ type: 'error', text1: error.response?.data?.errors.Title });
            } else {
                Toast.show({ type: 'error', text1: error.message || 'Произошла ошибка' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', backgroundColor: colors.background }]}>
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
            <ScreenHeader title={isEditMode ? 'Редактирование задачи' : 'Новая задача'} onBack={() => router.back()} overlap={false} />
            <ScrollView
                contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 110 }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >


                <View style={styles.card}>
                    <Text style={{ color: colors.subtext, fontSize: 13, fontWeight: '600', marginTop: 12 }}>Название *</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                        value={title}
                        onChangeText={setTitle}
                        accessibilityLabel="Название" placeholder="Название *"
                        placeholderTextColor={colors.subtext}
                    />

                    <Text style={{ color: colors.subtext, fontSize: 13, fontWeight: '600', marginTop: 12 }}>Описание *</Text>
                    <TextInput
                        style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                        multiline
                        numberOfLines={8}
                        value={description}
                        onChangeText={setDescription}
                        accessibilityLabel="Описание" placeholder="Описание *"
                        placeholderTextColor={colors.subtext}
                        textAlignVertical="top"
                    />

                    <MotionPressable style={[styles.unifiedInput, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setDatePickerVisibility(true)}>
                        <Text style={[dueDate ? styles.inputText : styles.placeholderText, dueDate && { color: colors.text }]}>
                            {dueDate ? formatDateForDisplay(dueDate) : "Выберите срок исполнения *"}
                        </Text>
                        <Ionicons name="calendar-outline" size={20} color={colors.subtext} />
                    </MotionPressable>

                    {/* Выбор приоритета */}
                    <View style={[styles.selectWrapper, { zIndex: 900 }]}>
                        <MotionPressable
                            style={[styles.selectTrigger, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={() => {
                                setIsPrioritySelectOpen(!isPrioritySelectOpen);
                                setIsStatusSelectOpen(false);
                            }}
                        >
                            <Text style={[priority === null ? styles.placeholderText : styles.selectValue, priority !== null && { color: colors.text }]}>
                                {priority !== null ? PRIORITY_MAP.find(p => p.id === priority)?.label : 'Приоритет *'}
                            </Text>
                            <Ionicons
                                name={isPrioritySelectOpen ? "chevron-up" : "chevron-down"}
                                size={20}
                                color={colors.subtext}
                            />
                        </MotionPressable>

                        {isPrioritySelectOpen && (
                            <View style={[styles.selectDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                {PRIORITY_MAP.map((item) => (
                                    <MotionPressable
                                        key={item.id}
                                        style={[
                                            styles.selectItem,
                                            { borderBottomColor: colors.divider },
                                            priority === item.id && [styles.selectItemSelected, { backgroundColor: isDark ? colors.primary + '20' : '#f0f7f0' }]
                                        ]}
                                        onPress={() => {
                                            setPriority(item.id);
                                            setIsPrioritySelectOpen(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.selectItemText,
                                            { color: colors.text },
                                            priority === item.id && [styles.selectItemTextSelected, { color: colors.primary }]
                                        ]}>
                                            {item.label}
                                        </Text>
                                        {priority === item.id && (
                                            <Ionicons name="checkmark" size={18} color={colors.primary} />
                                        )}
                                    </MotionPressable>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Выбор статуса */}
                    <View style={[styles.selectWrapper, { zIndex: 800 }]}>
                        <MotionPressable
                            style={[styles.selectTrigger, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={() => {
                                setIsStatusSelectOpen(!isStatusSelectOpen);
                                setIsPrioritySelectOpen(false);
                            }}
                        >
                            <Text style={[!selectedStatus ? styles.placeholderText : styles.selectValue, selectedStatus && { color: colors.text }]}>
                                {selectedStatus || 'Статус *'}
                            </Text>
                            <Ionicons
                                name={isStatusSelectOpen ? "chevron-up" : "chevron-down"}
                                size={20}
                                color={colors.subtext}
                            />
                        </MotionPressable>

                        {isStatusSelectOpen && (
                            <View style={[styles.selectDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                {statuses.map((item) => (
                                    <MotionPressable
                                        key={item.name}
                                        style={[
                                            styles.selectItem,
                                            { borderBottomColor: colors.divider },
                                            selectedStatus === item.name && [styles.selectItemSelected, { backgroundColor: isDark ? colors.primary + '20' : '#f0f7f0' }]
                                        ]}
                                        onPress={() => {
                                            setSelectedStatus(item.name);
                                            setIsStatusSelectOpen(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.selectItemText,
                                            { color: colors.text },
                                            selectedStatus === item.name && [styles.selectItemTextSelected, { color: colors.primary }]
                                        ]}>
                                            {item.name}
                                        </Text>
                                        {selectedStatus === item.name && (
                                            <Ionicons name="checkmark" size={18} color={colors.primary} />
                                        )}
                                    </MotionPressable>
                                ))}
                            </View>
                        )}
                    </View>

                    <MotionPressable
                        style={[styles.publishButton, { backgroundColor: colors.primary }, { backgroundColor: colors.primary }, isSubmitting && styles.publishButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.publishButtonText}>
                                {isEditMode ? 'Сохранить' : 'Создать'}
                            </Text>
                        )}
                    </MotionPressable>
                </View>
            </ScrollView>

            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="datetime"
                onConfirm={(date) => { setDueDate(date); setDatePickerVisibility(false); }}
                onCancel={() => setDatePickerVisibility(false)}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
    },
    header: { flexDirection: 'row', alignItems: 'center', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingBottom: 25, paddingHorizontal: 20 },
    backButton: { marginRight: 15, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#fff",
    },
    card: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
    },
    input: {
        backgroundColor: "#f7f7f7",
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 14,
        fontSize: 15,
        marginBottom: 14,
        marginTop: 8,
    },
    textArea: {
        textAlignVertical: "top",
    },
    unifiedInput: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#f7f7f7",
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 14,
        marginBottom: 14,
        marginTop: 8,
    },
    inputText: {
        fontSize: 15,
        color: "#333",
        flex: 1,
    },
    placeholderText: {
        fontSize: 15,
        color: "#9ca3af",
        flex: 1,
    },
    publishButton: {
        backgroundColor: "#0f6319",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14, // Немного увеличил высоту кнопки
        borderRadius: 12,
        marginTop: 25,
        marginBottom: 32,
    },
    publishButtonDisabled: {
        backgroundColor: "#9ca3af",
    },
    publishButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    // Стили для Select
    selectWrapper: {
        marginBottom: 14,
        marginTop: 8,
        position: 'relative',
    },
    selectTrigger: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#f7f7f7",
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 14,
    },
    selectValue: {
        fontSize: 15,
        color: "#333",
        flex: 1,
    },
    selectDropdown: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 12,
        marginTop: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
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
    selectItemSelected: {
        backgroundColor: '#f0f7f0',
    },
    selectItemText: {
        fontSize: 15,
        color: '#333',
    },
    selectItemTextSelected: {
        color: '#0f6319',
        fontWeight: '500',
    },
});
