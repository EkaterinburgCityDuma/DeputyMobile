import { CatalogItem} from '@/api/catalogService';
import {Document} from "@/api/documentService"
import { Download, Info } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from './file-manager-screen';
import { JSX } from 'react';
import { Image } from 'react-native';
import {apiUrl} from "@/api/api";
import {AuthManager} from "@/components/LoginScreen/LoginScreen";

interface DocumentCardProps {
    document: Document;
    getFileIcon: (item: CatalogItem) => JSX.Element;
    getFileSize: (fileSize: number) => string;
    onInfoPress: (document: Document) => void;
    onDownloadPress: () => void;
}

export function DocumentCard({ document, getFileIcon, getFileSize, onInfoPress, onDownloadPress }: DocumentCardProps) {
    const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(document.file_name_encoded);
    const token = AuthManager.getToken();

    return (
        <View style={styles.documentItem}>
            <View style={styles.documentContent}>
                <View style={styles.documentIconContainer}>
                    {isImage ? (
                        <Image
                            source={{
                                uri: `${apiUrl}/api/files/${encodeURIComponent(document.file_name)}`,
                                headers: { Authorization: `Bearer ${token}` }
                            }}
                            style={{ width: "100%", height: "100%", borderRadius: 8}}
                            resizeMode="cover"
                        />
                    ) : (
                        getFileIcon({
                            id: document.id,
                            name: document.file_name_encoded,
                            parent_catalog_id: null,
                            type: 'document'
                        } as CatalogItem)
                    )}
                </View>

                <View style={styles.documentInfo}>
                    <Text style={styles.documentName} numberOfLines={1}>
                        {document.file_name}
                    </Text>
                    <View style={styles.documentMeta}>
                        <Text style={styles.documentMetaText}>
                            Размер: {getFileSize(document.file_size)}
                        </Text>
                    </View>
                </View>

                <View style={styles.documentActions}>
                    {/* Исправленный вызов функции */}
                    <TouchableOpacity style={styles.documentActionButton} onPress={onDownloadPress}>
                        <Download size={17} color="#777d87" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.documentActionButton}
                        onPress={() => onInfoPress(document)}
                    >
                        <Info size={18} color="#777d87" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}
