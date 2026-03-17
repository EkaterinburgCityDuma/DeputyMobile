import { CatalogItem, catalogService } from '@/api/catalogService';
import { Document, documentService } from '@/api/documentService';
import * as DocumentPicker from 'expo-document-picker';
import {
    File,
    FileSpreadsheet,
    FileText,
    Folder,
    Image as ImageIcon,
    Presentation,
    Archive,
    Music,
    Video,
    Terminal,
    Code
} from 'lucide-react-native';

import {JSX, useState} from 'react';
import {AuthManager} from "@/components/LoginScreen/LoginScreen";
import {cacheDirectory, documentDirectory, downloadAsync} from "expo-file-system/legacy";
import {apiUrl} from "@/api/api";
import Toast from "react-native-toast-message";
import * as Sharing from "expo-sharing";
import {Alert} from "react-native";

export interface FileManagerState {
    currentCatalog: CatalogItem | null;
    currentCatalogLabel: string;
    searchQuery: string;
    loading: boolean;
    error: string | null;
    documents: Document[];
    showCreateModal: boolean;
    catalogName: string;
    creatingCatalog: boolean;
    createError: string | null;
    breadcrumbPath: { id: string; name: string }[];
    currentRootCatalog: CatalogItem | null;
    catalogHierarchy: Map<string, CatalogItem>;
    selectedDocument: Document | null;
    showDocumentDetailModal: boolean;
    isRefreshing: boolean;
}

export interface FileManagerHandlers {
    handleOpenCatalog: (type: 'public' | 'mine' | 'deputy', label: string) => Promise<void>;
    handleGoBack: () => void;
    handleBreadcrumbClick: (index: number) => Promise<void>;
    handleOpenChildCatalog: (catalog: CatalogItem) => Promise<void>;
    handleOpenCreateModal: () => void;
    handleCreateCatalog: () => Promise<void>;
    handleSearchChange: (query: string) => void;
    handleCloseCreateModal: () => void;
    handleCatalogNameChange: (name: string) => void;
    handleUploadFile: () => Promise<void>;
    handleOpenDocumentDetail: (document: Document) => void;
    handleCloseDocumentDetail: () => void;
    handleDeleteDocument: (documentId: string) => Promise<void>;
    getFileIcon: (item: CatalogItem, size?: number) => JSX.Element;
    getFileSize: (fileSize: number) => string;
    handleRefresh: () => Promise<void>;
    handleDownloadDocument: (fileName: string, serverUrl: string) => Promise<void>;
}

export interface FileManagerComputed {
    displayCatalogs: CatalogItem[];
    filteredCatalogs: CatalogItem[];
    filteredDocuments: Document[];
}

export const useFileManagerPresenter = () => {
    const [currentCatalog, setCurrentCatalog] = useState<CatalogItem | null>(null);
    const [currentCatalogLabel, setCurrentCatalogLabel] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [catalogName, setCatalogName] = useState('');
    const [creatingCatalog, setCreatingCatalog] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [breadcrumbPath, setBreadcrumbPath] = useState<{ id: string; name: string }[]>([]);
    const [currentRootCatalog, setCurrentRootCatalog] = useState<CatalogItem | null>(null);
    const [catalogHierarchy, setCatalogHierarchy] = useState<Map<string, CatalogItem>>(new Map());
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [documentsCache, setDocumentsCache] = useState<Map<string, Document[]>>(new Map());
    const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
    const [showDocumentDetailModal, setShowDocumentDetailModal] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Функция для построения плоской карты каталогов для быстрого поиска
    const buildCatalogMap = (catalogs: CatalogItem[], map: Map<string, CatalogItem> = new Map()): Map<string, CatalogItem> => {
        catalogs.forEach(catalog => {
            map.set(catalog.id, catalog);
            if (catalog.children && catalog.children.length > 0) {
                buildCatalogMap(catalog.children, map);
            }
        });
        return map;
    };

    const loadDocumentsWithCache = async (catalogId: string): Promise<Document[]> => {
        if (documentsCache.has(catalogId)) {
            return documentsCache.get(catalogId) || [];
        }
        const docs = await documentService.getDocumentsByCatalog(catalogId);

        const newCache = new Map(documentsCache);
        newCache.set(catalogId, docs);
        setDocumentsCache(newCache);

        return docs;
    };

    const handleOpenCatalog = async (type: 'public' | 'mine' | 'deputy', label: string) => {
        setLoading(true);
        setError(null);
        setDocuments([]);
        try {
            let catalogs: CatalogItem[];

            if (type === 'public') {
                catalogs = await catalogService.getPublicCatalogs();
            } else if (type === 'mine') {
                catalogs = await catalogService.getMysCatalogs();
            } else {
                catalogs = await catalogService.getDeputyCatalogs();
            }

            if (catalogs.length > 0) {
                const rootCatalog: CatalogItem = {
                    id: `root-${type}`,
                    name: label,
                    parent_catalog_id: null,
                    type: 'catalog',
                    children: catalogs,
                };
                setCurrentRootCatalog(rootCatalog);
                const hierarchy = buildCatalogMap([rootCatalog]);
                setCatalogHierarchy(hierarchy);

                setCurrentCatalog(rootCatalog);
                setCurrentCatalogLabel(label);
                setBreadcrumbPath([{ id: rootCatalog.id, name: label }]);
            } else {
                const emptyRoot: CatalogItem = { id: 'empty', name: label, parent_catalog_id: null, type: 'catalog' };
                setCurrentRootCatalog(emptyRoot);
                setCatalogHierarchy(new Map());

                setCurrentCatalog(emptyRoot);
                setCurrentCatalogLabel(label);
                setBreadcrumbPath([{ id: 'empty', name: label }]);
            }
        } catch (error: any) {
            setError(error?.message || 'Не удалось загрузить каталог');
            setCurrentCatalog(null);
            setCurrentCatalogLabel('');
        } finally {
            setLoading(false);
        }
    };

    const handleGoBack = () => {
        setCurrentCatalog(null);
        setCurrentCatalogLabel('');
        setSearchQuery('');
        setError(null);
        setDocuments([]);
        setBreadcrumbPath([]);
        setCurrentRootCatalog(null);
        setCatalogHierarchy(new Map());
    };

    const handleBreadcrumbClick = async (index: number) => {
        if (index === -1) {
            handleGoBack();
            return;
        }

        const selectedPath = breadcrumbPath[index];

        if (selectedPath.id.startsWith('root-')) {
            let catalogType: 'public' | 'mine' | 'deputy' = 'public';
            if (selectedPath.id === 'root-public') catalogType = 'public';
            else if (selectedPath.id === 'root-mine') catalogType = 'mine';
            else if (selectedPath.id === 'root-deputy') catalogType = 'deputy';

            handleOpenCatalog(catalogType, selectedPath.name);
            return;
        }

        const catalogInHierarchy = catalogHierarchy.get(selectedPath.id);

        if (catalogInHierarchy) {
            if (catalogInHierarchy.children && catalogInHierarchy.children.length > 0) {
                const newPath = breadcrumbPath.slice(0, index + 1);
                setBreadcrumbPath(newPath);
                setCurrentCatalog(catalogInHierarchy);
                setLoading(true);
                try {
                    const cachedDocs = await loadDocumentsWithCache(catalogInHierarchy.id);
                    setDocuments(cachedDocs);
                } catch (err: any) {
                    console.error('[FileManager] Ошибка при загрузке документов:', err);
                    setError(err?.message || 'Не удалось загрузить документы');
                    setDocuments([]);
                } finally {
                    setLoading(false);
                }
                return;
            }
        }

        const newPath = breadcrumbPath.slice(0, index + 1);
        setBreadcrumbPath(newPath);

        setLoading(true);
        setError(null);

        try {
            const docs = await loadDocumentsWithCache(selectedPath.id);
            setDocuments(docs);
            setCurrentCatalog({
                id: selectedPath.id,
                name: selectedPath.name,
                parent_catalog_id: null,
                type: 'catalog',
            });
        } catch (err: any) {
            console.error('[FileManager] Ошибка при переходе:', err);
            setError(err?.message || 'Не удалось загрузить каталог');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenChildCatalog = async (catalog: CatalogItem) => {
        setLoading(true);
        setError(null);
        try {
            const docs = await loadDocumentsWithCache(catalog.id);
            setDocuments(docs);
            setCurrentCatalog(catalog);
            setBreadcrumbPath([...breadcrumbPath, { id: catalog.id, name: catalog.name }]);
        } catch (err: any) {
            setError(err?.message || 'Не удалось загрузить документы');
            setDocuments([]);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreateModal = () => {
        setCatalogName('');
        setCreateError(null);
        setShowCreateModal(true);
    };

    const handleCloseCreateModal = () => {
        setShowCreateModal(false);
        setCatalogName('');
        setCreateError(null);
    };

    const handleSearchChange = (query: string) => {
        setSearchQuery(query);
    };

    const handleCatalogNameChange = (name: string) => {
        setCatalogName(name);
    };

    const handleCreateCatalog = async () => {
        if (!catalogName.trim()) {
            setCreateError('Введите название каталога');
            return;
        }

        setCreatingCatalog(true);
        setCreateError(null);
        let parentId: string | undefined = undefined;

        try {
            if (
                currentCatalog?.id &&
                currentCatalog.id !== 'empty' &&
                !currentCatalog.id.startsWith('root-')
            ) {
                parentId = currentCatalog.id;
            }
            const currentBreadcrumbPath = [...breadcrumbPath];
            const currentCatalogId = currentCatalog?.id;

            if (currentCatalogLabel === 'Личный') {
                await catalogService.createPrivateCatalog(catalogName.trim(), parentId);
            } else {
                await catalogService.createPublicCatalog(catalogName.trim(), parentId);
            }

            handleCloseCreateModal();

            if (currentCatalog && currentCatalogId) {
                const catalogType = currentCatalogLabel === 'Личный' ? 'mine' :
                                  currentCatalogLabel === 'Каталог депутата' ? 'deputy' : 'public';

                let updatedCatalogs: CatalogItem[];

                if (catalogType === 'public') {
                    updatedCatalogs = await catalogService.getPublicCatalogs();
                } else if (catalogType === 'mine') {
                    updatedCatalogs = await catalogService.getMysCatalogs();
                } else {
                    updatedCatalogs = await catalogService.getDeputyCatalogs();
                }

                if (updatedCatalogs.length > 0) {
                    const rootCatalog: CatalogItem = {
                        id: `root-${catalogType}`,
                        name: currentCatalogLabel,
                        parent_catalog_id: null,
                        type: 'catalog',
                        children: updatedCatalogs,
                    };

                    const hierarchy = buildCatalogMap([rootCatalog]);
                    setCatalogHierarchy(hierarchy);
                    setCurrentRootCatalog(rootCatalog);

                    if (currentCatalogId.startsWith('root-')) {
                        setCurrentCatalog(rootCatalog);
                    } else {
                        const updatedCatalog = hierarchy.get(currentCatalogId);
                        if (updatedCatalog) {
                            setCurrentCatalog(updatedCatalog);
                            // Инвалидируем кэш для текущего каталога
                            const newCache = new Map(documentsCache);
                            newCache.delete(currentCatalogId);
                            setDocumentsCache(newCache);
                            // Загружаем обновленный список документов
                            const docs = await documentService.getDocumentsByCatalog(currentCatalogId);
                            setDocuments(docs);
                            // Добавляем в кэш
                            const updatedCache = new Map(newCache);
                            updatedCache.set(currentCatalogId, docs);
                            setDocumentsCache(updatedCache);
                        }
                    }

                    setBreadcrumbPath(currentBreadcrumbPath);
                }
            }
        } catch (err: any) {
            console.error('[FileManager] Ошибка при создании каталога:', err);
            setCreateError(err?.message || 'Не удалось создать каталог');
        } finally {
            setCreatingCatalog(false);
        }
    };

    const handleRefresh = async () => {
        // Если мы не выбрали ни один раздел (мы на главном экране), обновлять нечего
        if (!currentCatalog && breadcrumbPath.length === 0) return;

        setIsRefreshing(true);
        setError(null);

        try {
            // 1. Определяем текущий корневой раздел для обновления структуры папок
            let catalogType: 'public' | 'mine' | 'deputy' | null = null;
            if (breadcrumbPath.length > 0) {
                const rootId = breadcrumbPath[0].id;
                if (rootId === 'root-public') catalogType = 'public';
                else if (rootId === 'root-mine') catalogType = 'mine';
                else if (rootId === 'root-deputy') catalogType = 'deputy';
            }

            // 2. Обновляем иерархию папок
            if (catalogType) {
                let updatedCatalogs: CatalogItem[] = [];
                if (catalogType === 'public') {
                    updatedCatalogs = await catalogService.getPublicCatalogs();
                } else if (catalogType === 'mine') {
                    updatedCatalogs = await catalogService.getMysCatalogs();
                } else if (catalogType === 'deputy') {
                    updatedCatalogs = await catalogService.getDeputyCatalogs();
                }

                if (updatedCatalogs.length > 0) {
                    const rootCatalog: CatalogItem = {
                        id: `root-${catalogType}`,
                        name: breadcrumbPath[0].name,
                        parent_catalog_id: null,
                        type: 'catalog',
                        children: updatedCatalogs,
                    };

                    const hierarchy = buildCatalogMap([rootCatalog]);
                    setCatalogHierarchy(hierarchy);
                    setCurrentRootCatalog(rootCatalog);

                    // Обновляем текущий каталог новыми данными (если в нем создали новую подпапку)
                    if (currentCatalog) {
                        if (currentCatalog.id.startsWith('root-')) {
                            setCurrentCatalog(rootCatalog);
                        } else {
                            const updatedCurrent = hierarchy.get(currentCatalog.id);
                            if (updatedCurrent) {
                                setCurrentCatalog(updatedCurrent);
                            }
                        }
                    }
                }
            }

            // 3. Обновляем документы для текущей папки (если это не корень)
            if (currentCatalog && !currentCatalog.id.startsWith('root-') && currentCatalog.id !== 'empty') {
                const currentId = currentCatalog.id;

                // Удаляем старые данные из кэша
                const newCache = new Map(documentsCache);
                newCache.delete(currentId);
                setDocumentsCache(newCache);

                // Загружаем свежие документы
                const freshDocs = await documentService.getDocumentsByCatalog(currentId);
                setDocuments(freshDocs);

                // Сохраняем свежие документы в кэш
                const updatedCache = new Map(newCache);
                updatedCache.set(currentId, freshDocs);
                setDocumentsCache(updatedCache);
            }

        } catch (err: any) {
            console.error('[FileManager] Ошибка при обновлении:', err);
            setError(err?.message || 'Не удалось обновить данные');
        } finally {
            setIsRefreshing(false);
        }
    };

    const getFileIcon = (item: CatalogItem, size = 20): JSX.Element => {
        if (item.children) {
            return <Folder size={size} color="#2A6E3F" />;
        }

        const ext = item.name.split('.').pop()?.toLowerCase();

        switch (ext) {
            // Документы
            case 'pdf':
                return <FileText size={size} color="#ef4444" />;
            case 'doc':
            case 'docx':
                return <FileText size={size} color="#3b82f6" />;
            case 'xls':
            case 'xlsx':
                return <FileSpreadsheet size={size} color="#16a34a" />;
            case 'txt':
                return <FileText size={size} color="#6b7280" />;

            // Презентации
            case 'ppt':
            case 'pptx':
                return <Presentation size={size} color="#f97316" />;

            // Архивы
            case 'zip':
            case 'rar':
            case '7z':
            case 'tar':
            case 'gz':
                return <Archive size={size} color="#f59e0b" />;

            // Аудио
            case 'mp3':
            case 'wav':
            case 'ogg':
            case 'flac':
            case 'aac':
                return <Music size={size} color="#10b981" />;

            // Видео
            case 'mp4':
            case 'avi':
            case 'mkv':
            case 'mov':
            case 'wmv':
            case 'flv':
                return <Video size={size} color="#ef4444" />;

            default:
                return <File size={size} color="#6b7280" />;
        }
    };

    const getFileSize = (fileSize: number): string => {
        if (fileSize > 0) {
            return `${(fileSize / 1024).toFixed(2)} КБ`;
        }
        return 'N/A';
    };

    const handleUploadFile = async () => {
        if (!currentCatalog || currentCatalog.id === 'empty') {
            setUploadError('Выберите каталог для загрузки файла');
            return;
        }

        try {
            setUploading(true);
            setUploadError(null);

            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
            });

            if (result.assets && result.assets.length > 0) {
                const file = result.assets[0];
                const currentCatalogId = currentCatalog.id;

                const uploadedDoc = await documentService.uploadDocument(
                    {
                        uri: file.uri,
                        name: file.name,
                        type: file.mimeType || 'application/octet-stream',
                    },
                    currentCatalogId
                );


                // Инвалидируем кэш для текущего каталога
                const newCache = new Map(documentsCache);
                newCache.delete(currentCatalogId);
                setDocumentsCache(newCache);

                // Загружаем обновленный список документов с сервера
                const docs = await documentService.getDocumentsByCatalog(currentCatalogId);
                setDocuments(docs);

                // Добавляем обновленный список в кэш
                const updatedCache = new Map(newCache);
                updatedCache.set(currentCatalogId, docs);
                setDocumentsCache(updatedCache);
            }
        } catch (error: any) {
            console.error('[FileManager] Ошибка при загрузке файла:', error);
            setUploadError(error?.message || 'Не удалось загрузить файл');
        } finally {
            setUploading(false);
        }
    };

    const handleOpenDocumentDetail = (document: Document) => {
        setSelectedDocument(document);
        setShowDocumentDetailModal(true);
    };

    const handleCloseDocumentDetail = () => {
        setShowDocumentDetailModal(false);
        setSelectedDocument(null);
    };

    const handleDownloadDocument = async (fileName: string, serverUrl: string) => {
        try {
            if (!serverUrl) return;

            const token = AuthManager.getToken();
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

    const handleDeleteDocument = async (documentId: string) => {
        try {
            await documentService.deleteDocument(documentId);

            // Удаляем документ из текущего списка
            const updatedDocuments = documents.filter(doc => doc.id !== documentId);
            setDocuments(updatedDocuments);

            // Инвалидируем кэш для текущего каталога
            if (currentCatalog) {
                const newCache = new Map(documentsCache);
                newCache.delete(currentCatalog.id);
                setDocumentsCache(newCache);
            }

            console.log('[FileManager] Документ успешно удален');
        } catch (error: any) {
            console.error('[FileManager] Ошибка при удалении документа:', error);
            throw error;
        }
    };

    const displayCatalogs = currentCatalog?.children || [];

    const filteredCatalogs = displayCatalogs.filter((cat: CatalogItem) =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredDocuments = documents.filter((doc: Document) =>
        doc.file_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const state: FileManagerState = {
        currentCatalog,
        currentCatalogLabel,
        searchQuery,
        loading,
        error,
        documents,
        showCreateModal,
        catalogName,
        creatingCatalog,
        createError,
        breadcrumbPath,
        currentRootCatalog,
        catalogHierarchy,
        selectedDocument,
        showDocumentDetailModal,
        isRefreshing,
    };

    const handlers: FileManagerHandlers = {
        handleOpenCatalog,
        handleGoBack,
        handleBreadcrumbClick,
        handleOpenChildCatalog,
        handleOpenCreateModal,
        handleCreateCatalog,
        handleSearchChange,
        handleCloseCreateModal,
        handleCatalogNameChange,
        handleUploadFile,
        handleOpenDocumentDetail,
        handleCloseDocumentDetail,
        handleDeleteDocument,
        getFileIcon,
        getFileSize,
        handleRefresh,
        handleDownloadDocument,
    };

    const computed: FileManagerComputed = {
        displayCatalogs,
        filteredCatalogs,
        filteredDocuments,
    };

    return { state, handlers, computed };
};
