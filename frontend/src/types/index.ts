// Tipos para el chat
export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  message: string;
  timestamp: string;
  contextUsed?: {
    database: boolean;
    knowledgeBase: number;
  };
}

export interface ChatResponse {
  success: boolean;
  message: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  contextUsed?: {
    database: boolean;
    knowledgeBase: number;
  };
  error?: string;
}

// Tipos para bases de datos
export interface DatabaseConnection {
  id: string;
  name: string;
  type: 'mysql' | 'postgresql' | 'mongodb';
  host: string;
  port: number;
  database: string;
  username: string;
  password?: string;
  uri?: string;
  description?: string;
  status: 'active' | 'inactive' | 'error';
  createdAt: string;
  lastTested: string;
}

export interface DatabaseConnectionForm {
  name: string;
  type: 'mysql' | 'postgresql' | 'mongodb';
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  uri?: string;
  description?: string;
}

export interface QueryResult {
  success: boolean;
  data?: any[];
  fields?: Array<{ name: string; type: string | number }>;
  rowCount?: number;
  error?: string;
}

export interface DatabaseSchema {
  [tableName: string]: {
    comment?: string;
    columns: Array<{
      column_name?: string;
      COLUMN_NAME?: string;
      data_type?: string;
      DATA_TYPE?: string;
      is_nullable?: string;
      IS_NULLABLE?: string;
      column_default?: string;
      COLUMN_DEFAULT?: string;
      column_comment?: string;
      COLUMN_COMMENT?: string;
    }>;
  };
}

// Tipos para base de conocimiento
export interface KnowledgeBaseFile {
  key: string;
  fileName: string;
  size: number;
  lastModified: string;
  contentType?: string;
  metadata?: {
    description?: string;
    category?: string;
    uploadedBy?: string;
    fileSize?: string;
  };
}

export interface FileUploadResponse {
  success: boolean;
  file?: {
    key: string;
    fileName: string;
    size: number;
    contentType: string;
    metadata: any;
  };
  error?: string;
  message?: string;
}

export interface KnowledgeBaseStats {
  totalFiles: number;
  totalSize: number;
  fileTypes: { [extension: string]: number };
  lastUpdated: number | null;
}

export interface SearchResult {
  file: KnowledgeBaseFile;
  context: string;
  matchIndex: number;
}

// Tipos para API responses
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Tipos para configuración
export interface AppConfig {
  apiUrl: string;
  maxFileSize: number;
  supportedFileTypes: string[];
}

// Tipos para notificaciones
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

// Tipos para el estado de la aplicación
export interface AppState {
  isLoading: boolean;
  notifications: Notification[];
  currentConnection?: string;
}

// Tipos para análisis de datos
export interface DataAnalysis {
  success: boolean;
  analysis: string;
  schema?: DatabaseSchema;
  sampleData?: any[];
  error?: string;
}
