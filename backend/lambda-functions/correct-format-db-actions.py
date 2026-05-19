import json

def lambda_handler(event, context):
    try:
        print(f"Evento recibido: {json.dumps(event)}")
        
        function_name = event.get('function', 'unknown')
        parameters = {param['name']: param['value'] for param in event.get('parameters', [])}
        
        if function_name == 'get_database_schema':
            connection_id = parameters.get('connectionId', 'unknown')
            
            response_text = f"""He encontrado información sobre la base de datos con ID: {connection_id}

La base de datos contiene las siguientes tablas:
- users: Tabla de usuarios con columnas id, name, email, created_at
- products: Tabla de productos con columnas id, name, price, description, category
- orders: Tabla de pedidos con columnas id, user_id, product_id, quantity, total, order_date

¿Te gustaría que ejecute alguna consulta específica en alguna de estas tablas?"""
            
            return {
                "messageVersion": "1.0",
                "response": {
                    "actionGroup": event.get('actionGroup'),
                    "function": function_name,
                    "functionResponse": {
                        "responseBody": {
                            "TEXT": {
                                "body": response_text
                            }
                        }
                    }
                }
            }
        
        # Respuesta por defecto
        return {
            "messageVersion": "1.0", 
            "response": {
                "actionGroup": event.get('actionGroup'),
                "function": function_name,
                "functionResponse": {
                    "responseBody": {
                        "TEXT": {
                            "body": f"Función {function_name} no implementada aún."
                        }
                    }
                }
            }
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        
        return {
            "messageVersion": "1.0",
            "response": {
                "actionGroup": event.get('actionGroup', 'unknown'),
                "function": event.get('function', 'unknown'),
                "functionResponse": {
                    "responseBody": {
                        "TEXT": {
                            "body": f"Error ejecutando función: {str(e)}"
                        }
                    }
                }
            }
        }