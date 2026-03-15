import React, { useCallback, useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, Dimensions, Linking,
    Platform
} from 'react-native';
import { useLocalSearchParams, router } from "expo-router";
import { AuthTokenManager } from "@/components/LoginScreen/LoginScreen";
import { apiUrl } from "@/api/api";
import { Event } from '@/models/EventModel';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Yamap, Marker } from 'react-native-yamap-plus';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {ArrowLeft} from "lucide-react-native";
import {EventAttachmentUploader} from "@/components/EventsScreen/EventAttachmentUploader";
import {EventAttendanceModal} from "@/components/EventsScreen/EventAttendanceModal";

const EventDetailsScreen: React.FC = () => {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [loading, setLoading] = useState(true);
    const [event, setEvent] = useState<Event | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const insets = useSafeAreaInsets();
    const [showUploader, setShowUploader] = useState(false);
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);


    const loadEvent = useCallback(async (isRefresh = false) => {
        try {
            const token = AuthTokenManager.getToken();
            if (!token) {
                router.push('/LoginScreen');
                return;
            }

            const response = await fetch(`${apiUrl}/api/Events/${id}`, {
                headers: {
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`
                },
            });

            if (!response.ok) {
                throw new Error('Ошибка загрузки события');
            }

            const data: Event = await response.json();
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

    // Парсинг локации
    const parseLocation = (locationString: string) => {
        if (!locationString) return { address: '', coordinates: null };

        const parts = locationString.split('|');
        if (parts.length === 2) {
            const [address, coords] = parts;
            const [lat, lon] = coords.split(',').map(Number);
            return {
                address: address.trim(),
                coordinates: { lat, lon }
            };
        }
        return { address: locationString, coordinates: null };
    };

    const location = parseLocation(event.location);

    // Форматирование дат
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return {
            full: date.toLocaleDateString('ru-RU', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            }),
            time: date.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            }),
            day: date.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long'
            })
        };
    };

    const startDate = formatDate(event.start_at);
    const endDate = formatDate(event.end_at);

    // Тип события на русском
    const getEventTypeLabel = (type: string) => {
        const types = {
            Event: 'Мероприятие',
            Meeting: 'Заседание',
            Commission: 'Комиссия'
        };
        return types[type as keyof typeof types] || type;
    };

    // Открытие маршрута в картах
    const openMaps = () => {
        if (location.coordinates) {
            const { lat, lon } = location.coordinates;
            const url = Platform.select({
                ios: `maps://app?daddr=${lat},${lon}`,
                android: `google.navigation:q=${lat},${lon}`,
            });
            if (url) {
                Linking.openURL(url);
            }
        } else {
            // Если нет координат, открываем поиск по адресу
            const encodedAddress = encodeURIComponent(location.address);
            const url = Platform.select({
                ios: `maps://app?q=${encodedAddress}`,
                android: `geo:0,0?q=${encodedAddress}`,
            });
            if (url) {
                Linking.openURL(url);
            }
        }
    };

    return (
        <>
        <ScrollView
            style={[styles.container, { backgroundColor: '#f8fafc' }]}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
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
                {/* Организатор */}
                {event.organizer && (
                    <View style={styles.organizerCard}>
                        <Ionicons name="person-circle-outline" size={24} color="#0f6319" />
                        <View style={styles.organizerInfo}>
                            <Text style={styles.organizerLabel}>Организатор</Text>
                            <Text style={styles.organizerName}>{event.organizer}</Text>
                        </View>
                    </View>
                )}

                {/* Карта */}
                {location.coordinates && (
                    <View style={styles.mapCard}>
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
                                    <Marker
                                        point={{
                                            lat: location.coordinates.lat,
                                            lon: location.coordinates.lon,
                                        }}
                                    />
                                </Yamap>

                                {/* Оверлей для клика */}
                                <View style={styles.mapOverlay}>
                                    <View style={styles.mapOverlayContent}>
                                        <Text style={styles.mapOverlayText}>Проложить маршрут</Text>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Адрес без карты */}
                {!location.coordinates && location.address && (
                    <TouchableOpacity style={styles.addressCard} onPress={openMaps}>
                        <Ionicons name="location-outline" size={24} color="#0f6319" />
                        <Text style={styles.addressText}>{location.address}</Text>
                        <Ionicons name="chevron-forward-outline" size={20} color="#6b7280" />
                    </TouchableOpacity>
                )}

                {/* Время */}
                <View style={styles.timeCard}>
                    <View style={styles.timeRow}>
                        <View style={styles.timeContent}>
                            <Text style={styles.timeLabel}>Начало</Text>
                            <Text style={styles.timeValue}>
                                {startDate.day}, {startDate.time}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.timeDivider} />

                    <View style={styles.timeRow}>
                        <View style={styles.timeContent}>
                            <Text style={styles.timeLabel}>Окончание</Text>
                            <Text style={styles.timeValue}>
                                {endDate.day}, {endDate.time}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Описание */}
                {event.description && (
                    <View style={styles.descriptionCard}>
                        <Text style={styles.sectionTitle}>О событии</Text>
                        <Text style={styles.description}>
                            {event.description}
                        </Text>
                    </View>
                )}

                {/* Дополнительная информация */}
                <View style={styles.metaCard}>
                    <View style={styles.metaRow}>
                        <Ionicons name="lock-open-outline" size={18} color="#6b7280" />
                        <Text style={styles.metaLabel}>
                            {event.isPublic ? 'Публичное событие' : 'Приватное событие'}
                        </Text>
                    </View>

                    {event.created_at && (
                        <View style={styles.metaRow}>
                            <Ionicons name="create-outline" size={18} color="#6b7280" />
                            <Text style={styles.metaLabel}>
                                Создано: {new Date(event.created_at).toLocaleDateString('ru-RU')}
                            </Text>
                        </View>
                    )}
                </View>

                <TouchableOpacity onPress={() => setShowUploader(true)}>
                    <Text>Прикрепить файл</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setShowAttendanceModal(true)}>
                    <Text>Отметить участие</Text>
                </TouchableOpacity>

                {/* Кнопка действия */}
                <TouchableOpacity style={styles.actionButton}>
                    <LinearGradient
                        colors={['#0f6319', '#1e4b2c']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.actionButtonGradient}
                    >
                        <Ionicons name="calendar" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Записаться</Text>
                    </LinearGradient>
                </TouchableOpacity>

            </View>
        </ScrollView>
    <EventAttachmentUploader
        eventId={id}
        visible={showUploader}
        onClose={() => setShowUploader(false)}
        onSuccess={() => {
            // Обновить список вложений, если нужно
            loadEvent();
        }}
    />
            <EventAttendanceModal
                eventId={id}
                visible={showAttendanceModal}
                onClose={() => setShowAttendanceModal(false)}
                onSuccess={() => {
                    // Обновить данные события или статус участия
                    //loadEvent();
                }}
            />

    </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
        color: '#6b7280',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        paddingHorizontal: 24,
    },
    errorText: {
        marginTop: 16,
        fontSize: 18,
        fontFamily: 'Inter_600SemiBold',
        color: '#1e293b',
        textAlign: 'center',
    },
    errorButton: {
        marginTop: 24,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: '#0f6319',
        borderRadius: 8,
    },
    errorButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        paddingBottom: 40,
        paddingHorizontal: 20,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    headerContent: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    headerSubtitle: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 2,
    },
    content: {
        padding: 16,
        marginTop: -40,
    },
    organizerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 24,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    organizerInfo: {
        marginLeft: 12,
        flex: 1,
    },
    organizerLabel: {
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        color: '#6b7280',
        marginBottom: 2,
    },
    organizerName: {
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
        color: '#1e293b',
    },
    mapCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'PlayfairDisplay_600SemiBold',
        color: '#1e293b',
        marginBottom: 8,
    },
    addressText: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: '#4b5563',
        marginBottom: 12,
    },
    mapContainer: {
        borderRadius: 8,
        overflow: 'hidden',
        height: 180,
        position: 'relative',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    mapOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mapOverlayContent: {
        flexDirection: 'row',
        position: 'absolute',
        bottom: 4,
        left: 2,
        backgroundColor: 'rgb(40,136,80)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    mapOverlayText: {
        color: '#fff',
        fontSize: 12,
    },
    addressCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    timeCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timeIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    timeContent: {
        flex: 1,
    },
    timeLabel: {
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        color: '#6b7280',
        marginBottom: 2,
    },
    timeValue: {
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
        color: '#1e293b',
    },
    timeDivider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginVertical: 12,
    },
    descriptionCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    description: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: '#4b5563',
        lineHeight: 22,
    },
    metaCard: {
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    metaLabel: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: '#6b7280',
        marginLeft: 10,
    },
    actionButton: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    actionButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
        marginLeft: 10,
    },
});

export default EventDetailsScreen;
