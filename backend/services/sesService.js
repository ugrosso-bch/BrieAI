const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

class SESService {
  constructor() {
    this.sesClient = new SESClient({
      region: process.env.SES_REGION || process.env.AWS_REGION
    });
    this.fromEmail = process.env.SES_FROM_EMAIL;
  }

  async sendEmail({ to, subject, htmlBody, textBody }) {
    try {
      const params = {
        Source: this.fromEmail,
        Destination: {
          ToAddresses: Array.isArray(to) ? to : [to]
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8'
          },
          Body: {
            Html: {
              Data: htmlBody,
              Charset: 'UTF-8'
            },
            Text: {
              Data: textBody || htmlBody.replace(/<[^>]*>/g, ''),
              Charset: 'UTF-8'
            }
          }
        }
      };

      const command = new SendEmailCommand(params);
      const result = await this.sesClient.send(command);
      
      console.log('Email enviado exitosamente:', result.MessageId);
      return { success: true, messageId: result.MessageId };
    } catch (error) {
      console.error('Error enviando email:', error);
      throw error;
    }
  }

  async sendWelcomeEmail(userEmail, userName) {
    const subject = '¡Bienvenido a BrieAI!';
    const htmlBody = `
      <div style="font-family: 'Montserrat', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #D4D0CB; padding: 20px;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h1 style="color: #ABA0FB; text-align: center; margin-bottom: 30px;">¡Bienvenido a BrieAI!</h1>
          <p style="color: #1A1A1A; font-size: 16px; line-height: 1.6;">Hola ${userName || 'Usuario'},</p>
          <p style="color: #1A1A1A; font-size: 16px; line-height: 1.6;">
            Te damos la bienvenida a BrieAI, tu asistente inteligente de análisis de datos. 
            Ahora puedes aprovechar el poder de la inteligencia artificial para analizar tus bases de datos 
            y obtener insights valiosos de manera conversacional.
          </p>
          <div style="background-color: #ABA0FB; color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0;">¿Qué puedes hacer con BrieAI?</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Conectar múltiples bases de datos (MySQL, PostgreSQL, MongoDB)</li>
              <li>Hacer preguntas en lenguaje natural sobre tus datos</li>
              <li>Subir documentos para enriquecer el contexto</li>
              <li>Recibir análisis inteligentes y recomendaciones</li>
            </ul>
          </div>
          <p style="color: #1A1A1A; font-size: 16px; line-height: 1.6;">
            ¡Comienza a explorar tus datos de una manera completamente nueva!
          </p>
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #666; font-size: 14px;">
              Saludos,<br>
              <strong style="color: #ABA0FB;">El equipo de BrieAI</strong>
            </p>
          </div>
        </div>
      </div>
    `;

    return await this.sendEmail({
      to: userEmail,
      subject,
      htmlBody
    });
  }

  async sendAnalysisReport(userEmail, reportData) {
    const subject = 'Reporte de Análisis - BrieAI';
    const htmlBody = `
      <div style="font-family: 'Montserrat', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #D4D0CB; padding: 20px;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h1 style="color: #ABA0FB; text-align: center; margin-bottom: 30px;">Reporte de Análisis</h1>
          <p style="color: #1A1A1A; font-size: 16px; line-height: 1.6;">
            Hemos completado el análisis que solicitaste. Aquí tienes un resumen de los resultados:
          </p>
          <div style="background-color: #FAE428; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #1A1A1A;">Resumen del Análisis</h3>
            <p style="margin: 0; color: #1A1A1A;">${reportData.summary || 'Análisis completado exitosamente'}</p>
          </div>
          ${reportData.insights ? `
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #1A1A1A;">Insights Principales</h3>
            <p style="margin: 0; color: #1A1A1A;">${reportData.insights}</p>
          </div>
          ` : ''}
          <p style="color: #1A1A1A; font-size: 16px; line-height: 1.6;">
            Para ver el análisis completo, ingresa a tu dashboard de BrieAI.
          </p>
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #666; font-size: 14px;">
              Saludos,<br>
              <strong style="color: #ABA0FB;">BrieAI</strong>
            </p>
          </div>
        </div>
      </div>
    `;

    return await this.sendEmail({
      to: userEmail,
      subject,
      htmlBody
    });
  }
}

module.exports = new SESService();