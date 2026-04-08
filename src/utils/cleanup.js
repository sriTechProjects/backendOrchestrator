const fs = require('fs').promises;
const path = require('path');

// Simple in-memory tracker for created files/directories during an operation.
// Other modules call registerCreatedPath(path) to mark artifacts that should be
// removed on cleanup. cleanup() will attempt best-effort removal but will
// never remove files outside PROJECT_ROOT.

const PROJECT_ROOT = process.cwd();
const createdPaths = new Set();
let inProgress = false;

function isInsideProject(absPath) {
  const rel = path.relative(PROJECT_ROOT, absPath);
  // rel === '' -> same as PROJECT_ROOT (we reject deleting project root)
  if (rel === '') return false;
  // If it starts with '..' it's outside
  if (rel === '..' || rel.startsWith('..' + path.sep)) return false;
  return true;
}

function registerCreatedPath(p) {
  if (!p) return;
  try {
    const absPath = path.resolve(PROJECT_ROOT, p);
    if (!isInsideProject(absPath)) {
      if (process.env.DEBUG) console.warn('registerCreatedPath: rejected path outside project root', p);
      return;
    }
    createdPaths.add(absPath);
  } catch (e) {
    if (process.env.DEBUG) console.warn('registerCreatedPath: invalid path', p, e && e.message ? e.message : e);
  }
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
      // Final safety checks before any deletion
      const absPath = path.resolve(p);

      // Prevent deleting the project root itself
      if (absPath === PROJECT_ROOT) {
        if (process.env.DEBUG) console.warn('cleanup: skipping project root', absPath);
        continue;
      }

      // Ensure still inside project subtree
      if (!isInsideProject(absPath)) {
        if (process.env.DEBUG) console.warn('cleanup: skipping path outside project root', absPath);
        continue;
      }

      // Check if it's a symlink; if so, unlink the symlink itself only
      let stat;
      try {
        stat = await fs.lstat(absPath);
      } catch (e) {
        // If file doesn't exist, continue
        if (process.env.DEBUG) console.debug('cleanup: path missing, skipping', absPath);
        continue;
      }

      if (stat.isSymbolicLink()) {
        try {
          await fs.unlink(absPath);
          if (process.env.DEBUG) console.debug('cleanup: removed symlink', absPath);
        } catch (e) {
          if (process.env.DEBUG) console.debug('cleanup: failed to remove symlink', absPath, e && e.message ? e.message : e);
        }
        continue;
      }

      // Use rm with recursive true to remove dirs or files
      try {
        await fs.rm(absPath, { recursive: true, force: true });
        if (process.env.DEBUG) console.debug('cleanup: removed', absPath);
      } catch (e) {
        if (process.env.DEBUG) console.debug('cleanup: failed to remove', absPath, e && e.message ? e.message : e);
        // continue to next path
      }
    } catch (e) {
      // Ensure loop continues even if unexpected error occurs
      if (process.env.DEBUG) console.debug('cleanup: unexpected error for', p, e && e.message ? e.message : e);
      continue;
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
