import { taskService } from '@/api/taskService';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Calendar, ChevronRight } from 'lucide-react-native';
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
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { styles } from './task-form-style';

type RootStackParamList = {
    TaskForm: { id?: string };
};

// Определяем 5 уровней приоритета согласно вашему API (1-5)
const PRIORITY_MAP = [
    { id: 1, label: 'Низкий' },
    { id: 2, label: 'Средний' },
    { id: 3, label: 'Высокий' },
    { id: 4, label: 'Срочный' },
    { id: 5, label: 'Критический' },
];

export function TaskForm() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    // Поля формы
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<number>(2); // По умолчанию "Средний" (2)
    const [dueDate, setDueDate] = useState<Date | null>(null);

    // Статусы из API
    const [statuses, setStatuses] = useState<{name: string}[]>([]);
    const [selectedStatus, setSelectedStatus] = useState<string>('');

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

    useEffect(() => {
        loadStatuses();
    }, []);

    const loadStatuses = async () => {
        try {
            const data = await taskService.getStatuses();
            setStatuses(data);
            // Если есть статус "создана", выбираем его по умолчанию
            const initial = data.find(s => s.name.toLowerCase() === 'создана') || data[0];
            if (initial) setSelectedStatus(initial.name);
        } catch (e) {
            Toast.show({ type: 'error', text1: 'Ошибка загрузки статусов' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!title.trim() || !description.trim() || !dueDate || !selectedStatus) {
            Toast.show({ type: 'error', text1: 'Заполните все поля' });
            return;
        }

        setIsSubmitting(true);
        try {
            // Формируем payload точно по вашему образцу CURL
            const payload = {
                title: title.trim(),
                description: description.trim(),
                startDate: new Date().toISOString(),
                expectedEndDate: dueDate.toISOString(),
                priority: priority, // Число 1-5
                status: selectedStatus, // Строка
            };

            await taskService.createTask(payload);
            Toast.show({ type: 'success', text1: 'Задача создана' });
            navigation.goBack();
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Ошибка при сохранении' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color="#2A6E3F" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Новая задача</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingBottom: insets.bottom + 20 } // Динамический отступ снизу
                    ]}
                >
                    <Text style={styles.sectionLabel}>Информация</Text>
                    <View style={styles.inputGroup}>
                        <TextInput
                            style={styles.minimalInput}
                            value={title}
                            onChangeText={setTitle}
                            placeholder="Введите название"
                            placeholderTextColor="#9CA3AF"
                        />
                        <View style={styles.divider} />
                        <TextInput
                            style={[styles.minimalInput, styles.textArea]}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Введите описание"
                            placeholderTextColor="#9CA3AF"
                            multiline
                        />
                    </View>

                    <Text style={styles.sectionLabel}>Срок исполнения</Text>
                    <TouchableOpacity
                        style={styles.listAction}
                        onPress={() => setDatePickerVisibility(true)}
                    >
                        <View style={styles.listActionContent}>
                            <Calendar size={20} color="#6B7280" />
                            <Text style={[styles.listActionText, !dueDate && { color: '#9CA3AF' }]}>
                                {dueDate
                                    ? dueDate.toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
                                    : 'Укажите дату и время'}
                            </Text>
                        </View>
                        <ChevronRight size={20} color="#D1D5DB" />
                    </TouchableOpacity>

                    <Text style={styles.sectionLabel}>Статус</Text>
                    <View style={styles.chipContainer}>
                        {statuses.map((s) => (
                            <TouchableOpacity
                                key={s.name}
                                onPress={() => setSelectedStatus(s.name)}
                                style={[styles.chip, selectedStatus === s.name && styles.chipActive]}
                            >
                                <Text style={[styles.chipText, selectedStatus === s.name && styles.chipTextActive]}>
                                    {s.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.sectionLabel}>Приоритет (1-5)</Text>
                    <View style={styles.chipContainer}>
                        {PRIORITY_MAP.map((p) => (
                            <TouchableOpacity
                                key={p.id}
                                onPress={() => setPriority(p.id)}
                                style={[styles.chip, priority === p.id && styles.chipActive]}
                            >
                                <Text style={[styles.chipText, priority === p.id && styles.chipTextActive]}>
                                    {p.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Кнопки теперь в общем потоке ScrollView */}
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.primaryButton, isSubmitting && { opacity: 0.7 }]}
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Создать задачу</Text>}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={styles.secondaryButtonText}>Отмена</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="datetime"
                onConfirm={(date) => { setDueDate(date); setDatePickerVisibility(false); }}
                onCancel={() => setDatePickerVisibility(false)}
                locale="ru-RU"
                confirmTextIOS="Выбрать"
                cancelTextIOS="Отмена"
            />
        </View>
    );
}
