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
import { X, Upload, FileText, Folder, ChevronRight } from 'lucide-react-native';
import { AuthTokenManager } from '../../utils/authTokenManager';

const apiUrl = process.env.EXPO_PUBLIC_API_URL;

interface Catalog {
    id: string;
    name: string;
    parent_id: string | null;
    children?: Catalog[];
    documents?: Document[];
}

interface Document {
    id: string;
    file_name: string;
    url: string;
    uploaded_at: string;
    uploaded_by: string;
    catalog_id: string;
}

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
    const [catalogs, setCatalogs] = useState<Catalog[]>([]);
    const [selectedCatalog, setSelectedCatalog] = useState<Catalog | null>(null);
    const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerResult | null>(null);
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<FileStatus | ''>('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showCatalogPicker, setShowCatalogPicker] = useState(false);
    const [catalogPath, setCatalogPath] = useState<Catalog[]>([]);

    // Загрузка списка каталогов
    const fetchCatalogs = useCallback(async () => {
        try {
            setLoading(true);
            const token = AuthTokenManager.getToken();
            const response = await fetch(`${apiUrl}/api/Catalogs/public`, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Error fetching catalogs: ${response.status}`);
            }

            const data: Catalog[] = await response.json();

            // Построение дерева каталогов
            const buildTree = (items: Catalog[], parentId: string | null = null): Catalog[] => {
                return items
                    .filter(item => item.parent_id === parentId)
                    .map(item => ({
                        ...item,
                        children: buildTree(items, item.id)
                    }));
            };

            const tree = buildTree(data);
            setCatalogs(tree);
        } catch (error) {
            console.error('Ошибка при загрузке каталогов:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить список каталогов');
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
        setCatalogPath([]);
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
    const navigateToCatalog = (catalog: Catalog, path: Catalog[] = []) => {
        setCatalogPath([...path, catalog]);
    };

    const navigateBack = () => {
        setCatalogPath(catalogPath.slice(0, -1));
    };

    const selectCatalog = (catalog: Catalog) => {
        setSelectedCatalog(catalog);
        setShowCatalogPicker(false);
        setCatalogPath([]);
    };

    // Рендер дерева каталогов
    const renderCatalogs = (items: Catalog[], level: number = 0, path: Catalog[] = []) => {
        return items.map(catalog => {
            const hasChildren = catalog.children && catalog.children.length > 0;
            const currentPath = [...path, catalog];

            return (
                <View key={catalog.id}>
                    <TouchableOpacity
                        style={[styles.catalogItem, { paddingLeft: 16 + level * 20 }]}
                        onPress={() => {
                            if (hasChildren) {
                                navigateToCatalog(catalog, currentPath);
                            } else {
                                selectCatalog(catalog);
                            }
                        }}
                    >
                        <View style={styles.catalogItemContent}>
                            <Folder size={20} color="#349339" />
                            <Text style={styles.catalogItemText}>{catalog.name}</Text>
                        </View>
                        {hasChildren && <ChevronRight size={20} color="#6b7280" />}
                    </TouchableOpacity>

                    {catalogPath.length > level &&
                        catalogPath[level]?.id === catalog.id &&
                        catalog.children &&
                        renderCatalogs(catalog.children, level + 1, currentPath)}
                </View>
            );
        });
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

            const response = await fetch(`${apiUrl}/api/Events/attachments`, {
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
            Alert.alert('Ошибка', 'Не удалось загрузить файл');
        } finally {
            setUploading(false);
        }
    };

    const renderCatalogPicker = () => (
        <Modal
            visible={showCatalogPicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowCatalogPicker(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Выберите каталог</Text>
                        <TouchableOpacity onPress={() => setShowCatalogPicker(false)}>
                            <X size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    {catalogPath.length > 0 && (
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={navigateBack}
                        >
                            <ChevronRight size={20} color="#349339" style={{ transform: [{ rotate: '180deg' }] }} />
                            <Text style={styles.backButtonText}>Назад</Text>
                        </TouchableOpacity>
                    )}

                    <ScrollView style={styles.catalogList}>
                        {loading ? (
                            <ActivityIndicator size="large" color="#349339" style={styles.loader} />
                        ) : catalogs.length === 0 ? (
                            <Text style={styles.emptyText}>Нет доступных каталогов</Text>
                        ) : (
                            renderCatalogs(catalogPath.length > 0 && catalogPath[catalogPath.length - 1]?.children
                                ? catalogPath[catalogPath.length - 1].children
                                : catalogs)
                        )}
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
                        <Text style={styles.modalTitle}>Прикрепить файл</Text>
                        <TouchableOpacity onPress={handleClose}>
                            <X size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.form}>
                        {/* Выбор каталога */}
                        <View style={styles.field}>
                            <Text style={styles.label}>Каталог <Text style={styles.required}>*</Text></Text>
                            <TouchableOpacity
                                style={styles.catalogSelector}
                                onPress={() => setShowCatalogPicker(true)}
                            >
                                <Folder size={20} color="#6b7280" />
                                <Text style={[
                                    styles.catalogSelectorText,
                                    !selectedCatalog && styles.placeholderText
                                ]}>
                                    {selectedCatalog ? selectedCatalog.name : 'Выберите каталог'}
                                </Text>
                                <ChevronRight size={20} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        {/* Выбор файла */}
                        <View style={styles.field}>
                            <Text style={styles.label}>Файл <Text style={styles.required}>*</Text></Text>
                            <TouchableOpacity
                                style={styles.fileSelector}
                                onPress={pickDocument}
                            >
                                <Upload size={20} color="#6b7280" />
                                <Text style={[
                                    styles.fileSelectorText,
                                    !selectedFile && styles.placeholderText
                                ]}>
                                    {selectedFile && !selectedFile.canceled && selectedFile.assets?.[0]
                                        ? selectedFile.assets[0].name
                                        : 'Выберите файл'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Описание */}
                        <View style={styles.field}>
                            <Text style={styles.label}>Описание</Text>
                            <TextInput
                                style={styles.input}
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Введите описание файла"
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                            />
                        </View>

                        {/* Статус */}
                        <View style={styles.field}>
                            <Text style={styles.label}>Статус</Text>
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

                        {/* Даты (можно добавить DatePicker компоненты) */}
                        <View style={styles.field}>
                            <Text style={styles.label}>Дата начала</Text>
                            <TextInput
                                style={styles.input}
                                value={startDate}
                                onChangeText={setStartDate}
                                placeholder="ГГГГ-ММ-ДД"
                            />
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Дата окончания</Text>
                            <TextInput
                                style={styles.input}
                                value={endDate}
                                onChangeText={setEndDate}
                                placeholder="ГГГГ-ММ-ДД"
                            />
                        </View>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={handleClose}
                            disabled={uploading}
                        >
                            <Text style={styles.cancelButtonText}>Отмена</Text>
                        </TouchableOpacity>

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
    catalogSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        backgroundColor: '#f9fafb',
    },
    catalogSelectorText: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: '#1f2937',
    },
    fileSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        backgroundColor: '#f9fafb',
    },
    fileSelectorText: {
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
        gap: 12,
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
    },
    catalogItemText: {
        fontSize: 16,
        color: '#1f2937',
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
    loader: {
        padding: 20,
    },
    emptyText: {
        textAlign: 'center',
        padding: 20,
        color: '#6b7280',
        fontSize: 16,
    },
});
