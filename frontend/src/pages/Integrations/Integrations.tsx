import React from 'react';
import { Settings } from 'lucide-react';
import './Integrations.css';

const Integrations: React.FC = () => {
  const integrations = [
    {
      id: 'google-drive',
      name: 'Google Drive',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg',
      description: 'Sincroniza archivos desde Google Drive'
    },
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      logo: 'https://ssl.gstatic.com/calendar/images/dynamiclogo_2020q4/calendar_31_2x.png',
      description: 'Integra eventos y recordatorios'
    },
    {
      id: 'microsoft-teams',
      name: 'Microsoft Teams',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Microsoft_Office_Teams_%282018%E2%80%93present%29.svg/512px-Microsoft_Office_Teams_%282018%E2%80%93present%29.svg.png',
      description: 'Conecta con equipos y chats'
    },
    {
      id: 'slack',
      name: 'Slack',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg',
      description: 'Integra canales y mensajes'
    },
    {
      id: 'sap',
      name: 'SAP',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/5/59/SAP_2011_logo.svg',
      description: 'Conecta con sistemas SAP'
    },
    {
      id: 'odoo',
      name: 'Odoo',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/5/50/Odoo_logo.svg',
      description: 'Integra datos de Odoo ERP'
    }
  ];

  const handleConfigure = (integrationName: string) => {
    if (integrationName === 'Google Calendar') {
      // El componente GoogleCalendarSetup maneja esto
      return;
    }
    alert(`Configuración de ${integrationName} - Próximamente disponible`);
  };

  return (
    <div className="integrations-container">
      <div className="integrations-header">
        <h1>Integraciones</h1>
        <p>Conecta BrieAI con tus herramientas favoritas</p>
      </div>

      <div className="integrations-grid">
        {integrations.map((integration) => (
          <div key={integration.id} className="integration-card">
            <div className="integration-logo">
              <img 
                src={integration.logo} 
                alt={`${integration.name} logo`}
                loading="lazy"
                onError={(e) => {
                  const target = e.currentTarget;
                  const fallback = target.nextElementSibling as HTMLElement;
                  target.style.display = 'none';
                  if (fallback) {
                    fallback.style.display = 'flex';
                    fallback.innerHTML = `<div style="width: 40px; height: 40px; background: var(--primary-color); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px;">${integration.name.charAt(0)}</div>`;
                  }
                }}
              />
              <div className="logo-fallback" style={{ display: 'none' }}>
                <Settings size={40} />
              </div>
            </div>
            
            <div className="integration-info">
              <h3>{integration.name}</h3>
              <p>{integration.description}</p>
            </div>
            
            {integration.name === 'Google Calendar' ? (
              <button 
                className="configure-button"
                disabled={true}
                style={{ opacity: 0.4, cursor: 'not-allowed', filter: 'grayscale(100%)' }}
                title="Próximamente disponible"
              >
                <Settings size={16} />
                Próximamente
              </button>
            ) : (
              <button 
                className="configure-button"
                disabled={true}
                style={{ opacity: 0.4, cursor: 'not-allowed', filter: 'grayscale(100%)' }}
                title="Próximamente disponible"
              >
                <Settings size={16} />
                Próximamente
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="integrations-footer">
        <p>¿No encuentras la integración que necesitas?</p>
        <button className="request-integration-button">
          Solicitar nueva integración
        </button>
      </div>
    </div>
  );
};

export default Integrations;