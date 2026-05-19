import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Upload, 
  Search, 
  Trash2, 
  Eye, 
  Download,
  FileText,
  File,
  AlertCircle,
  Loader2,
  Plus,
  X
} from 'lucide-react';
import { knowledgeBaseService } from '../../services/api';
import { KnowledgeBaseFile, KnowledgeBaseStats, SearchResult } from '../../types';
import './KnowledgeBase.css';

const KnowledgeBase: React.FC = () => {
  const [files, setFiles] = useState<KnowledgeBaseFile[]>([]);
  const [stats, setStats] = useState<KnowledgeBaseStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFile, setSelectedFile] = useState<KnowledgeBaseFile | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [error, setError] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadCategory, setUploadCategory] = useState('general');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'documentation', label: 'Documentación' },
    { value: 'procedures', label: 'Procedimientos' },
    { value: 'policies', label: 'Políticas' },
    { value: 'training', label: 'Entrenamiento' },
    { value: 'reference', label: 'Referencia' }
  ];

  useEffect(() => {
    loadFiles();
    loadStats();
  }, []);

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const response = await knowledgeBaseService.getFiles();
      if (response.success && response.files) {
        setFiles(response.files);
      }
    } catch (error) {
      console.error('Error loading files:', error);
      setError('Error al cargar los archivos');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await knowledgeBaseService.getStats();
      if (response.success && response.stats) {
        setStats(response.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Solo guardar el archivo seleccionado, no subirlo inmediatamente
    console.log('Archivo seleccionado:', file.name);
  };

  const handleUploadSubmit = async () => {
    const fileInput = fileInputRef.current;
    const file = fileInput?.files?.[0];
    
    if (!file) {
      setError('Por favor selecciona un archivo');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const response = await knowledgeBaseService.uploadFile(
        file, 
        uploadDescription, 
        uploadCategory
      );
      
      if (response.success) {
        await loadFiles();
        await loadStats();
        setShowUploadModal(false);
        setUploadDescription('');
        setUploadCategory('general');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setError(response.error || 'Error al subir el archivo');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setError('Error al subir el archivo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFile = async (key: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este archivo?')) {
      return;
    }

    try {
      const response = await knowledgeBaseService.deleteFile(key);
      if (response.success) {
        await loadFiles();
        await loadStats();
        if (selectedFile?.key === key) {
          setSelectedFile(null);
          setFileContent('');
        }
      } else {
        setError(response.error || 'Error al eliminar el archivo');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      setError('Error al eliminar el archivo');
    }
  };

  const handleViewFile = async (file: KnowledgeBaseFile) => {
    setSelectedFile(file);
    setFileContent('');
    setIsLoading(true);

    try {
      const response = await knowledgeBaseService.getFileContent(file.key);
      if (response.success && response.content) {
        setFileContent(response.content);
      } else {
        setError(response.error || 'Error al cargar el contenido del archivo');
      }
    } catch (error) {
      console.error('Error loading file content:', error);
      setError('Error al cargar el contenido del archivo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError('');

    try {
      const response = await knowledgeBaseService.search(searchQuery);
      if (response.success && response.results) {
        setSearchResults(response.results);
      } else {
        setError(response.error || 'Error en la búsqueda');
      }
    } catch (error) {
      console.error('Error searching:', error);
      setError('Error en la búsqueda');
    } finally {
      setIsSearching(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
      case 'doc':
      case 'docx':
      case 'txt':
      case 'md':
        return <FileText size={16} />;
      default:
        return <File size={16} />;
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      general: 'var(--color-beige-dark)',
      documentation: 'var(--color-violet)',
      procedures: 'var(--color-yellow)',
      policies: '#EF4444',
      training: '#10B981',
      reference: '#6366F1'
    };
    return colors[category] || colors.general;
  };

  return (
    <div className="knowledge-base-container">
      <div className="knowledge-base-header">
        <div className="header-title">
          <BookOpen size={24} />
          <div>
            <h1>Base de Conocimiento</h1>
            <p>Gestiona archivos y contenido para el chatbot</p>
          </div>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowUploadModal(true)}
        >
          <Plus size={16} />
          Subir Archivo
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError('')} className="error-close">×</button>
        </div>
      )}

      {/* Estadísticas */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <FileText size={24} />
            </div>
            <div className="stat-content">
              <h3>{stats.totalFiles}</h3>
              <p>Archivos totales</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Upload size={24} />
            </div>
            <div className="stat-content">
              <h3>{formatFileSize(stats.totalSize)}</h3>
              <p>Tamaño total</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <BookOpen size={24} />
            </div>
            <div className="stat-content">
              <h3>{Object.keys(stats.fileTypes).length}</h3>
              <p>Tipos de archivo</p>
            </div>
          </div>
        </div>
      )}

      <div className="knowledge-base-content">
        <div className="files-panel">
          <div className="panel-header">
            <h2>Archivos</h2>
            <div className="search-container">
              <div className="search-input-wrapper">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Buscar en archivos..."
                  className="search-input"
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="search-button"
                >
                  {isSearching ? (
                    <Loader2 className="loading-spinner" size={16} />
                  ) : (
                    <Search size={16} />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Resultados de búsqueda */}
          {searchResults.length > 0 && (
            <div className="search-results">
              <h3>Resultados de búsqueda ({searchResults.length})</h3>
              <div className="search-results-list">
                {searchResults.map((result, index) => (
                  <div key={index} className="search-result-item">
                    <div className="search-result-header">
                      <span className="search-result-file">{result.file.fileName}</span>
                      <button
                        onClick={() => handleViewFile(result.file)}
                        className="btn btn-sm btn-ghost"
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                    <div className="search-result-context">
                      ...{result.context}...
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lista de archivos */}
          <div className="files-list">
            {isLoading && files.length === 0 ? (
              <div className="loading-state">
                <Loader2 className="loading-spinner" size={24} />
                <span>Cargando archivos...</span>
              </div>
            ) : files.length === 0 ? (
              <div className="empty-state">
                <BookOpen size={48} />
                <h3>No hay archivos</h3>
                <p>Sube tu primer archivo para comenzar</p>
              </div>
            ) : (
              files.map(file => (
                <div 
                  key={file.key} 
                  className={`file-card ${selectedFile?.key === file.key ? 'selected' : ''}`}
                  onClick={() => handleViewFile(file)}
                >
                  <div className="file-header">
                    <div className="file-info">
                      <div className="file-icon">
                        {getFileIcon(file.fileName)}
                      </div>
                      <div className="file-details">
                        <h4>{file.fileName}</h4>
                        <div className="file-meta">
                          <span>{formatFileSize(file.size)}</span>
                          <span>•</span>
                          <span>{new Date(file.lastModified).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="file-actions">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewFile(file);
                        }}
                        className="btn btn-sm btn-ghost"
                        title="Ver contenido"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFile(file.key);
                        }}
                        className="btn btn-sm btn-ghost"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  
                  {file.metadata?.category && (
                    <div className="file-category">
                      <span 
                        className="category-tag"
                        style={{ backgroundColor: getCategoryColor(file.metadata.category) }}
                      >
                        {categories.find(c => c.value === file.metadata?.category)?.label || file.metadata.category}
                      </span>
                    </div>
                  )}
                  
                  {file.metadata?.description && (
                    <div className="file-description">
                      {file.metadata.description}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="content-panel">
          {selectedFile ? (
            <>
              <div className="content-header">
                <h2>{selectedFile.fileName}</h2>
                <div className="content-actions">
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setFileContent('');
                    }}
                    className="btn btn-sm btn-ghost"
                  >
                    <X size={16} />
                    Cerrar
                  </button>
                </div>
              </div>
              
              <div className="file-info-panel">
                <div className="info-item">
                  <strong>Tamaño:</strong> {formatFileSize(selectedFile.size)}
                </div>
                <div className="info-item">
                  <strong>Última modificación:</strong> {new Date(selectedFile.lastModified).toLocaleString()}
                </div>
                {selectedFile.metadata?.category && (
                  <div className="info-item">
                    <strong>Categoría:</strong> 
                    <span 
                      className="category-tag"
                      style={{ backgroundColor: getCategoryColor(selectedFile.metadata.category) }}
                    >
                      {categories.find(c => c.value === selectedFile.metadata?.category)?.label || selectedFile.metadata.category}
                    </span>
                  </div>
                )}
                {selectedFile.metadata?.description && (
                  <div className="info-item">
                    <strong>Descripción:</strong> {selectedFile.metadata.description}
                  </div>
                )}
              </div>

              <div className="file-content">
                {isLoading ? (
                  <div className="content-loading">
                    <Loader2 className="loading-spinner" size={24} />
                    <span>Cargando contenido...</span>
                  </div>
                ) : (
                  <pre className="content-text">{fileContent}</pre>
                )}
              </div>
            </>
          ) : (
            <div className="content-empty-state">
              <Eye size={48} />
              <h3>Selecciona un archivo</h3>
              <p>Elige un archivo de la lista para ver su contenido</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de subida */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Subir Archivo</h2>
              <button 
                className="modal-close" 
                onClick={() => setShowUploadModal(false)}
              >
                ×
              </button>
            </div>

            <div className="upload-form">
              <div className="form-group">
                <label>Archivo</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="file-input"
                  accept=".txt,.csv,.json,.pdf,.md,.doc,.docx"
                  disabled={isUploading}
                />
                <p className="file-help">
                  Formatos soportados: TXT, CSV, JSON, PDF, MD, DOC, DOCX (máx. 10MB)
                </p>
              </div>

              <div className="form-group">
                <label>Categoría</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="input select"
                  disabled={isUploading}
                >
                  {categories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Descripción (Opcional)</label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  className="input textarea"
                  rows={3}
                  placeholder="Describe el contenido del archivo..."
                  disabled={isUploading}
                />
              </div>

              {isUploading && (
                <div className="upload-progress">
                  <Loader2 className="loading-spinner" size={16} />
                  <span>Subiendo archivo...</span>
                </div>
              )}

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={() => setShowUploadModal(false)}
                  disabled={isUploading}
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleUploadSubmit}
                  disabled={isUploading || !fileInputRef.current?.files?.[0]}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="loading-spinner" size={16} />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      Subir Archivo
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;
