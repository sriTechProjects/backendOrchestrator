/**
 * Input sanitization utilities
 */
const ALLOWED_IDENTIFIER = /^[a-z0-9_-]+$/i;
const DRIVER_WHITELIST = ['pg', 'mysql2', 'sqlite3', 'tedious'];

function isValidIdentifier(name) {
    if (typeof name !== 'string') return false;
    return ALLOWED_IDENTIFIER.test(name);
}

function sanitizeResourceName(name) {
    if (typeof name !== 'string') throw new Error('Resource name must be a string');
    const cleaned = name.trim().toLowerCase();
    if (!isValidIdentifier(cleaned)) {
        throw new Error('Invalid resource name. Use only letters, numbers, hyphen or underscore (a-z0-9_-).');
    }
    return cleaned;
}

function validateDriver(driverName) {
    if (typeof driverName !== 'string') throw new Error('Driver name must be a string');
    const cleaned = driverName.trim();
    if (!DRIVER_WHITELIST.includes(cleaned)) {
        throw new Error(`Unsupported database driver: '${driverName}'. Allowed: ${DRIVER_WHITELIST.join(', ')}`);
    }
    return cleaned;
}

module.exports = {
    isValidIdentifier,
    sanitizeResourceName,
    validateDriver,
};
