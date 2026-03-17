import { apiUrl } from '@/api/api';
import { Document } from '@/api/documentService';
import { AlertCircle, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated, Linking,
    Modal,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { styles } from './file-manager-screen';
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface DocumentDetailModalProps {
    visible: boolean;
    document: Document | null;
    onClose: () => void;
    onDelete: (documentId: string) => Promise<void>;
}

export function DocumentDetailModal({ visible, document, onClose, onDelete }: DocumentDetailModalProps) {
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const slideAnim = useRef(new Animated.Value(1000)).current;
    const insets = useSafeAreaInsets();

    useEffect(() => {
        if (visible) {
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: 1000,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [visible, slideAnim]);

    const handleDeletePress = () => {
        Alert.alert(
            'Удалить файл?',
            `Вы уверены, что хотите удалить файл "${document?.file_name}"? Это действие нельзя отменить.`,
            [
                {
                    text: 'Отмена',
                    onPress: () => {},
                    style: 'cancel',
                },
                {
                    text: 'Удалить',
                    onPress: async () => {
                        if (!document) return;
                        await handleDelete(document.id);
                    },
                    style: 'destructive',
                },
            ],
            { cancelable: true }
        );
    };

    const handleDelete = async (documentId: string) => {
        try {
            setDeleting(true);
            setDeleteError(null);
            await onDelete(documentId);
            onClose();
        } catch (error: any) {
            console.error('[DocumentDetailModal] Ошибка при удалении:', error);
            setDeleteError(error?.message || 'Не удалось удалить файл');
        } finally {
            setDeleting(false);
        }
    };

    if (!document) return null;

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return dateString;
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Байт';
        const k = 1024;
        const sizes = ['Байт', 'КБ', 'МБ', 'ГБ'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    const openURL = async () => {
        const url = `${apiUrl}/${document.url}`;
        const supported = await Linking.canOpenURL(url);
    }

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={[styles.documentDetailModalOverlay, {paddingBottom: insets.bottom}]}>
                <Animated.View
                    style={[
                        styles.documentDetailModalContent,
                        {
                            transform: [{ translateY: slideAnim }],
                        }
                    ]}
                >
                    {/* Header */}
                    <View style={styles.documentDetailModalHeader}>
                        <Text style={styles.documentDetailModalTitle}>Информация</Text>
                        <TouchableOpacity onPress={onClose} disabled={deleting}>
                            <X size={24} color="#1f2937" />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <ScrollView style={styles.documentDetailModalBody} showsVerticalScrollIndicator={false}>
                        {/* File Name */}
                        <View style={styles.documentDetailField}>
                            <Text style={styles.documentDetailLabel}>Файл</Text>
                            <Text style={styles.documentDetailValue}>{document.file_name}.{document.file_name_encoded.split('.')[1]}</Text>
                        </View>

                        {/* File Size */}
                        <View style={styles.documentDetailField}>
                            <Text style={styles.documentDetailLabel}>Размер</Text>
                            <Text style={styles.documentDetailValue}>{formatFileSize(document.file_size)}</Text>
                        </View>

                        {/* Uploaded At */}
                        <View style={styles.documentDetailField}>
                            <Text style={styles.documentDetailLabel}>Дата загрузки</Text>
                            <Text style={styles.documentDetailValue}>{formatDate(document.uploaded_at)}</Text>
                        </View>


                        {/* Error Message */}
                        {deleteError && (
                            <View style={styles.documentDetailError}>
                                <AlertCircle size={20} color="#ef4444" />
                                <Text style={styles.documentDetailErrorText}>{deleteError}</Text>
                            </View>
                        )}
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.documentDetailModalFooter}>
                        <TouchableOpacity
                            style={[styles.documentDetailButtonDelete, deleting && { opacity: 0.6 }]}
                            onPress={handleDeletePress}
                            disabled={deleting}
                        >
                            {deleting ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                                <Text style={styles.documentDetailButtonDeleteText}>Удалить</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}
