#!/usr/bin/env node

import { resolve, basename } from 'path';
import { writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { runPrompt } from './index.js';

// Generate genagent.d.ts file with type definitions for .gen.ts files
async function ensureTypeDefinitions() {
  const typeDefContent = `declare module '*.gen.ts' {
  import { PromptContext, RunPromptOptions } from 'genagent';

  /**
   * GenAgent file exports
   *
   * Default export must be an async function that accepts PromptContext
   * Named export 'options' must be a RunPromptOptions object
   */

  export default function promptFn(ctx: PromptContext): Promise<string> | string;
  export const options: RunPromptOptions;
}

declare module '*.gen.js' {
  import { PromptContext, RunPromptOptions } from 'genagent';

  export default function promptFn(ctx: PromptContext): Promise<string> | string;
  export const options: RunPromptOptions;
}`;

  // Check if genagent.d.ts already exists
  if (!existsSync('genagent.d.ts')) {
    try {
      await writeFile('genagent.d.ts', typeDefContent, 'utf-8');
    } catch (error) {
      // Silently fail if we can't write the file
      // This might happen due to permissions, which is fine
    }
  }
}

export async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('GenAgent CLI');
    console.log('');
    console.log('Usage: genagent run <file.gen.ts>');
    console.log('');
    console.log('Commands:');
    console.log('  run <file>       Execute a GenAgent file (.gen.ts or .gen.js)');
    console.log('  --help, -h       Show this help message');
    console.log('');
    console.log('Arguments:');
    console.log('  <file>           Path to a GenAgent file (.gen.ts or .gen.js)');
    console.log('                   .gen.ts files are executed directly without compilation');
    console.log('                   Must export:');
    console.log('                   - Default export: async function accepting PromptContext');
    console.log('                   - options: RunPromptOptions with model property');
    console.log('');
    console.log('Example:');
    console.log('  genagent run ./my-agent.gen.ts');
    console.log('');
    console.log('Example file (my-agent.gen.ts):');
    console.log('  export default async ({ $ }) => {');
    console.log('    return $`Hello World`;');
    console.log('  };');
    console.log('');
    console.log('  export const options = {');
    console.log('    model: "openai:gpt-4"');
    console.log('  };');
    console.log('');
    console.log('Setup:');
    console.log('  On first run, genagent.d.ts will be created in the current directory');
    console.log('  Add it to your tsconfig.json to enable type checking in .gen.ts files');
    process.exit(args.length === 0 ? 1 : 0);
  }

  const command = args[0];
  const filePath = args[1];

  if (command !== 'run' || !filePath) {
    console.error('Usage: genagent run <file.gen.ts>');
    console.error('Use "genagent --help" for more information');
    process.exit(1);
  }

  // Validate file extension
  const fileName = basename(filePath);
  if (!fileName.endsWith('.gen.ts') && !fileName.endsWith('.gen.js')) {
    console.error(`Error: File must have .gen.ts or .gen.js extension`);
    console.error(`Got: ${fileName}`);
    console.error('');
    console.error('GenAgent files must be named with the .gen.ts or .gen.js extension.');
    console.error('Example: my-agent.gen.ts');
    process.exit(1);
  }

  try {
    // Ensure type definitions exist on first run
    await ensureTypeDefinitions();

    const resolvedPath = resolve(process.cwd(), filePath);

    // Dynamic import to load the file
    // If this is a .gen.ts file, the tsx loader is already enabled by the wrapper script
    const importPath = `file://${resolvedPath}`;
    const module = await import(importPath);

    // Extract the promptFn and options from the module
    // promptFn can be:
    // - Named export: export const promptFn = ...
    // - Default export function: export default async ({ $ }) => ...
    // - Nested in default: export default { promptFn, options }
    let promptFn = module.promptFn;
    if (!promptFn && typeof module.default === 'function') {
      promptFn = module.default;
    }
    if (!promptFn && module.default?.promptFn) {
      promptFn = module.default.promptFn;
    }

    // options can be a named export or nested in default
    let options = module.options;
    if (!options && module.default?.options) {
      options = module.default.options;
    }

    if (!promptFn || !options) {
      console.error(
        'Error: GenAgent file must have default export (async function) and options export.'
      );
      console.error('');
      console.error('Example my-agent.gen.ts:');
      console.error('');
      console.error('export default async ({ $ }) => {');
      console.error('  return $`Hello World`;');
      console.error('};');
      console.error('');
      console.error('export const options = {');
      console.error('  model: "openai:gpt-4"');
      console.error('};');
      process.exit(1);
    }

    if (typeof promptFn !== 'function') {
      console.error('Error: "promptFn" must be a function');
      process.exit(1);
    }

    if (typeof options !== 'object' || !options.model) {
      console.error('Error: "options" must be an object with a "model" property');
      process.exit(1);
    }

    // Execute the agent
    const result = await runPrompt(promptFn, options);
    console.log('\nResult:', result);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      if (error.message.includes('Cannot find module')) {
        console.error(`File not found: ${filePath}`);
      }
    } else {
      console.error('An unexpected error occurred:', error);
    }
    process.exit(1);
  }
}
