import { runChatPrompt } from '../dist/index.js';
import { z } from 'zod';

/**
 * Example demonstrating headless mode
 *
 * When headless: true is set, the chat UI is disabled and
 * the agent runs in the background without any visual interface.
 * This is useful for:
 * - Automated scripts
 * - CI/CD pipelines
 * - Server-side execution
 * - Batch processing
 */

(async () => {
  console.log('🚀 Running in headless mode (no UI)...\n');

  try {
    const result = await runChatPrompt(
      async ({ defMessage, defTool, $ }) => {
        defTool(
          'add',
          'Add two numbers',
          z.object({
            a: z.number(),
            b: z.number()
          }),
          async ({ a, b }) => {
            return { result: a + b };
          }
        );

        defMessage('user', 'What is 25 + 17?');

        return $`Please answer the user's math question using the add tool.`;
      },
      {
        model: 'gpt-4o-mini',
        headless: true, // This disables the chat UI
        label: 'headless-demo'
      }
    );

    console.log('✅ Execution completed!');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
