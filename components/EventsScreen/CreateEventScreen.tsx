import React, { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
//@ts-ignore
import DateTimePickerModal from "@/components/ui/Shared/DateTimePickerModal";
import { router, useLocalSearchParams } from "expo-router";
import { apiClient } from "@/api/api";
import { AuthManager } from "@/api/auth";
import { ScreenHeader } from '@/components/ui/Shared/ScreenHeader';
import { MotionPressable } from '@/components/ui/Shared/Motion';
import LocationPickerModal from "./LocationPickerModal";
import Toast from "react-native-toast-message";

import { PeoplePickerModal } from "@/components/EventsScreen/PeoplePickerModal";
import { useTheme } from '@/context/ThemeContext';

type User = { id: string; full_name: string; email: string };
type Department = { id: string; name: string };

export function CreateEventScreen() {
    const { colors, isDark } = useTheme();
    const { id } = useLocalSearchParams<{ id: string }>();
    const isEditMode = !!id;

    const isAdmin = AuthManager.getRole() === "Admin";
    const insets = useSafeAreaInsets();
    const scrollViewRef = useRef<ScrollView>(null);

    // Основные поля формы
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [location, setLocation] = useState("");
    const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
    const [startAt, setStartAt] = useState<Date | null>(null);
    const [endAt, setEndAt] = useState<Date | null>(null);
    const [eventType, setEventType] = useState<string>();
    const [isPublic, setIsPublic] = useState(isAdmin);
    const [isPeoplePickerVisible, setPeoplePickerVisible] = useState(false);

    // Списки приглашений
    const [users, setUsers] = useState<User[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>([]);

    // Состояния UI
    const [isStartPickerVisible, setStartPickerVisible] = useState(false);
    const [isEndPickerVisible, setEndPickerVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isDataLoading, setIsDataLoading] = useState(isEditMode); // Загрузка данных для редактирования
    const [isMapModalVisible, setMapModalVisible] = useState(false);

    // Состояния Dropdown'ов
    const [isTypeSelectOpen, setIsTypeSelectOpen] = useState(false);

    const eventTypes = [
        { label: 'Мероприятие', value: 'Event' },
        { label: 'Заседание', value: 'Meeting' },
        { label: 'Комиссия', value: 'Commission' },
    ];

    const selectedType = eventTypes.find(item => item.value === eventType);

    useEffect(() => {
        fetchUsersAndDepartments();
        if (isEditMode) {
            fetchEventData();
        }
    }, [isEditMode]);

    const fetchUsersAndDepartments = async () => {
        const token = AuthManager.getToken();
        if (!token) return;

        try {
            const [depsRes, usersRes] = await Promise.all([
                apiClient.get('/api/Department/get-all', {
                    headers: { accept: "application/json" }
                }),
                apiClient.get('/api/Auth/all', {
                    headers: { accept: "application/json" }
                })
            ]);
            setDepartments(depsRes.data);
            setUsers(usersRes.data);
        } catch (error) {
            console.error("Ошибка загрузки списков:", error);
        }
    };

    // Функция загрузки данных существующего события
    const fetchEventData = async () => {
        const token = AuthManager.getToken();
        if (!token) return;

        try {
            const { data } = await apiClient.get(`/api/Events/${id}`);

            setTitle(data.title || "");
            setDescription(data.description || "");
            setStartAt(new Date(data.start_at));
            setEndAt(new Date(data.end_at));
            setEventType(data.type);
            setIsPublic(data.is_public ?? isAdmin);

            if (data.location) {
                const parts = data.location.split('|');
                setLocation(parts[0]);
                if (parts.length > 1) {
                    const [lat, lon] = parts[1].split(',');
                    setCoords({ lat: parseFloat(lat), lon: parseFloat(lon) });
                }
            }

            if (data.user_ids) setSelectedUserIds(data.user_ids);
            if (data.department_ids) setSelectedDepartmentIds(data.department_ids);
        } catch (error) {
            console.error("Ошибка загрузки события:", error);
            Toast.show({
                type: 'error',
                text1: 'Ошибка',
                text2: 'Не удалось загрузить данные для редактирования',
                position: 'top',
            });
        } finally {
            setIsDataLoading(false);
        }
    };

    const handleLocationSelected = (locationData: { address: string; coords: { lat: number; lon: number } | null }) => {
        setLocation(locationData.address);
        setCoords(locationData.coords);
    };

    const handleStartDateConfirm = (date: Date) => {
        setStartAt(date);
        setStartPickerVisible(false);
    };

    const handleEndDateConfirm = (date: Date) => {
        setEndAt(date);
        setEndPickerVisible(false);
    };

    const handleSave = async () => {
        if (!title.trim() || !startAt || !endAt || !eventType) {
            Toast.show({
                type: 'error',
                text1: 'Ошибка',
                text2: 'Пожалуйста, заполните все обязательные поля',
                position: 'top',
                visibilityTime: 3000,
            });
            return;
        }

        if (endAt.getTime() <= startAt.getTime()) {
            Toast.show({
                type: 'error',
                text1: 'Ошибка',
                text2: 'Дата окончания должна быть позже даты начала',
                position: 'top',
                visibilityTime: 3000,
            });
            return;
        }

        if (!isPublic && selectedUserIds.length === 0 && selectedDepartmentIds.length === 0) {
            Toast.show({
                type: 'error',
                text1: 'Внимание',
                text2: 'Для приватного мероприятия выберите пользователей или отделы',
                position: 'top',
                visibilityTime: 4000,
            });
            return;
        }

        const token = AuthManager.getToken();
        if (!token) {
            Toast.show({
                type: 'error',
                text1: 'Ошибка',
                text2: 'Необходимо авторизоваться',
                position: 'top',
                visibilityTime: 3000,
            });
            return;
        }

        setIsLoading(true);

        try {
            const locationString = coords
                ? `${location.trim()}|${coords.lat},${coords.lon}`
                : location.trim();

            const baseEventData = {
                title: title.trim(),
                description: description.trim(),
                start_at: startAt.toISOString(),
                end_at: endAt.toISOString(),
                location: locationString,
                type: eventType,
            };

            let endpoint: string;
            let method = isEditMode ? "PUT" : "POST";
            let requestBody: any;

            if (isEditMode) {
                endpoint = `/api/Events/${id}`;
                requestBody = {
                    ...baseEventData,
                    is_public: isPublic,
                    user_ids: selectedUserIds,
                    department_ids: selectedDepartmentIds
                };
            } else {
                if (isPublic) {
                    endpoint = `/api/Events/create-public`;
                    requestBody = baseEventData;
                } else {
                    endpoint = `/api/Events/create-private`;
                    requestBody = {
                        ...baseEventData,
                        user_ids: selectedUserIds,
                        department_ids: selectedDepartmentIds
                    };
                }
            }

            console.log("Эндпоинт:", endpoint, "Метод:", method);

            let response;
            if (method === "PUT") {
                response = await apiClient.put(endpoint, requestBody, {
                    headers: {
                        "accept": "application/json",
                        "Content-Type": "application/json",
                    }
                });
            } else {
                response = await apiClient.post(endpoint, requestBody, {
                    headers: {
                        "accept": "application/json",
                        "Content-Type": "application/json",
                    }
                });
            }

            const eventData = response.data;

            let parsedEventData;
            try {
                parsedEventData = eventData;
            } catch {
                parsedEventData = null;
            }

            const newEventId = parsedEventData?.id;

            if (!isEditMode && !newEventId) {
                throw new Error('Не удалось получить ID созданного события');
            }

            Toast.show({
                type: 'success',
                text1: 'Успешно',
                text2: `Событие успешно ${isEditMode ? 'обновлено' : 'создано'}`,
                position: 'top',
                visibilityTime: 3000,
            });

            if (!isEditMode) {
                clearForm();
            }
            if (isEditMode) {
                router.push({
                    pathname: "/(screens)/EventsScreen/EventDetailsScreen",
                    params: { id: id }
                });
            } else {
                router.push({
                    pathname: "/(screens)/EventsScreen/EventDetailsScreen",
                    params: { id: newEventId }
                });
            }

        } catch (error: any) {
            console.error("Полная ошибка:", error);
            Toast.show({
                type: 'error',
                text1: 'Ошибка',
                text2: error.message || 'Произошла ошибка',
                position: 'top',
                visibilityTime: 4000,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const formatDateForDisplay = (date: Date | null) => {
        if (!date) return "";
        return `${date.toLocaleDateString("ru-RU")} ${date.toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
        })}`;
    };

    const clearForm = () => {
        setTitle("");
        setDescription("");
        setLocation("");
        setCoords(null);
        setStartAt(null);
        setEndAt(null);
        setEventType(undefined);
        setIsPublic(isAdmin);
        setSelectedUserIds([]);
        setSelectedDepartmentIds([]);
    };

    // Если данные еще грузятся, показываем лоадер вместо формы
    if (isDataLoading) {
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
            <ScreenHeader title={isEditMode ? 'Редактирование события' : 'Новое событие'} onBack={() => router.back()} overlap={false} />
            <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 110 }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >

                <View style={styles.card}>
                    {!isAdmin && (
                        <View style={[styles.warningAlert, { backgroundColor: isDark ? '#451a03' : '#fef3c7', borderColor: isDark ? '#92400e' : '#fde047' }]}>
                            <Ionicons name="information-circle-outline" size={24} color={isDark ? '#fbbf24' : '#b45309'} style={{ marginTop: 2 }}/>
                            <Text style={[styles.warningText, { color: isDark ? '#fbbf24' : '#b45309' }]}>
                                Вы можете создавать только приватные мероприятия. Обязательно выберите пользователей или отделы для рассылки приглашений.
                            </Text>
                        </View>
                    )}

                    <Text style={{ color: colors.subtext, fontSize: 13, fontWeight: '600', marginTop: 12 }}>Название *</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                        value={title}
                        onChangeText={setTitle}
                        accessibilityLabel="Название" placeholder="Название события"
                        placeholderTextColor={colors.subtext}
                    />

                    <Text style={{ color: colors.subtext, fontSize: 13, fontWeight: '600', marginTop: 12 }}>Описание *</Text>
                    <TextInput
                        style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                        multiline
                        numberOfLines={8}
                        value={description}
                        onChangeText={setDescription}
                        accessibilityLabel="Описание" placeholder="Детали мероприятия"
                        placeholderTextColor={colors.subtext}
                        textAlignVertical="top"
                    />

                    <MotionPressable style={[styles.unifiedInput, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setMapModalVisible(true)}>
                        <Text style={[location ? styles.inputText : styles.placeholderText, location && { color: colors.text }]}>
                            {location ? location : "Выберите адрес на карте *"}
                        </Text>
                        <Ionicons name="map-outline" size={22} color={colors.subtext} />
                    </MotionPressable>

                    <MotionPressable style={[styles.unifiedInput, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setStartPickerVisible(true)}>
                        <Text style={[startAt ? styles.inputText : styles.placeholderText, startAt && { color: colors.text }]}>
                            {startAt ? formatDateForDisplay(startAt) : "Выберите дату и время начала *"}
                        </Text>
                        <Ionicons name="calendar-outline" size={20} color={colors.subtext} />
                    </MotionPressable>

                    <MotionPressable style={[styles.unifiedInput, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setEndPickerVisible(true)}>
                        <Text style={[endAt ? styles.inputText : styles.placeholderText, endAt && { color: colors.text }]}>
                            {endAt ? formatDateForDisplay(endAt) : "Выберите дату и время окончания *"}
                        </Text>
                        <Ionicons name="calendar-outline" size={20} color={colors.subtext} />
                    </MotionPressable>

                    <View style={styles.selectWrapper}>
                        <MotionPressable
                            style={[styles.selectTrigger, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={() => setIsTypeSelectOpen(!isTypeSelectOpen)}
                        >
                            <Text style={[!eventType ? styles.placeholderText : styles.selectValue, eventType && { color: colors.text }]}>
                                {selectedType?.label || 'Тип *'}
                            </Text>
                            <Ionicons
                                name={isTypeSelectOpen ? "chevron-up" : "chevron-down"}
                                size={20}
                                color={colors.subtext}
                            />
                        </MotionPressable>

                        {isTypeSelectOpen && (
                            <View style={[styles.selectDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                {eventTypes.map((item) => (
                                    <MotionPressable
                                        key={item.value}
                                        style={[
                                            styles.selectItem,
                                            { borderBottomColor: colors.divider },
                                            eventType === item.value && [styles.selectItemSelected, { backgroundColor: isDark ? colors.primary + '20' : '#f0f7f0' }]
                                        ]}
                                        onPress={() => {
                                            setEventType(item.value);
                                            setIsTypeSelectOpen(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.selectItemText,
                                            { color: colors.text },
                                            eventType === item.value && [styles.selectItemTextSelected, { color: colors.primary }]
                                        ]}>
                                            {item.label}
                                        </Text>
                                        {eventType === item.value && (
                                            <Ionicons name="checkmark" size={18} color={colors.primary} />
                                        )}
                                    </MotionPressable>
                                ))}
                            </View>
                        )}
                    </View>

                    {isAdmin && (
                        <MotionPressable
                            accessibilityRole="checkbox" accessibilityLabel="Публичное мероприятие" accessibilityState={{ checked: isPublic }} style={[styles.checkboxContainer, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={() => {
                                setIsPublic(!isPublic);
                                if (!isPublic) {
                                    setSelectedUserIds([]);
                                    setSelectedDepartmentIds([]);
                                }
                            }}
                        >
                            <Text style={[styles.checkboxLabel, { color: colors.text }]}>Публичное мероприятие</Text>
                            <View style={[styles.checkbox, { borderColor: colors.subtext }, isPublic && [styles.checkboxChecked, { backgroundColor: colors.primary, borderColor: colors.primary }] ]}>
                                {isPublic && <Ionicons name="checkmark" size={18} color="#fff" />}
                            </View>
                        </MotionPressable>
                    )}

                    {(!isPublic || !isAdmin) && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>
                                {!isAdmin && !isPublic ? "Приглашения *" : "Приглашения"}
                            </Text>
                            <MotionPressable
                                style={[styles.inviteButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                                onPress={() => setPeoplePickerVisible(true)}
                            >
                                <View style={styles.inviteButtonContent}>
                                    <Ionicons name="people-outline" size={24} color={isDark ? colors.roleText : "#0f6319"} />
                                    <View>
                                        <Text style={[styles.inviteButtonTitle, { color: colors.text }]}>Выбрать участников</Text>
                                        <Text style={[styles.inviteButtonSubtitle, { color: colors.subtext }]}>
                                            {selectedUserIds.length + selectedDepartmentIds.length > 0
                                                ? `Выбрано: ${selectedUserIds.length} пользователей, ${selectedDepartmentIds.length} отделов`
                                                : "Нажмите для выбора пользователей и отделов"}
                                        </Text>
                                    </View>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
                            </MotionPressable>
                        </View>
                    )}

                    <MotionPressable
                        style={[styles.publishButton, { backgroundColor: colors.primary }, { backgroundColor: colors.primary }, isLoading && styles.publishButtonDisabled]}
                        onPress={handleSave}
                        disabled={isLoading}
                    >
                        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.publishButtonText}>{isEditMode ? "Сохранить изменения" : "Создать"}</Text>}
                    </MotionPressable>
                </View>
            </ScrollView>

            <DateTimePickerModal
                isVisible={isStartPickerVisible}
                mode="datetime"
                onConfirm={handleStartDateConfirm}
                onCancel={() => setStartPickerVisible(false)}
            />
            <DateTimePickerModal
                isVisible={isEndPickerVisible}
                mode="datetime"
                onConfirm={handleEndDateConfirm}
                onCancel={() => setEndPickerVisible(false)}
            />

            <LocationPickerModal
                visible={isMapModalVisible}
                onClose={() => setMapModalVisible(false)}
                onLocationSelected={handleLocationSelected}
                initialLocation={location}
                initialCoords={coords}
            />

            <PeoplePickerModal
                visible={isPeoplePickerVisible}
                onClose={() => setPeoplePickerVisible(false)}
                users={users}
                departments={departments}
                selectedUserIds={selectedUserIds}
                selectedDepartmentIds={selectedDepartmentIds}
                onConfirm={(userIds, departmentIds) => {
                    setSelectedUserIds(userIds);
                    setSelectedDepartmentIds(departmentIds);
                }}
                mode="both"
            />
        </KeyboardAvoidingView>
    );
}

// ...оставляем стили без изменений
const styles = StyleSheet.create({
    container: { flexGrow: 1 },
    header: { flexDirection: 'row', alignItems: 'center', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingBottom: 25, paddingHorizontal: 20 },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    headerTitle: { fontSize: 20, fontWeight: "700", color: "#fff" },
    card: { borderRadius: 16, padding: 20, marginBottom: 20 },
    warningAlert: { flexDirection: 'row', backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fde047', borderRadius: 12, padding: 12, marginBottom: 6, marginTop: -36 },
    warningText: { flex: 1, color: '#b45309', fontSize: 14, marginLeft: 8, lineHeight: 20 },
    input: { backgroundColor: "#f7f7f7", borderWidth: 1, borderColor: "#ddd", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 14, fontSize: 15, marginBottom: 14, marginTop: 8 },
    textArea: { textAlignVertical: "top", minHeight: 100 },
    unifiedInput: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#f7f7f7", borderWidth: 1, borderColor: "#ddd", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 14, marginBottom: 14, marginTop: 8 },
    inputText: { fontSize: 15, color: "#333", flex: 1 },
    placeholderText: { fontSize: 15, color: "#9ca3af", flex: 1 },
    publishButton: { backgroundColor: "#0f6319", flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 12, marginTop: 25 },
    publishButtonDisabled: { backgroundColor: "#9ca3af" },
    publishButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    selectWrapper: { marginBottom: 14, marginTop: 8, position: 'relative', zIndex: 1000 },
    selectTrigger: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#f7f7f7", borderWidth: 1, borderColor: "#ddd", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 14 },
    selectValue: { fontSize: 15, color: "#333", flex: 1 },
    selectDropdown: { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 12, marginTop: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, zIndex: 1001 },
    selectItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    selectItemSelected: { backgroundColor: '#f0f7f0' },
    selectItemText: { fontSize: 15, color: '#333' },
    selectItemTextSelected: { color: '#0f6319', fontWeight: '500' },
    checkboxContainer: { backgroundColor: "#f7f7f7", borderWidth: 1, borderColor: "#ddd", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 14, marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1, borderColor: '#6b7280', justifyContent: 'center', alignItems: 'center' },
    checkboxChecked: { backgroundColor: '#0f6319', borderColor: '#0f6319' },
    checkboxLabel: { fontSize: 15, color: '#333' },
    section: { marginBottom: 16, marginTop: 8 },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 },
    inviteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f7f7f7', borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 12 },
    inviteButtonContent: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    inviteButtonTitle: { fontSize: 15, fontWeight: '500', color: '#333' },
    inviteButtonSubtitle: { fontSize: 11, color: '#6b7280', marginTop: 2 },
});
