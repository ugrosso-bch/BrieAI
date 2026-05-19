import React, { useState } from 'react';
import authService from '../../services/authService';

interface RegisterFormProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authService.signUp(email, password, name);
      setNeedsConfirmation(true);
    } catch (err: any) {
      setError(err.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authService.confirmSignUp(email, confirmationCode);
      // Después de confirmar, ir directamente al login
      onSwitchToLogin();
    } catch (err: any) {
      if (err.message.includes('Current status is CONFIRMED')) {
        // Usuario ya confirmado, ir al login
        onSwitchToLogin();
      } else {
        setError(err.message || 'Error al confirmar registro');
      }
    } finally {
      setLoading(false);
    }
  };

  if (needsConfirmation) {
    return (
      <div className="auth-form">
        <h2>Confirmar Registro</h2>
        <p>Revisa tu email e ingresa el código:</p>
        <form onSubmit={handleConfirm}>
          <input
            type="text"
            value={confirmationCode}
            onChange={(e) => setConfirmationCode(e.target.value)}
            required
            placeholder="Código de confirmación"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '2px solid #ddd',
              borderRadius: '8px',
              fontSize: '1rem',
              marginBottom: '1rem'
            }}
          />
          {error && <div className="error-message">{error}</div>}
          <button type="submit" disabled={loading}>
            {loading ? 'Confirmando...' : 'Confirmar'}
          </button>
          <p style={{textAlign: 'center', marginTop: '1rem'}}>
            ¿Ya confirmaste el usuario?{' '}
            <button type="button" onClick={onSwitchToLogin} className="link-button">
              Ir al login
            </button>
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="auth-form">
      <h2>Registrarse</h2>
      <form onSubmit={handleRegister}>
        <div className="form-group">
          <label>Nombre:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Contraseña:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <div className="error-message">{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? 'Registrando...' : 'Registrarse'}
        </button>
      </form>
      <p>
        ¿Ya tienes cuenta?{' '}
        <button type="button" onClick={onSwitchToLogin} className="link-button">
          Inicia sesión
        </button>
      </p>
    </div>
  );
};

export default RegisterForm;