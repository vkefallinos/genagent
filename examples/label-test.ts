import { runPrompt } from '../src/index.js';
import { z } from 'zod';

/**
 * Example demonstrating the label feature
 * This will:
 * 1. Show the label in the UI header
 * 2. Save the full message trace to .genagent/my-test-label.json
 */
async function labelExample() {
  console.log('=== Label Feature Example ===\n');

  const result = await runPrompt(
    async ({ defMessage, defTool, $ }) => {
      defMessage('user', 'I need to calculate something');

      defTool(
        'add',
        'Add two numbers',
        z.object({
          a: z.number(),
          b: z.number(),
        }),
        async ({ a, b }) => a + b
      );

      return $`What is 42 + 58? Use the add tool.`;
    },
    {
      model: 'large',
      system: ['You are a helpful math assistant.'],
      label: 'my-test-label', // This will show in UI and save to .genagent/my-test-label.json
    }
  );

  console.log('\nFinal result:', result);
  console.log('\nCheck .genagent/my-test-label.json for the full message trace!');
}

labelExample().catch(console.error);
