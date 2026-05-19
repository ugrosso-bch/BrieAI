const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');

// Suscribir email a notificaciones
router.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email es requerido' });
    }

    const result = await notificationService.subscribeEmail(email);
    
    if (result.success) {
      res.json({ 
        message: 'Suscripción exitosa. Revisa tu email para confirmar la suscripción.',
        subscriptionArn: result.subscriptionArn 
      });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error en suscripción:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Desuscribir email
router.post('/unsubscribe', async (req, res) => {
  try {
    const { subscriptionArn } = req.body;
    
    if (!subscriptionArn) {
      return res.status(400).json({ error: 'SubscriptionArn es requerido' });
    }

    const result = await notificationService.unsubscribeEmail(subscriptionArn);
    
    if (result.success) {
      res.json({ message: 'Desuscripción exitosa' });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error en desuscripción:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener lista de suscripciones
router.get('/subscriptions', async (req, res) => {
  try {
    const subscriptions = await notificationService.getSubscriptions();
    res.json(subscriptions);
  } catch (error) {
    console.error('Error obteniendo suscripciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Enviar notificación de prueba
router.post('/test', async (req, res) => {
  try {
    await notificationService.sendNotification(
      'Notificación de Prueba - Demo Shark Tank',
      'Esta es una notificación de prueba para verificar que el sistema funciona correctamente.'
    );
    res.json({ message: 'Notificación de prueba enviada' });
  } catch (error) {
    console.error('Error enviando notificación de prueba:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;