#!/usr/bin/env node

import { resolve } from 'path';
import { runPrompt } from './index.js';

export async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('GenAgent CLI');
    console.log('');
    console.log('Usage: genagent run <file>');
    console.log('');
    console.log('Commands:');
    console.log('  run <file>       Execute a GenAgent file');
    console.log('  --help, -h       Show this help message');
    console.log('');
    console.log('Arguments:');
    console.log('  <file>           Path to a TypeScript or JavaScript file exporting:');
    console.log('                   - promptFn: async function that accepts context');
    console.log('                   - options: RunPromptOptions with model property');
    console.log('');
    console.log('Example:');
    console.log('  genagent run ./my-agent.ts');
    console.log('');
    console.log('Example file (my-agent.ts):');
    console.log('  export const promptFn = async ({ $ }) => {');
    console.log('    return $`Hello World`;');
    console.log('  };');
    console.log('');
    console.log('  export const options = {');
    console.log('    model: "openai:gpt-4"');
    console.log('  };');
    process.exit(args.length === 0 ? 1 : 0);
  }

  const command = args[0];
  const filePath = args[1];

  if (command !== 'run' || !filePath) {
    console.error('Usage: genagent run <file>');
    console.error('Use "genagent --help" for more information');
    process.exit(1);
  }

  try {
    const resolvedPath = resolve(process.cwd(), filePath);

    // Dynamic import to load the file
    const module = await import(resolvedPath);

    // Extract the promptFn and options from the module
    const promptFn = module.promptFn || module.default?.promptFn;
    const options = module.options || module.default?.options;

    if (!promptFn || !options) {
      console.error(
        'Error: The exported module must have "promptFn" and "options" properties.'
      );
      console.error('');
      console.error('Example export:');
      console.error('');
      console.error('export const promptFn = async ({ $ }) => {');
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
