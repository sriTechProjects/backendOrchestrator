module.exports = (dialect) => {
    // Force dotenv to load immediately to guarantee env vars exist
    const setupEnv = `if (!process.env.DB_HOST) require('dotenv').config();\n`;

    if (dialect === 'postgres') {
        return `${setupEnv}
const { Pool } = require('pg');

// SINGLETON PATTERN: The pool is created once when module is loaded
const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 5432,
});


module.exports = pool;
`;
    } else {
        return `${setupEnv}
const mysql = require('mysql2');

// SINGLETON PATTERN: The pool is created once when module is loaded
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const promisePool = pool.promise();

module.exports = promisePool;
`;
    }
};