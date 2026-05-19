import json
import boto3
import pymysql
import psycopg2
import os

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')

# La tabla usa 'id' como partition key (igual a connectionId)
CONNECTIONS_TABLE = os.environ.get('CONNECTIONS_TABLE', 'dev-brieai-db-connections')

def lambda_handler(event, context):
    try:
        print(f"Evento recibido: {json.dumps(event)}")
        
        api_path = event.get('apiPath', '')
        http_method = event.get('httpMethod', 'POST')
        action_group = event.get('actionGroup', 'DatabaseActions')
        parameters = event.get('parameters', [])
        
        # Soporte para requestBody (OpenAPI requestBody format)
        params = {}
        for param in parameters:
            params[param['name']] = param['value']
        
        request_body = event.get('requestBody', {})
        if request_body:
            content = request_body.get('content', {})
            json_content = content.get('application/json', {})
            properties = json_content.get('properties', {})
            for key, val in properties.items():
                params[key] = val.get('value', '')
        
        print(f"Path: {api_path}, Params: {params}")
        
        if api_path == '/list-connections':
            result = list_connections()
        elif api_path == '/get-schema':
            result = get_database_schema(params.get('connectionId'))
        elif api_path == '/execute-query':
            result = execute_query(params.get('connectionId'), params.get('query'))
        else:
            result = {
                'statusCode': 400,
                'body': json.dumps({'error': f'API Path no soportado: {api_path}'})
            }
        
        return {
            'messageVersion': '1.0',
            'response': {
                'actionGroup': action_group,
                'apiPath': api_path,
                'httpMethod': http_method,
                'httpStatusCode': result.get('statusCode', 200),
                'responseBody': {
                    'application/json': {
                        'body': result.get('body', '{}')
                    }
                }
            }
        }
            
    except Exception as e:
        print(f"Error en lambda_handler: {str(e)}")
        return {
            'messageVersion': '1.0',
            'response': {
                'actionGroup': event.get('actionGroup', 'DatabaseActions'),
                'apiPath': event.get('apiPath', ''),
                'httpMethod': event.get('httpMethod', 'POST'),
                'httpStatusCode': 500,
                'responseBody': {
                    'application/json': {
                        'body': json.dumps({'error': str(e)})
                    }
                }
            }
        }


def get_connection_from_dynamo(connection_id):
    """Busca la conexión en DynamoDB. Prueba con 'id' como partition key."""
    table = dynamodb.Table(CONNECTIONS_TABLE)
    
    # Intentar con 'id' (clave que guarda el backend Node.js)
    response = table.get_item(Key={'id': connection_id})
    if 'Item' in response:
        return response['Item']
    
    # Fallback: scan buscando por connectionId o name
    scan_response = table.scan(
        FilterExpression='connectionId = :cid OR #n = :cid',
        ExpressionAttributeNames={'#n': 'name'},
        ExpressionAttributeValues={':cid': connection_id}
    )
    items = scan_response.get('Items', [])
    if items:
        return items[0]
    
    return None


def list_connections():
    """Lista todas las conexiones disponibles"""
    try:
        table = dynamodb.Table(CONNECTIONS_TABLE)
        response = table.scan()
        items = response.get('Items', [])
        
        connections = []
        for item in items:
            connections.append({
                'id': item.get('id') or item.get('connectionId', ''),
                'name': item.get('name', 'Sin nombre'),
                'type': item.get('type', 'mysql'),
                'host': item.get('host', ''),
                'database': item.get('database', ''),
                'port': item.get('port', 3306)
            })
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'connections': connections,
                'count': len(connections)
            })
        }
    except Exception as e:
        print(f"Error listando conexiones: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }


def get_database_schema(connection_id):
    """Obtiene el esquema de una base de datos"""
    try:
        if not connection_id:
            return {'statusCode': 400, 'body': json.dumps({'error': 'connectionId requerido'})}
        
        connection = get_connection_from_dynamo(connection_id)
        if not connection:
            return {'statusCode': 404, 'body': json.dumps({'error': f'Conexión {connection_id} no encontrada'})}
        
        db_type = connection.get('type', 'mysql').lower()
        
        if db_type == 'mysql':
            return get_mysql_schema(connection)
        elif db_type in ('postgresql', 'postgres'):
            return get_postgres_schema(connection)
        else:
            return {'statusCode': 400, 'body': json.dumps({'error': f'Tipo de DB no soportado: {db_type}'})}
            
    except Exception as e:
        print(f"Error obteniendo schema: {str(e)}")
        return {'statusCode': 500, 'body': json.dumps({'error': str(e)})}


def get_mysql_schema(connection):
    conn = None
    try:
        conn = pymysql.connect(
            host=connection['host'],
            port=int(connection.get('port', 3306)),
            user=connection.get('username') or connection.get('user', ''),
            password=connection.get('password', ''),
            database=connection['database'],
            connect_timeout=10
        )
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT TABLE_NAME, TABLE_COMMENT 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = %s
        """, (connection['database'],))
        tables = cursor.fetchall()
        
        schema_info = []
        for table_name, table_comment in tables:
            cursor.execute("""
                SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s
                ORDER BY ORDINAL_POSITION
            """, (connection['database'], table_name))
            columns = cursor.fetchall()
            
            schema_info.append({
                'table': table_name,
                'comment': table_comment or '',
                'columns': [
                    {'name': col[0], 'type': col[1], 'nullable': col[2], 'key': col[3]}
                    for col in columns
                ]
            })
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'connection_name': connection.get('name', ''),
                'database': connection['database'],
                'schema': schema_info,
                'table_count': len(schema_info)
            })
        }
    finally:
        if conn:
            conn.close()


def get_postgres_schema(connection):
    conn = None
    try:
        conn = psycopg2.connect(
            host=connection['host'],
            port=int(connection.get('port', 5432)),
            user=connection.get('username') or connection.get('user', ''),
            password=connection.get('password', ''),
            database=connection['database'],
            connect_timeout=10
        )
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        tables = [row[0] for row in cursor.fetchall()]
        
        schema_info = []
        for table_name in tables:
            cursor.execute("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = %s
                ORDER BY ordinal_position
            """, (table_name,))
            columns = cursor.fetchall()
            
            schema_info.append({
                'table': table_name,
                'columns': [
                    {'name': col[0], 'type': col[1], 'nullable': col[2]}
                    for col in columns
                ]
            })
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'connection_name': connection.get('name', ''),
                'database': connection['database'],
                'schema': schema_info,
                'table_count': len(schema_info)
            })
        }
    finally:
        if conn:
            conn.close()


def execute_query(connection_id, query):
    """Ejecuta una consulta SQL"""
    try:
        if not connection_id or not query:
            return {'statusCode': 400, 'body': json.dumps({'error': 'connectionId y query son requeridos'})}
        
        # Validación de seguridad básica
        query_upper = query.strip().upper()
        dangerous = ['DROP ', 'TRUNCATE ', 'DELETE FROM', 'ALTER TABLE', 'CREATE TABLE', 'INSERT INTO', 'UPDATE ']
        for d in dangerous:
            if query_upper.startswith(d):
                return {
                    'statusCode': 403,
                    'body': json.dumps({'error': f'Operación no permitida: {d.strip()}. Solo se permiten SELECT.'})
                }
        
        connection = get_connection_from_dynamo(connection_id)
        if not connection:
            return {'statusCode': 404, 'body': json.dumps({'error': f'Conexión {connection_id} no encontrada'})}
        
        db_type = connection.get('type', 'mysql').lower()
        
        if db_type == 'mysql':
            return execute_mysql_query(connection, query)
        elif db_type in ('postgresql', 'postgres'):
            return execute_postgres_query(connection, query)
        else:
            return {'statusCode': 400, 'body': json.dumps({'error': f'Tipo de DB no soportado: {db_type}'})}
            
    except Exception as e:
        print(f"Error ejecutando query: {str(e)}")
        return {'statusCode': 500, 'body': json.dumps({'error': str(e)})}


def execute_mysql_query(connection, query):
    conn = None
    try:
        conn = pymysql.connect(
            host=connection['host'],
            port=int(connection.get('port', 3306)),
            user=connection.get('username') or connection.get('user', ''),
            password=connection.get('password', ''),
            database=connection['database'],
            connect_timeout=10
        )
        cursor = conn.cursor()
        cursor.execute(query)
        
        if query.strip().upper().startswith('SELECT'):
            results = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            
            rows = [dict(zip(columns, row)) for row in results[:50]]  # Max 50 filas
            
            response_text = f"Consulta ejecutada exitosamente.\nResultados ({len(results)} filas"
            if len(results) > 50:
                response_text += f", mostrando primeras 50"
            response_text += f"):\n\nColumnas: {', '.join(columns)}\n\nDatos:\n"
            for row in rows[:10]:
                response_text += str(row) + "\n"
            if len(rows) > 10:
                response_text += f"... y {len(rows) - 10} filas más"
            
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'success': True,
                    'query': query,
                    'columns': columns,
                    'rows': rows,
                    'total_rows': len(results),
                    'summary': response_text
                })
            }
        else:
            conn.commit()
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'success': True,
                    'message': 'Consulta ejecutada exitosamente',
                    'affected_rows': cursor.rowcount
                })
            }
    finally:
        if conn:
            conn.close()


def execute_postgres_query(connection, query):
    conn = None
    try:
        conn = psycopg2.connect(
            host=connection['host'],
            port=int(connection.get('port', 5432)),
            user=connection.get('username') or connection.get('user', ''),
            password=connection.get('password', ''),
            database=connection['database'],
            connect_timeout=10
        )
        cursor = conn.cursor()
        cursor.execute(query)
        
        if query.strip().upper().startswith('SELECT'):
            results = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            
            rows = [dict(zip(columns, row)) for row in results[:50]]
            
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'success': True,
                    'query': query,
                    'columns': columns,
                    'rows': rows,
                    'total_rows': len(results)
                }, default=str)  # default=str para manejar tipos no serializables
            }
        else:
            conn.commit()
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'success': True,
                    'message': 'Consulta ejecutada exitosamente',
                    'affected_rows': cursor.rowcount
                })
            }
    finally:
        if conn:
            conn.close()
