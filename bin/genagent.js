#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the compiled CLI from dist
const { main } = await import('../dist/cli.js');

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
