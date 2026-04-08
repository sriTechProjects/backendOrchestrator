const { spawnSync } = require('child_process');

/**
 * Execute a command safely without using a shell.
 * @param {string} command - base command (e.g., 'npm')
 * @param {string[]} args - array of arguments
 * @param {object} [options] - spawnSync options (will be cloned); shell will be forced to false
 */
function safeExec(command, args, options = {}) {
    if (!Array.isArray(args)) throw new TypeError('args must be an array');

    // Whether this spawn needs a shell. Default to false for safety.
    let requiresShell = false;

    // Resolve platform-specific executable name on Windows
    let cmd = command;
    if (process.platform === 'win32') {
        const lc = cmd.toLowerCase();
        // If caller explicitly provided a .cmd or .exe, honor that
        if (lc.endsWith('.cmd')) {
            requiresShell = true;
        }
        // If it doesn't have an extension or path, we append .cmd for common npm/shim behavior
        if (!lc.endsWith('.cmd') && !lc.endsWith('.exe') && !cmd.includes('/') && !cmd.includes('\\')) {
            cmd = `${cmd}.cmd`;
            // Appending .cmd means the command will be a Windows batch shim; use shell
            requiresShell = true;
        }
    }

    // Build a minimal, scrubbed environment preserving only essential variables
    const safeEnv = {};
    if (process.env.PATH) safeEnv.PATH = process.env.PATH;
    // HOME on POSIX, USERPROFILE on Windows
    if (process.env.HOME) safeEnv.HOME = process.env.HOME;
    if (process.env.USERPROFILE) safeEnv.USERPROFILE = process.env.USERPROFILE;
    if (process.env.APPDATA) safeEnv.APPDATA = process.env.APPDATA;

    const spawnOptions = Object.assign({}, options, { shell: requiresShell, env: safeEnv });

    const result = spawnSync(cmd, args, spawnOptions);

    if (result && result.error) {
        const msg = `Command execution failed: ${cmd} ${args.join(' ')} - ${result.error.message}`;
        const err = new Error(msg);
        err.cause = result.error;
        throw err;
    }

    // Non-zero exit status
    if (typeof result.status === 'number' && result.status !== 0) {
        let stderr = '';
        try {
            if (result.stderr) stderr = result.stderr.toString();
        } catch (e) {
            stderr = '';
        }
        const msg = `Command exited with code ${result.status}: ${cmd} ${args.join(' ')}${stderr ? ' - ' + stderr.trim() : ''}`;
        throw new Error(msg);
    }

    return result;
}

module.exports = safeExec;
