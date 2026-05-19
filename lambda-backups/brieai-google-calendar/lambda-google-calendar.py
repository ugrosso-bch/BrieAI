import json
import boto3
import urllib3
import logging
from datetime import datetime, timedelta

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
secrets_client = boto3.client('secretsmanager')

def lambda_handler(event, context):
    try:
        logger.info(f"Evento recibido: {json.dumps(event)}")
        
        function_name = event.get('function', 'unknown')
        parameters = {param['name']: param['value'] for param in event.get('parameters', [])}
        
        if function_name == 'get_calendar_events':
            date_filter = parameters.get('date', 'today')
            return get_calendar_events(event, date_filter)
            
        elif function_name == 'create_calendar_event':
            title = parameters.get('title', '')
            date = parameters.get('date', '')
            time = parameters.get('time', '')
            description = parameters.get('description', '')
            return create_calendar_event(event, title, date, time, description)
            
        elif function_name == 'list_upcoming_events':
            days = int(parameters.get('days', 7))
            return list_upcoming_events(event, days)
            
        else:
            return get_calendar_info(event)
            
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return create_response(event, f"Error procesando solicitud de calendario: {str(e)}")

def get_calendar_events(event, date_filter):
    """Obtiene eventos del calendario para una fecha específica"""
    try:
        # Simular eventos del calendario
        today = datetime.now()
        
        if date_filter.lower() in ['today', 'hoy']:
            target_date = today
            date_str = "hoy"
        elif date_filter.lower() in ['tomorrow', 'mañana']:
            target_date = today + timedelta(days=1)
            date_str = "mañana"
        else:
            target_date = today
            date_str = date_filter
        
        # Eventos de ejemplo
        sample_events = [
            {
                'title': 'Reunión de equipo',
                'time': '09:00 AM',
                'duration': '1 hora',
                'attendees': ['equipo@empresa.com'],
                'location': 'Sala de conferencias'
            },
            {
                'title': 'Llamada con cliente',
                'time': '02:00 PM',
                'duration': '30 minutos',
                'attendees': ['cliente@empresa.com'],
                'location': 'Google Meet'
            },
            {
                'title': 'Revisión de proyecto',
                'time': '04:30 PM',
                'duration': '45 minutos',
                'attendees': ['manager@empresa.com'],
                'location': 'Oficina'
            }
        ]
        
        response_text = f"""📅 Eventos de calendario para {date_str}:

{chr(10).join([f"• {event['time']} - {event['title']} ({event['duration']})" for event in sample_events])}

📊 Resumen:
- Total de eventos: {len(sample_events)}
- Tiempo total ocupado: 2 horas 15 minutos
- Próximo evento: {sample_events[0]['title']} a las {sample_events[0]['time']}

💡 Puedes pedirme:
- "Crea una reunión mañana a las 3pm"
- "¿Qué eventos tengo esta semana?"
- "Cancela la reunión de las 2pm"

¿Necesitas más detalles sobre algún evento específico?"""
        
        return create_response(event, response_text)
        
    except Exception as e:
        return create_response(event, f"❌ Error obteniendo eventos: {str(e)}")

def create_calendar_event(event, title, date, time, description):
    """Crea un nuevo evento en el calendario"""
    try:
        if not title:
            return create_response(event, "❌ Se requiere un título para el evento")
        
        # Procesar fecha y hora
        if not date:
            date = "hoy"
        if not time:
            time = "por definir"
        
        # Simular creación del evento
        event_id = f"evt_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        response_text = f"""✅ Evento creado exitosamente

📅 Detalles del evento:
- Título: {title}
- Fecha: {date}
- Hora: {time}
- Descripción: {description if description else 'Sin descripción'}
- ID del evento: {event_id}

🔗 El evento ha sido agregado a tu calendario de Google.

💡 Próximos pasos:
- Recibirás una notificación 15 minutos antes
- Puedes modificar el evento diciendo "Edita el evento {title}"
- Para cancelar: "Cancela el evento {title}"

¿Necesitas agregar invitados o modificar algún detalle?"""
        
        return create_response(event, response_text)
        
    except Exception as e:
        return create_response(event, f"❌ Error creando evento: {str(e)}")

def list_upcoming_events(event, days):
    """Lista eventos próximos en los siguientes días"""
    try:
        # Eventos de ejemplo para los próximos días
        upcoming_events = [
            {'date': 'Hoy', 'events': 3, 'highlight': 'Reunión de equipo a las 9:00 AM'},
            {'date': 'Mañana', 'events': 2, 'highlight': 'Presentación de proyecto a las 10:00 AM'},
            {'date': 'Miércoles', 'events': 4, 'highlight': 'Workshop de innovación a las 2:00 PM'},
            {'date': 'Jueves', 'events': 1, 'highlight': 'Reunión con cliente a las 11:00 AM'},
            {'date': 'Viernes', 'events': 2, 'highlight': 'Revisión semanal a las 4:00 PM'}
        ]
        
        total_events = sum(day['events'] for day in upcoming_events[:days])
        
        response_text = f"""📅 Eventos próximos ({days} días):

{chr(10).join([f"• {day['date']}: {day['events']} eventos - {day['highlight']}" for day in upcoming_events[:days]])}

📊 Resumen de la semana:
- Total de eventos: {total_events}
- Día más ocupado: Miércoles (4 eventos)
- Tiempo libre disponible: Fines de semana

⚡ Eventos importantes:
- Presentación de proyecto (Mañana)
- Workshop de innovación (Miércoles)
- Revisión semanal (Viernes)

💡 ¿Te gustaría que te recuerde algún evento específico o necesitas reprogramar algo?"""
        
        return create_response(event, response_text)
        
    except Exception as e:
        return create_response(event, f"❌ Error listando eventos: {str(e)}")

def get_calendar_info(event):
    """Información general sobre la integración de Google Calendar"""
    return create_response(event, """📅 Integración de Google Calendar

🔗 Estado de conexión:
- Google Calendar: ✅ Conectado
- Sincronización: Activa
- Última actualización: Hace 5 minutos

💡 Funciones disponibles:
- Ver eventos de hoy/mañana/semana
- Crear nuevos eventos
- Modificar eventos existentes
- Recibir recordatorios automáticos

🗣️ Comandos que puedes usar:
- "¿Qué eventos tengo hoy?"
- "Crea una reunión mañana a las 3pm con el equipo"
- "Lista mis eventos de esta semana"
- "¿Tengo tiempo libre el viernes?"

📊 Estadísticas:
- Eventos este mes: 24
- Reuniones programadas: 18
- Tiempo promedio por evento: 45 minutos

¿Qué te gustaría hacer con tu calendario?""")

def create_response(event, text):
    """Crea la respuesta en el formato esperado por Bedrock Agent"""
    return {
        "messageVersion": "1.0",
        "response": {
            "actionGroup": event.get('actionGroup'),
            "function": event.get('function'),
            "functionResponse": {
                "responseBody": {
                    "TEXT": {
                        "body": text
                    }
                }
            }
        }
    }