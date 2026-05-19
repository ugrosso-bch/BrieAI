const mysql = require('mysql2/promise');
const { Client } = require('pg');
const { MongoClient } = require('mongodb');

class DatabaseService {
  constructor() {
    this.connections = new Map();
  }

  async testConnection(config) {
    try {
      switch (config.type) {
        case 'mysql':
          return await this.testMySQLConnection(config);
        case 'postgresql':
          return await this.testPostgreSQLConnection(config);
        case 'mongodb':
          return await this.testMongoDBConnection(config);
        default:
          return { success: false, error: 'Tipo de base de datos no soportado' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testMySQLConnection(config) {
    let connection;
    try {
      connection = await mysql.createConnection({
        host: config.host,
        port: config.port || 3306,
        user: config.username,
        password: config.password,
        database: config.database,
        connectTimeout: 10000
      });

      await connection.execute('SELECT 1');
      
      return { 
        success: true, 
        message: 'Conexión MySQL exitosa',
        version: await this.getMySQLVersion(connection)
      };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      if (connection) await connection.end();
    }
  }

  async testPostgreSQLConnection(config) {
    const client = new Client({
      host: config.host,
      port: config.port || 5432,
      user: config.username,
      password: config.password,
      database: config.database,
      connectionTimeoutMillis: 10000
    });

    try {
      await client.connect();
      const result = await client.query('SELECT version()');
      
      return { 
        success: true, 
        message: 'Conexión PostgreSQL exitosa',
        version: result.rows[0].version
      };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      await client.end();
    }
  }

  async testMongoDBConnection(config) {
    const uri = config.uri || `mongodb://${config.username}:${config.password}@${config.host}:${config.port || 27017}/${config.database}`;
    const client = new MongoClient(uri, { 
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000
    });

    try {
      await client.connect();
      const adminDb = client.db().admin();
      const result = await adminDb.buildInfo();
      
      return { 
        success: true, 
        message: 'Conexión MongoDB exitosa',
        version: result.version
      };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      await client.close();
    }
  }

  async saveConnection(id, config) {
    try {
      const testResult = await this.testConnection(config);
      
      if (!testResult.success) {
        return testResult;
      }

      this.connections.set(id, {
        ...config,
        id: id,
        createdAt: new Date().toISOString(),
        lastTested: new Date().toISOString(),
        status: 'active'
      });

      return { 
        success: true, 
        message: 'Conexión guardada exitosamente',
        connection: this.connections.get(id)
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getConnections() {
    return Array.from(this.connections.values());
  }

  getConnection(id) {
    return this.connections.get(id);
  }

  deleteConnection(id) {
    const deleted = this.connections.delete(id);
    return { 
      success: deleted, 
      message: deleted ? 'Conexión eliminada' : 'Conexión no encontrada' 
    };
  }

  async executeQuery(connectionId, query) {
    try {
      const config = this.connections.get(connectionId);
      
      if (!config) {
        return { success: false, error: 'Conexión no encontrada' };
      }

      switch (config.type) {
        case 'mysql':
          return await this.executeMySQLQuery(config, query);
        case 'postgresql':
          return await this.executePostgreSQLQuery(config, query);
        case 'mongodb':
          return await this.executeMongoDBQuery(config, query);
        default:
          return { success: false, error: 'Tipo de base de datos no soportado' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async executeMySQLQuery(config, query) {
    let connection;
    try {
      connection = await mysql.createConnection({
        host: config.host,
        port: config.port || 3306,
        user: config.username,
        password: config.password,
        database: config.database
      });

      const [rows, fields] = await connection.execute(query);
      
      return { 
        success: true, 
        data: rows,
        fields: fields?.map(f => ({ name: f.name, type: f.type })) || [],
        rowCount: Array.isArray(rows) ? rows.length : 0
      };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      if (connection) await connection.end();
    }
  }

  async executePostgreSQLQuery(config, query) {
    const client = new Client({
      host: config.host,
      port: config.port || 5432,
      user: config.username,
      password: config.password,
      database: config.database
    });

    try {
      await client.connect();
      const result = await client.query(query);
      
      return { 
        success: true, 
        data: result.rows,
        fields: result.fields?.map(f => ({ name: f.name, type: f.dataTypeID })) || [],
        rowCount: result.rowCount
      };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      await client.end();
    }
  }

  async executeMongoDBQuery(config, queryObj) {
    const uri = config.uri || `mongodb://${config.username}:${config.password}@${config.host}:${config.port || 27017}/${config.database}`;
    const client = new MongoClient(uri);

    try {
      await client.connect();
      const db = client.db(config.database);
      
      // Parsear la consulta MongoDB (simplificado)
      const { collection, operation, filter = {}, options = {} } = JSON.parse(queryObj);
      const coll = db.collection(collection);
      
      let result;
      switch (operation) {
        case 'find':
          result = await coll.find(filter, options).toArray();
          break;
        case 'findOne':
          result = await coll.findOne(filter, options);
          break;
        case 'count':
          result = await coll.countDocuments(filter);
          break;
        default:
          throw new Error('Operación no soportada');
      }
      
      return { 
        success: true, 
        data: Array.isArray(result) ? result : [result],
        rowCount: Array.isArray(result) ? result.length : 1
      };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      await client.close();
    }
  }

  async getMySQLVersion(connection) {
    try {
      const [rows] = await connection.execute('SELECT VERSION() as version');
      return rows[0].version;
    } catch (error) {
      return 'Desconocida';
    }
  }

  async getSchema(connectionId) {
    try {
      const config = this.connections.get(connectionId);
      
      if (!config) {
        return { success: false, error: 'Conexión no encontrada' };
      }

      switch (config.type) {
        case 'mysql':
          return await this.getMySQLSchema(config);
        case 'postgresql':
          return await this.getPostgreSQLSchema(config);
        case 'mongodb':
          return await this.getMongoDBSchema(config);
        default:
          return { success: false, error: 'Tipo de base de datos no soportado' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getMySQLSchema(config) {
    let connection;
    try {
      connection = await mysql.createConnection({
        host: config.host,
        port: config.port || 3306,
        user: config.username,
        password: config.password,
        database: config.database
      });

      const [tables] = await connection.execute(`
        SELECT TABLE_NAME, TABLE_COMMENT 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = ?
      `, [config.database]);

      const schema = {};
      
      for (const table of tables) {
        const [columns] = await connection.execute(`
          SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        `, [config.database, table.TABLE_NAME]);
        
        schema[table.TABLE_NAME] = {
          comment: table.TABLE_COMMENT,
          columns: columns
        };
      }

      return { success: true, schema: schema };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      if (connection) await connection.end();
    }
  }

  async getPostgreSQLSchema(config) {
    const client = new Client({
      host: config.host,
      port: config.port || 5432,
      user: config.username,
      password: config.password,
      database: config.database
    });

    try {
      await client.connect();
      
      const tablesResult = await client.query(`
        SELECT table_name, table_comment 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);

      const schema = {};
      
      for (const table of tablesResult.rows) {
        const columnsResult = await client.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = $1
        `, [table.table_name]);
        
        schema[table.table_name] = {
          comment: table.table_comment,
          columns: columnsResult.rows
        };
      }

      return { success: true, schema: schema };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      await client.end();
    }
  }

  async getMongoDBSchema(config) {
    const uri = config.uri || `mongodb://${config.username}:${config.password}@${config.host}:${config.port || 27017}/${config.database}`;
    const client = new MongoClient(uri);

    try {
      await client.connect();
      const db = client.db(config.database);
      
      const collections = await db.listCollections().toArray();
      const schema = {};
      
      for (const collection of collections) {
        // Obtener una muestra de documentos para inferir el esquema
        const sample = await db.collection(collection.name).findOne();
        schema[collection.name] = {
          type: 'collection',
          sampleDocument: sample
        };
      }

      return { success: true, schema: schema };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      await client.close();
    }
  }
}

module.exports = new DatabaseService();
