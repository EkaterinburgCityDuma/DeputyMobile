import { AuthManager } from '@/components/LoginScreen/LoginScreen';
import { apiUrl } from './api';

export interface CreateTaskPayload {
  title: string;
  description: string;
  expected_end_date: string;
  priority: number | null;
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
    const token = AuthManager.getToken();
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

      return await response.json();
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

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Ошибка при получении задач:', error);
      throw error;
    }
  }
  async getTasksByCurrentUser(): Promise<Task[]> {
    try {
      const response = await this.fetchWithTimeout(`${apiUrl}/api/task/get-tasks-by-current-user`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });


      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Ошибка при получении задач:', error);
      throw error;
    }
  }
  async getAssignedTasks(): Promise<Task[]> {
    try {
      const response = await this.fetchWithTimeout(`${apiUrl}/api/task/get-assigned-tasks`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Ошибка при получении задач:', error);
      throw error;
    }
  }
  async getAuthorTasks(): Promise<Task[]> {
    try {
      const response = await this.fetchWithTimeout(`${apiUrl}/api/task/get-author-tasks`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Ошибка при получении задач:', error);
      throw error;
    }
  }

  async deleteTask(id: string) {
    try {
      await this.fetchWithTimeout(`${apiUrl}/api/task/gdelete/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });
    } catch (error) {
      console.error('Ошибка при удалении задач:', error);
      throw error;
    }
  }

  async getTaskById(id: string): Promise<Task> {
    try {
      const response = await this.fetchWithTimeout(`${apiUrl}/api/task/get-task/${id}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();
      console.log('[TaskService] Задача успешно получена:', data);
      return data;
    } catch (error) {
      console.error('[TaskService] Ошибка при получении задачи:', error);
      throw error;
    }
  }

  async updateTask(taskId: string, payload: CreateTaskPayload): Promise<void> {
    const response = await this.fetchWithTimeout(`${apiUrl}/api/task/update/${taskId}`, {
      method: 'POST', // Как указано в твоем требовании
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Ошибка при обновлении задачи');
    }
  }
}

export const taskService = new TaskService();
