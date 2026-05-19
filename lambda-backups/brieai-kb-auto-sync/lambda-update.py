import json
import boto3
import logging
import os
from urllib.parse import unquote_plus

# Configurar logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Cliente de Bedrock Agent
bedrock_agent = boto3.client('bedrock-agent')

def lambda_handler(event, context):
    """
    Función Lambda para sincronizar Knowledge Base cuando se crean o eliminan objetos en S3
    """
    try:
        logger.info(f"Evento recibido: {json.dumps(event)}")
        
        # Obtener IDs desde variables de entorno
        knowledge_base_id = os.environ.get('KNOWLEDGE_BASE_ID', 'GGWEF8GFTP')
        data_source_id = os.environ.get('DATA_SOURCE_ID', 'ELS4VKD6AS')
        
        for record in event['Records']:
            # Obtener detalles del evento S3
            event_name = record['eventName']
            bucket_name = record['s3']['bucket']['name']
            object_key = unquote_plus(record['s3']['object']['key'])
            
            logger.info(f"Procesando evento {event_name} para archivo {object_key} en bucket {bucket_name}")
            
            # Disparar sync de Knowledge Base para eventos de creación y eliminación
            if event_name.startswith('ObjectCreated') or event_name.startswith('ObjectRemoved'):
                try:
                    sync_response = bedrock_agent.start_ingestion_job(
                        knowledgeBaseId=knowledge_base_id,
                        dataSourceId=data_source_id,
                        description=f'Auto-sync disparado por evento S3: {event_name} en {object_key}'
                    )
                    
                    job_id = sync_response['ingestionJob']['ingestionJobId']
                    logger.info(f"Trabajo de sincronización iniciado exitosamente: {job_id}")
                    
                except Exception as sync_error:
                    logger.error(f"Error iniciando sincronización: {str(sync_error)}")
                    raise sync_error
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Sincronización de Knowledge Base disparada exitosamente',
                'knowledgeBaseId': knowledge_base_id,
                'dataSourceId': data_source_id
            })
        }
        
    except Exception as e:
        logger.error(f"Error en auto-sync: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e),
                'message': 'Error procesando evento S3'
            })
        }