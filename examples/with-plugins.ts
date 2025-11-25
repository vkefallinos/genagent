import { runPrompt } from '../src/index.js';
import { calculatorPlugin } from './plugins/calculator.js';
import { filesystemPlugin } from './plugins/filesystem.js';

/**
 * Example demonstrating the plugin system in genagent
 *
 * This example shows how to:
 * 1. Import plugins from separate files
 * 2. Pass plugins to runPrompt via the options
 * 3. Use tools and system prompts from plugins
 */

async function main() {
  console.log('Running genagent with plugins...\n');

  // Example 1: Using calculator plugin
  console.log('=== Example 1: Calculator Plugin ===\n');
  const calcResult = await runPrompt(
    async ({ $ }) => {
      return $`What is the square root of 144? Use the available tools to calculate it.`;
    },
    {
      model: 'openai:gpt-4o-mini',
      plugins: [calculatorPlugin],
      system: ['You are a helpful math assistant.'],
    }
  );

  console.log('\nCalculator result:', calcResult);

  // Example 2: Using filesystem plugin
  console.log('\n\n=== Example 2: Filesystem Plugin ===\n');
  const fsResult = await runPrompt(
    async ({ $ }) => {
      return $`List the files in the current directory and tell me how many TypeScript files there are.`;
    },
    {
      model: 'openai:gpt-4o-mini',
      plugins: [filesystemPlugin],
      system: ['You are a helpful file system assistant.'],
    }
  );

  console.log('\nFilesystem result:', fsResult);

  // Example 3: Using multiple plugins together
  console.log('\n\n=== Example 3: Multiple Plugins ===\n');
  const multiResult = await runPrompt(
    async ({ $ }) => {
      return $`First, calculate 25 * 4. Then, create a file called 'result.txt' with the result.`;
    },
    {
      model: 'openai:gpt-4o-mini',
      plugins: [calculatorPlugin, filesystemPlugin],
      system: ['You are a helpful assistant with math and filesystem capabilities.'],
    }
  );

  console.log('\nMulti-plugin result:', multiResult);

  // Example 4: Plugin with custom prompt function
  console.log('\n\n=== Example 4: Advanced Plugin Usage ===\n');
  const advancedResult = await runPrompt(
    async ({ defMessage, $ }) => {
      defMessage('user', 'I need to do some calculations and save them to a file.');
      return $`Calculate the following and save each result to a file:
      1. 123 + 456
      2. 789 * 2
      3. Square root of 625

      Save all results to a file called 'calculations.txt' in a readable format.`;
    },
    {
      model: 'openai:gpt-4o-mini',
      plugins: [calculatorPlugin, filesystemPlugin],
      system: [
        'You are a helpful assistant.',
        'When saving results to files, format them nicely for human readability.',
      ],
    }
  );

  console.log('\nAdvanced result:', advancedResult);
}

main().catch(console.error);
