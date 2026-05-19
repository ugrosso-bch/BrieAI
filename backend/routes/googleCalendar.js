const express = require('express');
const router = express.Router();
const googleCalendarService = require('../services/googleCalendarService');

// Iniciar autorización de Calendar
router.get('/auth/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const authUrl = googleCalendarService.getAuthUrl(userId);
        
        res.json({
            success: true,
            authUrl,
            message: 'Visita esta URL para autorizar acceso al calendario'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Callback de autorización
router.get('/callback', async (req, res) => {
    try {
        const { code, state: userId } = req.query;
        
        if (!code) {
            return res.status(400).json({
                success: false,
                error: 'Authorization code not provided'
            });
        }

        await googleCalendarService.exchangeCodeForTokens(code, userId);
        
        res.json({
            success: true,
            message: 'Calendario autorizado exitosamente'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Verificar estado de autorización
router.get('/status/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const tokens = await googleCalendarService.getTokens(userId);
        
        res.json({
            success: true,
            authorized: !!tokens,
            message: tokens ? 'Calendario autorizado' : 'Calendario no autorizado'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;