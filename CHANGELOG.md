# Changelog

All notable changes to this project will be documented in this file.

## [0.3.1] - 2026-04-08

### Changed
- Improved project cleanup to prevent deletion outside project root and handle symlinks safely
- Enhanced file writing utilities to validate and restrict file operations to project directory

### Security
- Removed use of `shell: true` in all process execution; added `safeExec` utility for secure command execution
- Added strict input sanitization for resource names and database driver selection
- Enforced database driver whitelist to prevent arbitrary module loading
- Hardened cleanup utility to canonicalize and validate paths before deletion
- Validated and sanitized all file and route generation paths to prevent path traversal
- Improved error handling and validation for all user-supplied input

## [0.3.0] - 2026-02-26

### Added
- Added `init` command to initialize a new backend project
- Added `db:init` command to connect and configure a database (MySQL/PostgreSQL)
- Added `db:list` command to list all tables in the connected database
- Added `generate` command to scaffold CRUD APIs for a database table
- Added `--skip-install` and `--yes` flags to `init` command
- Added `--ops` flag to `generate` command to specify CRUD operations
- Added automatic creation of `bsgen.json` project config
- Added automatic creation of `.env` and `src/config/db.js` for database setup
- Added input masking for password prompts

### Changed
- Improved CLI output formatting for better readability
- Enhanced error messages for missing configuration or failed operations
- Improved directory and file structure for generated projects
- Enhanced database driver installation and verification process

### Fixed
- Fixed crash when required config files are missing
- Fixed error handling for failed database connections
- Fixed duplicate file creation in controller and route generation

### Security
- Secured handling of database credentials using masked input
- Improved input validation for CLI arguments and prompts
