const path = require('path');
const fs = require('fs').promises;
const config = require('./config');

/**
 * Helper to manually parse .env without requiring 'dotenv'
 */
async function getEnvVars() {
    try {
        const envPath = path.join(process.cwd(), '.env');
        const content = await fs.readFile(envPath, 'utf-8');
        return content.split('\n').reduce((acc, line) => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) acc[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '');
            return acc;
        }, {});
    } catch (e) {
        return {};
    }
}


/**
 * Main Function: Inspects a table and returns column details
 * @param {string} tableName 
 * @returns {Promise<Array<{ name: string, type: string, isPrimary: boolean }>>}
 */
async function getTableSchema(tableName) {
    // 1. Read Config & Secrets
    const conf = await config.getConfig();
    const env = await getEnvVars();
    const { dialect, driver, envKeys } = conf.database;

    const dbConfig = {
        host: env[envKeys.host],
        user: env[envKeys.user],
        password: env[envKeys.pass],
        database: env[envKeys.name],
        port: parseInt(env[envKeys.port], 10)
    };

    const driverPath = path.join(process.cwd(), 'node_modules', driver);

    // 2. Dialect Specific Introspection
    try {
        if (dialect === 'postgres') {
            return await inspectPostgres(driverPath, dbConfig, tableName);
        } else {
            return await inspectMySQL(driverPath, dbConfig, tableName);
        }
    } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND') {
            throw new Error(`Driver '${driver}' not found. Please install it.`);
        }
        throw new Error(`Introspection failed: ${error.message}`);
    }
}

// --- Postgres Logic ---
async function inspectPostgres(driverPath, dbConfig, tableName) {
    const { Client } = require(driverPath);
    const client = new Client(dbConfig);

    await client.connect();

    // Query combines columns metadata with primary key constraints
    const sql = `
        SELECT 
            c.column_name as name, 
            c.udt_name as type,
            CASE WHEN k.column_name IS NOT NULL THEN true ELSE false END as is_primary
        FROM information_schema.columns c
        LEFT JOIN information_schema.key_column_usage k
            ON c.table_name = k.table_name 
            AND c.column_name = k.column_name
            AND k.constraint_name LIKE '%pkey'
        WHERE c.table_name = $1 
        AND c.table_schema = 'public'
    `;

    try {
        const res = await client.query(sql, [tableName]);
        if (res.rows.length === 0) {
            throw new Error(`Table '${tableName}' not found in public schema.`);
        }

        return res.rows.map(row => ({
            name: row.name,
            type: row.type, // e.g., 'int4', 'varchar'
            isPrimary: row.is_primary
        }));
    } finally {
        await client.end();
    }
}

// --- MySQL Logic ---
async function inspectMySQL(driverPath, dbConfig, tableName) {
    const mysql = require(path.join(driverPath, 'promise'));
    const connection = await mysql.createConnection(dbConfig);

    try {
        const [rows] = await connection.execute(`SHOW COLUMNS FROM ${tableName}`);

        return rows.map(row => ({
            name: row.Field,
            type: row.Type, // e.g., 'int(11)', 'varchar(255)'
            isPrimary: row.Key === 'PRI'
        }));
    } catch (e) {
        // MySQL throws specific error if table doesn't exist
        if (e.code === 'ER_NO_SUCH_TABLE') {
            throw new Error(`Table '${tableName}' does not exist.`);
        }
        throw e;
    } finally {
        await connection.end();
    }
}

module.exports = { getTableSchema };