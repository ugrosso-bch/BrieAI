import json
import boto3
from datetime import datetime

def lambda_handler(event, context):
    print(f"Evento recibido: {json.dumps(event)}")
    
    ses = boto3.client('ses')
    
    try:
        # Extraer parámetros del evento
        action_group = event.get('actionGroup', '')
        api_path = event.get('apiPath', '')
        parameters = event.get('parameters', [])
        
        # Convertir parámetros a diccionario
        params = {}
        for param in parameters:
            params[param['name']] = param['value']
        
        if api_path == '/send-email':
            return send_email(ses, params)
        else:
            return {
                'statusCode': 400,
                'body': {
                    'application/json': {
                        'body': json.dumps({'error': f'Acción no soportada: {api_path}'})
                    }
                }
            }
            
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': {
                'application/json': {
                    'body': json.dumps({'error': str(e)})
                }
            }
        }

def send_email(ses, params):
    """Enviar email usando SES"""
    try:
        recipient = params.get('recipient')
        subject = params.get('subject', 'Información de BrieAI')
        content = params.get('content', '')
        sender = 'ugrosso@bigcheese.com.uy'  # Email verificado en SES
        
        if not recipient:
            return {
                'statusCode': 400,
                'body': {
                    'application/json': {
                        'body': json.dumps({'error': 'Destinatario requerido'})
                    }
                }
            }
        
        # Enviar email
        response = ses.send_email(
            Source=sender,
            Destination={'ToAddresses': [recipient]},
            Message={
                'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                'Body': {
                    'Text': {'Data': content, 'Charset': 'UTF-8'},
                    'Html': {
                        'Data': f"""
                        <html>
                        <body>
                            <h2>{subject}</h2>
                            <div style="white-space: pre-wrap; font-family: Arial, sans-serif;">
                                {content}
                            </div>
                            <hr>
                            <p><small>Enviado por BrieAI - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</small></p>
                        </body>
                        </html>
                        """,
                        'Charset': 'UTF-8'
                    }
                }
            }
        )
        
        message_id = response['MessageId']
        
        return {
            'statusCode': 200,
            'body': {
                'application/json': {
                    'body': json.dumps({
                        'success': True,
                        'message': f'Email enviado exitosamente a {recipient}',
                        'messageId': message_id
                    })
                }
            }
        }
        
    except Exception as e:
        print(f"Error enviando email: {str(e)}")
        return {
            'statusCode': 500,
            'body': {
                'application/json': {
                    'body': json.dumps({
                        'success': False,
                        'error': f'Error enviando email: {str(e)}'
                    })
                }
            }
        }