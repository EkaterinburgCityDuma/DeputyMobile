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
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { X, Upload, Check, FileText, AlertCircle, Folder } from 'lucide-react-native';
import { AuthTokenManager } from '@/components/LoginScreen/LoginScreen';
import { apiUrl } from '@/api/api';
import { catalogService, CatalogItem } from '@/api/catalogService';
import { ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
    eventId: string;
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    currentStatus?: 'Yes' | 'No' | 'Unknown';
}

type AttendanceStatus = 'Yes' | 'No' | 'Unknown';

interface UploadedDocument {
    id: string;
    file_name: string;
    url: string;
}

export const EventAttendanceModal: React.FC<Props> = ({
                                                          eventId,
                                                          visible,
                                                          onClose,
                                                          onSuccess,
                                                          currentStatus = 'Unknown'
                                                      }) => {
    const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus>(currentStatus);
    const [excuseNote, setExcuseNote] = useState('');
    const [excuseDocument, setExcuseDocument] = useState<UploadedDocument | null>(null);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Состояния для загрузки файла
    const [showDocumentPicker, setShowDocumentPicker] = useState(false);
    const [catalogs, setCatalogs] = useState<CatalogItem[]>([]);
    const [loadingCatalogs, setLoadingCatalogs] = useState(false);
    const [selectedCatalog, setSelectedCatalog] = useState<CatalogItem | null>(null);
    const [currentPath, setCurrentPath] = useState<CatalogItem[]>([]);
    const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerResult | null>(null);
    const [documentError, setDocumentError] = useState<string | null>(null);
    const insets = useSafeAreaInsets();


    // Загрузка каталогов для документов
    const fetchCatalogs = useCallback(async () => {
        try {
            setLoadingCatalogs(true);
            setDocumentError(null);
            const publicCatalogs = await catalogService.getPublicCatalogs();
            setCatalogs(publicCatalogs);
        } catch (error) {
            console.error('Ошибка при загрузке каталогов:', error);
            setDocumentError('Не удалось загрузить список каталогов');
        } finally {
            setLoadingCatalogs(false);
        }
    }, []);

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
    };

    // Загрузка оправдательного документа
    const uploadExcuseDocument = async () => {
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
            setDocumentError(null);

            const token = AuthTokenManager.getToken();
            const file = selectedFile.assets[0];

            const formData = new FormData();

            formData.append('File', {
                uri: file.uri,
                type: file.mimeType || 'application/octet-stream',
                name: file.name || 'file'
            } as any);

            formData.append('CatalogId', selectedCatalog.id);

            const response = await fetch(`${apiUrl}/api/Documents/upload`, {
                method: 'POST',
                headers: {
                    'Accept': 'text/plain',
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Upload failed: ${response.status} - ${errorText}`);
            }

            const document: UploadedDocument = await response.json();
            setExcuseDocument(document);
            setShowDocumentPicker(false);

            setSelectedFile(null);
            setSelectedCatalog(null);
            setCurrentPath([]);

        } catch (error) {
            console.error('Ошибка при загрузке файла:', error);
            setDocumentError('Не удалось загрузить файл');
        } finally {
            setUploading(false);
        }
    };

    // Отправка статуса присутствия
    const submitAttendance = async () => {
        if (selectedStatus === 'Unknown') {
            Alert.alert('Ошибка', 'Выберите статус присутствия');
            return;
        }

        try {
            setSubmitting(true);
            setError(null);

            const token = AuthTokenManager.getToken();

            const body: any = {
                status: selectedStatus
            };

            // Добавляем оправдательные поля только если статус "No"
            if (selectedStatus === 'No') {
                if (excuseNote) {
                    body.excuse_note = excuseNote;
                }
                if (excuseDocument) {
                    body.excuse_document_id = excuseDocument.id;
                }
            }

            const response = await fetch(`${apiUrl}/api/Events/${eventId}/rsvp`, {
                method: 'POST',
                headers: {
                    'accept': '*/*',
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json-patch+json',
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Submit failed: ${response.status} - ${errorText}`);
            }

            Alert.alert('Успех', 'Статус участия сохранен', [
                {
                    text: 'OK',
                    onPress: () => {
                        onSuccess?.();
                        onClose();
                    }
                }
            ]);
            setSelectedStatus(currentStatus);
            setExcuseNote('');
            setExcuseDocument(null);
            setError(null);

        } catch (error) {
            console.error('Ошибка при отправке статуса:', error);
            setError('Не удалось сохранить статус. Попробуйте позже.');
        } finally {
            setSubmitting(false);
        }
    };

    // Рендер списка каталогов для выбора
    const renderCatalogList = () => {
        const currentCatalogs = getCurrentCatalogs();

        if (loadingCatalogs) {
            return (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#349339" />
                </View>
            );
        }

        if (documentError) {
            return (
                <View style={styles.errorContainer}>
                    <AlertCircle size={32} color="#ef4444" />
                    <Text style={styles.errorText}>{documentError}</Text>
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

    // Модалка выбора документа
    const renderDocumentPicker = () => (
        <Modal
            visible={showDocumentPicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowDocumentPicker(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, styles.pickerModalContent]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Загрузить оправдательный документ</Text>
                        <TouchableOpacity onPress={() => setShowDocumentPicker(false)}>
                            <X size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    {!selectedCatalog ? (
                        // Выбор каталога
                        <>
                            {currentPath.length > 0 && (
                                <TouchableOpacity
                                    style={styles.backButton}
                                    onPress={navigateBack}
                                >
                                    <ChevronRight size={20} color="#349339" style={{ transform: [{ rotate: '180deg' }] }} />
                                    <Text style={styles.backButtonText}>Назад</Text>
                                </TouchableOpacity>
                            )}

                            <ScrollView style={styles.catalogList}>
                                {renderCatalogList()}
                            </ScrollView>
                        </>
                    ) : (
                        // Выбор файла
                        <View style={styles.fileSelectionContainer}>
                            <View style={styles.selectedCatalogInfo}>
                                <Folder size={20} color="#349339" />
                                <Text style={styles.selectedCatalogText}>{selectedCatalog.name}</Text>
                                <TouchableOpacity onPress={() => setSelectedCatalog(null)}>
                                    <X size={20} color="#6b7280" />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={styles.fileSelector}
                                onPress={pickDocument}
                            >
                                <Upload size={24} color="#349339" />
                                <Text style={styles.fileSelectorText}>
                                    {selectedFile && !selectedFile.canceled && selectedFile.assets?.[0]
                                        ? selectedFile.assets[0].name
                                        : 'Выберите файл'}
                                </Text>
                            </TouchableOpacity>

                            {selectedFile && !selectedFile.canceled && (
                                <TouchableOpacity
                                    style={styles.uploadButton}
                                    onPress={uploadExcuseDocument}
                                    disabled={uploading}
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
                            )}
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );

    return (
        <>
            <Modal
                visible={visible}
                transparent={true}
                animationType="slide"
                onRequestClose={onClose}
            >
                <View style={[styles.modalOverlay]}>
                    <View style={[styles.modalContent]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Участие в мероприятии</Text>
                            <TouchableOpacity onPress={onClose}>
                                <X size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
                            {/* Выбор статуса */}
                            <View style={styles.field}>
                                <View style={styles.statusButtons}>
                                    <TouchableOpacity
                                        style={[
                                            styles.statusButton,
                                            selectedStatus === 'Yes' && styles.statusButtonActive
                                        ]}
                                        onPress={() => setSelectedStatus('Yes')}
                                    >
                                        <Text style={[
                                            styles.statusButtonText,
                                            selectedStatus === 'Yes' && styles.statusButtonTextActive
                                        ]}>
                                            Пойду
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.statusButton,
                                            selectedStatus === 'No' && styles.statusButtonActive
                                        ]}
                                        onPress={() => setSelectedStatus('No')}
                                    >
                                        <Text style={[
                                            styles.statusButtonText,
                                            selectedStatus === 'No' && styles.statusButtonTextActive
                                        ]}>
                                            Не пойду
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Поля для статуса "Не пойду" */}
                            {selectedStatus === 'No' && (
                                <>
                                    {/* Оправдательная записка */}
                                    <View style={styles.field}>
                                        <TextInput
                                            style={styles.textArea}
                                            value={excuseNote}
                                            onChangeText={setExcuseNote}
                                            placeholder="Укажите причину отсутствия"
                                            multiline
                                            numberOfLines={4}
                                            textAlignVertical="top"
                                        />
                                    </View>

                                    {/* Оправдательный документ */}
                                    <View style={styles.field}>
                                        <Text style={styles.label}>Оправдательный документ</Text>

                                        {excuseDocument ? (
                                            <View style={styles.documentInfo}>
                                                <FileText size={20} color="#349339" />
                                                <Text style={styles.documentName} numberOfLines={1}>
                                                    {excuseDocument.file_name}
                                                </Text>
                                                <TouchableOpacity
                                                    onPress={() => setExcuseDocument(null)}
                                                    style={styles.removeDocument}
                                                >
                                                    <X size={20} color="#ef4444" />
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            <TouchableOpacity
                                                style={styles.addDocumentButton}
                                                onPress={() => {
                                                    fetchCatalogs();
                                                    setShowDocumentPicker(true);
                                                }}
                                            >
                                                <Upload size={20} color="#349339" />
                                                <Text style={styles.addDocumentText}>Загрузить документ</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </>
                            )}

                            {error && (
                                <View style={styles.formError}>
                                    <AlertCircle size={16} color="#ef4444" />
                                    <Text style={styles.formErrorText}>{error}</Text>
                                </View>
                            )}
                        </ScrollView>

                        <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 10}]}>
                            <TouchableOpacity
                                style={[
                                    styles.submitButton,
                                    (selectedStatus === 'Unknown' || submitting) && styles.submitButtonDisabled
                                ]}
                                onPress={submitAttendance}
                                disabled={selectedStatus === 'Unknown' || submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Text style={styles.submitButtonText}>Сохранить</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {renderDocumentPicker()}
        </>
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
        minHeight: '35%',
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
        marginBottom: 20,
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
    statusButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    statusButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#d1d5db',
        backgroundColor: 'white',
        gap: 8,
    },
    statusButtonActive: {
        backgroundColor: '#349339',
        borderColor: '#349339',
    },
    statusButtonText: {
        fontSize: 16,
        color: '#374151',
        fontWeight: '500',
    },
    statusButtonTextActive: {
        color: 'white',
    },
    textArea: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#f9fafb',
        minHeight: 100,
    },
    addDocumentButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        borderStyle: 'dashed',
        backgroundColor: '#f9fafb',
        gap: 8,
    },
    addDocumentText: {
        fontSize: 16,
        color: '#349339',
        fontWeight: '500',
    },
    documentInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        gap: 8,
    },
    documentName: {
        flex: 1,
        fontSize: 14,
        color: '#1f2937',
    },
    removeDocument: {
        padding: 4,
    },
    modalFooter: {

        padding: 16,
        gap: 12,
    },
    submitButton: {
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#349339',
    },
    submitButtonDisabled: {
        backgroundColor: '#9ca3af',
    },
    submitButtonText: {
        fontSize: 16,
        color: 'white',
        fontWeight: '500',
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
    // Document picker styles
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
    fileSelectionContainer: {
        padding: 16,
        gap: 16,
    },
    selectedCatalogInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        gap: 8,
    },
    selectedCatalogText: {
        flex: 1,
        fontSize: 16,
        color: '#1f2937',
    },
    fileSelector: {
        alignItems: 'center',
        padding: 32,
        borderWidth: 2,
        borderColor: '#d1d5db',
        borderRadius: 8,
        borderStyle: 'dashed',
        backgroundColor: '#f9fafb',
        gap: 8,
    },
    fileSelectorText: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#349339',
        gap: 8,
    },
    uploadButtonText: {
        fontSize: 16,
        color: 'white',
        fontWeight: '500',
    },
});
