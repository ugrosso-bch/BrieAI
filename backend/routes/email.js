const express = require('express');
const router = express.Router();
const sesService = require('../services/sesService');

// Enviar email personalizado
router.post('/send', async (req, res) => {
  try {
    const { to, subject, htmlBody, textBody } = req.body;

    if (!to || !subject || !htmlBody) {
      return res.status(400).json({
        error: 'Faltan campos requeridos: to, subject, htmlBody'
      });
    }

    const result = await sesService.sendEmail({
      to,
      subject,
      htmlBody,
      textBody
    });

    res.json({
      success: true,
      message: 'Email enviado exitosamente',
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Error enviando email:', error);
    res.status(500).json({
      error: 'Error enviando email',
      details: error.message
    });
  }
});

// Enviar email de bienvenida
router.post('/welcome', async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email es requerido'
      });
    }

    const result = await sesService.sendWelcomeEmail(email, name);

    res.json({
      success: true,
      message: 'Email de bienvenida enviado',
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Error enviando email de bienvenida:', error);
    res.status(500).json({
      error: 'Error enviando email de bienvenida',
      details: error.message
    });
  }
});

// Enviar reporte de análisis
router.post('/analysis-report', async (req, res) => {
  try {
    const { email, reportData } = req.body;

    if (!email || !reportData) {
      return res.status(400).json({
        error: 'Email y reportData son requeridos'
      });
    }

    const result = await sesService.sendAnalysisReport(email, reportData);

    res.json({
      success: true,
      message: 'Reporte enviado por email',
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Error enviando reporte:', error);
    res.status(500).json({
      error: 'Error enviando reporte',
      details: error.message
    });
  }
});

// Enviar email desde el agente (endpoint para que Lambda/Bedrock invoque el backend)
// También puede usarse desde el frontend directamente
router.post('/agent-send', async (req, res) => {
  try {
    const { to, recipient, subject, content, htmlBody, analysis_data, insights } = req.body;
    
    const toAddress = to || recipient || process.env.SES_FROM_EMAIL;
    
    if (!toAddress) {
      return res.status(400).json({ error: 'Se requiere destinatario (to o recipient)' });
    }
    
    // Si viene analysis_data, es un reporte de análisis
    if (analysis_data) {
      const result = await sesService.sendAnalysisReport(toAddress, {
        summary: analysis_data,
        insights: insights || ''
      });
      return res.json({ success: true, message: `Reporte enviado a ${toAddress}`, messageId: result.messageId });
    }
    
    // Email estándar con content o htmlBody
    const emailSubject = subject || 'Información de BrieAI';
    const emailHtml = htmlBody || `
      <div style="font-family: 'Montserrat', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #D4D0CB; padding: 20px;">
        <div style="background-color: white; padding: 30px; border-radius: 10px;">
          <h1 style="color: #ABA0FB;">📊 BrieAI</h1>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
            <pre style="white-space: pre-wrap; font-family: inherit; color: #1A1A1A;">${content || ''}</pre>
          </div>
          <p style="color: #666; font-size: 14px; margin-top: 20px;">Enviado por <strong style="color: #ABA0FB;">BrieAI</strong></p>
        </div>
      </div>
    `;
    
    const result = await sesService.sendEmail({
      to: toAddress,
      subject: emailSubject,
      htmlBody: emailHtml,
      textBody: content || emailSubject
    });
    
    res.json({
      success: true,
      message: `Email enviado exitosamente a ${toAddress}`,
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Error en agent-send:', error);
    res.status(500).json({ error: 'Error enviando email', details: error.message });
  }
});

// Enviar email de prueba
router.post('/test', async (req, res) => {
  try {
    const testEmail = req.body.email || process.env.SES_FROM_EMAIL;
    
    const result = await sesService.sendEmail({
      to: testEmail,
      subject: 'Prueba de SES - BrieAI',
      htmlBody: `
        <div style="font-family: 'Montserrat', Arial, sans-serif; padding: 20px; background-color: #D4D0CB;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #ABA0FB; text-align: center;">🎉 ¡SES funcionando!</h2>
            <p style="color: #1A1A1A; text-align: center;">
              La integración con Amazon SES está configurada correctamente.
            </p>
            <div style="background-color: #FAE428; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #1A1A1A; text-align: center;">
                <strong>BrieAI ya puede enviar correos electrónicos</strong>
              </p>
            </div>
            <p style="color: #666; font-size: 14px; text-align: center;">
              Enviado desde: ${process.env.SES_FROM_EMAIL}
            </p>
          </div>
        </div>
      `
    });

    res.json({
      success: true,
      message: 'Email de prueba enviado exitosamente',
      messageId: result.messageId,
      sentTo: testEmail
    });
  } catch (error) {
    console.error('Error enviando email de prueba:', error);
    res.status(500).json({
      error: 'Error enviando email de prueba',
      details: error.message
    });
  }
});

module.exports = router;