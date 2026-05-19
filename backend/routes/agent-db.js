const express = require('express');
const router = express.Router();
const databaseService = require('../services/databaseService');

// Endpoint para que el Agent obtenga esquemas de DB
router.post('/schema/:connectionId', async (req, res) => {
  try {
    const { connectionId } = req.params;
    
    const connection = await databaseService.getConnection(connectionId);
    if (!connection) {
      return res.status(404).json({ error: 'Conexión no encontrada' });
    }
    
    const schema = await databaseService.getSchema(connectionId);
    
    res.json({
      success: true,
      schema: schema,
      connection: connection.name
    });
    
  } catch (error) {
    console.error('Error obteniendo schema:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para ejecutar consultas
router.post('/query/:connectionId', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const { query } = req.body;
    
    const result = await databaseService.executeQuery(connectionId, query);
    
    res.json({
      success: true,
      result: result
    });
    
  } catch (error) {
    console.error('Error ejecutando query:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;