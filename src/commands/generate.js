const path = require('path');
const fs = require('fs').promises;
const introspection = require('../utils/introspection');
const generateController = require('../templates/controller.template');
const writer = require('../utils/writer');
const config = require('../utils/config');

// Helper to parse flags (e.g. "CR" -> ['create', 'read'])
function parseOps(flag) {
    if (!flag) return ['create', 'read', 'update', 'delete'];
    const map = { C: 'create', R: 'read', U: 'update', D: 'delete' };
    return flag.toUpperCase().split('').map(char => map[char]).filter(Boolean);
}

async function generate(resourceName, options) {
    const start = Date.now();
    console.log(`\n🚀 Generating resources for: ${resourceName}...`);

    try {
        // 1. Configuration & Setup
        const conf = await config.getConfig();
        const ops = parseOps(options.ops);
        
        // Normalize names (e.g. "users" -> "users", "User" -> "users" - simplistic)
        const tableName = resourceName.toLowerCase(); 
        const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
        const controllerName = `${capitalize(tableName)}Controller`;

        // 2. Introspection (The "Eyes")
        console.log('   🔍 Scanning database schema...');
        const columns = await introspection.getTableSchema(tableName);
        
        // Find the actual Primary Key name (fallback to 'id' just in case)
        const pkColumn = columns.find(c => c.isPrimary) || { name: 'id' };
        const pkName = pkColumn.name;
        
        // 3. Generate Controller Code (The "Brain")
        console.log('   🧠 Constructing logic...');
        const controllerFunctions = generateController(tableName, columns, conf.database.dialect, ops);
        
        // 4. Write Controller File (The "Hands")
        const controllerPath = path.join(process.cwd(), 'src', 'controllers', `${tableName}.controller.js`);
        
        // Add header if new file
        if (controllerFunctions.length > 0) {
            const result = await writer.smartAppend(controllerPath, controllerFunctions);
            
            // If new file, prepend imports
            if (result.status === 'created') {
                const dbImport = "const db = require('../config/db');";
                const content = await fs.readFile(controllerPath, 'utf-8');
                await fs.writeFile(controllerPath, `${dbImport}\n\n${content}`);
            }
            console.log(`   ✅ Controller: ${result.message}`);
        }

        // 5. Generate & Write Route File (NOW PASSING pkName!)
        const routeContent = generateRouteContent(tableName, ops, pkName);
        const routePath = path.join(process.cwd(), 'src', 'routes', `${tableName}.routes.js`);
        
        const routeResult = await writer.appendRoute(routePath, routeContent);
        // Updated console log to use the message from appendRoute
        console.log(`   ✅ Routes: ${routeResult.message} (src/routes/${tableName}.routes.js)`);

        // 6. Inject into Main Router
        const routerPath = path.join(process.cwd(), 'src', 'routes', 'index.js');
        const injectResult = await writer.injectRoute(routerPath, tableName, `./${tableName}.routes`);
        
        if (injectResult.status === 'warning') {
            console.log(`   ⚠️  ${injectResult.message}`);
        } else if (injectResult.status === 'updated') {
            console.log(`   🔗 Wired up: /api/v1/${tableName}`);
        }

        const duration = ((Date.now() - start) / 1000).toFixed(2);
        console.log(`\n✨ Done in ${duration}s! Happy coding.`);

    } catch (error) {
        console.error(`\n❌ Error: ${error.message}`);
    }
}

/**
 * Internal helper to generate the Route file string
 * NOW ACCEPTS pkName dynamically.
 */
function generateRouteContent(resourceName, ops, pkName) {
    const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
    const singular = resourceName.endsWith('s') ? resourceName.slice(0, -1) : resourceName;
    const name = capitalize(singular);

    let lines = [`const router = require('express').Router();`,
                 `const controller = require('../controllers/${resourceName}.controller');`];

    lines.push(''); // spacer

    if (ops.includes('create')) lines.push(`router.post('/', controller.create${name});`);
    if (ops.includes('read')) {
        lines.push(`router.get('/', controller.getAll${name}s);`);
        // Injects dynamic Primary Key instead of hardcoded ':id'
        lines.push(`router.get('/:${pkName}', controller.get${name}ById);`);
    }
    // Injects dynamic Primary Key
    if (ops.includes('update')) lines.push(`router.put('/:${pkName}', controller.update${name});`);
    if (ops.includes('delete')) lines.push(`router.delete('/:${pkName}', controller.delete${name});`);

    lines.push('');
    lines.push('module.exports = router;');

    return lines.join('\n');
}

module.exports = generate;