import { CatalogItem } from '@/api/catalogService';
import { Document } from '@/api/documentService';
import { SkeletonLoader } from '@/components/ui/Shared/SkeletonLoader';
import { LinearGradient } from "expo-linear-gradient";
import {
    AlertCircle,
    ArrowLeft,
    Folder,
    FolderPlus,
    Home,
    Search,
    Upload
} from 'lucide-react-native';
import {
    ScrollView,
    Text,
    TouchableOpacity,
    View,
    RefreshControl} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CatalogCard } from './CatalogCard';
import { DocumentCard } from './DocumentCard';
import { DocumentDetailModal } from './DocumentDetailModal';
import { useFileManagerPresenter } from './FileManagerPresenter';
import { styles } from './file-manager-screen';
import { CreateCatalogModal } from './CreateCatalogModal';
import {AuthManager} from "@/api/auth";
import {useMemo, useState, useEffect} from "react";
import { UploadingDocumentCard } from './UploadingDocumentCard';
import { useTheme } from '@/context/ThemeContext';

export function FileManager() {
    const { colors, isDark } = useTheme();
    const { state, handlers, computed } = useFileManagerPresenter();
    const insets = useSafeAreaInsets();
    const [userRole, setUserRole] = useState(AuthManager.getRole());

    useEffect(() => {
        setUserRole(AuthManager.getRole());

        return AuthManager.addListener(() => {
            setUserRole(AuthManager.getRole());
        });
    }, []);

    const showCreateCatalogButton = useMemo(() => {
        if (!state.currentCatalog) return false;

        if (state.breadcrumbPath[0]?.name === 'Общий') {
            return userRole === "Admin";
        }
        return true;
    }, [state.currentCatalog, userRole]);

    const showUploadButton = useMemo(() => {
        if (!state.currentCatalog) return false;

        const isRootCatalog = state.currentCatalog.id.startsWith('root-');

        const isRootOfPersonalCatalog = state.breadcrumbPath.length === 1 &&
            state.breadcrumbPath[0]?.name === 'Личный';

        const isRootOfDeputyCatalog = state.breadcrumbPath.length === 1 &&
            state.breadcrumbPath[0]?.name === 'Каталог депутата';

        if (isRootCatalog || isRootOfPersonalCatalog || isRootOfDeputyCatalog) {
            return false;
        }

        return true;
    }, [state.currentCatalog, userRole, state.breadcrumbPath]);

    return (
        <View style={[styles.container, {backgroundColor: colors.background}]}>
            {/* Header */}
            <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, {paddingTop: insets.top + 15}]}>

                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Документы</Text>
                    <Text style={styles.headerSubtitle}>
                        {state.currentCatalog ? state.currentCatalogLabel : 'Выберите каталог'}
                    </Text>
                </View>
                <View style={styles.headerButtonsContainer}>
                    {state.currentCatalog && <TouchableOpacity
                        style={styles.headerButton}
                        onPress={handlers.handleGoBack}
                        accessibilityRole="button"
                        accessibilityLabel="Назад к предыдущему каталогу"
                    >
                        <ArrowLeft size={24} color="#ffffff" />
                    </TouchableOpacity>}
                    {showCreateCatalogButton && (
                        <TouchableOpacity
                            style={styles.headerButton}
                            onPress={handlers.handleOpenCreateModal}
                        >
                            <View pointerEvents="none">
                            <FolderPlus size={24} color="#ffffff" />
                            </View>
                        </TouchableOpacity>
                    )}

                    {showUploadButton && (
                        <TouchableOpacity
                            style={styles.headerButton}
                            onPress={handlers.handleUploadFile}
                        >
                            <View pointerEvents="none">
                            <Upload size={20} color="#ffffff" />
                            </View>
                        </TouchableOpacity>
                    )}
                </View>
            </LinearGradient>

            {/* Breadcrumb */}
            {state.currentCatalog && (
                <View style={[styles.breadcrumb, { backgroundColor: colors.card }]}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.breadcrumbScroll}
                    >
                        <TouchableOpacity
                            style={styles.breadcrumbButton}
                            onPress={() => handlers.handleBreadcrumbClick(-1)}
                        >
                            <View pointerEvents="none">
                            <Home size={20} color={colors.actionIconColor.tasks} />
                            </View>
                        </TouchableOpacity>

                        {state.breadcrumbPath.map((item, index) => (
                            <View key={item.id} style={styles.breadcrumbItemContainer}>
                                <Text style={[styles.breadcrumbSeparator, { color: colors.subtext }]}> / </Text>
                                {index === state.breadcrumbPath.length - 1 ? (
                                    <View style={styles.breadcrumbButtonCurrent}>
                                        <Text style={[styles.breadcrumbTextCurrent, { color: colors.text }]}>{item.name}</Text>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        style={styles.breadcrumbButton}
                                        onPress={() => handlers.handleBreadcrumbClick(index)}
                                    >
                                        <Text style={[styles.breadcrumbText, { color: colors.subtext }]}>{item.name}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}


            {/* Content */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={state.isRefreshing || false}
                                onRefresh={handlers.handleRefresh}
                                colors={[colors.primary]}
                                tintColor={colors.primary}
                            />
                        }>
                {state.loading && !state.isRefreshing && (
                    <SkeletonLoader count={3} itemHeight={80} itemMargin={12} />
                )}

                {state.error && (
                    <View style={styles.errorContainer}>
                        <AlertCircle size={32} color={isDark ? "#f87171" : "#ef4444"} />
                        <Text style={[styles.errorText, { color: colors.text }]}>{state.error}</Text>
                        {state.currentCatalog === null && (
                            <TouchableOpacity
                                style={[styles.errorButton, { backgroundColor: colors.primary }]}
                                onPress={() => handlers.handleGoBack()}
                            >
                                <Text style={styles.errorButtonText}>Попробовать снова</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Root Catalogs or Content */}
                {!state.currentCatalog && !state.loading && !state.error && (
                    <View style={styles.section}>
                        <View style={styles.catalogList}>
                            {userRole === "Admin" &&
                                <CatalogCard
                                catalog={{ id: 'root-public', name: 'Общий', parent_catalog_id: null, type: 'catalog' }}
                                onPress={() => handlers.handleOpenCatalog('public', 'Общий')}
                                />
                            }
                            {userRole === "Deputy" &&
                                <>
                                    <CatalogCard
                                        catalog={{ id: 'root-public', name: 'Общий', parent_catalog_id: null, type: 'catalog' }}
                                        onPress={() => handlers.handleOpenCatalog('public', 'Общий')}
                                    />
                                    <CatalogCard
                                        catalog={{ id: 'root-mine', name: 'Личный', parent_catalog_id: null, type: 'catalog' }}
                                        onPress={() => handlers.handleOpenCatalog('mine', 'Личный')}
                                    />
                                </>
                            }
                            {userRole === "Helper" &&
                                <>
                                    <CatalogCard
                                        catalog={{ id: 'root-public', name: 'Общий', parent_catalog_id: null, type: 'catalog' }}
                                        onPress={() => handlers.handleOpenCatalog('public', 'Общий')}
                                    />
                                    <CatalogCard
                                        catalog={{ id: 'root-deputy', name: 'Каталог депутата', parent_catalog_id: null, type: 'catalog' }}
                                        onPress={() => handlers.handleOpenCatalog('deputy', 'Каталог депутата')}
                                    />
                                </>
                            }
                        </View>
                    </View>
                )}

                {/* Catalogs List */}
                {state.currentCatalog && !state.loading && computed.filteredCatalogs.length > 0 && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Каталоги ({computed.filteredCatalogs.length})</Text>
                        <View style={styles.catalogList}>
                            {computed.filteredCatalogs.map((cat: CatalogItem) => (
                                <CatalogCard
                                    key={cat.id}
                                    catalog={cat}
                                    onPress={handlers.handleOpenChildCatalog}
                                />
                            ))}
                        </View>
                    </View>
                )}

                {/* Documents List */}
                {state.currentCatalog && !state.loading && (computed.filteredDocuments.length > 0 || state.uploading) && (
                    <View style={[styles.section, {marginTop: -8}]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>
                            Файлы ({computed.filteredDocuments.length + (state.uploading ? 1 : 0)})
                        </Text>
                        <View style={styles.documentList}>

                            {/* Плейсхолдер загрузки всегда сверху */}
                            {state.uploading && (
                                <UploadingDocumentCard
                                    progress={state.uploadProgress}
                                    onCancel={handlers.cancelUpload}
                                />
                            )}

                            {/* Обычные документы */}
                            {computed.filteredDocuments.map((doc: Document) => (
                                <DocumentCard
                                    key={doc.id}
                                    document={doc}
                                    getFileIcon={handlers.getFileIcon}
                                    getFileSize={handlers.getFileSize}
                                    onInfoPress={handlers.handleOpenDocumentDetail}
                                    onDownloadPress={() => handlers.handleDownloadDocument(doc)}
                                />
                            ))}
                        </View>
                    </View>
                )}

                {/* Empty State */}
                {state.currentCatalog && !state.loading && computed.filteredCatalogs.length === 0 && computed.filteredDocuments.length === 0 && !state.searchQuery && !state.uploading && (
                    <View style={styles.emptyState}>
                        <View style={[styles.emptyStateIcon, { backgroundColor: isDark ? colors.iconBox : '#F3F4F6' }]}>
                            <Folder size={32} color={colors.subtext} />
                        </View>
                        <Text style={[styles.emptyStateTitle, { color: colors.text }]}>Каталог пуст</Text>
                    </View>
                )}

                {/* No Results State */}
                {state.currentCatalog && !state.loading && computed.filteredCatalogs.length === 0 && computed.filteredDocuments.length === 0 && state.searchQuery && (
                    <View style={styles.emptyState}>
                        <View style={[styles.emptyStateIcon, { backgroundColor: isDark ? colors.iconBox : '#F3F4F6' }]}>
                            <Search size={32} color={colors.subtext} />
                        </View>
                        <Text style={[styles.emptyStateTitle, { color: colors.text }]}>Ничего не найдено</Text>
                        <Text style={[styles.emptyStateSubtitle, { color: colors.subtext }]}>Попробуйте изменить запрос поиска</Text>
                    </View>
                )}
            </ScrollView>

            {/* Create Catalog Modal */}
            <CreateCatalogModal
                visible={state.showCreateModal}
                catalogName={state.catalogName}
                creatingCatalog={state.creatingCatalog}
                createError={state.createError}
                onClose={handlers.handleCloseCreateModal}
                onNameChange={handlers.handleCatalogNameChange}
                onCreate={handlers.handleCreateCatalog}
            />

            {/* Document Detail Modal */}
            <DocumentDetailModal
                visible={state.showDocumentDetailModal}
                document={state.selectedDocument}
                onClose={handlers.handleCloseDocumentDetail}
                onDelete={handlers.handleDeleteDocument}
                onStatusChange={handlers.handleStatusChange}
                getFileSize={handlers.getFileSize}
            />
        </View>
    );
}
