import { MotionPressable, Reveal } from '@/components/ui/Shared/Motion';
import { CatalogItem } from '@/api/catalogService';
import { Document } from "@/api/documentService"
import { Info , CheckCircle2 } from 'lucide-react-native';
import { Text, View, Image, Platform } from 'react-native';
import { styles } from './file-manager-screen';
import { JSX, useState, useEffect } from 'react';
import { apiUrl } from "@/api/api";
import {xAppSecret, AuthManager } from "@/api/auth";

import {ImagePreviewModal} from "@/components/EventsScreen/ImagePreviewModal";
import { useTheme } from '@/context/ThemeContext';

import { useFileManagerStore } from '@/store/useFileManagerStore';


interface DocumentCardProps {
    document: Document;
    getFileIcon: (item: CatalogItem) => JSX.Element;
    getFileSize: (fileSize: number) => string;
    onInfoPress: (document: Document) => void;
    onDownloadPress: () => void;
}

export function DocumentCard({ document, getFileIcon, getFileSize, onInfoPress, onDownloadPress }: DocumentCardProps) {
    const { colors, isDark } = useTheme();
    const { downloadedFiles } = useFileManagerStore();
    const isDownloaded = downloadedFiles.includes(document.id);

    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg'];
    const isImage = imageExtensions.includes(document.content_type?.toLowerCase());
    const token = AuthManager.getToken();
    const imageUrl = `${apiUrl}/api/files/${encodeURIComponent(`${document.file_name}`)}`;
    const imageHeaders = {
        Authorization: `Bearer ${token}`,
        'X-App-Secret': xAppSecret
    };

    const [webPreviewUrl, setWebPreviewUrl] = useState<string | null>(null);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        if (Platform.OS === 'web' && isImage) {
            let isMounted = true;

            const fetchImageForWeb = async () => {
                try {
                    const response = await fetch(imageUrl, {
                        headers: imageHeaders
                    });
                    if (!response.ok) throw new Error('Failed to fetch image');

                    const blob = await response.blob();
                    const objectUrl = URL.createObjectURL(blob);

                    if (isMounted) {
                        setWebPreviewUrl(objectUrl);
                    }
                } catch (error) {
                    console.error('Error loading image preview for web:', error);
                    setImageError(true);
                }
            };

            fetchImageForWeb();

            return () => {
                isMounted = false;
                if (webPreviewUrl) {
                    URL.revokeObjectURL(webPreviewUrl);
                }
            };
        }
    }, [document.file_name, isImage]);

    const imageSource = Platform.OS === 'web'
        ? { uri: webPreviewUrl || undefined }
        : {
            uri: imageUrl,
            headers: imageHeaders
        };

    const handleImagePress = () => {
        if (isImage && !imageError && (webPreviewUrl || imageSource.uri)) {
            setPreviewVisible(true);
        } else {
            // Если не изображение или ошибка загрузки, скачиваем файл
            onDownloadPress();
        }
    };

    const handleDownloadFromPreview = () => {
        setPreviewVisible(false);
        onDownloadPress();
    };

    return (
        <>
            <Reveal style={[styles.documentItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <MotionPressable accessibilityLabel={`Открыть ${document.file_name}`} onPress={handleImagePress} style={styles.documentContent}>
                    <View style={[styles.documentIconContainer, { backgroundColor: isDark ? colors.iconBox : '#F3F4F6' }]}>
                        {isImage && !imageError ? (
                            <Image
                                source={imageSource}
                                style={{ width: "100%", height: "100%", borderRadius: 8 }}
                                resizeMode="cover"
                                onError={() => setImageError(true)}
                            />
                        ) : (
                            getFileIcon({
                                id: document.id,
                                name: document.content_type,
                                parent_catalog_id: null,
                                type: 'document'
                            } as CatalogItem)
                        )}
                    </View>

                    <View style={styles.documentInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.documentName, { color: colors.text, flex: 1 }]} numberOfLines={1}>
                                {document.file_name}{document.content_type}
                            </Text>
                            {isDownloaded && (
                                <CheckCircle2 size={14} color={colors.primary} />
                            )}
                        </View>
                        <View style={styles.documentMeta}>
                            <Text style={[styles.documentMetaText, { color: colors.subtext }]}>
                                Размер: {getFileSize(document.file_size)}
                            </Text>
                        </View>
                    </View>

                    <MotionPressable
                        style={styles.documentActionButton}
                        accessibilityLabel="Сведения о документе" onPress={event => { event.stopPropagation(); onInfoPress(document); }}
                    >
                        <View pointerEvents="none">
                            <Info size={18} color={colors.subtext} />
                        </View>
                    </MotionPressable>
                </MotionPressable>
            </Reveal>

            <ImagePreviewModal
                visible={previewVisible}
                onClose={() => {
                    setPreviewVisible(false);
                }}
                fileName={document.file_name}
                onDownload={handleDownloadFromPreview}
            />
        </>
    );
}
