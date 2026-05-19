import axios from 'axios';
import authService from './authService';
import {
  ChatResponse,
  DatabaseConnection,
  DatabaseConnectionForm,
  QueryResult,
  DatabaseSchema,
  KnowledgeBaseFile,
  FileUploadResponse,
  KnowledgeBaseStats,
  SearchResult,
  ApiResponse,
  DataAnalysis
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Configurar axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token de autenticación
api.interceptors.request.use((config) => {
  const token = authService.getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejo de errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      authService.signOut();
      // window.location.reload(); // Comentado para evitar redirecciones
    }
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// Servicios de Chat
export const chatService = {
  sendMessage: async (message: string, connectionId?: string, conversationId?: string): Promise<ChatResponse> => {
    const response = await api.post('/chat/message', {
      message,
      connectionId,
      conversationId,
    });
    return response.data as ChatResponse;
  },

  analyzeData: async (query: string, connectionId: string): Promise<DataAnalysis> => {
    const response = await api.post('/chat/analyze', {
      query,
      connectionId,
    });
    return response.data as DataAnalysis;
  },

  getHistory: async (): Promise<ApiResponse<any[]>> => {
    const response = await api.get('/chat/history');
    return response.data as ApiResponse<any[]>;
  },
};

// Servicios de Base de Datos
export const databaseService = {
  getConnections: async (): Promise<{ success: boolean; connections?: DatabaseConnection[]; error?: string }> => {
    const response = await api.get('/database/connections');
    return response.data as { success: boolean; connections?: DatabaseConnection[]; error?: string };
  },

  getConnection: async (id: string): Promise<{ success: boolean; connection?: DatabaseConnection; error?: string }> => {
    const response = await api.get(`/database/connections/${id}`);
    return response.data as { success: boolean; connection?: DatabaseConnection; error?: string };
  },

  testConnection: async (config: Omit<DatabaseConnectionForm, 'name' | 'description'>): Promise<ApiResponse<any>> => {
    const response = await api.post('/database/test-connection', config);
    return response.data as ApiResponse<any>;
  },

  createConnection: async (config: DatabaseConnectionForm): Promise<{ success: boolean; connection?: DatabaseConnection; error?: string; message?: string }> => {
    const response = await api.post('/database/connections', config);
    return response.data as { success: boolean; connection?: DatabaseConnection; error?: string; message?: string };
  },

  updateConnection: async (id: string, config: Partial<DatabaseConnectionForm>): Promise<{ success: boolean; connection?: DatabaseConnection; error?: string; message?: string }> => {
    const response = await api.put(`/database/connections/${id}`, config);
    return response.data as { success: boolean; connection?: DatabaseConnection; error?: string; message?: string };
  },

  deleteConnection: async (id: string): Promise<ApiResponse<any>> => {
    const response = await api.delete(`/database/connections/${id}`);
    return response.data as ApiResponse<any>;
  },

  executeQuery: async (connectionId: string, query: string): Promise<QueryResult> => {
    const response = await api.post(`/database/connections/${connectionId}/query`, {
      query,
    });
    return response.data as QueryResult;
  },

  getSchema: async (connectionId: string): Promise<{ success: boolean; schema?: DatabaseSchema; error?: string }> => {
    const response = await api.get(`/database/connections/${connectionId}/schema`);
    return response.data as { success: boolean; schema?: DatabaseSchema; error?: string };
  },

  testExistingConnection: async (connectionId: string): Promise<ApiResponse<any>> => {
    const response = await api.post(`/database/connections/${connectionId}/test`);
    return response.data as ApiResponse<any>;
  },
};

// Servicios de Base de Conocimiento
export const knowledgeBaseService = {
  getFiles: async (): Promise<{ success: boolean; files?: KnowledgeBaseFile[]; error?: string }> => {
    const response = await api.get('/knowledge-base/files');
    return response.data as { success: boolean; files?: KnowledgeBaseFile[]; error?: string };
  },

  uploadFile: async (file: File, description?: string, category?: string): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    if (description) formData.append('description', description);
    if (category) formData.append('category', category);

    const response = await api.post('/knowledge-base/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data as FileUploadResponse;
  },

  getFileContent: async (key: string): Promise<{ success: boolean; content?: string; metadata?: any; contentType?: string; error?: string }> => {
    const encodedKey = encodeURIComponent(key);
    const response = await api.get(`/knowledge-base/files/${encodedKey}`);
    return response.data as { success: boolean; content?: string; metadata?: any; contentType?: string; error?: string };
  },

  deleteFile: async (key: string): Promise<ApiResponse<any>> => {
    const encodedKey = encodeURIComponent(key);
    const response = await api.delete(`/knowledge-base/files/${encodedKey}`);
    return response.data as ApiResponse<any>;
  },

  getStats: async (): Promise<{ success: boolean; stats?: KnowledgeBaseStats; error?: string }> => {
    const response = await api.get('/knowledge-base/stats');
    return response.data as { success: boolean; stats?: KnowledgeBaseStats; error?: string };
  },

  search: async (query: string): Promise<{ success: boolean; results?: SearchResult[]; query?: string; totalMatches?: number; error?: string }> => {
    const response = await api.post('/knowledge-base/search', { query });
    return response.data as { success: boolean; results?: SearchResult[]; query?: string; totalMatches?: number; error?: string };
  },

  getContent: async (): Promise<ApiResponse<{ content: string; fileCount: number }>> => {
    const response = await api.get('/knowledge-base/content');
    return response.data as ApiResponse<{ content: string; fileCount: number }>;
  },
};

// Servicio de salud de la API
export const healthService = {
  check: async (): Promise<ApiResponse<{ status: string; timestamp: string; service: string }>> => {
    const response = await api.get('/health');
    return response.data as ApiResponse<{ status: string; timestamp: string; service: string }>;
  },
};

export default api;
