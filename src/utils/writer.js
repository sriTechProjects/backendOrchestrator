const fs = require('fs').promises;
const path = require('path');

/**
 * intelligently appends functions to a file if they don't exist.
 * Used for Controllers to add partial CRUD (e.g. adding 'Delete' later).
 * * @param {string} filePath - Path to the controller file
 * @param {Array<{ name: string, code: string }>} functions - Generated functions
 */
async function smartAppend(filePath, functions) {
    let content = '';
    let exists = false;

    // 1. Read existing content
    try {
        content = await fs.readFile(filePath, 'utf-8');
        exists = true;
    } catch (e) {
        // File doesn't exist yet, start empty
        content = ''; 
    }

    // 2. Filter: Only keep functions that are NOT in the file
    const toAppend = functions.filter(fn => {
        // We check if "exports.functionName" is already present
        return !content.includes(fn.name);
    });

    if (toAppend.length === 0) {
        return { status: 'skipped', message: 'All requested operations already exist.' };
    }

    // 3. Build the new code block
    const newCode = toAppend.map(fn => fn.code).join('\n\n');

    // 4. Write or Append
    if (exists) {
        // Append to the bottom with separation
        await fs.appendFile(filePath, '\n\n' + newCode);
        return { status: 'updated', message: `Added: ${toAppend.map(f => f.name).join(', ')}` };
    } else {
        // Create new file (Usually the caller handles imports, but for safety we write raw)
        await fs.writeFile(filePath, newCode);
        return { status: 'created', message: 'File created.' };
    }
}

/**
 * Injects a route registration into src/routes/index.js
 * Uses a "Main Router" pattern.
 * * @param {string} routerPath - Path to src/routes/index.js
 * @param {string} resourceName - e.g. "users"
 * @param {string} routeFile - e.g. "./users.routes"
 */
async function injectRoute(routerPath, resourceName, routeFile) {
    let content = '';
    try {
        content = await fs.readFile(routerPath, 'utf-8');
    } catch (e) {
        return { status: 'error', message: 'Main router file (src/routes/index.js) not found.' };
    }
    
    // 1. Check for duplicates
    // We look for: router.use('/users', ...
    if (content.includes(`router.use('/${resourceName}',`)) {
        return { status: 'skipped', message: 'Route already registered.' };
    }

    // The line to add
    const injectionLine = `router.use('/${resourceName}', require('${routeFile}'));`;

    let newContent = content;
    let injected = false;

    // 2. Strategy A: Magic Marker (Created by bsgen init)
    const marker = '// -- ROUTES INJECTION POINT --';
    
    if (content.includes(marker)) {
        // Replace marker with "Line + Newline + Marker" (preserving it)
        newContent = content.replace(marker, `${injectionLine}\n${marker}`);
        injected = true;
    } 
    // 3. Strategy B: Before Export (Fallback if user deleted marker)
    else if (content.includes('module.exports')) {
        newContent = content.replace('module.exports', `${injectionLine}\n\nmodule.exports`);
        injected = true;
    }

    // 4. Write or Warn
    if (injected) {
        await fs.writeFile(routerPath, newContent);
        return { status: 'updated', message: `Registered /${resourceName} in main router.` };
    } else {
        return { 
            status: 'warning', 
            message: `Could not auto-inject route. Please add this manually to src/routes/index.js:\n   ${injectionLine}` 
        };
    }
}

async function appendRoute(filePath, routeLines) {
    let content = '';
    let exists = false;

    // 1. Read existing content
    try {
        content = await fs.readFile(filePath, 'utf-8');
        exists = true;
    } catch (e) {
        // File doesn't exist, start empty
        content = ''; 
    }

    if (!exists) {
        // If new, just write the whole block
        await fs.writeFile(filePath, routeLines);
        return { status: 'created', message: 'Route file created.' };
    }

    // 2. Parse the new lines
    // We expect routeLines to be a string. We split it to process line by line.
    const newLines = routeLines.split('\n');
    const linesToAdd = [];

    for (const line of newLines) {
        const trimmed = line.trim();
        // Skip imports, empty lines, and module.exports (we only want the router.get/post calls)
        if (!trimmed || 
            trimmed.startsWith('const') || 
            trimmed.startsWith('module.exports') || 
            trimmed.startsWith('//')) {
            continue;
        }

        // 3. Duplicate Check
        // If the file already contains "router.get('/', ...)", don't add it again.
        if (!content.includes(trimmed)) {
            linesToAdd.push(line); // Keep original indentation
        }
    }

    if (linesToAdd.length === 0) {
        return { status: 'skipped', message: 'All routes already exist.' };
    }

    // 4. Inject before module.exports
    // We want to insert the new routes *before* the export line
    if (content.includes('module.exports = router;')) {
        const newBlock = linesToAdd.join('\n');
        const newContent = content.replace(
            'module.exports = router;', 
            `\n${newBlock}\n\nmodule.exports = router;`
        );
        await fs.writeFile(filePath, newContent);
        return { status: 'updated', message: `Added ${linesToAdd.length} new routes.` };
    } else {
        // Fallback: just append (rare case if file structure is weird)
        await fs.appendFile(filePath, '\n' + linesToAdd.join('\n'));
        return { status: 'updated', message: 'Appended new routes.' };
    }
}

module.exports = { smartAppend, injectRoute, appendRoute };     