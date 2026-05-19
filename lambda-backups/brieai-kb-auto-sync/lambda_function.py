import json
import boto3
import urllib.parse
from datetime import datetime

def lambda_handler(event, context):
    print(f"Evento recibido: {json.dumps(event)}")
    
    bedrock_agent = boto3.client('bedrock-agent')
    
    # IDs de Knowledge Base
    KNOWLEDGE_BASE_ID = 'P7FLW1X7A0'
    DATA_SOURCE_ID = 'L0ZZINAE2L'
    
    try:
        for record in event['Records']:
            # Obtener información del evento S3
            bucket = record['s3']['bucket']['name']
            key = urllib.parse.unquote_plus(record['s3']['object']['key'])
            event_name = record['eventName']
            
            print(f"Procesando: {event_name} para {key} en bucket {bucket}")
            
            # Determinar el tipo de evento
            if event_name.startswith('ObjectCreated'):
                reason = f"Archivo creado: {key}"
            elif event_name.startswith('ObjectRemoved'):
                reason = f"Archivo eliminado: {key}"
            else:
                reason = f"Evento S3: {event_name} - {key}"
            
            # Iniciar sync del Knowledge Base
            response = bedrock_agent.start_ingestion_job(
                knowledgeBaseId=KNOWLEDGE_BASE_ID,
                dataSourceId=DATA_SOURCE_ID,
                description=f"{reason} - {datetime.now().isoformat()}"
            )
            
            job_id = response['ingestionJob']['ingestionJobId']
            print(f"✅ Sync iniciado: {job_id}")
            
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Sync iniciado exitosamente',
                'jobId': job_id
            })
        }
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e)
            })
        }