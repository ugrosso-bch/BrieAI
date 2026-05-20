import React, { useState } from 'react';
import { Mail, Send, CheckCircle, AlertCircle } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

interface EmailTestProps {
  recipientEmail?: string;
}

const EmailTest: React.FC<EmailTestProps> = ({ recipientEmail }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const verifiedEmail = recipientEmail || 'ugrosso@bigcheese.com.uy';
  const fromEmail = 'noreply@brieagent.com';

  const sendTestEmail = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/email/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: verifiedEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: `Email enviado exitosamente a ${data.sentTo}`
        });
      } else {
        setResult({
          success: false,
          message: data.error || 'Error enviando email'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Error de conexión'
      });
    } finally {
      setLoading(false);
    }
  };

  const sendWelcomeEmail = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/email/welcome`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: verifiedEmail,
          name: 'Uriel Grosso'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: 'Email de bienvenida enviado exitosamente'
        });
      } else {
        setResult({
          success: false,
          message: data.error || 'Error enviando email'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Error de conexión'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      maxWidth: '500px', 
      margin: '20px auto', 
      padding: '20px',
      backgroundColor: 'white',
      borderRadius: '10px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '20px',
        color: '#ABA0FB'
      }}>
        <Mail size={24} style={{ marginRight: '10px' }} />
        <h3 style={{ margin: 0 }}>Prueba de SES</h3>
      </div>

      <div style={{ 
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <p style={{ margin: 0, color: '#1A1A1A', fontSize: '16px' }}>
          📧 Enviando a: <strong>{verifiedEmail}</strong>
        </p>
        <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
          (Dirección verificada en SES — modo sandbox)
        </p>
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px' 
      }}>
        <button
          onClick={sendTestEmail}
          disabled={loading}
          style={{
            flex: 1,
            padding: '12px 20px',
            backgroundColor: '#ABA0FB',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            opacity: loading ? 0.7 : 1,
            transition: 'all 0.3s'
          }}
        >
          <Send size={18} />
          {loading ? 'Enviando...' : 'Email de Prueba'}
        </button>

        <button
          onClick={sendWelcomeEmail}
          disabled={loading}
          style={{
            flex: 1,
            padding: '12px 20px',
            backgroundColor: '#FAE428',
            color: '#1A1A1A',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            opacity: loading ? 0.7 : 1,
            transition: 'all 0.3s'
          }}
        >
          <Mail size={18} />
          {loading ? 'Enviando...' : 'Bienvenida'}
        </button>
      </div>

      {result && (
        <div style={{
          padding: '15px',
          borderRadius: '8px',
          backgroundColor: result.success ? '#d4edda' : '#f8d7da',
          border: `1px solid ${result.success ? '#c3e6cb' : '#f5c6cb'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          {result.success ? (
            <CheckCircle size={20} style={{ color: '#155724' }} />
          ) : (
            <AlertCircle size={20} style={{ color: '#721c24' }} />
          )}
          <span style={{ 
            color: result.success ? '#155724' : '#721c24',
            fontSize: '14px'
          }}>
            {result.message}
          </span>
        </div>
      )}

      <div style={{
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        fontSize: '14px',
        color: '#666'
      }}>
        <strong>Configuración SES:</strong><br />
        Desde: {fromEmail}<br />
        Para: {verifiedEmail}<br />
        Región: us-east-1
      </div>
    </div>
  );
};

export default EmailTest;