import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageCircle, Database, BookOpen, Bell, Settings, Menu, X, LogOut, User as UserIcon } from 'lucide-react';
import { User } from '../../services/authService';
import './Sidebar.css';

interface SidebarProps {
  user?: User;
  onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, onLogout }) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    {
      path: '/chat',
      icon: MessageCircle,
      label: 'Chat',
      description: 'Conversa con BrieAI'
    },
    {
      path: '/database',
      icon: Database,
      label: 'Bases de Datos',
      description: 'Gestiona conexiones'
    },
    {
      path: '/knowledge-base',
      icon: BookOpen,
      label: 'Base de Conocimiento',
      description: 'Administra archivos'
    },
    {
      path: '/notifications',
      icon: Bell,
      label: 'Notificaciones',
      description: 'Configura alertas'
    },
    {
      path: '/integrations',
      icon: Settings,
      label: 'Integraciones',
      description: 'Conecta herramientas'
    }
  ];

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Mobile menu button */}
      <button 
        className="mobile-menu-btn"
        onClick={toggleSidebar}
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && <div className="sidebar-overlay" onClick={toggleSidebar} />}

      {/* Sidebar */}
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <h1 className="sidebar-title">
            <span className="title-main">Brie</span>
            <span className="title-accent">AI</span>
          </h1>
          <p className="sidebar-subtitle">
            Plataforma de Análisis Inteligente
          </p>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
                           (location.pathname === '/' && item.path === '/chat');
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
                onClick={() => setIsOpen(false)}
              >
                <div className="nav-item-icon">
                  <Icon size={20} />
                </div>
                <div className="nav-item-content">
                  <span className="nav-item-label">{item.label}</span>
                  <span className="nav-item-description">{item.description}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="user-section">
            <div className="user-info">
              <UserIcon size={20} />
              <div className="user-details">
                <span className="user-name">{user.name}</span>
                <span className="user-email">{user.email}</span>
              </div>
            </div>
            <button onClick={onLogout} className="logout-button">
              <LogOut size={16} />
              Cerrar sesión
            </button>
          </div>
        )}

        <div className="sidebar-footer">
          <div className="footer-info">
            <p className="footer-text">
              Powered by <strong>BigCheese & AWS</strong>
            </p>
            <p className="footer-version">v1.0.0</p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
