import { AuthManager } from '@/components/LoginScreen/LoginScreen';
import { apiUrl } from './api';

export interface DocumentApiResponse {
    id: string;
    file_name: string;
    file_name_encoded: string;
    status: number;
    start_date: string;
    end_date: string;
    url: string;
    content_type: string;
    size: number;
    uploaded_by_id: string;
    catalog_id: string;
    post_id: string;
    post?: {
        id: string;
        title: string;
        summary: string;
        body: string;
        created_by_id: string;
        created_at: string;
        published_at: string;
        thumbnail_url: string;
        attachments: string[];
    };
    uploaded_at: string;
}

export interface Document {
    id: string;
    file_name: string;
    file_name_encoded: string;
    file_size: number;
    uploaded_at: string;
    content_type: string;
    url: string;
}

class DocumentService {
    private getAuthHeaders() {
        const token = AuthManager.getToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
        };
    }

    private async fetchWithTimeout(
        url: string,
        options: RequestInit = {},
        timeout: number = 10000
    ): Promise<Response> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    private adaptDocument(data: DocumentApiResponse): Document {
        return {
            id: data.id,
            file_name: data.file_name,
            file_name_encoded: data.file_name_encoded,
            file_size: data.size,
            uploaded_at: data.uploaded_at,
            content_type: data.content_type,
            url: data.url,
        };
    }

    async getDocumentsByCatalog(catalogId: string): Promise<Document[]> {
        try {
            const response = await this.fetchWithTimeout(
                `${apiUrl}/api/Documents/by-catalog/${catalogId}`,
                {
                    method: 'GET',
                    headers: this.getAuthHeaders(),
                }
            );

            if (!response.ok) {
                throw new Error(`Ошибка при получении файлов: ${response.status}`);
            }

            const data = await response.json();

            let documentsData = Array.isArray(data) ? data : (data?.data || []);
            const documents = Array.isArray(documentsData)
                ? documentsData.map(item => this.adaptDocument(item))
                : [];

            return documents;
        } catch (error) {
            console.error('[DocumentService] Ошибка при получении файлов:', error);
            throw error;
        }
    }

    async uploadDocument(
        file: { uri: string; name: string; type: string },
        catalogId: string,
        documentStatus?: number,
        startDate?: string,
        endDate?: string
    ): Promise<Document> {
        try {
            const formData = new FormData();
            formData.append('File', {
                uri: file.uri,
                name: file.name,
                type: file.type || 'application/octet-stream',
            } as any);
            formData.append('CatalogId', catalogId);
            formData.append('DocumentStatus', (documentStatus ?? 0).toString());

            if (startDate) {
                formData.append('StartDate', startDate);
            }

            if (endDate) {
                formData.append('EndDate', endDate);
            }

            const token = AuthManager.getToken();

            const response = await fetch(
                `${apiUrl}/api/Documents/upload`,
                {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': token ? `Bearer ${token}` : '',
                        'Content-Type': 'multipart/form-data',
                    },
                    body: formData,
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[DocumentService] Ошибка ответа сервера:', errorText);
                throw new Error(`Ошибка при загрузке файла: ${response.status} - ${errorText}`);
            }

            const data: DocumentApiResponse = await response.json();
            return this.adaptDocument(data);
        } catch (error) {
            console.error('[DocumentService] Ошибка при загрузке файла:', error);
            throw error;
        }
    }

    async deleteDocument(documentId: string): Promise<void> {
        try {
            const response = await this.fetchWithTimeout(
                `${apiUrl}/api/Documents/${documentId}`,
                {
                    method: 'DELETE',
                    headers: this.getAuthHeaders(),
                }
            );

            if (!response.ok) {
                throw new Error(`Ошибка при удалении файла: ${response.status}`);
            }

            console.log('[DocumentService] Файл успешно удален:', documentId);
        } catch (error) {
            console.error('[DocumentService] Ошибка при удалении файла:', error);
            throw error;
        }
    }
}

export const documentService = new DocumentService();
