const fs = require('fs'); // Standard fs for sync operations (simple writes)
const path = require('path');
const safeExec = require('../utils/executor');
const input = require("../utils/input");
const dbTemplate = require("../templates/db.template");
const config = require('../utils/config'); // <--- NEW IMPORT

const { validateDriver } = require('../utils/sanitize');

const db_init = async () => {
    console.log('Initialize Database Connection');

    // 1. Gather Inputs
    const dialect = await input.ask("DB Type (MySQL/PostgreSQL) [mysql]: ") || 'mysql';
    const normalizedDialect = dialect.toLowerCase().includes('post') ? 'postgres' : 'mysql';
    const defaultPort = normalizedDialect === 'postgres' ? '5432' : '3306';

    const host = await input.ask('Host [localhost]: ') || 'localhost';
    const user = await input.ask('User [root]: ') || 'root';
    const password = await input.askSecret('Password: ');
    const database = await input.ask('Database Name: ');

    // 2. Install Driver
    const pkgName = normalizedDialect === 'postgres' ? 'pg' : 'mysql2';
    // Validate the resolved package name before using it to install or require
    validateDriver(pkgName);
    console.log(`\n Installing driver: ${pkgName}...`);

    try {
        safeExec('npm', ['install', pkgName], { stdio: 'inherit' });
    } catch (e) {
        throw new Error('Failed to install driver. ' + (e && e.message ? e.message : ''));
    }

    // 3. Test Connection
    console.log('\n Testing connection credentials...');
    try {
        if (normalizedDialect === 'postgres') {
            const { Client } = require(require.resolve(pkgName, {
                paths: [process.cwd()]
            }));
            const client = new Client({ host, user, password, database });
            await client.connect();
            await client.query('SELECT 1');
            await client.end();
        } else {
            // MySQL (mysql2 promise wrapper)
            const mysql = require(require.resolve(pkgName + '/promise', {
                paths: [process.cwd()]
            }));
            const connection = await mysql.createConnection({ host, user, password, database });
            await connection.execute('SELECT 1');
            await connection.end();
        }
        console.log(' Connection Verified!');
    } catch (error) {
        console.error(` Connection Failed: ${error.message}`);
        throw new Error('Aborting due to connection failure.');
    }

    // 4. Write Configuration Files (.env and db.js)
    console.log('\n Writing configuration files...');
    const currentDir = process.cwd();

    // A. Update .env
    const envVars = `
# Database Configuration
DB_DIALECT=${normalizedDialect}
DB_HOST=${host}
DB_USER=${user}
DB_PASSWORD=${password}
DB_NAME=${database}
DB_PORT=${defaultPort}
`;
    const envPath = path.join(currentDir, '.env');

    try {
        fs.appendFileSync(envPath, envVars);
        console.log('   - Updated .env');
    } catch (err) {
        console.error('   - Failed to update .env');
    }

    // B. Create config/db.js
    const configDir = path.join(currentDir, 'src', 'config');
    const dbFile = path.join(configDir, 'db.js');

    try {
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        fs.writeFileSync(dbFile, dbTemplate(normalizedDialect));
        console.log('   - Created src/config/db.js');
    } catch (err) {
        throw new Error('Failed to create db.js');
    }

    // 5. Update Project Config (bsgen.json) <-- NEW SECTION
    try {
        console.log('Updating bsgen.json with database settings...');

        // Read current config
        const currentConf = await config.getConfig();

        // Inject DB settings
        currentConf.database = {
            dialect: normalizedDialect,
            driver: pkgName,
            envKeys: {
                host: "DB_HOST",
                port: "DB_PORT",
                user: "DB_USER",
                pass: "DB_PASSWORD",
                name: "DB_NAME"
            }
        };

        // Save back
        await config.updateConfig(currentConf);
        console.log('   - Updated bsgen.json');

    } catch (e) {
        console.warn('Warning: Failed to update bsgen.json. You might need to check it manually.');
    }

    console.log('\nDatabase setup complete.');
}

module.exports = db_init;