#!/usr/bin/env node

const { Command } = require('commander');
const program = new Command();
const initCommand = require('../src/commands/init');
const db_init = require('../src/commands/db-init');
const cleanup = require('../src/utils/cleanup');
const db_list = require('../src/commands/db-list');
const generate = require("../src/commands/generate")

// 1. Safety Net: Handle Ctrl+C
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT (Ctrl+C). Cleaning up...');
  try {
    await cleanup.cleanup();
  } catch (e) { }
  process.exit(130);
});

// 2. Tool Definition
program
  .name('bsgen')
  .description('A universal backend scaffolding tool')
  .version('0.3.0', '-v, --version');

// 3. Command: Init
program
  .command('init')
  .description('Initialize a new backend project')
  .option('--skip-install', 'Skip installing dependencies')
  .option('-y, --yes', 'Accept defaults')
  .action(async (cmdOpts) => {
    cleanup.startOperation();
    try {
      await initCommand({
        skipInstall: cmdOpts.skipInstall,
        cwd: process.cwd(),
        yes: cmdOpts.yes,
      });
      cleanup.endOperation();
    } catch (err) {
      console.error(err.message);
      try { await cleanup.cleanup(); } catch (e) { }
      process.exit(1);
    }
  });

// 4. Command: DB Init (RENAMED HERE)
program
  .command('db:init') // <--- CHANGED FROM 'connect-db'
  .description('Connect to a database (MySQL/PostgreSQL)')
  .action(async () => {
    try {
      await db_init();
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  });

program
  .command('db:list')
  .description("List all the tables in the Database")
  .action(async () => {
    try {
      await db_list();
    } catch (error) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  });

program
  .command('generate <resource>')
  .description('Generate CRUD API for a database table')
  .option('-o, --ops <ops>', 'Specify operations (e.g. CR for Create/Read only)')
  .action(async (resource, options) => {
    // Pass the options object cleanly
    await generate(resource, options);
  });

// 5. Run it
program.parse(process.argv);