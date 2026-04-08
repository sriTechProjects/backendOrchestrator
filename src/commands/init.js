const fs = require('fs').promises;
const path = require('path');
const safeExec = require('../utils/executor');
const cleanup = require('../../src/utils/cleanup');
const config = require('../utils/config');

async function init(options = {}) {
    const currentDir = process.cwd();
    const skipInstall = !!options.skipInstall;

    console.log('Starting project initialization...');

    // 1. Safety Check
    try {
        await fs.access(path.join(currentDir, 'package.json'));
        throw new Error('Project already initialized (package.json found).');
    } catch (e) {
        if (e.code !== 'ENOENT') throw e;
    }

    // 2. Create Directories
    try {
        console.log('Creating directory structure...');
        const dirs = ['src/controllers', 'src/routes', 'src/config', 'src/utils'];

        for (const d of dirs) {
            const fullPath = path.join(currentDir, d);
            await fs.mkdir(fullPath, { recursive: true });
            cleanup.registerCreatedPath(fullPath);
        }
    } catch (error) {
        await cleanup.cleanup();
        throw new Error('Failed to create directories: ' + error.message);
    }

    // 3. Install Dependencies
    if (!skipInstall) {
        try {
            console.log('Installing dependencies...');
            // Use safeExec to avoid shell execution and reduce injection risk
            safeExec('npm', ['init', '-y'], { stdio: 'inherit' });
            safeExec('npm', ['install', 'express', 'dotenv', 'cors'], { stdio: 'inherit' });
            safeExec('npm', ['install', '--save-dev', 'nodemon'], { stdio: 'inherit' });
        } catch (error) {
            await cleanup.cleanup();
            throw new Error('Failed to install dependencies. ' + (error && error.message ? error.message : ''));
        }
    }

    // 4. Generate Files
    console.log('Generating files...');

    // A. The Main Router (New Architecture)
    const routerContent = `const router = require('express').Router();

router.get('/', (req, res) => {
    res.json({ message: 'API is working' });
});

// -- ROUTES INJECTION POINT --

module.exports = router;
`;

    // B. The App Entry Point (Cleaner)
    const appContent = `const express = require('express');
const cors = require('cors');
const routes = require('./src/routes'); // Imports index.js automatically
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount all routes under /api/v1
app.use('/api/v1', routes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));
`;

    try {
        // Write app.js
        const appPath = path.join(currentDir, 'app.js');
        await fs.writeFile(appPath, appContent);
        cleanup.registerCreatedPath(appPath);

        // Write src/routes/index.js
        const routerPath = path.join(currentDir, 'src/routes/index.js');
        await fs.writeFile(routerPath, routerContent);
        cleanup.registerCreatedPath(routerPath);

        // Write .env
        const envPath = path.join(currentDir, '.env');
        await fs.writeFile(envPath, 'PORT=3000');
        cleanup.registerCreatedPath(envPath);

        // Write .gitignore
        const gitPath = path.join(currentDir, '.gitignore');
        await fs.writeFile(gitPath, 'node_modules\n.env');
        cleanup.registerCreatedPath(gitPath);

    } catch (error) {
        await cleanup.cleanup();
        throw new Error('Failed to write files: ' + error.message);
    }

    // 5. Generate Configuration
    try {
        console.log('Generating project configuration (bsgen.json)...');
        await config.createConfig();
        const bsgenPath = path.join(currentDir, 'bsgen.json');
        cleanup.registerCreatedPath(bsgenPath);
    } catch (error) {
        console.warn('⚠️  Warning: Failed to create bsgen.json.');
    }

    console.log('Project initialized successfully.');
}

module.exports = init;