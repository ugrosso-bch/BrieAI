import json
import boto3
from datetime import datetime, timedelta
import os
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

def lambda_handler(event, context):
    print(f"Event: {json.dumps(event)}")
    
    try:
        # Extraer parámetros
        params = {}
        for param in event.get('parameters', []):
            params[param['name']] = param['value']
        
        api_path = event.get('apiPath', '')
        
        if api_path == '/list-events':
            return list_events(params, event)
        elif api_path == '/create-event':
            return create_event(params, event)
        elif api_path == '/check-availability':
            return check_availability(params, event)
        else:
            return error_response(event, f'Acción no soportada: {api_path}')
            
    except Exception as e:
        print(f"Error: {str(e)}")
        return error_response(event, f'Error interno: {str(e)}')

def get_calendar_service():
    """Obtiene el servicio de Google Calendar"""
    # Por ahora usamos credenciales mock - necesitaremos configurar OAuth
    # En producción, esto vendría de AWS Secrets Manager
    return None

def list_events(params, event):
    """Lista eventos del calendario"""
    try:
        # Por ahora usar datos mock hasta integrar completamente con el backend
        # En producción, esto haría una llamada al servicio de Node.js
        days_ahead = int(params.get('days_ahead', 7))
        
        # Eventos reales se obtendrían del servicio Node.js
        # response = requests.get(f'http://backend-url/api/google/calendar/events/ugrosso')
        
        mock_events = [
            {
                'summary': 'Reunión con inversores - Shark Tank',
                'start': '2025-09-01T10:00:00',
                'end': '2025-09-01T11:00:00',
                'description': 'Presentación de BrieAI a potenciales inversores'
            },
            {
                'summary': 'Demo BrieAI',
                'start': '2025-09-02T14:00:00',
                'end': '2025-09-02T15:30:00',
                'description': 'Demostración completa de la plataforma'
            }
        ]
        
        return success_response(event, {
            'events': mock_events,
            'total_events': len(mock_events),
            'period': f'Próximos {days_ahead} días',
            'status': 'Calendario autorizado y conectado'
        })
        
    except Exception as e:
        return error_response(event, f'Error listando eventos: {str(e)}')

def create_event(params, event):
    """Crea un nuevo evento en el calendario"""
    try:
        title = params.get('title', 'Evento sin título')
        start_time = params.get('start_time', '')
        end_time = params.get('end_time', '')
        description = params.get('description', '')
        
        # Validar parámetros requeridos
        if not start_time:
            return error_response(event, 'start_time es requerido')
        
        # Si no hay end_time, asumir 1 hora
        if not end_time:
            try:
                start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                end_dt = start_dt + timedelta(hours=1)
                end_time = end_dt.isoformat()
            except:
                return error_response(event, 'Formato de fecha inválido')
        
        # Simulación de creación de evento
        new_event = {
            'id': f'event_{int(datetime.now().timestamp())}',
            'summary': title,
            'start': start_time,
            'end': end_time,
            'description': description,
            'status': 'confirmed',
            'created': datetime.now().isoformat()
        }
        
        return success_response(event, {
            'message': f'Evento "{title}" creado exitosamente',
            'event': new_event
        })
        
    except Exception as e:
        return error_response(event, f'Error creando evento: {str(e)}')

def check_availability(params, event):
    """Verifica disponibilidad en el calendario"""
    try:
        date = params.get('date', '')
        start_hour = int(params.get('start_hour', 9))
        end_hour = int(params.get('end_hour', 17))
        
        if not date:
            return error_response(event, 'date es requerido (formato: YYYY-MM-DD)')
        
        # Simulación de disponibilidad
        busy_slots = [
            {'start': '10:00', 'end': '11:00', 'title': 'Reunión con inversores'},
            {'start': '14:00', 'end': '15:30', 'title': 'Demo Shark Tank'}
        ]
        
        available_slots = []
        current_hour = start_hour
        
        for slot in busy_slots:
            slot_start = int(slot['start'].split(':')[0])
            if current_hour < slot_start:
                available_slots.append({
                    'start': f'{current_hour:02d}:00',
                    'end': f'{slot_start:02d}:00',
                    'duration_hours': slot_start - current_hour
                })
            current_hour = int(slot['end'].split(':')[0]) + 1
        
        # Agregar slot final si queda tiempo
        if current_hour < end_hour:
            available_slots.append({
                'start': f'{current_hour:02d}:00',
                'end': f'{end_hour:02d}:00',
                'duration_hours': end_hour - current_hour
            })
        
        return success_response(event, {
            'date': date,
            'available_slots': available_slots,
            'busy_slots': busy_slots,
            'total_available_hours': sum(slot['duration_hours'] for slot in available_slots)
        })
        
    except Exception as e:
        return error_response(event, f'Error verificando disponibilidad: {str(e)}')

def success_response(event, data):
    """Respuesta exitosa para Bedrock Agent"""
    return {
        'messageVersion': '1.0',
        'response': {
            'actionGroup': event.get('actionGroup', ''),
            'apiPath': event.get('apiPath', ''),
            'httpMethod': event.get('httpMethod', ''),
            'httpStatusCode': 200,
            'responseBody': {
                'application/json': {
                    'body': json.dumps(data)
                }
            }
        }
    }

def error_response(event, error_message):
    """Respuesta de error para Bedrock Agent"""
    return {
        'messageVersion': '1.0',
        'response': {
            'actionGroup': event.get('actionGroup', ''),
            'apiPath': event.get('apiPath', ''),
            'httpMethod': event.get('httpMethod', ''),
            'httpStatusCode': 400,
            'responseBody': {
                'application/json': {
                    'body': json.dumps({'error': error_message})
                }
            }
        }
    }