const fs = require('fs').promises;
const path = require('path');

const CONFIG_FILE = 'bsgen.json';

function getConfigPath() {
    return path.join(process.cwd(), CONFIG_FILE);
}

async function checkExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function createConfig() {
    const configPath = getConfigPath();
    
    const content = {
        version: "0.3.0",
        meta: {
            language: "javascript",
            packageManager: "npm"
        },
        paths: {
            root: "./src",
            app: "app.js",
            controllers: "src/controllers",
            routes: "src/routes",
            config: "src/config"
        }
    };

    try {
        await fs.writeFile(configPath, JSON.stringify(content, null, 2));
    } catch (e) {
        throw new Error('Failed to create bsgen.json: ' + e.message);
    }
}

/**
 * Update specific keys in the config.
 */
async function updateConfig(updates) {
    const configPath = getConfigPath();
    const exists = await checkExists(configPath);
    
    if (!exists) return; // Fail silently if missing

    try {
        const fileContent = await fs.readFile(configPath, 'utf-8');
        const current = JSON.parse(fileContent);
        
        const newConfig = { ...current, ...updates };
        
        await fs.writeFile(configPath, JSON.stringify(newConfig, null, 2));
    } catch (e) {
        console.error('Warning: Failed to update bsgen.json');
    }
}

/**
 * Get the config object.
 */
async function getConfig() {
    const configPath = getConfigPath();
    const exists = await checkExists(configPath);
    
    if (!exists) {
        throw new Error('Configuration file (bsgen.json) not found. Run "bsgen init" first.');
    }
    
    const fileContent = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(fileContent);
}

module.exports = { createConfig, updateConfig, getConfig };