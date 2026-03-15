import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    ActivityIndicator,
    Alert,
    TextInput,
    Platform
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { X, Upload, FileText, Folder, ChevronRight, AlertCircle } from 'lucide-react-native';
import { catalogService, CatalogItem } from '@/api/catalogService';
import { apiUrl } from '@/api/api';
import { AuthTokenManager } from '@/components/LoginScreen/LoginScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
    eventId: string;
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const FILE_STATUSES = {
    TODO: 'ToDo',
    IN_PROGRESS: 'inProgress',
    DONE: 'Done'
} as const;

type FileStatus = typeof FILE_STATUSES[keyof typeof FILE_STATUSES];

export const EventAttachmentUploader: React.FC<Props> = ({
                                                             eventId,
                                                             visible,
                                                             onClose,
                                                             onSuccess
                                                         }) => {
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [catalogs, setCatalogs] = useState<CatalogItem[]>([]);
    const [selectedCatalog, setSelectedCatalog] = useState<CatalogItem | null>(null);
    const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerResult | null>(null);
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<FileStatus | ''>('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showCatalogPicker, setShowCatalogPicker] = useState(false);
    const [currentPath, setCurrentPath] = useState<CatalogItem[]>([]);
    const [error, setError] = useState<string | null>(null);
    const insets = useSafeAreaInsets();

    // Загрузка публичных каталогов
    const fetchCatalogs = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const publicCatalogs = await catalogService.getPublicCatalogs();
            setCatalogs(publicCatalogs);
        } catch (error) {
            console.error('Ошибка при загрузке каталогов:', error);
            setError('Не удалось загрузить список каталогов');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (visible) {
            fetchCatalogs();
            resetForm();
        }
    }, [visible, fetchCatalogs]);

    const resetForm = () => {
        setSelectedCatalog(null);
        setSelectedFile(null);
        setDescription('');
        setStatus('');
        setStartDate('');
        setEndDate('');
        setShowCatalogPicker(false);
        setCurrentPath([]);
        setError(null);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    // Выбор файла
    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
                multiple: false
            });

            if (!result.canceled && result.assets && result.assets[0]) {
                setSelectedFile(result);
            }
        } catch (error) {
            console.error('Ошибка при выборе файла:', error);
            Alert.alert('Ошибка', 'Не удалось выбрать файл');
        }
    };

    // Навигация по каталогам
    const getCurrentCatalogs = (): CatalogItem[] => {
        if (currentPath.length === 0) {
            return catalogs;
        }

        const lastCatalog = currentPath[currentPath.length - 1];
        return lastCatalog.children || [];
    };

    const navigateToCatalog = (catalog: CatalogItem) => {
        setCurrentPath([...currentPath, catalog]);
    };

    const navigateBack = () => {
        setCurrentPath(currentPath.slice(0, -1));
    };

    const selectCatalog = (catalog: CatalogItem) => {
        setSelectedCatalog(catalog);
        setShowCatalogPicker(false);
        setCurrentPath([]);
    };

    // Отправка файла
    const uploadFile = async () => {
        if (!selectedFile || selectedFile.canceled || !selectedFile.assets?.[0]) {
            Alert.alert('Ошибка', 'Выберите файл для загрузки');
            return;
        }

        if (!selectedCatalog) {
            Alert.alert('Ошибка', 'Выберите каталог для загрузки');
            return;
        }

        try {
            setUploading(true);
            setError(null);

            const token = AuthTokenManager.getToken();
            const file = selectedFile.assets[0];

            const formData = new FormData();

            // Добавление файла
            formData.append('File', {
                uri: file.uri,
                type: file.mimeType || 'application/octet-stream',
                name: file.name || 'file'
            } as any);

            // Добавление обязательных полей
            formData.append('CatalogId', selectedCatalog.id);

            // Добавление опциональных полей
            if (status) {
                formData.append('DocumentStatus', status);
            }

            if (description) {
                formData.append('description', description);
            }

            if (startDate) {
                formData.append('StartDate', new Date(startDate).toISOString());
            }

            if (endDate) {
                formData.append('EndDate', new Date(endDate).toISOString());
            }

            const response = await fetch(`${apiUrl}/api/Events/${eventId}/attachments`, {
                method: 'POST',
                headers: {
                    'Accept': '*/*',
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Upload failed: ${response.status} - ${errorText}`);
            }

            Alert.alert('Успех', 'Файл успешно загружен', [
                {
                    text: 'OK',
                    onPress: () => {
                        onSuccess?.();
                        handleClose();
                    }
                }
            ]);

        } catch (error) {
            console.error('Ошибка при загрузке файла:', error);
            setError('Не удалось загрузить файл. Попробуйте позже.');
        } finally {
            setUploading(false);
        }
    };

    // Рендер списка каталогов
    const renderCatalogList = () => {
        const currentCatalogs = getCurrentCatalogs();

        if (loading) {
            return (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#349339" />
                </View>
            );
        }

        if (error) {
            return (
                <View style={styles.errorContainer}>
                    <AlertCircle size={32} color="#ef4444" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={fetchCatalogs}
                    >
                        <Text style={styles.retryButtonText}>Повторить</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (currentCatalogs.length === 0) {
            return (
                <View style={styles.emptyContainer}>
                    <Folder size={48} color="#9ca3af" />
                    <Text style={styles.emptyText}>Нет доступных каталогов</Text>
                </View>
            );
        }

        return currentCatalogs.map(catalog => (
            <TouchableOpacity
                key={catalog.id}
                style={styles.catalogItem}
                onPress={() => {
                    if (catalog.children && catalog.children.length > 0) {
                        navigateToCatalog(catalog);
                    } else {
                        selectCatalog(catalog);
                    }
                }}
            >
                <View style={styles.catalogItemContent}>
                    <Folder size={20} color="#349339" />
                    <Text style={styles.catalogItemText}>{catalog.name}</Text>
                </View>
                {catalog.children && catalog.children.length > 0 && (
                    <ChevronRight size={20} color="#6b7280" />
                )}
            </TouchableOpacity>
        ));
    };

    // Рендер модалки выбора каталога
    const renderCatalogPicker = () => (
        <Modal
            visible={showCatalogPicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowCatalogPicker(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, styles.pickerModalContent]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Выберите каталог</Text>
                        <TouchableOpacity onPress={() => setShowCatalogPicker(false)}>
                            <X size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    {currentPath.length > 0 && (
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={navigateBack}
                        >
                            <ChevronRight size={20} color="#349339" style={{ transform: [{ rotate: '180deg' }] }} />
                            <Text style={styles.backButtonText}>Назад</Text>
                        </TouchableOpacity>
                    )}

                    {/* Хлебные крошки */}
                    {currentPath.length > 0 && (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.breadcrumbContainer}
                        >
                            <TouchableOpacity onPress={() => setCurrentPath([])}>
                                <Text style={styles.breadcrumbRoot}>Корень</Text>
                            </TouchableOpacity>
                            {currentPath.map((item, index) => (
                                <View key={item.id} style={styles.breadcrumbItem}>
                                    <Text style={styles.breadcrumbSeparator}> / </Text>
                                    <TouchableOpacity onPress={() => setCurrentPath(currentPath.slice(0, index + 1))}>
                                        <Text style={styles.breadcrumbText}>{item.name}</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    )}

                    <ScrollView style={styles.catalogList}>
                        {renderCatalogList()}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={handleClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Прикрепить файл к событию</Text>
                        <TouchableOpacity onPress={handleClose}>
                            <X size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
                        <View style={styles.field}>


                        <TouchableOpacity
                            style={styles.selector}
                            onPress={() => setShowCatalogPicker(true)}
                        >
                            <Text style={[
                                styles.selectorText,
                                !selectedCatalog && styles.placeholderText
                            ]}>
                                {selectedCatalog
                                    ? selectedCatalog.name
                                    : 'Выберите каталог для загрузки *'}
                            </Text>
                        </TouchableOpacity>
                        </View>
                        <View style={styles.field}>
                        <TouchableOpacity
                            style={styles.selector}
                            onPress={pickDocument}
                        >
                            <Text style={[
                                styles.selectorText,
                                !selectedFile && styles.placeholderText
                            ]} numberOfLines={1}>
                                {selectedFile && !selectedFile.canceled && selectedFile.assets?.[0]
                                    ? selectedFile.assets[0].name
                                    : 'Выберите файл *'}
                            </Text>
                        </TouchableOpacity>
                        </View>
                        <View style={styles.field}>
                        <TextInput
                            style={styles.textArea}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Описание"
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />
                            </View>
                        {/* Статус */}
                        <View style={styles.field}>
                            <Text style={styles.label}>Статус обработки</Text>
                            <View style={styles.statusButtons}>
                                {Object.entries(FILE_STATUSES).map(([key, value]) => (
                                    <TouchableOpacity
                                        key={key}
                                        style={[
                                            styles.statusButton,
                                            status === value && styles.statusButtonActive
                                        ]}
                                        onPress={() => setStatus(status === value ? '' : value)}
                                    >
                                        <Text style={[
                                            styles.statusButtonText,
                                            status === value && styles.statusButtonTextActive
                                        ]}>
                                            {value}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Даты */}
                        <View style={styles.field}>
                            <Text style={styles.label}>Дата начала (опционально)</Text>
                            <TextInput
                                style={styles.input}
                                value={startDate}
                                onChangeText={setStartDate}
                                placeholder="ГГГГ-ММ-ДД"
                            />
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Дата окончания (опционально)</Text>
                            <TextInput
                                style={styles.input}
                                value={endDate}
                                onChangeText={setEndDate}
                                placeholder="ГГГГ-ММ-ДД"
                            />
                        </View>

                        {error && (
                            <View style={styles.formError}>
                                <AlertCircle size={16} color="#ef4444" />
                                <Text style={styles.formErrorText}>{error}</Text>
                            </View>
                        )}
                    </ScrollView>

                    <View style={[styles.modalFooter, {paddingBottom: insets.bottom + 15}]}>
                        <TouchableOpacity
                            style={[
                                styles.uploadButton,
                                (!selectedFile || !selectedCatalog || uploading) && styles.uploadButtonDisabled
                            ]}
                            onPress={uploadFile}
                            disabled={!selectedFile || !selectedCatalog || uploading}
                        >
                            {uploading ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <>
                                    <Upload size={20} color="white" />
                                    <Text style={styles.uploadButtonText}>Загрузить</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {renderCatalogPicker()}
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        minHeight: '50%',
        maxHeight: '90%',
    },
    pickerModalContent: {
        minHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
    },
    form: {
        padding: 16,
    },
    field: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 8,
    },
    required: {
        color: '#ef4444',
    },
    selector: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        backgroundColor: '#f9fafb',
    },
    selectorText: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: '#1f2937',
    },
    placeholderText: {
        color: '#9ca3af',
    },
    input: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#f9fafb',
    },
    textArea: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#f9fafb',
        minHeight: 80,
    },
    statusButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    statusButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#d1d5db',
        backgroundColor: 'white',
    },
    statusButtonActive: {
        backgroundColor: '#349339',
        borderColor: '#349339',
    },
    statusButtonText: {
        fontSize: 14,
        color: '#374151',
    },
    statusButtonTextActive: {
        color: 'white',
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    cancelButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
    },
    cancelButtonText: {
        fontSize: 16,
        color: '#374151',
        fontWeight: '500',
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#349339',
        gap: 8,
    },
    uploadButtonDisabled: {
        backgroundColor: '#9ca3af',
    },
    uploadButtonText: {
        fontSize: 16,
        color: 'white',
        fontWeight: '500',
    },
    // Catalog picker styles
    breadcrumbContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        maxHeight: 44,
    },
    breadcrumbRoot: {
        fontSize: 14,
        color: '#349339',
        fontWeight: '500',
    },
    breadcrumbItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    breadcrumbSeparator: {
        fontSize: 14,
        color: '#9ca3af',
    },
    breadcrumbText: {
        fontSize: 14,
        color: '#349339',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        gap: 4,
    },
    backButtonText: {
        fontSize: 16,
        color: '#349339',
        fontWeight: '500',
    },
    catalogList: {
        maxHeight: 400,
    },
    catalogItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    catalogItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    catalogItemText: {
        fontSize: 16,
        color: '#1f2937',
        flex: 1,
    },
    loaderContainer: {
        padding: 40,
        alignItems: 'center',
    },
    errorContainer: {
        padding: 40,
        alignItems: 'center',
    },
    errorText: {
        marginTop: 8,
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
    },
    retryButton: {
        marginTop: 16,
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#349339',
        borderRadius: 8,
    },
    retryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        marginTop: 12,
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
    },
    formError: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fee2e2',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        gap: 8,
    },
    formErrorText: {
        fontSize: 14,
        color: '#ef4444',
        flex: 1,
    },
});
