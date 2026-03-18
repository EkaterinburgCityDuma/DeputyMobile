import React, { useState, useEffect } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import {router, useLocalSearchParams} from "expo-router";
import { taskService } from '@/api/taskService';
import {formatDateForDisplay} from "@/utils";

const PRIORITY_MAP = [
    { id: 1, label: 'Низкий' },
    { id: 2, label: 'Средний' },
    { id: 3, label: 'Высокий' },
    { id: 4, label: 'Срочный' },
    { id: 5, label: 'Критический' },
];

export function TaskForm() {
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
                router.push({ pathname: '/(forms)/TaskDetailScreen', params: { id: id } });
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
                router.push({ pathname: '/(forms)/TaskDetailScreen', params: { id: taskId } });
            }
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Ошибка при сохранении' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', backgroundColor: '#fff' }]}>
                <ActivityIndicator size="large" color="#2A6E3F" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: '#fff' }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <ScrollView
                contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 20 }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <LinearGradient
                    colors={['#2A6E3F', '#349339']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.header, { paddingTop: insets.top + 20 }]}
                >
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    {/* Меняем заголовок в зависимости от режима */}
                    <Text style={styles.headerTitle}>
                        {isEditMode ? 'Редактирование' : 'Новая задача'}
                    </Text>
                </LinearGradient>

                <View style={styles.card}>
                    <TextInput
                        style={styles.input}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Название *"
                        placeholderTextColor="#999"
                    />

                    <TextInput
                        style={[styles.input, styles.textArea]}
                        multiline
                        numberOfLines={8}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Описание *"
                        placeholderTextColor="#999"
                        textAlignVertical="top"
                    />

                    <TouchableOpacity style={styles.unifiedInput} onPress={() => setDatePickerVisibility(true)}>
                        <Text style={dueDate ? styles.inputText : styles.placeholderText}>
                            {dueDate ? formatDateForDisplay(dueDate) : "Выберите срок исполнения *"}
                        </Text>
                    </TouchableOpacity>

                    {/* Выбор статуса */}
                    <View style={[styles.selectWrapper, { zIndex: 1000 }]}>
                        <TouchableOpacity
                            style={styles.selectTrigger}
                            onPress={() => {
                                setIsStatusSelectOpen(!isStatusSelectOpen);
                                setIsPrioritySelectOpen(false);
                            }}
                        >
                            <Text style={!selectedStatus ? styles.placeholderText : styles.selectValue}>
                                {selectedStatus || 'Статус *'}
                            </Text>
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
                                            selectedStatus === item.name && styles.selectItemSelected
                                        ]}
                                        onPress={() => {
                                            setSelectedStatus(item.name);
                                            setIsStatusSelectOpen(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.selectItemText,
                                            selectedStatus === item.name && styles.selectItemTextSelected
                                        ]}>
                                            {item.name}
                                        </Text>
                                        {selectedStatus === item.name && (
                                            <Ionicons name="checkmark" size={18} color="#0f6319" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Выбор приоритета */}
                    <View style={[styles.selectWrapper, { zIndex: 900 }]}>
                        <TouchableOpacity
                            style={styles.selectTrigger}
                            onPress={() => {
                                setIsPrioritySelectOpen(!isPrioritySelectOpen);
                                setIsStatusSelectOpen(false);
                            }}
                        >
                            <Text style={priority === null ? styles.placeholderText : styles.selectValue}>
                                {priority !== null ? PRIORITY_MAP.find(p => p.id === priority)?.label : 'Приоритет *'}
                            </Text>
                            <Ionicons
                                name={isPrioritySelectOpen ? "chevron-up" : "chevron-down"}
                                size={20}
                                color="#6b7280"
                            />
                        </TouchableOpacity>

                        {isPrioritySelectOpen && (
                            <View style={styles.selectDropdown}>
                                {PRIORITY_MAP.map((item) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={[
                                            styles.selectItem,
                                            priority === item.id && styles.selectItemSelected
                                        ]}
                                        onPress={() => {
                                            setPriority(item.id);
                                            setIsPrioritySelectOpen(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.selectItemText,
                                            priority === item.id && styles.selectItemTextSelected
                                        ]}>
                                            {item.label}
                                        </Text>
                                        {priority === item.id && (
                                            <Ionicons name="checkmark" size={18} color="#0f6319" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[styles.publishButton, isSubmitting && styles.publishButtonDisabled]}
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
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <DateTimePickerModal

                isVisible={isDatePickerVisible}

                mode="datetime"

                onConfirm={(date) => { setDueDate(date); setDatePickerVisibility(false); }}

                onCancel={() => setDatePickerVisibility(false)}

                locale="ru-RU"

                confirmTextIOS="Выбрать"

                cancelTextIOS="Отмена"

            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        paddingBottom: 20,
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
    },
    backButton: {
        marginRight: 10,
        padding: 4,
    },
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
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
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
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
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
        borderRadius: 10,
        marginTop: 25,
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
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
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
        borderRadius: 10,
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
