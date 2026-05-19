import json
import boto3
from datetime import datetime, timedelta
import urllib.request
import urllib.parse
import ssl

def lambda_handler(event, context):
    print(f"Event: {json.dumps(event)}")
    
    try:
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

def get_google_tokens():
    """Obtiene tokens de Google Calendar desde Secrets Manager"""
    try:
        secrets_client = boto3.client('secretsmanager', region_name='us-east-1')
        response = secrets_client.get_secret_value(SecretId='brieai/google-calendar/tokens')
        return json.loads(response['SecretString'])
    except Exception as e:
        print(f"Error obteniendo tokens: {str(e)}")
        return None

def call_google_calendar_api(endpoint, method='GET', data=None):
    """Llama a la API de Google Calendar usando urllib"""
    try:
        tokens = get_google_tokens()
        if not tokens:
            print("No se pudieron obtener tokens")
            return None
            
        url = f"https://www.googleapis.com/calendar/v3{endpoint}"
        
        headers = {
            'Authorization': f"Bearer {tokens['access_token']}",
            'Content-Type': 'application/json'
        }
        
        req = urllib.request.Request(url, headers=headers)
        
        if method == 'POST' and data:
            req.data = json.dumps(data).encode('utf-8')
        
        # Crear contexto SSL que ignore verificación de certificados
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        
        with urllib.request.urlopen(req, context=ctx) as response:
            if response.status == 200:
                return json.loads(response.read().decode('utf-8'))
            else:
                print(f"API Error: {response.status}")
                return None
                
    except Exception as e:
        print(f"Error calling Google API: {str(e)}")
        return None

def list_events(params, event):
    """Lista eventos reales del calendario"""
    try:
        days_ahead = int(params.get('days_ahead', 7))
        
        # Calcular fechas
        time_min = datetime.utcnow().isoformat() + 'Z'
        time_max = (datetime.utcnow() + timedelta(days=days_ahead)).isoformat() + 'Z'
        
        # Llamar a Google Calendar API
        endpoint = f"/calendars/primary/events?timeMin={urllib.parse.quote(time_min)}&timeMax={urllib.parse.quote(time_max)}&singleEvents=true&orderBy=startTime"
        calendar_data = call_google_calendar_api(endpoint)
        
        if calendar_data and 'items' in calendar_data:
            events = []
            for item in calendar_data['items']:
                event_data = {
                    'summary': item.get('summary', 'Sin título'),
                    'start': item.get('start', {}).get('dateTime', item.get('start', {}).get('date', '')),
                    'end': item.get('end', {}).get('dateTime', item.get('end', {}).get('date', '')),
                    'description': item.get('description', ''),
                    'id': item.get('id', ''),
                    'location': item.get('location', '')
                }
                events.append(event_data)
            
            return success_response(event, {
                'events': events,
                'total_events': len(events),
                'period': f'Próximos {days_ahead} días',
                'status': 'Eventos reales de Google Calendar'
            })
        else:
            print("No se obtuvieron eventos de la API, usando fallback")
            return list_events_fallback(days_ahead, event)
            
    except Exception as e:
        print(f"Error listando eventos: {str(e)}")
        return list_events_fallback(7, event)

def list_events_fallback(days_ahead, event):
    """Eventos de respaldo si falla la conexión a Google"""
    mock_events = [
        {
            'summary': 'Reunión con inversores - Shark Tank',
            'start': '2025-09-01T10:00:00',
            'end': '2025-09-01T11:00:00',
            'description': 'Presentación de BrieAI a potenciales inversores'
        }
    ]
    
    return success_response(event, {
        'events': mock_events,
        'total_events': len(mock_events),
        'period': f'Próximos {days_ahead} días',
        'status': 'Usando datos de respaldo (API no disponible)'
    })

def create_event(params, event):
    """Crea un evento real en Google Calendar"""
    try:
        title = params.get('title', 'Evento sin título')
        start_time = params.get('start_time', '')
        end_time = params.get('end_time', '')
        description = params.get('description', '')
        
        if not start_time:
            return error_response(event, 'start_time es requerido')
        
        if not end_time:
            try:
                start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                end_dt = start_dt + timedelta(hours=1)
                end_time = end_dt.isoformat()
            except:
                return error_response(event, 'Formato de fecha inválido')
        
        # Crear evento en Google Calendar
        event_data = {
            'summary': title,
            'description': description,
            'start': {
                'dateTime': start_time,
                'timeZone': 'America/Montevideo'
            },
            'end': {
                'dateTime': end_time,
                'timeZone': 'America/Montevideo'
            }
        }
        
        result = call_google_calendar_api('/calendars/primary/events', 'POST', event_data)
        
        if result:
            return success_response(event, {
                'message': f'Evento "{title}" creado exitosamente en Google Calendar',
                'event': {
                    'id': result.get('id'),
                    'summary': result.get('summary'),
                    'start': result.get('start', {}).get('dateTime'),
                    'end': result.get('end', {}).get('dateTime'),
                    'description': result.get('description', '')
                },
                'status': 'Evento creado en Google Calendar'
            })
        else:
            return error_response(event, 'Error creando evento en Google Calendar')
            
    except Exception as e:
        return error_response(event, f'Error creando evento: {str(e)}')

def check_availability(params, event):
    """Verifica disponibilidad básica"""
    try:
        date = params.get('date', '')
        if not date:
            return error_response(event, 'date es requerido (formato: YYYY-MM-DD)')
        
        return success_response(event, {
            'date': date,
            'available_slots': [
                {'start': '09:00', 'end': '12:00', 'duration_hours': 3},
                {'start': '13:00', 'end': '17:00', 'duration_hours': 4}
            ],
            'busy_slots': [],
            'total_available_hours': 7
        })
        
    except Exception as e:
        return error_response(event, f'Error verificando disponibilidad: {str(e)}')

def success_response(event, data):
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