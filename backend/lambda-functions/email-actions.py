import json
import boto3
from botocore.exceptions import ClientError

def lambda_handler(event, context):
    print(f"Received event: {json.dumps(event)}")
    
    ses_client = boto3.client('ses', region_name='us-east-1')
    from_email = 'ugrosso@bigcheese.com.uy'
    
    try:
        action_group = event.get('actionGroup', '')
        api_path = event.get('apiPath', '')
        http_method = event.get('httpMethod', 'POST')
        parameters = event.get('parameters', [])
        
        # Soporte para requestBody (formato OpenAPI con requestBody)
        params = {}
        for param in parameters:
            params[param['name']] = param['value']
        
        # También leer del requestBody si viene en ese formato
        request_body = event.get('requestBody', {})
        if request_body:
            content = request_body.get('content', {})
            json_content = content.get('application/json', {})
            properties = json_content.get('properties', {})
            for key, val in properties.items():
                params[key] = val.get('value', '')
        
        print(f"Action: {action_group}, Path: {api_path}, Method: {http_method}")
        print(f"Parameters: {params}")
        
        if api_path == '/send-email':
            result = send_email(ses_client, from_email, params)
        elif api_path == '/send-analysis-report':
            result = send_analysis_report(ses_client, from_email, params)
        else:
            result = {
                'statusCode': 400,
                'body': json.dumps({'error': f'Acción no soportada: {api_path}'})
            }
        
        return {
            'messageVersion': '1.0',
            'response': {
                'actionGroup': action_group,
                'apiPath': api_path,
                'httpMethod': http_method,
                'httpStatusCode': result['statusCode'],
                'responseBody': {
                    'application/json': {
                        'body': result['body']
                    }
                }
            }
        }
            
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'messageVersion': '1.0',
            'response': {
                'actionGroup': event.get('actionGroup', ''),
                'apiPath': event.get('apiPath', ''),
                'httpMethod': event.get('httpMethod', 'POST'),
                'httpStatusCode': 500,
                'responseBody': {
                    'application/json': {
                        'body': json.dumps({'error': f'Error interno: {str(e)}'})
                    }
                }
            }
        }


def send_email(ses_client, from_email, params):
    """Envía un email básico"""
    try:
        to_email = params.get('to_email') or params.get('recipient', 'ugrosso@bigcheese.com.uy')
        subject = params.get('subject', 'Información de BrieAI')
        content = params.get('content', '')
        
        html_body = f"""
        <div style="font-family: 'Montserrat', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #D4D0CB; padding: 20px;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h1 style="color: #ABA0FB; text-align: center; margin-bottom: 30px;">📊 Información de BrieAI</h1>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <pre style="white-space: pre-wrap; font-family: 'Montserrat', Arial, sans-serif; margin: 0; color: #1A1A1A; line-height: 1.6;">{content}</pre>
                </div>
                <div style="text-align: center; margin-top: 30px;">
                    <p style="color: #666; font-size: 14px;">
                        Enviado por <strong style="color: #ABA0FB;">BrieAI</strong>
                    </p>
                </div>
            </div>
        </div>
        """
        
        response = ses_client.send_email(
            Source=from_email,
            Destination={'ToAddresses': [to_email]},
            Message={
                'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                'Body': {
                    'Html': {'Data': html_body, 'Charset': 'UTF-8'},
                    'Text': {'Data': content, 'Charset': 'UTF-8'}
                }
            }
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'success': True,
                'message': f'Email enviado exitosamente a {to_email}',
                'messageId': response['MessageId']
            })
        }
        
    except ClientError as e:
        return {
            'statusCode': 400,
            'body': json.dumps({
                'error': f'Error enviando email: {e.response["Error"]["Message"]}'
            })
        }


def send_analysis_report(ses_client, from_email, params):
    """Envía un reporte de análisis detallado"""
    try:
        to_email = params.get('to_email') or params.get('recipient', 'ugrosso@bigcheese.com.uy')
        analysis_data = params.get('analysis_data', '')
        insights = params.get('insights', '')
        
        subject = 'Reporte de Análisis - BrieAI'
        
        insights_section = ''
        if insights:
            insights_section = f"""
            <div style="background-color: #ABA0FB; color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0;">💡 Insights y Recomendaciones</h3>
                <pre style="white-space: pre-wrap; font-family: 'Montserrat', Arial, sans-serif; margin: 0; color: white; line-height: 1.6;">{insights}</pre>
            </div>
            """
        
        html_body = f"""
        <div style="font-family: 'Montserrat', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #D4D0CB; padding: 20px;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h1 style="color: #ABA0FB; text-align: center; margin-bottom: 30px;">📈 Reporte de Análisis</h1>
                <div style="background-color: #FAE428; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin: 0 0 15px 0; color: #1A1A1A;">📊 Datos del Análisis</h3>
                    <pre style="white-space: pre-wrap; font-family: 'Montserrat', Arial, sans-serif; margin: 0; color: #1A1A1A; line-height: 1.6;">{analysis_data}</pre>
                </div>
                {insights_section}
                <div style="text-align: center; margin-top: 30px;">
                    <p style="color: #666; font-size: 14px;">
                        Generado por <strong style="color: #ABA0FB;">BrieAI</strong>
                    </p>
                </div>
            </div>
        </div>
        """
        
        response = ses_client.send_email(
            Source=from_email,
            Destination={'ToAddresses': [to_email]},
            Message={
                'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                'Body': {
                    'Html': {'Data': html_body, 'Charset': 'UTF-8'},
                    'Text': {'Data': f"Análisis:\n{analysis_data}\n\nInsights:\n{insights}", 'Charset': 'UTF-8'}
                }
            }
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'success': True,
                'message': f'Reporte enviado exitosamente a {to_email}',
                'messageId': response['MessageId']
            })
        }
        
    except ClientError as e:
        return {
            'statusCode': 400,
            'body': json.dumps({
                'error': f'Error enviando reporte: {e.response["Error"]["Message"]}'
            })
        }
