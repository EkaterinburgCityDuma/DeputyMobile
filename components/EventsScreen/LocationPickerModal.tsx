import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    Modal, StyleSheet, Alert, ActivityIndicator, Platform, KeyboardAvoidingView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LocationPickerMap } from "@/components/ui/LocationPickerMap/LocationPickerMap";
import * as Location from 'expo-location';
import { useTheme } from '@/context/ThemeContext';

const INITIAL_REGION = {
    lat: 56.837239,
    lon: 60.597887,
    zoom: 16,
};

interface LocationPickerModalProps {
    visible: boolean;
    onClose: () => void;
    onLocationSelected: (location: { address: string; coords: { lat: number; lon: number } | null }) => void;
    initialLocation?: string;
    initialCoords?: { lat: number; lon: number } | null;
}

export default function LocationPickerModal({
                                                visible,
                                                onClose,
                                                onLocationSelected,
                                                initialLocation,
                                                initialCoords
                                            }: LocationPickerModalProps) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
    const [location, setLocation] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [mapFailed, setMapFailed] = useState(false);
    const [manualAddress, setManualAddress] = useState('');
    const handleMapError = useCallback(() => {
        setMapFailed(true);
        setManualAddress(initialLocation || '');
    }, [initialLocation]);

    // Новые стейты для отслеживания реального положения камеры и разрешений
    const [currentCamera, setCurrentCamera] = useState({ lat: INITIAL_REGION.lat, lon: INITIAL_REGION.lon, zoom: INITIAL_REGION.zoom });
    const [hasLocationPermission, setHasLocationPermission] = useState(false);

    const mapRef = useRef<any>(null);
    const insets = useSafeAreaInsets();
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);
    const abortController = useRef<AbortController | null>(null);

    // Сброс состояния и установка начальной точки при открытии модалки
    useEffect(() => {
        if (visible) {
            setMapFailed(Platform.OS === 'web' && !process.env.EXPO_PUBLIC_GEOCODER_API_KEY?.trim());
            setManualAddress(initialLocation || '');
            // Тихо проверяем разрешения, чтобы понять, можно ли рендерить showUserPosition
            Location.getForegroundPermissionsAsync().then(({ status }) => {
                setHasLocationPermission(status === 'granted');
            });

            const startCoords = initialCoords || { lat: INITIAL_REGION.lat, lon: INITIAL_REGION.lon };
            setCoords(startCoords);
            setCurrentCamera(prev => ({ ...prev, lat: startCoords.lat, lon: startCoords.lon }));

            if (initialCoords) {
                setLocation(initialLocation || "");
            } else {
                reverseGeocode(startCoords);
            }

            // Центрируем карту один раз при открытии
            setTimeout(() => {
                // ПРОВЕРКА: на вебе метода setCenter не будет
                if (mapRef.current && typeof mapRef.current.setCenter === 'function') {
                    mapRef.current.setCenter(startCoords, INITIAL_REGION.zoom);
                }
            }, 300);

        } else {
            // Очистка при закрытии
            setSearchQuery("");
            setSearchResults([]);
            setCoords(null);
        }
    }, [visible]);

    const reverseGeocode = useCallback(async (coords: { lat: number; lon: number }) => {
        if (!coords) return;

        try {
            // Обратите внимание: Яндекс Геокодер принимает координаты строго в формате "долгота,широта" (lon,lat)
            const response = await fetch(
                `https://geocode-maps.yandex.ru/v1/?apikey=${process.env.EXPO_PUBLIC_GEOCODER_API_KEY}&geocode=${coords.lon},${coords.lat}&format=json`
            );

            const data = await response.json();
            const featureMember = data?.response?.GeoObjectCollection?.featureMember;

            if (featureMember && featureMember.length > 0) {
                // Берем первый (самый точный) результат
                const geoObject = featureMember[0].GeoObject;
                const addressName = geoObject.name; // Например: "улица Малышева, 53"
                const addressDesc = geoObject.description; // Например: "Екатеринбург, Россия"

                // Склеиваем название и описание (можно оставить только name, если нужно короче)
                const fullAddress = [addressName, addressDesc].filter(Boolean).join(', ');
                setLocation(fullAddress || "Выбранное место");
            } else {
                // Обязательно вызываем setLocation, даже если адрес не найден
                setLocation("Выбранное место");
            }
        } catch (error) {
            console.error('Reverse geocode error:', error);
            // Фолбэк на случай проблем с интернетом
            setLocation("Выбранное место");
        }
    }, []);

    const getUserLocation = useCallback(async () => {
        try {
            setIsLoading(true);
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert("Внимание", "Нет доступа к геолокации. Разрешите доступ в настройках.");
                setHasLocationPermission(false);
                return;
            }

            setHasLocationPermission(true);

            const userLoc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced
            });

            const newCoords = {
                lat: userLoc.coords.latitude,
                lon: userLoc.coords.longitude
            };

            setCoords(newCoords);
            await reverseGeocode(newCoords);

            if (mapRef.current) {
                mapRef.current.setCenter(newCoords, 16);
            }
        } catch (error) {
            console.error('Get user location error:', error);
            Alert.alert("Ошибка", "Не удалось получить местоположение");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const searchPlaces = useCallback(async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        // Отменяем предыдущий запрос, если он был
        if (abortController.current) {
            abortController.current.abort();
        }

        // Создаем новый AbortController
        abortController.current = new AbortController();

        setIsSearching(true);
        try {
            const response = await fetch(
                `https://geocode-maps.yandex.ru/v1/?apikey=${process.env.EXPO_PUBLIC_GEOCODER_API_KEY}&geocode=${encodeURIComponent(`г. Екатеринбург, ${query}`)}&format=json`,
                { signal: abortController.current.signal }
            );

            const data = await response.json();

            // Проверяем, не был ли запрос отменен
            if (abortController.current.signal.aborted) {
                return;
            }

            if (data?.response?.GeoObjectCollection?.featureMember) {
                const results = data.response.GeoObjectCollection.featureMember.map((item: any) => ({
                    name: item.GeoObject.name || item.GeoObject.description || "Без названия",
                    description: item.GeoObject.description,
                    lat: parseFloat(item.GeoObject.Point.pos.split(' ')[1]),
                    lon: parseFloat(item.GeoObject.Point.pos.split(' ')[0])
                })).slice(0, 10); // Ограничиваем количество результатов до 10

                setSearchResults(results);
            } else {
                setSearchResults([]);
            }
        } catch (error: any) {
            // Игнорируем ошибки отмены запроса
            if (error.name === 'AbortError') {
                console.log('Search request aborted');
                return;
            }
            console.error('Search error:', error);
            setSearchResults([]);
        } finally {
            if (!abortController.current?.signal.aborted) {
                setIsSearching(false);
            }
        }
    }, []);

    const handleSearchChange = useCallback((text: string) => {
        setSearchQuery(text);

        // Очищаем таймаут
        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        // Если текст пустой, сразу очищаем результаты
        if (!text.trim()) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        // Устанавливаем новый таймаут
        // @ts-ignore
        searchTimeout.current = setTimeout(() => {
            searchPlaces(text);
        }, 500);
    }, [searchPlaces]);

    useEffect(() => {
        return () => {
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }
            if (abortController.current) {
                abortController.current.abort();
            }
        };
    }, []);

    const selectSearchResult = useCallback((result: any) => {
        const newCoords = { lat: result.lat, lon: result.lon };
        setCoords(newCoords);
        setLocation(result.name);
        setSearchQuery(result.name);
        setSearchResults([]);

        if (mapRef.current) {
            mapRef.current.setCenter(newCoords, 16);
        }
    }, []);

    const handleConfirmLocation = useCallback(async () => {
        if (!coords) return;

        try {
            await reverseGeocode(coords);
            onLocationSelected({ address: location, coords });
            onClose();
        } catch (error) {
            console.error('Confirm location error:', error);
        }
    }, [coords, location, onLocationSelected, onClose]);

    const handleMapPress = useCallback((e: any) => {
        if (!e.nativeEvent) return;

        const { lat, lon } = e.nativeEvent;
        if (typeof lat === 'number' && typeof lon === 'number') {
            setCoords({ lat, lon });
            reverseGeocode({ lat, lon });
        }
    }, [reverseGeocode]);

    // Зум теперь работает относительно текущего центра экрана, а не маркера
    const handleZoomIn = useCallback(() => {
        if (mapRef.current?.setCenter) {
            const newZoom = Math.min(currentCamera.zoom + 1, 18);
            mapRef.current.setCenter({ lat: currentCamera.lat, lon: currentCamera.lon }, newZoom);
        }
    }, [currentCamera]);

    const handleZoomOut = useCallback(() => {
        if (mapRef.current?.setCenter) {
            const newZoom = Math.max(currentCamera.zoom - 1, 3);
            mapRef.current.setCenter({lat: currentCamera.lat, lon: currentCamera.lon}, newZoom);
        }
    }, [currentCamera]);

    const handleCameraPositionChanged = useCallback((e: any) => {
        if (e.nativeEvent) {
            setCurrentCamera({
                lat: e.nativeEvent.point.lat,
                lon: e.nativeEvent.point.lon,
                zoom: e.nativeEvent.zoom
            });
        }
    }, []);

    const clearSearch = useCallback(() => {
        setSearchQuery("");
        setSearchResults([]);
    }, []);

    if (mapFailed) return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.background }}>
                <View style={[styles.manualHeader, { paddingTop: insets.top + 12, borderBottomColor: colors.divider, backgroundColor: colors.card }]}>
                    <Text style={[styles.manualTitle, { color: colors.text }]}>Место проведения</Text>
                    <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Закрыть" style={styles.manualClose}>
                        <Ionicons name="close" size={24} color={colors.subtext} />
                    </TouchableOpacity>
                </View>
                <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.manualContent}>
                    <View style={[styles.manualCard, { backgroundColor: colors.card }]}>
                        <Text style={[styles.manualTitle, { color: colors.text }]}>Укажите адрес</Text>
                        <Text style={[styles.manualHint, { color: colors.subtext }]}>Карта недоступна. Адрес можно сохранить вручную.</Text>
                        <Text style={[styles.manualLabel, { color: colors.subtext }]}>Адрес места проведения</Text>
                        <TextInput value={manualAddress} onChangeText={setManualAddress} placeholder="Город, улица, дом или название места"
                            accessibilityLabel="Адрес места проведения" placeholderTextColor={colors.subtext} selectionColor={colors.roleText}
                            multiline textAlignVertical="top"
                            style={[styles.manualInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]} />
                    </View>
                </ScrollView>
                <View style={[styles.manualFooter, { paddingBottom: insets.bottom + 16, backgroundColor: colors.card, borderTopColor: colors.divider }]}>
                <TouchableOpacity accessibilityRole="button" disabled={!manualAddress.trim()} style={[styles.confirmBtn, { backgroundColor: colors.primary, opacity: manualAddress.trim() ? 1 : 0.5 }]}
                    onPress={() => { onLocationSelected({ address: manualAddress.trim(), coords: null }); onClose(); }}>
                    <Text style={styles.confirmBtnText}>Сохранить адрес</Text>
                </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <View style={styles.mapModalContainer}>
                {/* Верхняя панель с поиском */}
                <View style={[styles.mapHeader, { paddingTop: insets.top + 10 }]}>
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color={colors.subtext} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Поиск места или адреса"
                            placeholderTextColor={colors.subtext}
                            value={searchQuery}
                            onChangeText={handleSearchChange}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={clearSearch}>
                                <Ionicons name="close-circle" size={20} color={colors.subtext} />
                            </TouchableOpacity>
                        )}
                        {isSearching && (
                            <ActivityIndicator size="small" color={colors.roleText} style={{ marginLeft: 8 }} />
                        )}
                    </View>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Результаты поиска */}
                {searchResults.length > 0 && (
                    <View style={styles.searchResults}>
                        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                            {searchResults.map((result, index) => (
                                <TouchableOpacity
                                    key={`${result.lat}-${result.lon}-${index}`}
                                    style={styles.searchResultItem}
                                    onPress={() => selectSearchResult(result)}
                                >
                                    <Ionicons name="location-outline" size={20} color={colors.roleText} />
                                    <View style={styles.searchResultTexts}>
                                        <Text style={styles.searchResultName}>{result.name}</Text>
                                        {result.description && (
                                            <Text style={styles.searchResultDescription} numberOfLines={1}>
                                                {result.description}
                                            </Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Карта */}
                {visible && <LocationPickerMap
                    onError={handleMapError}
                    ref={mapRef}
                    hasPermission={hasLocationPermission}
                    initialRegion={INITIAL_REGION}
                    coords={coords}
                    onMapPress={handleMapPress}
                    onCameraPositionChange={handleCameraPositionChanged}
                />}

                {/* Кнопки управления */}
                <View style={styles.zoomControls}>
                    <TouchableOpacity style={styles.zoomButton} onPress={handleZoomIn} activeOpacity={0.7}>
                        <Ionicons name="add" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <View style={styles.zoomDivider} />
                    <TouchableOpacity style={styles.zoomButton} onPress={handleZoomOut} activeOpacity={0.7}>
                        <Ionicons name="remove" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={[styles.myLocationButton, isLoading && styles.disabledButton]}
                    onPress={getUserLocation}
                    activeOpacity={0.7}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator size="small" color={colors.text} />
                    ) : (
                        <Ionicons name="locate" size={24} color={colors.text} />
                    )}
                </TouchableOpacity>

                {/* Нижняя панель */}
                {coords && (
                    <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 10 }]}>
                        <View style={styles.selectedLocationInfo}>
                            <Ionicons name="location" size={20} color={colors.roleText} />
                            <Text style={styles.selectedLocationText} numberOfLines={2}>
                                {location || "Выберите место на карте"}
                            </Text>
                        </View>

                        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmLocation} activeOpacity={0.7}>
                            <Text style={styles.confirmBtnText}>Подтвердить</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </Modal>
    );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
    manualHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
    manualTitle: { fontSize: 18, fontWeight: '600' },
    manualClose: { padding: 10, borderRadius: 12 },
    manualContent: { padding: 20, width: '100%', maxWidth: 640, alignSelf: 'center' },
    manualCard: { padding: 20, borderRadius: 20 },
    manualHint: { fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 24 },
    manualLabel: { fontSize: 12, marginBottom: 8 },
    manualInput: { minHeight: 100, borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, lineHeight: 22 },
    manualFooter: { padding: 20, borderTopWidth: 1 },
    mapModalContainer: {
        flex: 1,
        backgroundColor: colors.card,
    },
    mapHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 10,
        backgroundColor: 'transparent',
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        paddingHorizontal: 12,
        marginRight: 12,
        height: 44,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: colors.text,
        padding: 0,
    },
    closeButton: {
        width: 44,
        height: 44,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchResults: {
        position: 'absolute',
        top: 70,
        left: 16,
        right: 16,
        zIndex: 11,
        backgroundColor: colors.card,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        maxHeight: 300,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    searchResultTexts: {
        flex: 1,
        marginLeft: 12,
    },
    searchResultName: {
        fontSize: 15,
        color: colors.text,
        fontWeight: '600',
    },
    searchResultDescription: {
        fontSize: 13,
        color: colors.subtext,
        marginTop: 2,
    },
    map: {
        flex: 1,
    },
    markerContainer: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    markerDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.primary,
        borderWidth: 3,
        borderColor: colors.card,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    zoomControls: {
        position: 'absolute',
        right: 16,
        bottom: "55%",
        backgroundColor: colors.card,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        zIndex: 20,
    },
    zoomButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    zoomDivider: {
        height: 1,
        backgroundColor: colors.divider,
    },
    myLocationButton: {
        position: 'absolute',
        right: 16,
        bottom: "40%",
        width: 44,
        height: 44,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        zIndex: 20,
    },
    disabledButton: {
        opacity: 0.5,
    },
    bottomPanel: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.card,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        borderBottomWidth: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 10,
        zIndex: 15,
    },
    selectedLocationInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        marginBottom: 16,
    },
    selectedLocationText: {
        flex: 1,
        fontSize: 15,
        color: colors.text,
        marginLeft: 8,
    },
    confirmBtn: {
        padding: 16,
        borderRadius: 10,
        backgroundColor: colors.primary,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.primary,
    },
    confirmBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
});
