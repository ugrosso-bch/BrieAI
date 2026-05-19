import json
import boto3

def lambda_handler(event, context):
    try:
        print(f"Evento recibido: {json.dumps(event)}")
        
        function_name = event.get('function', 'unknown')
        
        if function_name == 'get_database_schema':
            return {
                'statusCode': 200,
                'body': {
                    'message': 'Función get_database_schema ejecutada',
                    'schema': [
                        {
                            'table': 'users',
                            'columns': ['id', 'name', 'email']
                        },
                        {
                            'table': 'products', 
                            'columns': ['id', 'name', 'price']
                        }
                    ]
                }
            }
        
        return {
            'statusCode': 200,
            'body': {
                'message': f'Función {function_name} no implementada aún',
                'available_functions': ['get_database_schema']
            }
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': {
                'error': str(e)
            }
        }