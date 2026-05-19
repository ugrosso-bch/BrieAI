import React, { useState, useEffect } from 'react';
import { Calendar, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';

interface GoogleCalendarSetupProps {
  userId: string;
}

const GoogleCalendarSetup: React.FC<GoogleCalendarSetupProps> = ({ userId }) => {
  const [status, setStatus] = useState<'checking' | 'authorized' | 'not_authorized'>('checking');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, [userId]);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/google/calendar/status/${userId}`);
      const data = await response.json();
      setStatus(data.authorized ? 'authorized' : 'not_authorized');
    } catch (error) {
      console.error('Error checking auth status:', error);
      setStatus('not_authorized');
    }
  };

  const handleAuthorize = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3001/api/google/calendar/auth/${userId}`);
      const data = await response.json();
      
      if (data.success) {
        // Abrir en nueva pestaña
        window.open(data.authUrl, '_blank');
        
        // Verificar cada 3 segundos si se completó la autorización
        const checkInterval = setInterval(async () => {
          await checkAuthStatus();
          if (status === 'authorized') {
            clearInterval(checkInterval);
          }
        }, 3000);
      }
    } catch (error) {
      console.error('Error getting auth URL:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%' }}>

      {status === 'checking' && (
        <div style={{ color: '#666', fontSize: '14px' }}>
          Verificando estado de autorización...
        </div>
      )}

      {status === 'authorized' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px',
          backgroundColor: '#d4edda',
          borderRadius: '8px',
          border: '1px solid #c3e6cb'
        }}>
          <CheckCircle size={16} style={{ color: '#155724', marginRight: '8px' }} />
          <span style={{ color: '#155724', fontSize: '14px', fontWeight: '500' }}>
            Autorizado
          </span>
        </div>
      )}

      {status === 'not_authorized' && (
        <button
          onClick={handleAuthorize}
          disabled={loading}
          className="configure-button"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%'
          }}
        >
          <ExternalLink size={16} />
          {loading ? 'Conectando...' : 'Configurar'}
        </button>
      )}
    </div>
  );
};

export default GoogleCalendarSetup;