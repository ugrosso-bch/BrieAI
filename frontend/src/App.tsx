import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Chat from './pages/Chat/Chat';
import Database from './pages/Database/Database';
import KnowledgeBase from './pages/KnowledgeBase/KnowledgeBase';
import Notifications from './pages/Notifications/Notifications';
import Integrations from './pages/Integrations/Integrations';
import AuthModal from './components/Auth/AuthModal';
import GoogleCallback from './components/Auth/GoogleCallback';
import authService, { User } from './services/authService';
import { ChatMessage } from './types';
import './App.css';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(true); // Abre directo al entrar sin sesión
  const [isLoading, setIsLoading] = useState(true);

  // Estado de conversación persistido a nivel App para sobrevivir la navegación
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatConversationId, setChatConversationId] = useState<string>('');

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser && authService.isAuthenticated()) {
      setUser(currentUser);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = () => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
  };

  const handleLogout = () => {
    authService.signOut();
    setUser(null);
    // Limpiar conversación al cerrar sesión
    setChatMessages([]);
    setChatConversationId('');
  };

  if (isLoading) {
    return <div className="loading">Cargando...</div>;
  }

  if (!user) {
    return (
      <Router>
        <div className="App">
          <Routes>
            <Route path="/auth/callback" element={<GoogleCallback />} />
            <Route path="*" element={
              <div>
                <div className="auth-required">
                  <h1>BrieAI</h1>
                  <p>Inicia sesión para acceder a la plataforma</p>
                  <button onClick={() => setShowAuthModal(true)} className="auth-button">
                    Iniciar sesión
                  </button>
                </div>
                <AuthModal
                  isOpen={showAuthModal}
                  onClose={() => setShowAuthModal(false)}
                  onSuccess={handleLogin}
                />
              </div>
            } />
          </Routes>
        </div>
      </Router>
    );
  }

  return (
    <Router>
      <div className="App">
        <Layout user={user} onLogout={handleLogout}>
          <Routes>
            <Route path="/" element={
              <Chat
                persistedMessages={chatMessages}
                persistedConversationId={chatConversationId}
                onMessagesChange={setChatMessages}
                onConversationIdChange={setChatConversationId}
              />
            } />
            <Route path="/chat" element={
              <Chat
                persistedMessages={chatMessages}
                persistedConversationId={chatConversationId}
                onMessagesChange={setChatMessages}
                onConversationIdChange={setChatConversationId}
              />
            } />
            <Route path="/database" element={<Database />} />
            <Route path="/knowledge-base" element={<KnowledgeBase />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/auth/callback" element={<GoogleCallback />} />
          </Routes>
        </Layout>
      </div>
    </Router>
  );
}

export default App;