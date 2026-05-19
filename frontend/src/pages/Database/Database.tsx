import React, { useState, useEffect } from 'react';
import { 
  Database as DatabaseIcon, 
  Plus, 
  Edit, 
  Trash2, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Eye,
  Play,
  AlertCircle
} from 'lucide-react';
import { databaseService } from '../../services/api';
import { DatabaseConnection, DatabaseConnectionForm, QueryResult, DatabaseSchema } from '../../types';
import './Database.css';

const Database: React.FC = () => {
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingConnection, setEditingConnection] = useState<DatabaseConnection | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<DatabaseConnection | null>(null);
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [schema, setSchema] = useState<DatabaseSchema | null>(null);
  const [isExecutingQuery, setIsExecutingQuery] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<DatabaseConnectionForm>({
    name: '',
    type: 'mysql',
    host: '',
    port: '',
    database: '',
    username: '',
    password: '',
    uri: '',
    description: ''
  });

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    setIsLoading(true);
    try {
      const response = await databaseService.getConnections();
      if (response.success && response.connections) {
        setConnections(response.connections);
      }
    } catch (error) {
      console.error('Error loading connections:', error);
      setError('Error al cargar las conexiones');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (editingConnection) {
        const response = await databaseService.updateConnection(editingConnection.id, formData);
        if (response.success) {
          await loadConnections();
          resetForm();
        } else {
          setError(response.error || 'Error al actualizar la conexión');
        }
      } else {
        const response = await databaseService.createConnection(formData);
        if (response.success) {
          await loadConnections();
          resetForm();
        } else {
          setError(response.error || 'Error al crear la conexión');
        }
      }
    } catch (error) {
      console.error('Error saving connection:', error);
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async (connection?: DatabaseConnection) => {
    setIsLoading(true);
    setError('');

    try {
      let response;
      if (connection) {
        response = await databaseService.testExistingConnection(connection.id);
      } else {
        // Convertir el puerto a string para el test
        const testData = {
          type: formData.type,
          host: formData.host,
          port: formData.port,
          username: formData.username,
          password: formData.password,
          database: formData.database,
          uri: formData.uri
        };
        response = await databaseService.testConnection(testData);
      }

      if (response.success) {
        alert('¡Conexión exitosa!');
      } else {
        setError(response.error || 'Error en la conexión');
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setError('Error al probar la conexión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConnection = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta conexión?')) {
      return;
    }

    try {
      const response = await databaseService.deleteConnection(id);
      if (response.success) {
        await loadConnections();
        if (selectedConnection?.id === id) {
          setSelectedConnection(null);
          setSchema(null);
          setQueryResult(null);
        }
      } else {
        setError(response.error || 'Error al eliminar la conexión');
      }
    } catch (error) {
      console.error('Error deleting connection:', error);
      setError('Error al eliminar la conexión');
    }
  };

  const handleSelectConnection = async (connection: DatabaseConnection) => {
    setSelectedConnection(connection);
    setQueryResult(null);
    setError('');

    // Load schema
    try {
      const response = await databaseService.getSchema(connection.id);
      if (response.success && response.schema) {
        setSchema(response.schema);
      }
    } catch (error) {
      console.error('Error loading schema:', error);
    }
  };

  const handleExecuteQuery = async () => {
    if (!selectedConnection || !query.trim()) return;

    setIsExecutingQuery(true);
    setError('');

    try {
      const response = await databaseService.executeQuery(selectedConnection.id, query);
      setQueryResult(response);
    } catch (error) {
      console.error('Error executing query:', error);
      setError('Error al ejecutar la consulta');
    } finally {
      setIsExecutingQuery(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'mysql',
      host: '',
      port: '',
      database: '',
      username: '',
      password: '',
      uri: '',
      description: ''
    });
    setShowForm(false);
    setEditingConnection(null);
    setError('');
  };

  const handleEdit = (connection: DatabaseConnection) => {
    setFormData({
      name: connection.name,
      type: connection.type,
      host: connection.host,
      port: connection.port.toString(),
      database: connection.database,
      username: connection.username,
      password: '',
      uri: connection.uri || '',
      description: connection.description || ''
    });
    setEditingConnection(connection);
    setShowForm(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="status-icon success" size={16} />;
      case 'error':
        return <XCircle className="status-icon error" size={16} />;
      default:
        return <AlertCircle className="status-icon warning" size={16} />;
    }
  };

  const renderQueryResult = () => {
    if (!queryResult) return null;

    if (!queryResult.success) {
      return (
        <div className="query-error">
          <AlertCircle size={16} />
          <span>{queryResult.error}</span>
        </div>
      );
    }

    if (!queryResult.data || queryResult.data.length === 0) {
      return (
        <div className="query-empty">
          <span>No se encontraron resultados</span>
        </div>
      );
    }

    return (
      <div className="query-results">
        <div className="results-header">
          <span>Resultados ({queryResult.rowCount} filas)</span>
        </div>
        <div className="results-table-container">
          <table className="results-table">
            <thead>
              <tr>
                {Object.keys(queryResult.data[0]).map(key => (
                  <th key={key}>{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {queryResult.data.map((row, index) => (
                <tr key={index}>
                  {Object.values(row).map((value, cellIndex) => (
                    <td key={cellIndex}>
                      {value !== null && value !== undefined ? String(value) : 'NULL'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="database-container">
      <div className="database-header">
        <div className="header-title">
          <DatabaseIcon size={24} />
          <div>
            <h1>Gestión de Bases de Datos</h1>
            <p>Administra conexiones y ejecuta consultas</p>
          </div>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
        >
          <Plus size={16} />
          Nueva Conexión
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError('')} className="error-close">×</button>
        </div>
      )}

      <div className="database-content">
        <div className="connections-panel">
          <h2>Conexiones</h2>
          
          {isLoading && !showForm ? (
            <div className="loading-state">
              <Loader2 className="loading-spinner" size={24} />
              <span>Cargando conexiones...</span>
            </div>
          ) : (
            <div className="connections-list">
              {connections.map(connection => (
                <div 
                  key={connection.id} 
                  className={`connection-card ${selectedConnection?.id === connection.id ? 'selected' : ''}`}
                  onClick={() => handleSelectConnection(connection)}
                >
                  <div className="connection-header">
                    <div className="connection-info">
                      <h3>{connection.name}</h3>
                      <span className="connection-type">{connection.type}</span>
                    </div>
                    <div className="connection-status">
                      {getStatusIcon(connection.status)}
                    </div>
                  </div>
                  
                  <div className="connection-details">
                    <p>{connection.host}:{connection.port}</p>
                    <p>Base de datos: {connection.database}</p>
                    {connection.description && (
                      <p className="connection-description">{connection.description}</p>
                    )}
                  </div>

                  <div className="connection-actions">
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTestConnection(connection);
                      }}
                      title="Probar conexión"
                    >
                      <TestTube size={14} />
                    </button>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(connection);
                      }}
                      title="Editar"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConnection(connection.id);
                      }}
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              
              {connections.length === 0 && !isLoading && (
                <div className="empty-state">
                  <DatabaseIcon size={48} />
                  <h3>No hay conexiones</h3>
                  <p>Crea tu primera conexión a base de datos</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="query-panel">
          {selectedConnection ? (
            <>
              <div className="query-header">
                <h2>Consultas - {selectedConnection.name}</h2>
                <div className="query-actions">
                  <button
                    className="btn btn-primary"
                    onClick={handleExecuteQuery}
                    disabled={!query.trim() || isExecutingQuery}
                  >
                    {isExecutingQuery ? (
                      <Loader2 className="loading-spinner" size={16} />
                    ) : (
                      <Play size={16} />
                    )}
                    Ejecutar
                  </button>
                </div>
              </div>

              <div className="query-editor">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Escribe tu consulta SQL aquí..."
                  className="query-textarea"
                  rows={8}
                />
              </div>

              {renderQueryResult()}

              {schema && (
                <div className="schema-panel">
                  <h3>Esquema de la Base de Datos</h3>
                  <div className="schema-tables">
                    {Object.entries(schema).map(([tableName, tableInfo]) => (
                      <div key={tableName} className="schema-table">
                        <h4>{tableName}</h4>
                        {tableInfo.comment && (
                          <p className="table-comment">{tableInfo.comment}</p>
                        )}
                        <div className="table-columns">
                          {tableInfo.columns.map((column, index) => (
                            <div key={index} className="column-info">
                              <span className="column-name">
                                {column.column_name || column.COLUMN_NAME}
                              </span>
                              <span className="column-type">
                                {column.data_type || column.DATA_TYPE}
                              </span>
                              {(column.is_nullable === 'NO' || column.IS_NULLABLE === 'NO') && (
                                <span className="column-required">NOT NULL</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="query-empty-state">
              <Eye size={48} />
              <h3>Selecciona una conexión</h3>
              <p>Elige una conexión de la lista para ejecutar consultas</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de formulario */}
      {showForm && (
        <div className="modal-overlay" onClick={() => resetForm()}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingConnection ? 'Editar Conexión' : 'Nueva Conexión'}</h2>
              <button className="modal-close" onClick={resetForm}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="connection-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Tipo</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                    className="input select"
                  >
                    <option value="mysql">MySQL</option>
                    <option value="postgresql">PostgreSQL</option>
                    <option value="mongodb">MongoDB</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Host</label>
                  <input
                    type="text"
                    value={formData.host}
                    onChange={(e) => setFormData({...formData, host: e.target.value})}
                    className="input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Puerto</label>
                  <input
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({...formData, port: e.target.value})}
                    className="input"
                    placeholder={formData.type === 'mysql' ? '3306' : formData.type === 'postgresql' ? '5432' : '27017'}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Base de Datos</label>
                  <input
                    type="text"
                    value={formData.database}
                    onChange={(e) => setFormData({...formData, database: e.target.value})}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Usuario</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    className="input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Contraseña</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="input"
                    placeholder={editingConnection ? "Dejar vacío para mantener actual" : ""}
                    required={!editingConnection}
                  />
                </div>
              </div>

              {formData.type === 'mongodb' && (
                <div className="form-group">
                  <label>URI de Conexión (Opcional)</label>
                  <input
                    type="text"
                    value={formData.uri}
                    onChange={(e) => setFormData({...formData, uri: e.target.value})}
                    className="input"
                    placeholder="mongodb://usuario:contraseña@host:puerto/basededatos"
                  />
                </div>
              )}

              <div className="form-group">
                <label>Descripción (Opcional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="input textarea"
                  rows={3}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={resetForm}>
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => handleTestConnection()}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="loading-spinner" size={16} /> : <TestTube size={16} />}
                  Probar Conexión
                </button>
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? <Loader2 className="loading-spinner" size={16} /> : null}
                  {editingConnection ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Database;
