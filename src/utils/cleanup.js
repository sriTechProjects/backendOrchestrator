const fs = require('fs').promises;
const path = require('path');

// Simple in-memory tracker for created files/directories during an operation.
// Other modules call registerCreatedPath(path) to mark artifacts that should be
// removed on cleanup. cleanup() will attempt best-effort removal.

const createdPaths = new Set();
let inProgress = false;

function registerCreatedPath(p) {
  if (!p) return;
  createdPaths.add(p);
}

function startOperation() {
  inProgress = true;
}

function endOperation() {
  inProgress = false;
}

async function cleanup() {
  // iterate in reverse-ish order to try files before directories
  const paths = Array.from(createdPaths).sort((a, b) => b.length - a.length);
  for (const p of paths) {
    try {
      // Use rm with recursive true to remove dirs or files
      await fs.rm(p, { recursive: true, force: true });
    } catch (e) {
      // Best-effort; ignore errors but emit debug information when requested
      if (process.env.DEBUG) {
        try {
          console.debug('cleanup: failed to remove', p, e && e.message ? e.message : e);
        } catch (__) {}
      }
    }
  }
  createdPaths.clear();
}

function listCreated() {
  return Array.from(createdPaths);
}

module.exports = {
  registerCreatedPath,
  startOperation,
  endOperation,
  cleanup,
  listCreated,
};
