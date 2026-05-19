import json

def lambda_handler(event, context):
    try:
        print(f"Evento recibido: {json.dumps(event)}")
        
        # El Agent de Bedrock envía el evento en un formato específico
        function_name = event.get('function', 'unknown')
        
        # Respuesta en formato que espera el Agent
        response_body = {
            'TEXT': {
                'body': f'Función {function_name} ejecutada correctamente. Esquema de base de datos disponible: tablas users, products, orders.'
            }
        }
        
        return {
            'messageVersion': '1.0',
            'response': response_body
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        
        error_response = {
            'TEXT': {
                'body': f'Error ejecutando función: {str(e)}'
            }
        }
        
        return {
            'messageVersion': '1.0',
            'response': error_response
        }