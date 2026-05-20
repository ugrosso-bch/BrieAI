import React, { useState, useEffect } from 'react';
import { Bell, Mail, Plus, Trash2, Send, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import notificationService, { Subscription } from '../../services/notificationService';
import EmailTest from '../../components/EmailTest';
import authService from '../../services/authService';
import './Notifications.css';

const Notifications: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const currentUser = authService.getCurrentUser();
  const userEmail = currentUser?.email || '';

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const subs = await notificationService.getSubscriptions();
      console.log('Suscripciones recibidas:', subs);
      setSubscriptions(subs.filter(sub => sub.Protocol === 'email'));
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    try {
      setLoading(true);
      await notificationService.subscribeEmail(newEmail.trim());
      setMessage({ 
        type: 'success', 
        text: 'Suscripción exitosa. Revisa tu email para confirmar la suscripción.' 
      });
      setNewEmail('');
      setTimeout(() => loadSubscriptions(), 2000); // Recargar después de 2 segundos
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async (subscriptionArn: string) => {
    if (!window.confirm('¿Estás seguro de que quieres desuscribir este email?')) return;

    try {
      setLoading(true);
      await notificationService.unsubscribeEmail(subscriptionArn);
      setMessage({ type: 'success', text: 'Email desuscrito exitosamente' });
      loadSubscriptions();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      setLoading(true);
      await notificationService.sendTestNotification();
      setMessage({ type: 'success', text: 'Notificación de prueba enviada' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="notifications-container">
      <div className="notifications-header">
        <div className="header-content">
          <Bell className="header-icon" />
          <div>
            <h1>Notificaciones</h1>
            <p>Configura las notificaciones por email para recibir alertas sobre cambios en el sistema</p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}>×</button>
        </div>
      )}

      <div className="notifications-content">
        <div className="notification-section">
          <h2>Agregar Nueva Suscripción</h2>
          <form onSubmit={handleSubscribe} className="subscribe-form">
            <div className="form-group">
              <Mail className="input-icon" />
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Ingresa tu email"
                required
                disabled={loading}
              />
              <button type="submit" className="submit-button" disabled={loading || !newEmail.trim()}>
                <Plus size={16} />
                Suscribir
              </button>
            </div>
          </form>
          <p className="form-help">
            Recibirás notificaciones cuando se agreguen o eliminen conexiones de bases de datos y archivos de la base de conocimiento.
          </p>
        </div>

        <div className="notification-section">
          <div className="section-header">
            <h2>Suscripciones Activas</h2>
            <div className="header-buttons">
              <button 
                onClick={loadSubscriptions} 
                className="refresh-button"
                disabled={loading}
              >
                <RefreshCw size={16} />
                Actualizar
              </button>
              <button 
                onClick={handleTestNotification} 
                className="test-button"
                disabled={loading || subscriptions.length === 0}
              >
                <Send size={16} />
                Enviar Prueba
              </button>
            </div>
          </div>

          {loading && subscriptions.length === 0 ? (
            <div className="loading">Cargando suscripciones...</div>
          ) : subscriptions.length === 0 ? (
            <div className="empty-state">
              <Mail size={48} />
              <h3>No hay suscripciones activas</h3>
              <p>Agrega un email para comenzar a recibir notificaciones</p>
            </div>
          ) : (
            <div className="subscriptions-list">
              {subscriptions.map((subscription) => (
                <div key={subscription.SubscriptionArn} className="subscription-item">
                  <div className="subscription-info">
                    <Mail className="subscription-icon" />
                    <div>
                      <div className="subscription-email">{subscription.Endpoint}</div>
                      <div className="subscription-status">
                        {subscription.SubscriptionArn && !subscription.SubscriptionArn.includes('PendingConfirmation') ? (
                          <span className="status confirmed">✓ Confirmado</span>
                        ) : (
                          <span className="status pending">⏳ Pendiente de confirmación</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnsubscribe(subscription.SubscriptionArn)}
                    className="unsubscribe-button"
                    disabled={loading}
                    title="Desuscribir"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="notification-section">
          <h2>Prueba de SES</h2>
          <EmailTest recipientEmail={userEmail} />
        </div>

        <div className="notification-section">
          <h2>Tipos de Notificaciones</h2>
          <div className="notification-types">
            <div className="notification-type">
              <div className="type-icon database">🗄️</div>
              <div>
                <h3>Conexiones de Base de Datos</h3>
                <p>Notificaciones cuando se agregan o eliminan conexiones de bases de datos</p>
              </div>
            </div>
            <div className="notification-type">
              <div className="type-icon knowledge">📚</div>
              <div>
                <h3>Base de Conocimiento</h3>
                <p>Notificaciones cuando se suben o eliminan archivos de la base de conocimiento</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;