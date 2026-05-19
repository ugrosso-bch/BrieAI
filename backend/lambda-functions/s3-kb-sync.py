import json
import boto3
import logging
from urllib.parse import unquote_plus

logger = logging.getLogger()
logger.setLevel(logging.INFO)

bedrock_agent = boto3.client('bedrock-agent')

KNOWLEDGE_BASE_ID = 'GGWEF8GFTP'
DATA_SOURCE_ID = 'ELS4VKD6AS'

def lambda_handler(event, context):
    """
    Lambda function to sync Knowledge Base when S3 objects are created or deleted
    """
    try:
        for record in event['Records']:
            # Get S3 event details
            event_name = record['eventName']
            bucket_name = record['s3']['bucket']['name']
            object_key = unquote_plus(record['s3']['object']['key'])
            
            logger.info(f"Processing S3 event: {event_name} for object: {object_key}")
            
            # Trigger Knowledge Base sync for both create and delete events
            if event_name.startswith('ObjectCreated') or event_name.startswith('ObjectRemoved'):
                sync_response = bedrock_agent.start_ingestion_job(
                    knowledgeBaseId=KNOWLEDGE_BASE_ID,
                    dataSourceId=DATA_SOURCE_ID,
                    description=f'Auto-sync triggered by S3 event: {event_name} on {object_key}'
                )
                
                job_id = sync_response['ingestionJob']['ingestionJobId']
                logger.info(f"Started Knowledge Base sync job: {job_id}")
        
        return {
            'statusCode': 200,
            'body': json.dumps('Knowledge Base sync triggered successfully')
        }
        
    except Exception as e:
        logger.error(f"Error processing S3 event: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps(f'Error: {str(e)}')
        }