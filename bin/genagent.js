#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if we're running a .gen.ts file
const args = process.argv.slice(2);
const hasGenTs = args.some(arg => arg.endsWith('.gen.ts'));

if (hasGenTs) {
  // For .gen.ts files, re-spawn with tsx loader enabled
  const txzPath = resolve(__dirname, '../node_modules/.bin/tsx');
  const cliPath = resolve(__dirname, '../dist/cli.js');

  const child = spawn('node', [
    '--loader', 'tsx/esm',
    cliPath,
    ...args
  ], {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
} else {
  // For .gen.js files or other commands, run normally
  const { main } = await import('../dist/cli.js');

  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
