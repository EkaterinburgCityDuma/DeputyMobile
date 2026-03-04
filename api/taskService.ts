import { AuthTokenManager } from '@/components/LoginScreen/LoginScreen';
import { apiUrl } from './api';

export interface CreateTaskPayload {
  title: string;
  description: string;
  startDate: string;
  expectedEndDate: string;
  priority: number;
  status: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  startDate: string;
  expectedEndDate: string;
  priority: number;
  status: string;
  [key: string]: any;
}

class TaskService {
  private getAuthHeaders() {
    const token = AuthTokenManager.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  private async fetchWithTimeout(url: string, options: RequestInit = {}, timeout: number = 10000): Promise<Response> {
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

  async createTask(payload: CreateTaskPayload): Promise<Task> {
    try {
      const response = await this.fetchWithTimeout(`${apiUrl}/api/task/create`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Ошибка при создании задачи: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Ошибка при создании задачи:', error);
      throw error;
    }
  }

  async getStatuses(): Promise<{ name: string; isDefault: boolean }[]> {
    const response = await this.fetchWithTimeout(`${apiUrl}/api/Status/get-all`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Ошибка загрузки статусов');
    return await response.json();
  }

  async getAllTasks(): Promise<Task[]> {
    try {
      const response = await this.fetchWithTimeout(`${apiUrl}/api/task/get-tasks`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Ошибка при получении задач: ${response.status}`);
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Ошибка при получении задач:', error);
      throw error;
    }
  }

  async getTaskById(id: string): Promise<Task> {
    try {
      console.log('[TaskService] Получение задачи с ID:', id);
      const response = await this.fetchWithTimeout(`${apiUrl}/api/task/get-task/${id}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Ошибка при получении задачи: ${response.status}`);
      }

      const data = await response.json();
      console.log('[TaskService] Задача успешно получена:', data);
      return data;
    } catch (error) {
      console.error('[TaskService] Ошибка при получении задачи:', error);
      throw error;
    }
  }
}

export const taskService = new TaskService();
