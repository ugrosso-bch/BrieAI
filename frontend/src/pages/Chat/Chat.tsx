import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Database, BookOpen, Loader2, AlertCircle, Zap } from 'lucide-react';
import { chatService, databaseService } from '../../services/api';
import { ChatMessage, DatabaseConnection } from '../../types';
import './Chat.css';

interface ChatProps {
  persistedMessages: ChatMessage[];
  persistedConversationId: string;
  onMessagesChange: (messages: ChatMessage[]) => void;
  onConversationIdChange: (id: string) => void;
}

const Chat: React.FC<ChatProps> = ({
  persistedMessages,
  persistedConversationId,
  onMessagesChange,
  onConversationIdChange,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(persistedMessages);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [conversationId, setConversationId] = useState<string>(persistedConversationId);
  const [isAgentMode] = useState<boolean>(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sincronizar mensajes hacia arriba cuando cambien
  useEffect(() => {
    onMessagesChange(messages);
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sincronizar conversationId hacia arriba cuando cambie
  useEffect(() => {
    onConversationIdChange(conversationId);
  }, [conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadConnections();
    // Solo mostrar bienvenida si es una conversación nueva
    if (persistedMessages.length === 0) {
      loadInitialMessage();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConnections = async () => {
    try {
      const response = await databaseService.getConnections();
      if (response.success && response.connections) {
        setConnections(response.connections);
      }
    } catch (error) {
      console.error('Error loading connections:', error);
    }
  };



  const loadInitialMessage = () => {
    const welcomeMessage: ChatMessage = {
      id: '1',
      type: 'assistant',
      message: '¡Hola! Soy BrieAI, tu asistente de análisis de datos. ¿En qué puedo ayudarte?',
      timestamp: new Date().toISOString()
    };
    const newId = Date.now().toString();
    setMessages([welcomeMessage]);
    setConversationId(newId);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      message: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError('');

    try {
      // Preparar contexto con conexiones disponibles
      let contextMessage = inputMessage;
      if (connections.length > 0) {
        const connectionsContext = connections.map(conn => 
          `- "${conn.name}" (ID: ${conn.id}, Tipo: ${conn.type}): ${conn.host}:${conn.port}/${conn.database}`
        ).join('\n');
        contextMessage = `CONEXIONES DE BASE DE DATOS DISPONIBLES:\n${connectionsContext}\n\nCONSULTA DEL USUARIO: ${inputMessage}`;
      }
      
      // Usar únicamente chat con Agent BrieAI
      const response = await chatService.sendMessage(contextMessage, selectedConnection, conversationId);
      
      if (response.success) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          message: response.message,
          timestamp: new Date().toISOString(),
          contextUsed: response.contextUsed
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        setError(response.error || 'Error al procesar el mensaje');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Error de conexión. Por favor intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessage = (message: string) => {
    // Simple formatting for code blocks and line breaks
    return message.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line.startsWith('```') ? (
          <code className="code-block">{line.replace(/```/g, '')}</code>
        ) : line.startsWith('•') ? (
          <div className="bullet-point">{line}</div>
        ) : (
          line
        )}
        {index < message.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  const getConnectionName = (connectionId: string) => {
    const connection = connections.find(c => c.id === connectionId);
    return connection ? connection.name : 'Conexión no encontrada';
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="chat-title">
          <Bot className="chat-icon" size={24} />
          <div>
            <h1>Chat con BrieAI</h1>
            <p>Asistente inteligente de datos impulsado por BigCheese y AWS</p>
          </div>
        </div>
        
        <div className="chat-controls">
          <div className="agent-status">
            <Zap size={16} />
            <span>BrieAI Agent Activo</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError('')} className="error-close">×</button>
        </div>
      )}

      <div className="chat-messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.type}`}>
            <div className="message-avatar">
              {message.type === 'user' ? (
                <User size={20} />
              ) : (
                <Bot size={20} />
              )}
            </div>
            <div className="message-content">
              <div className="message-text">
                {formatMessage(message.message)}
              </div>
              {message.contextUsed && (
                <div className="message-context">
                  <div className="context-indicators">
                    {message.contextUsed.database && (
                      <span className="context-indicator">
                        <Database size={12} />
                        Base de datos: {getConnectionName(selectedConnection)}
                      </span>
                    )}
                    {message.contextUsed.knowledgeBase > 0 && (
                      <span className="context-indicator">
                        <BookOpen size={12} />
                        {message.contextUsed.knowledgeBase} archivos de conocimiento
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div className="message-timestamp">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message assistant">
            <div className="message-avatar">
              <Bot size={20} />
            </div>
            <div className="message-content">
              <div className="message-loading">
                <Loader2 className="loading-spinner" size={16} />
                <span>BrieAI está pensando...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <div className="chat-input-wrapper">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe tu mensaje aquí... (Shift + Enter para nueva línea)"
            className="chat-input"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="send-button"
          >
            {isLoading ? (
              <Loader2 className="loading-spinner" size={20} />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
        
        <div className="active-connection agent-mode">
          <Zap size={14} />
          <span>BrieAI Agent: Acceso completo a KB y DB</span>
        </div>
      </div>
    </div>
  );
};

export default Chat;
