import React, { useCallback, useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, Alert, Platform, Image, Share
} from 'react-native';
import { useLocalSearchParams, useRouter } from "expo-router";
import { AuthManager } from "@/api/auth";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, FileText, Download, CheckCircle2, XCircle, HelpCircle, X, Edit, Trash2, Megaphone } from "lucide-react-native";
import { EventAttachmentUploader } from "@/components/EventsScreen/EventAttachmentUploader";
import { EventAttendanceModal } from "@/components/EventsScreen/EventAttendanceModal";
import { useFileManagerPresenter } from "@/components/FileManagerScreen/FileManagerPresenter";
import { formatDateTime } from "@/utils";
import { AttendeeExcuseModal } from "@/components/EventsScreen/AttendeeExcuseModal";
import Toast from "react-native-toast-message";
// @ts-ignore
import { EventMap } from "@/components/ui/EventMap/EventMap";
import {showLocation} from "react-native-map-link";
import {apiClient, apiUrl} from '@/api/api';
import {xAppSecret} from "@/api/auth";
import {ImagePreviewModal} from "@/components/EventsScreen/ImagePreviewModal";
import { useTheme } from '@/context/ThemeContext';


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
    excuse_document_name: string | null;
    excuse_note: string | null;
}

interface EventData {
    id: string;
    author_id: string;
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

import { useFileManagerStore } from '@/store/useFileManagerStore';

interface AttachmentItemProps {
    file: Attachment;
    onImagePress: (file: Attachment) => void;
}

const AttachmentItem: React.FC<AttachmentItemProps> = ({ file, onImagePress }) => {
    const { colors, isDark } = useTheme();
    const { downloadedFiles } = useFileManagerStore();
    const isDownloaded = downloadedFiles.includes(file.document_id || file.id);

    const [downloadProgress, setDownloadProgress] = useState(0);
    const [isDownloading, setIsDownloading] = useState(false);
    const { handlers } = useFileManagerPresenter();
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.file_name);

    const handleDownload = React.useCallback(() => {
        // Приводим объект вложения к формату документа для корректной работы загрузки и кэширования
        const docCompatible = {
            id: file.document_id || file.id,
            file_name: file.file_name,
            content_type: file.file_name.split('.').pop() || 'dat',
            ...file
        };
        // @ts-ignore
        handlers.handleDownloadDocument(docCompatible);
    }, [handlers, file]);

    return (
        <View style={styles.attachmentContainer}>
            {isImage ? (
                <TouchableOpacity
                    style={[styles.imagePreviewContainer, { backgroundColor: isDark ? colors.iconBox : '#f1f5f9' }]}
                    onPress={() => onImagePress(file)}
                >
                    <ImagePreviewThumbnail file={file} />
                    <View style={styles.imagePreviewOverlay}>
                        <Text style={styles.imagePreviewName} numberOfLines={1}>
                            {file.file_name}
                        </Text>
                    </View>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity
                    style={[styles.fileRow, { backgroundColor: isDark ? colors.iconBox : '#f8fafc' }, isDownloading && styles.fileRowDownloading]}
                    onPress={handleDownload}
                    disabled={isDownloading}
                >
                    <View style={[styles.fileIconContainer, { backgroundColor: isDark ? colors.primary + '20' : '#eef2ff' }]}>
                        <FileText size={20} color={isDark ? colors.roleText : "#0f6319"} />
                    </View>
                    <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1} ellipsizeMode="middle">
                        {file.file_name}
                    </Text>
                    {isDownloaded && !isDownloading && (
                        <CheckCircle2 size={16} color={colors.primary} style={{ marginRight: 8 }} />
                    )}
                    {isDownloading ? (
                        <Text style={[styles.progressText, { color: colors.primary }]}>
                            {Math.round(downloadProgress * 100)}%
                        </Text>
                    ) : (
                        <Download size={20} color={colors.subtext} />
                    )}
                </TouchableOpacity>
            )}

            {isDownloading && (
                <View style={[styles.progressBarBackground, { backgroundColor: colors.border }]}>
                    <View style={[styles.progressBarFill, { backgroundColor: colors.primary, width: `${downloadProgress * 100}%` }]} />
                </View>
            )}
        </View>
    );
};

const ImagePreviewThumbnail: React.FC<{ file: Attachment }> = ({ file }) => {
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const token = AuthManager.getToken();
    const imageUrl = `${apiUrl}/api/files/${encodeURIComponent(file.file_name)}`;
    const imageHeaders = {
        Authorization: `Bearer ${token}`,
        'X-App-Secret': xAppSecret
    };

    useEffect(() => {
        if (Platform.OS === 'web') {
            let isMounted = true;
            const fetchThumbnail = async () => {
                try {
                    const response = await fetch(imageUrl, { headers: imageHeaders });
                    if (!response.ok) throw new Error('Failed to fetch');
                    const blob = await response.blob();
                    const objectUrl = URL.createObjectURL(blob);
                    if (isMounted) setThumbnailUrl(objectUrl);
                } catch (error) {
                    console.error('Error loading thumbnail:', error);
                }
            };
            fetchThumbnail();
            return () => {
                isMounted = false;
                if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl);
            };
        }
    }, [file.file_name]);

    const source = Platform.OS === 'web'
        ? { uri: thumbnailUrl || undefined }
        : { uri: imageUrl, headers: imageHeaders };

    return (
        <Image
            source={source}
            style={{ width: "100%", height: "100%", borderRadius: 8 }}
            resizeMode="cover"
        />
    );
};

import { useEventDetailsStore } from "@/store/useEventDetailsStore";

export const EventDetailsScreen: React.FC = () => {
    const { colors, isDark } = useTheme();
    const { id } = useLocalSearchParams<{ id: string }>();

    const { events, isLoading: storeLoading, fetchEventDetails } = useEventDetailsStore();
    const event = events[id || ''] as EventData | undefined;

    const [refreshing, setRefreshing] = useState(false);
    const insets = useSafeAreaInsets();
    const [showUploader, setShowUploader] = useState(false);
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);
    const { handlers } = useFileManagerPresenter();
    const router = useRouter();
    const [excuseModalVisible, setExcuseModalVisible] = useState(false);
    const [selectedExcuseAttendee, setSelectedExcuseAttendee] = useState<Attendee | null>(null);
    const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewFileName, setPreviewFileName] = useState<string | null>(null);

    const handleImagePress = (file: Attachment) => {
        setSelectedAttachment(file);
        setPreviewFileName(file.file_name);
        setPreviewVisible(true);
    };

    const handleDownloadFromPreview = () => {
        if (selectedAttachment) {
            const docCompatible = {
                id: selectedAttachment.document_id || selectedAttachment.id,
                file_name: selectedAttachment.file_name,
                content_type: selectedAttachment.file_name.split('.').pop() || 'dat',
                ...selectedAttachment
            };
            // @ts-ignore
            handlers.handleDownloadDocument(docCompatible);
        }
    };

    const userRole = AuthManager.getRole();
    const userId = AuthManager.getUserId();

    const handleBack = () => {
        if (router.canGoBack()) router.back();
        else router.replace('/EventsScreen');
    };

    const loadEvent = useCallback(async (isRefresh = false) => {
        if (!id) return;
        await fetchEventDetails(id, isRefresh);
        setRefreshing(false);
    }, [id, fetchEventDetails]);

    useEffect(() => {
        loadEvent();
    }, [loadEvent]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadEvent(true);
    }, [loadEvent]);

    const loading = storeLoading && !event;

    // Функция для построения ссылки на карты
    const getMapLink = (locationString: string): string => {
        const parsed = parseLocation(locationString);
        if (parsed.coordinates) {
            return `https://yandex.ru/maps/?pt=${parsed.coordinates.lon},${parsed.coordinates.lat}&z=16`;
        } else if (parsed.address) {
            return `https://yandex.ru/maps/?text=${encodeURIComponent(parsed.address)}`;
        }
        return '';
    };

    const currentUserAttendance = event?.attendees?.find(
        (a) => a.user_id === userId
    );
    const currentAttendanceStatus: 'Yes' | 'No' | 'Unknown' =
        (currentUserAttendance?.status as 'Yes' | 'No') ?? 'Unknown';

    // Функция для формирования текста для шаринга
    const getShareText = (): string => {
        if (!event) return '';

        const start = formatDateTime(event.start_at);
        const end = formatDateTime(event.end_at);
        const mapLink = getMapLink(event.location);
        const visibility = event.is_public ? '🔓 Публичное событие' : '🔒 Приватное событие';
        const address = parseLocation(event.location).address || 'Не указано';

        let text = `\n`;

        if (event.description) {
            text += `📝 ${event.description}\n\n`;
        }

        text += `🕒 Начало: ${start.day}, ${start.time}\n`;
        text += `⏰ Окончание: ${end.day}, ${end.time}\n\n`;

        text += `📍 Место: ${address}\n`;

        if (mapLink) {
            text += `🗺️ Карта: ${mapLink}\n\n`;
        }

        text += `${visibility}\n\n`;

        return text;
    };

    // Функция шаринга (работает и на нативе, и в вебе)
    const handleShare = async () => {
        if (!event) return;

        const shareText = getShareText();

        if (Platform.OS === 'web') {
            // Веб: используем Web Share API если доступен, иначе копируем в буфер
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: event.title,
                        text: shareText,
                    });
                    Toast.show({
                        type: 'success',
                        text1: 'Успешно',
                        text2: 'Событие отправлено',
                        position: 'top',
                        visibilityTime: 2000,
                    });
                } catch (error: any) {
                    if (error.name !== 'AbortError') {
                        // Если шаринг отменен пользователем — не показываем ошибку
                        fallbackCopyToClipboard(shareText);
                    }
                }
            } else {
                fallbackCopyToClipboard(shareText);
            }
        } else {
            // Нативные платформы (iOS, Android)
            try {
                const result = await Share.share({
                    title: event.title,
                    message: shareText,
                });
                if (result.action === Share.sharedAction) {
                    Toast.show({
                        type: 'success',
                        text1: 'Успешно',
                        text2: 'Событие отправлено',
                        position: 'top',
                        visibilityTime: 2000,
                    });
                }
            } catch (error: any) {
                Toast.show({
                    type: 'error',
                    text1: 'Ошибка',
                    text2: error.message || 'Не удалось поделиться',
                    position: 'bottom',
                    visibilityTime: 3000,
                });
            }
        }
    };

    // Fallback для веба (копирование в буфер обмена)
    const fallbackCopyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            Toast.show({
                type: 'success',
                text1: 'Скопировано',
                text2: 'Текст события скопирован в буфер обмена',
                position: 'top',
                visibilityTime: 3000,
            });
        } catch (err) {
            Toast.show({
                type: 'error',
                text1: 'Ошибка',
                text2: 'Не удалось скопировать текст',
                position: 'bottom',
                visibilityTime: 3000,
            });
        }
    };

    const parseLocation = (locationString: string) => {
        if (!locationString) return { address: '', coordinates: null };
        const match = locationString.match(/^([^|]+)\|\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)\s*$/);
        if (match) {
            const lat = Number(match[2]);
            const lon = Number(match[3]);
            if (match[1].trim() && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
                return { address: match[1].trim(), coordinates: { lat, lon } };
            }
        }
        return { address: locationString.trim(), coordinates: null };
    };

    const location = parseLocation(event?.location || '');
    const startDate = event ? formatDateTime(event.start_at) : { day: '', time: '' };
    const endDate = event ? formatDateTime(event.end_at) : { day: '', time: '' };

    const getEventTypeLabel = (type: string) => {
        const types: Record<string, string> = {
            Event: 'Мероприятие',
            Meeting: 'Заседание',
            Commission: 'Комиссия'
        };
        return types[type] || type;
    };

    const openMaps = () => {
        if (Platform.OS === 'web') {
            if (location.coordinates) {
                window.open(`https://yandex.ru/maps/?pt=${location.coordinates.lon},${location.coordinates.lat}&z=16`, '_blank');
            } else if (location.address) {
                window.open(`https://yandex.ru/maps/?text=${encodeURIComponent(location.address)}`, '_blank');
            }
            return;
        }

        const locationParams = {
            title: location.address,
            dialogTitle: 'Открыть в навигаторе',
            dialogMessage: 'Выберите приложение для построения маршрута',
            cancelText: 'Отмена',
        };

        if (location.coordinates) {
            const { lat, lon } = location.coordinates;
            showLocation({
                ...locationParams,
                latitude: lat,
                longitude: lon,
                appsWhiteList: ['yandex-maps', 'dgis', 'apple-maps']
            });
        }
        else if (location.address) {
            showLocation({
                ...locationParams,
                address: location.address
            });
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Yes': return <CheckCircle2 size={18} color="#0f6319" />;
            case 'No': return <XCircle size={18} color="#dc2626" />;
            default: return <HelpCircle size={18} color="#6b7280" />;
        }
    };

    const getInitials = (name: string) => {
        if (!name) return '';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const handleDelete = () => {
        if (Platform.OS === 'web') {
            if (window.confirm('Вы уверены, что хотите удалить событие?')) {
                executeDelete();
            }
            return;
        }

        Alert.alert('Удаление', 'Вы уверены?', [
            { text: 'Отмена', style: 'cancel' },
            {
                text: 'Удалить',
                style: 'destructive',
                onPress: executeDelete
            },
        ]);
    };

    const executeDelete = async () => {
        try {
            await apiClient.delete(`/api/Events/${id}`);

            Toast.show({
                type: 'success',
                text1: 'Успешно',
                text2: 'Событие успешно удалено',
                position: 'top',
                visibilityTime: 3000,
            });
            router.push("/(screens)/EventsScreen");
        } catch (error: any) {
            console.error('Delete error:', error);

            const errorMessage = error.response?.data?.message || error.message || 'Произошла неизвестная ошибка';
            Toast.show({
                type: 'error',
                text1: 'Ошибка',
                text2: errorMessage,
                position: 'bottom',
                visibilityTime: 4000,
            });
        }
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.subtext }]}>Загрузка события...</Text>
            </View>
        );
    }

    if (!event) {
        return (
            <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
                <Ionicons name="alert-circle-outline" size={64} color={isDark ? "#f87171" : "#dc2626"} />
                <Text style={[styles.errorText, { color: colors.text }]}>Событие не найдено</Text>
                <TouchableOpacity style={[styles.errorButton, { backgroundColor: colors.primary }]} onPress={handleBack}>
                    <Text style={styles.errorButtonText}>Вернуться назад</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <>
            <ScrollView
                style={[styles.container, { backgroundColor: colors.background }]}
                contentContainerStyle={{ paddingBottom: 24 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
                showsVerticalScrollIndicator={false}
            >
                <LinearGradient
                    colors={[colors.primary, colors.secondary]}
                    style={[styles.header, { paddingTop: insets.top + 15 }]}
                >
                    <View style={styles.headerTopRow}>
                        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                            <View pointerEvents="none">
                                <ArrowLeft size={24} color="white" />
                            </View>
                        </TouchableOpacity>

                        <View style={styles.headerActions}>
                            {/* Новая кнопка "Поделиться" (мегафон) */}
                            <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
                                <Megaphone size={20} color="white" />
                            </TouchableOpacity>

                            {(userRole === "Admin" || userId === event.author_id) && (
                                <>
                                    <TouchableOpacity
                                        style={[styles.iconButton, { marginLeft: 10 }]}
                                        onPress={() => router.push({ pathname: '/(screens)/EventsScreen/CreateEventScreen', params: { id: event.id, isEdit: 1 } })}
                                    >
                                        <Edit size={20} color="white" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.iconButton, { marginLeft: 10 }]} onPress={handleDelete}>
                                        <Trash2 size={20} color="#fff" />
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>

                    <View style={styles.headerContent}>
                        <Text style={styles.headerTitle} numberOfLines={3}>{event.title}</Text>
                        <View style={[styles.statusTag, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                            <Text style={[styles.statusTagText, { color: 'white' }]}>{getEventTypeLabel(event.type)}</Text>
                        </View>
                    </View>
                </LinearGradient>

                <View style={styles.content}>
                    <View style={[styles.card, { backgroundColor: colors.card, shadowOpacity: isDark ? 0 : 0.05 }]}>
                        <View style={styles.timeRow}>
                            <View style={styles.timeContent}>
                                <Text style={[styles.label, { color: colors.subtext }]}>Начало</Text>
                                <Text style={[styles.value, { color: colors.text }]}>{startDate.day}, {startDate.time}</Text>
                            </View>
                            <View style={[styles.timeDividerVertical, { backgroundColor: colors.divider }]} />
                            <View style={styles.timeContent}>
                                <Text style={[styles.label, { color: colors.subtext }]}>Окончание</Text>
                                <Text style={[styles.value, { color: colors.text }]}>{endDate.day}, {endDate.time}</Text>
                            </View>
                        </View>
                    </View>

                    {!!location.address && (
                        <View style={[styles.card, { backgroundColor: colors.card, shadowOpacity: isDark ? 0 : 0.05 }]}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Место проведения</Text>
                            <Text style={[styles.addressText, { color: colors.subtext }]}>{location.address}</Text>
                            {location.coordinates && <TouchableOpacity onPress={openMaps} activeOpacity={0.9}>
                                <View style={styles.mapContainer}>
                                    <EventMap key={event.location} coordinates={location.coordinates} />
                                </View>
                            </TouchableOpacity>}
                        </View>
                    )}

                    {event.description && (
                        <View style={[styles.card, { backgroundColor: colors.card, shadowOpacity: isDark ? 0 : 0.05 }]}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>О событии</Text>
                            <Text style={[styles.description, { color: colors.subtext }]}>{event.description}</Text>
                        </View>
                    )}

                    {event.attachments && event.attachments.length > 0 && (
                        <View style={[styles.card, { backgroundColor: colors.card, shadowOpacity: isDark ? 0 : 0.05 }]}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Материалы</Text>
                            {event.attachments.map((file) => (
                                <AttachmentItem
                                    key={file.id}
                                    file={file}
                                    onImagePress={handleImagePress}
                                />
                            ))}
                        </View>
                    )}

                    {event.attendees && event.attendees.length > 0 && (
                        <View style={[styles.card, { backgroundColor: colors.card, shadowOpacity: isDark ? 0 : 0.05 }]}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Участники ({event.attendees.filter(attendee => attendee.status === 'Yes').length})</Text>
                            {event.attendees.map((attendee) => (
                                <TouchableOpacity
                                    key={attendee.user_id}
                                    style={[styles.attendeeRow, { borderBottomColor: colors.divider }]}
                                    onPress={() => {
                                        if (attendee.status === 'No') {
                                            setSelectedExcuseAttendee(attendee);
                                            setExcuseModalVisible(true);
                                        } else {
                                            router.push({ pathname: '/(screens)/ProfileScreen', params: { id: attendee.user_id } });
                                        }
                                    }}
                                >
                                    <View style={[styles.avatar, { backgroundColor: isDark ? colors.iconBox : '#e2e8f0' }]}>
                                        <Text style={[styles.avatarText, { color: colors.text }]}>{getInitials(attendee.user_full_name)}</Text>
                                    </View>
                                    <View style={styles.attendeeInfo}>
                                        <Text style={[styles.attendeeName, { color: colors.text }]}>{attendee.user_full_name}</Text>
                                        <View style={styles.statusBadge}>
                                            {getStatusIcon(attendee.status)}
                                            <Text style={[styles.statusText, { color: colors.subtext }]}>
                                                {attendee.status === 'Yes' ? 'Подтвердил' : attendee.status === 'No' ? 'Отклонил' : 'Под вопросом'}
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    <View style={[styles.metaCard, { backgroundColor: isDark ? colors.iconBox : '#f9fafb', borderColor: colors.border }]}>
                        <View style={styles.metaRow}>
                            <Ionicons name="lock-open-outline" size={18} color={colors.subtext} />
                            <Text style={[styles.metaLabel, { color: colors.subtext }]}>
                                {event.is_public ? 'Публичное событие' : 'Приватное событие'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.actionGroup}>
                        { (userRole === "Admin" || userId === event.author_id ) &&
                            <TouchableOpacity style={[styles.secondaryButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setShowUploader(true)}>
                                <FileText size={20} color={isDark ? colors.roleText : "#0f6319"} />
                                <Text style={[styles.secondaryButtonText, { color: isDark ? colors.roleText : "#0f6319" }]}>Прикрепить файл</Text>
                            </TouchableOpacity>
                        }

                        <TouchableOpacity style={[styles.secondaryButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setShowAttendanceModal(true)}>
                            <CheckCircle2 size={20} color={isDark ? colors.roleText : "#0f6319"} />
                            <Text style={[styles.secondaryButtonText, { color: isDark ? colors.roleText : "#0f6319" }]}>Отметить участие</Text>
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
                currentStatus={currentAttendanceStatus}
            />
            <AttendeeExcuseModal
                visible={excuseModalVisible}
                onClose={() => setExcuseModalVisible(false)}
                attendee={selectedExcuseAttendee}
                onDownloadDocument={handlers.handleDownloadDocument}
            />

            <ImagePreviewModal
                visible={previewVisible}
                onClose={() => {
                    setPreviewVisible(false);
                    setPreviewFileName(null);
                    setSelectedAttachment(null);
                }}
                fileName={previewFileName}
                onDownload={handleDownloadFromPreview}
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
    header: { paddingHorizontal: 20, paddingBottom: 50, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
    headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
    headerContent: { flex: 1 },
    headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 10 },
    statusTag: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
    statusTagText: { fontSize: 12, fontWeight: '600' },
    content: { padding: 16, marginTop: -55 },
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

    fileRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, marginBottom: 8 },
    fileIconContainer: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    fileName: { flex: 1, fontSize: 14, color: '#1e293b', marginRight: 12 },

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
    attachmentContainer: { marginBottom: 12 },
    imagePreviewContainer: { height: 120, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f1f5f9' },
    imagePreview: { width: '100%', height: '100%' },
    imagePreviewOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center', justifyContent: 'space-between' },
    imagePreviewName: { color: '#fff', fontSize: 12, flex: 1, marginRight: 8 },
    downloadIconButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8 },
    fileRowDownloading: { opacity: 0.8 },
    progressText: { fontSize: 12, fontWeight: '600', color: '#0f6319' },
    progressBarBackground: { height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, marginTop: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#0f6319', borderRadius: 2 },
    imageViewerOverlay: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
    imageViewerCloseButton: { position: 'absolute', top: 50, right: 20, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 8 },
    imageViewerImage: { width: '100%', height: '80%' },
    imageViewerFooter: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    imageViewerFileName: { color: 'white', fontSize: 16, fontWeight: '500', flex: 1 },
    downloadButtonInViewer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0f6319',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        marginLeft: 12,
        gap: 8
    },
    downloadButtonText: { color: 'white', fontSize: 14, fontWeight: '600' },
    fullScreenImage: { width: '100%', height: '80%' },
    fullScreenOverlay: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
    closePreviewButton: { position: 'absolute', right: 20, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 5 },
    fullImage: { width: '100%', height: '80%' },
    previewFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', padding: 20, alignItems: 'center' },
    previewFooterText: { color: 'white', fontSize: 16, fontWeight: '500' },
});
