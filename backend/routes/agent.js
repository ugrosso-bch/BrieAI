const express = require('express');
const router = express.Router();
const agentService = require('../services/agentService');

// Endpoint para verificar estado del Agent
router.get('/status', async (req, res) => {
  try {
    const status = await agentService.checkAgentStatus();
    res.json({
      available: status.available,
      error: status.error,
      agentId: process.env.BEDROCK_AGENT_ID,
      aliasId: 'BRIEAI'
    });
  } catch (error) {
    console.error('Error verificando estado del Agent:', error);
    res.status(500).json({ 
      available: false, 
      error: 'Error verificando estado del Agent' 
    });
  }
});

// Endpoint para chat con Bedrock Agent
router.post('/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Mensaje es requerido' });
    }

    const result = await agentService.invokeAgent(message, sessionId);

    if (result.success) {
      res.json({
        response: result.response,
        sessionId: result.sessionId,
        mode: 'agent'
      });
    } else {
      res.status(500).json({ error: result.error });
    }

  } catch (error) {
    console.error('Error en chat con Agent:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;