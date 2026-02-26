const readline = require('readline')


/**
 * Prompt the user with a question and return the trimmed answer.
 * @param {string} query The prompt to display to the user.
 * @returns {Promise<string>} The trimmed user input.
 */
const ask = (query) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(query, (answer) => {
            try {
                rl.close();
            } catch (e) {
                // ignore
            }
            resolve(answer.trim());
        });
    });
}


/**
 * Prompt the user for a secret value (password) without echoing characters.
 * The returned value is the entered password or null if the input was cancelled (Ctrl+C).
 * @param {string} query The prompt to display to the user.
 * @returns {Promise<string|null>} The entered secret, or null on cancellation.
 */
const askSecret = (query) => {
    return new Promise((resolve) => {
        process.stdout.write(query);

        // Ensure stdin is in raw mode for single-character handling
        try {
            process.stdin.setRawMode(true);
        } catch (e) {
            // Some environments may not support raw mode; fall back to normal question
            return resolve('');
        }
        process.stdin.resume();
        process.stdin.setEncoding('utf-8');

        let password = '';

        const cleanup = () => {
            try {
                process.stdin.setRawMode(false);
            } catch (e) {
                // ignore
            }
            process.stdin.removeListener('data', handler);
        };

        const handler = (char) => {
            try {
                if (char === '\u0003') { // Ctrl+C
                    process.stdout.write('\n');
                    cleanup();
                    // Resolve null to signal cancellation
                    resolve(null);
                    return;
                }

                if (char === '\n' || char === '\r') {
                    cleanup();
                    process.stdout.write('\n');
                    resolve(password.trim());
                    return;
                }

                // Handle backspace / delete (DEL is '\x7f')
                if (char === '\u0008' || char === '\x7f') {
                    if (password.length > 0) {
                        password = password.slice(0, -1);
                        process.stdout.write('\b \b');
                    }
                    return;
                }

                password += char;
                process.stdout.write('*');
            } catch (err) {
                cleanup();
                resolve(null);
            }
        };

        process.stdin.on('data', handler);
    });
}

module.exports = {
    ask,
    askSecret,
}