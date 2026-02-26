const path = require('path');
const fs = require('fs').promises;
const config = require('../utils/config');

async function db_list() {
    console.log('Connecting to database...');

    // 1. Read Project Config
    let conf;
    try {
        conf = await config.getConfig();
    } catch (e) {
        throw new Error('Could not read bsgen.json. Run "bsgen init" first.');
    }

    const { dialect, driver } = conf.database;
    if (!dialect || !driver) {
        throw new Error('Database configuration missing. Run "bsgen db:init" first.');
    }

    // 2. Read Secrets from .env
    const envPath = path.join(process.cwd(), '.env');
    const envVars = await parseEnv(envPath);
    
    // Helper to get value from .env using the keys defined in bsgen.json
    const getEnv = (key) => envVars[conf.database.envKeys[key]];

    const dbConfig = {
        host: getEnv('host'),
        user: getEnv('user'),
        password: getEnv('pass'),
        database: getEnv('name'),
        port: getEnv('port')
    };

    // 3. Load Driver Dynamically
    const driverPath = path.join(process.cwd(), 'node_modules', driver);
    let tables = [];

    try {
        if (dialect === 'postgres') {
            const { Client } = require(driverPath);
            const client = new Client(dbConfig);
            await client.connect();
            
            // Postgres Query
            const res = await client.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE';
            `);
            tables = res.rows.map(r => r.table_name);
            await client.end();

        } else if (dialect === 'mysql') {
            const mysql = require(path.join(driverPath, 'promise'));
            const connection = await mysql.createConnection(dbConfig);
            
            // MySQL Query
            const [rows] = await connection.execute('SHOW TABLES');
            // MySQL returns object like { 'Tables_in_dbname': 'tablename' }
            tables = rows.map(r => Object.values(r)[0]); 
            await connection.end();
        }
    } catch (e) {
        // Friendly error for missing driver
        if (e.code === 'MODULE_NOT_FOUND') {
            throw new Error(`Driver '${driver}' not found. Did you run 'npm install'?`);
        }
        throw e;
    }

    // 4. Output Results
    if (tables.length === 0) {
        console.log('⚠️  No tables found in the database.');
    } else {
        console.log('\n📂 Database Tables:');
        console.log('-------------------');
        tables.forEach(t => console.log(` - ${t}`));
        console.log('-------------------');
    }
}

/**
 * Tiny helper to parse .env file manually 
 * (Avoids needing 'dotenv' dependency in the CLI tool itself)
 */
async function parseEnv(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        return content.split('\n').reduce((acc, line) => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                let value = match[2].trim();
                // Remove quotes if present
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1);
                }
                acc[key] = value;
            }
            return acc;
        }, {});
    } catch (e) {
        throw new Error('.env file not found.');
    }
}

module.exports = db_list;