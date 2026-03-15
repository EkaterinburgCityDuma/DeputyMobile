import React, { useCallback, useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, Linking,
    Platform, Alert
} from 'react-native';
import { useLocalSearchParams, router } from "expo-router";
import { AuthTokenManager } from "@/components/LoginScreen/LoginScreen";
import { apiUrl } from "@/api/api";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Yamap, Marker } from 'react-native-yamap-plus';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, FileText, Download, CheckCircle2, XCircle, HelpCircle } from "lucide-react-native";
import { EventAttachmentUploader } from "@/components/EventsScreen/EventAttachmentUploader";
import { EventAttendanceModal } from "@/components/EventsScreen/EventAttendanceModal";
import { downloadAsync, documentDirectory, cacheDirectory } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Toast from "react-native-toast-message";

// Обновленные интерфейсы под новую структуру данных
interface Attachment {
    id: string;
    document_id: string;
    file_name: string;
    url: string;
    description: string | null;
}

interface Attendee {
    user_id: string;
    user_full_name: string;
    status: 'Yes' | 'No' | 'Maybe' | string;
    excuse_document_id: string | null;
    excuse_note: string | null;
}

interface EventData {
    id: string;
    title: string;
    type: string;
    description: string;
    start_at: string;
    end_at: string;
    location: string;
    is_public: boolean;
    organizer?: string;
    created_at?: string;
    attachments: Attachment[];
    attendees: Attendee[];
}

const EventDetailsScreen: React.FC = () => {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [loading, setLoading] = useState(true);
    const [event, setEvent] = useState<EventData | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const insets = useSafeAreaInsets();
    const [showUploader, setShowUploader] = useState(false);
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);

    const loadEvent = useCallback(async (isRefresh = false) => {
        try {
            const token = AuthTokenManager.getToken();

            const response = await fetch(`${apiUrl}/api/Events/${id}`, {
                headers: {
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`
                },
            });

            if (!response.ok) {
                throw new Error('Ошибка загрузки события');
            }

            const data: EventData = await response.json();
            setEvent(data);
        } catch (e) {
            console.error('Ошибка при загрузке события:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id]);

    useEffect(() => {
        loadEvent();
    }, [loadEvent]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadEvent(true);
    }, [loadEvent]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0f6319" />
                <Text style={styles.loadingText}>Загрузка события...</Text>
            </View>
        );
    }

    if (!event) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={64} color="#dc2626" />
                <Text style={styles.errorText}>Событие не найдено</Text>
                <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
                    <Text style={styles.errorButtonText}>Вернуться назад</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const parseLocation = (locationString: string) => {
        if (!locationString) return { address: '', coordinates: null };
        const parts = locationString.split('|');
        if (parts.length === 2) {
            const [address, coords] = parts;
            const [lat, lon] = coords.split(',').map(Number);
            return { address: address.trim(), coordinates: { lat, lon } };
        }
        return { address: locationString, coordinates: null };
    };

    const location = parseLocation(event.location);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return {
            time: date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            day: date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
        };
    };

    const startDate = formatDate(event.start_at);
    const endDate = formatDate(event.end_at);

    const getEventTypeLabel = (type: string) => {
        const types: Record<string, string> = {
            Event: 'Мероприятие',
            Meeting: 'Заседание',
            Commission: 'Комиссия'
        };
        return types[type] || type;
    };

    const openMaps = () => {
        if (location.coordinates) {
            const { lat, lon } = location.coordinates;
            const url = Platform.select({
                ios: `maps://app?daddr=${lat},${lon}`,
                android: `google.navigation:q=${lat},${lon}`,
            });
            if (url) Linking.openURL(url);
        } else {
            const encodedAddress = encodeURIComponent(location.address);
            const url = Platform.select({
                ios: `maps://app?q=${encodedAddress}`,
                android: `geo:0,0?q=${encodedAddress}`,
            });
            if (url) Linking.openURL(url);
        }
    };

    const handleDownloadFile = async (fileName: string, serverUrl: string) => {
        try {
            if (!serverUrl) return;

            const token = AuthTokenManager.getToken();
            const fileExtension = serverUrl.split('.').pop() || 'dat';
            const localFileName = fileName.includes('.') ? fileName : `${fileName}.${fileExtension}`;

            const baseDir = documentDirectory || cacheDirectory;
            if (!baseDir) throw new Error("Директория недоступна");

            const fileUri = baseDir.endsWith('/')
                ? `${baseDir}${localFileName}`
                : `${baseDir}/${localFileName}`;

            const downloadUrl = `${apiUrl}/api/files/${encodeURIComponent(fileName)}`;
            // Показываем предварительный тост, что загрузка началась (опционально)
            Toast.show({
                type: 'info',
                text1: 'Загрузка...',
                text2: `Файл ${localFileName} скачивается`,
                position: 'top'
            });

            const downloadResult = await downloadAsync(
                downloadUrl,
                fileUri,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            if (downloadResult.status === 200) {
                // 1. Показываем Toast об успехе с путем к файлу
                Toast.show({
                    type: 'success',
                    text1: 'Файл успешно загружен',
                    text2: `Путь: ${localFileName}`, // Весь путь слишком длинный, лучше показать имя
                    position: 'top',
                    visibilityTime: 4000,
                });

                // 2. Открываем файл
                if (await Sharing.isAvailableAsync()) {
                    // Для Android важно указать mimeType, если сервер его прислал
                    await Sharing.shareAsync(downloadResult.uri, {
                        mimeType: downloadResult.headers['content-type'] || undefined,
                        dialogTitle: 'Открыть файл',
                    });
                } else {
                    Alert.alert('Загружено', `Файл сохранен по пути: ${downloadResult.uri}`);
                }
            } else {
                throw new Error(`Сервер вернул ${downloadResult.status}`);
            }
        } catch (error) {
            console.error('Ошибка:', error);
            Toast.show({
                type: 'error',
                text1: 'Ошибка загрузки',
                text2: 'Не удалось сохранить файл в память',
                position: 'bottom'
            });
        }
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Yes': return <CheckCircle2 size={18} color="#0f6319" />;
            case 'No': return <XCircle size={18} color="#dc2626" />;
            default: return <HelpCircle size={18} color="#6b7280" />;
        }
    };

    return (
        <>
            <ScrollView
                style={[styles.container, { backgroundColor: '#f8fafc' }]}
                contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
            >
                <LinearGradient
                    colors={['#2A6E3F', '#349339']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.header, { paddingTop: insets.top + 15 }]}
                >
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <ArrowLeft size={24} color="white" />
                    </TouchableOpacity>
                    <View style={styles.headerContent}>
                        <Text style={styles.headerTitle} numberOfLines={2}>{event.title}</Text>
                        <Text style={styles.headerSubtitle}>{getEventTypeLabel(event.type)}</Text>
                    </View>
                </LinearGradient>

                <View style={styles.content}>
                    {/* Время */}
                    <View style={styles.card}>
                        <View style={styles.timeRow}>
                            <View style={styles.timeContent}>
                                <Text style={styles.label}>Начало</Text>
                                <Text style={styles.value}>{startDate.day}, {startDate.time}</Text>
                            </View>
                            <View style={styles.timeDividerVertical} />
                            <View style={styles.timeContent}>
                                <Text style={styles.label}>Окончание</Text>
                                <Text style={styles.value}>{endDate.day}, {endDate.time}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Карта */}
                    {location.coordinates && (
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Место проведения</Text>
                            <Text style={styles.addressText}>{location.address}</Text>
                            <TouchableOpacity onPress={openMaps} activeOpacity={0.9}>
                                <View style={styles.mapContainer}>
                                    <Yamap
                                        style={styles.map}
                                        initialRegion={{
                                            lat: location.coordinates.lat,
                                            lon: location.coordinates.lon,
                                            zoom: 14,
                                            azimuth: 0,
                                            tilt: 0
                                        }}
                                        interactiveDisabled={true}
                                    >
                                        <Marker point={{ lat: location.coordinates.lat, lon: location.coordinates.lon }} />
                                    </Yamap>
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Описание */}
                    {event.description && (
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>О событии</Text>
                            <Text style={styles.description}>{event.description}</Text>
                        </View>
                    )}

                    {/* Прикрепленные документы */}
                    {event.attachments && event.attachments.length > 0 && (
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Материалы</Text>
                            {event.attachments.map((file) => (
                                <TouchableOpacity
                                    key={file.id}
                                    style={styles.fileRow}
                                    onPress={() => handleDownloadFile(file.file_name, file.url)}
                                >
                                    <View style={styles.fileIconContainer}>
                                        <FileText size={20} color="#0f6319" />
                                    </View>
                                    <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
                                        {file.file_name}
                                    </Text>
                                    <Download size={20} color="#6b7280" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Участники */}
                    {event.attendees && event.attendees.length > 0 && (
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Участники ({event.attendees.length})</Text>
                            {event.attendees.map((attendee) => (
                                <View key={attendee.user_id} style={styles.attendeeRow}>
                                    <View style={styles.avatar}>
                                        <Text style={styles.avatarText}>{getInitials(attendee.user_full_name)}</Text>
                                    </View>
                                    <View style={styles.attendeeInfo}>
                                        <Text style={styles.attendeeName}>{attendee.user_full_name}</Text>
                                        <View style={styles.statusBadge}>
                                            {getStatusIcon(attendee.status)}
                                            <Text style={styles.statusText}>
                                                {attendee.status === 'Yes' ? 'Подтвердил' : attendee.status === 'No' ? 'Отклонил' : 'Под вопросом'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Дополнительная информация */}
                    <View style={styles.metaCard}>
                        <View style={styles.metaRow}>
                            <Ionicons name="lock-open-outline" size={18} color="#6b7280" />
                            <Text style={styles.metaLabel}>
                                {event.is_public ? 'Публичное событие' : 'Приватное событие'}
                            </Text>
                        </View>
                    </View>

                    {/* Кнопки управления */}
                    <View style={styles.actionGroup}>
                        <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowUploader(true)}>
                            <FileText size={20} color="#0f6319" />
                            <Text style={styles.secondaryButtonText}>Прикрепить файл</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowAttendanceModal(true)}>
                            <CheckCircle2 size={20} color="#0f6319" />
                            <Text style={styles.secondaryButtonText}>Отметить участие</Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </ScrollView>

            <EventAttachmentUploader
                eventId={id}
                visible={showUploader}
                onClose={() => setShowUploader(false)}
                onSuccess={loadEvent}
            />
            <EventAttendanceModal
                eventId={id}
                visible={showAttendanceModal}
                onClose={() => setShowAttendanceModal(false)}
                onSuccess={loadEvent}
            />
        </>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
    loadingText: { marginTop: 12, fontSize: 16, color: '#6b7280' },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', paddingHorizontal: 24 },
    errorText: { marginTop: 16, fontSize: 18, color: '#1e293b', textAlign: 'center' },
    errorButton: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#0f6319', borderRadius: 8 },
    errorButtonText: { color: '#fff', fontSize: 16 },
    header: { flexDirection: 'row', alignItems: 'center', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingBottom: 40, paddingHorizontal: 20 },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    headerContent: { flex: 1 },
    headerTitle: { fontSize: 20, fontWeight: '600', color: '#FFFFFF' },
    headerSubtitle: { fontSize: 13, color: 'rgba(255, 255, 255, 0.8)', marginTop: 2 },
    content: { padding: 16, marginTop: -30 },
    card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b', marginBottom: 12 },
    timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    timeContent: { flex: 1 },
    timeDividerVertical: { width: 1, height: '100%', backgroundColor: '#e5e7eb', marginHorizontal: 16 },
    label: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
    value: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
    addressText: { fontSize: 14, color: '#4b5563', marginBottom: 12 },
    mapContainer: { borderRadius: 12, overflow: 'hidden', height: 160 },
    map: { width: '100%', height: '100%' },
    description: { fontSize: 15, color: '#4b5563', lineHeight: 22 },

    // Стили файлов
    fileRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, marginBottom: 8 },
    fileIconContainer: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    fileName: { flex: 1, fontSize: 14, color: '#1e293b', marginRight: 12 },

    // Стили участников
    attendeeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarText: { fontSize: 14, fontWeight: '600', color: '#475569' },
    attendeeInfo: { flex: 1 },
    attendeeName: { fontSize: 15, fontWeight: '500', color: '#1e293b', marginBottom: 4 },
    statusBadge: { flexDirection: 'row', alignItems: 'center' },
    statusText: { fontSize: 13, color: '#64748b', marginLeft: 6 },

    metaCard: { backgroundColor: '#f9fafb', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb' },
    metaRow: { flexDirection: 'row', alignItems: 'center' },
    metaLabel: { fontSize: 14, color: '#6b7280', marginLeft: 10 },

    actionGroup: { gap: 12, marginBottom: 20 },
    secondaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
    secondaryButtonText: { fontSize: 15, fontWeight: '600', color: '#0f6319', marginLeft: 8 },
});

export default EventDetailsScreen;
