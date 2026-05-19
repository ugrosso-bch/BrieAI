import json
import boto3
import pymysql

dynamodb = boto3.resource('dynamodb')
secrets_client = boto3.client('secretsmanager')
connections_table = dynamodb.Table('brieai-db-connections')

def lambda_handler(event, context):
    try:
        print(f"Evento recibido: {json.dumps(event)}")
        
        function_name = event.get('function', 'unknown')
        parameters = {param['name']: param['value'] for param in event.get('parameters', [])}
        
        if function_name == 'get_database_schema':
            connection_id = parameters.get('connectionId')
            
            # Buscar conexión por connectionId usando scan
            response = connections_table.scan(
                FilterExpression='connectionId = :cid',
                ExpressionAttributeValues={':cid': connection_id}
            )
            
            if not response['Items']:
                return create_response(event, "Conexión no encontrada")
            
            connection = response['Items'][0]
            
            # Obtener credenciales de Secrets Manager
            secret_response = secrets_client.get_secret_value(
                SecretId=connection['secretArn']
            )
            credentials = json.loads(secret_response['SecretString'])
            
            # Conectar a MySQL
            conn = pymysql.connect(
                host=connection['host'],
                port=int(connection['port']),
                user=credentials['user'],
                password=credentials['password'],
                database=connection['database']
            )
            
            cursor = conn.cursor()
            
            # Obtener tablas
            cursor.execute("SHOW TABLES")
            tables = [table[0] for table in cursor.fetchall()]
            
            # Obtener algunos datos de ejemplo
            schema_info = []
            for table in tables:
                cursor.execute(f"DESCRIBE {table}")
                columns = cursor.fetchall()
                
                # Obtener algunos registros de ejemplo
                cursor.execute(f"SELECT * FROM {table} LIMIT 3")
                sample_data = cursor.fetchall()
                
                table_info = f"Tabla '{table}' con columnas: {', '.join([col[0] for col in columns])}"
                if sample_data:
                    table_info += f" (contiene {len(sample_data)} registros)"
                
                schema_info.append(table_info)
            
            conn.close()
            
            response_text = f"""Base de datos '{connection['name']}' conectada exitosamente.

Esquema encontrado:
{chr(10).join(['- ' + info for info in schema_info])}

Puedo ejecutar consultas SQL en estas tablas. ¿Qué consulta específica te gustaría que ejecute?"""
            
            return create_response(event, response_text)
            
        elif function_name == 'execute_query':
            connection_id = parameters.get('connectionId')
            query = parameters.get('query', '')
            
            # Buscar conexión
            response = connections_table.scan(
                FilterExpression='connectionId = :cid',
                ExpressionAttributeValues={':cid': connection_id}
            )
            
            if not response['Items']:
                return create_response(event, "Conexión no encontrada")
            
            connection = response['Items'][0]
            
            # Obtener credenciales de Secrets Manager
            secret_response = secrets_client.get_secret_value(
                SecretId=connection['secretArn']
            )
            credentials = json.loads(secret_response['SecretString'])
            
            # Ejecutar query
            conn = pymysql.connect(
                host=connection['host'],
                port=int(connection['port']),
                user=credentials['user'],
                password=credentials['password'],
                database=connection['database']
            )
            
            cursor = conn.cursor()
            cursor.execute(query)
            
            if query.strip().upper().startswith('SELECT'):
                results = cursor.fetchall()
                columns = [desc[0] for desc in cursor.description]
                
                response_text = f"Consulta ejecutada: {query}\n\nResultados ({len(results)} filas):\n"
                for i, row in enumerate(results[:10]):  # Solo primeras 10 filas
                    response_text += f"{i+1}. {dict(zip(columns, row))}\n"
                
                if len(results) > 10:
                    response_text += f"... y {len(results) - 10} filas más"
            else:
                conn.commit()
                response_text = f"Consulta ejecutada exitosamente: {query}"
            
            conn.close()
            return create_response(event, response_text)
        
        return create_response(event, f"Función {function_name} no implementada")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return create_response(event, f"Error: {str(e)}")

def create_response(event, text):
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