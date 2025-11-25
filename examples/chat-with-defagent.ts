import { runChatPrompt } from '../dist/index.js';
import { z } from 'zod';

/**
 * Example demonstrating defAgent with thread support in chat UI
 *
 * This example shows how subagents appear as Slack-like threads
 * when using the chat interface.
 */

(async () => {
  console.log('🚀 Starting chat with defAgent example...\n');

  try {
    const result = await runChatPrompt(
      async ({ defAgent, defTool, defMessage, $ }) => {
        // Define a simple tool
        defTool(
          'add',
          'Add two numbers',
          z.object({
            a: z.number().describe('First number'),
            b: z.number().describe('Second number')
          }),
          async ({ a, b }) => {
            return { result: a + b };
          }
        );

        // Define a subagent that will appear as a thread
        defAgent(
          'calculator',
          'Performs mathematical calculations using available tools',
          z.object({
            operation: z.string().describe('The math operation to perform'),
            numbers: z.array(z.number()).describe('Numbers to use in calculation')
          }),
          async ({ operation, numbers }, ctx) => {
            // This subagent will appear as a thread in the chat UI!
            ctx.defMessage('system', 'You are a calculator assistant. Use the add tool to perform calculations.');

            return $`Please ${operation} these numbers: ${numbers.join(', ')}. Use the add tool.`;
          },
          {
            model: 'gpt-4o-mini',
            system: ['You are a helpful math assistant']
          }
        );

        // Define another subagent for research
        defAgent(
          'researcher',
          'Researches topics and provides summaries',
          z.object({
            topic: z.string().describe('Topic to research')
          }),
          async ({ topic }, ctx) => {
            // This will also appear as a separate thread
            ctx.defMessage('system', 'You are a research assistant. Provide concise, accurate information.');

            return $`Research and summarize: ${topic}`;
          },
          {
            model: 'gpt-4o-mini'
          }
        );

        // Set up conversation context
        defMessage('system', 'You are a helpful AI assistant with access to specialized subagents.');
        defMessage('user', 'Can you help me add 15 and 27?');

        return $`The user wants to perform a calculation. Use the calculator subagent to help them.
                 After that, use the researcher subagent to explain what addition is.`;
      },
      {
        model: 'gpt-4o-mini',
        label: 'defagent-demo',
        system: ['You are a helpful assistant that delegates tasks to specialized subagents.']
      }
    );

    console.log('\n✅ Chat completed successfully!');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
})();
