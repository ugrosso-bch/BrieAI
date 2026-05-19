const express = require('express');
const router = express.Router();
const googleCalendarService = require('../services/googleCalendarService');

// Listar eventos reales del usuario
router.get('/events/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { days_ahead = 7 } = req.query;
        
        const events = await googleCalendarService.listEvents(userId, parseInt(days_ahead));
        
        const formattedEvents = events.map(event => ({
            summary: event.summary || 'Sin título',
            start: event.start?.dateTime || event.start?.date,
            end: event.end?.dateTime || event.end?.date,
            description: event.description || '',
            id: event.id,
            location: event.location || ''
        }));
        
        res.json({
            success: true,
            events: formattedEvents,
            total_events: formattedEvents.length,
            period: `Próximos ${days_ahead} días`
        });
    } catch (error) {
        console.error('Error getting calendar events:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Crear evento real
router.post('/events/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const eventData = req.body;
        
        const createdEvent = await googleCalendarService.createEvent(userId, eventData);
        
        res.json({
            success: true,
            message: `Evento "${eventData.title}" creado exitosamente`,
            event: {
                id: createdEvent.id,
                summary: createdEvent.summary,
                start: createdEvent.start?.dateTime,
                end: createdEvent.end?.dateTime,
                description: createdEvent.description
            }
        });
    } catch (error) {
        console.error('Error creating calendar event:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;