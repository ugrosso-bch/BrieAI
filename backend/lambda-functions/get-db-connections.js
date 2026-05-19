const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        console.log('🔍 Obteniendo conexiones de base de datos...');
        
        // Obtener conexiones de DynamoDB
        const params = {
            TableName: process.env.DYNAMODB_DB_CONNECTIONS_TABLE || 'brieai-db-connections'
        };
        
        const result = await dynamodb.scan(params).promise();
        
        const connections = result.Items.map(item => ({
            id: item.id,
            name: item.name,
            type: item.type,
            host: item.host,
            port: item.port,
            database: item.database,
            status: item.status || 'active'
        }));
        
        console.log(`✅ Encontradas ${connections.length} conexiones`);
        
        return {
            statusCode: 200,
            body: {
                success: true,
                connections: connections,
                count: connections.length
            }
        };
        
    } catch (error) {
        console.error('❌ Error obteniendo conexiones:', error);
        
        return {
            statusCode: 500,
            body: {
                success: false,
                error: error.message,
                connections: []
            }
        };
    }
};