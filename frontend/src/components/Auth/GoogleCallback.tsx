import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const GoogleCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      // Para token flow, los tokens vienen en el hash
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      
      const accessToken = params.get('access_token');
      const idToken = params.get('id_token');
      const error = params.get('error');

      console.log('URL actual:', window.location.href);
      console.log('Hash:', hash);
      
      if (error) {
        console.error('Google OAuth error:', error);
        navigate('/');
        return;
      }
      
      if (accessToken && idToken) {
        try {
          console.log('Tokens recibidos directamente');
          
          // Decodificar el id_token para obtener info real del usuario
          const userInfo = JSON.parse(atob(idToken.split('.')[1]));
          console.log('Info del usuario real:', userInfo);
          
          const user = {
            id: userInfo.sub,
            email: userInfo.email,
            name: userInfo.name || userInfo.given_name + ' ' + userInfo.family_name,
            picture: userInfo.picture
          };
          
          // Guardar tokens reales en localStorage
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('idToken', idToken);
          localStorage.setItem('user', JSON.stringify(user));
          
          console.log('Usuario real logueado:', user);
          
          // Recargar la página
          window.location.href = '/';
          
        } catch (error) {
          console.error('Error processing tokens:', error);
          navigate('/');
        }
      } else {
        console.log('No se encontraron tokens');
        navigate('/');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <div className="loading-spinner"></div>
      <p>Procesando inicio de sesión con Google...</p>
    </div>
  );
};

export default GoogleCallback;