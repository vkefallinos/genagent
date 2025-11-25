import { runChatPrompt } from '../dist/index.js';
import { z } from 'zod';

/**
 * Example demonstrating the new Slack-like chat UI
 *
 * Features demonstrated:
 * - Message history displayed like Slack
 * - Tool calls shown inline with messages
 * - Pause/Resume execution with Ctrl+P or pause button
 * - Inject messages during execution
 * - Thread view for subagents (when implemented)
 * - Bottom input bar for user messages
 *
 * Keyboard shortcuts:
 * - Tab: Switch focus between messages and input
 * - ↑/↓: Navigate messages
 * - Enter: Open thread (if message has thread)
 * - Ctrl+P: Pause/Resume execution
 * - Ctrl+C: Cancel/Exit
 */

const result = await runChatPrompt(
  async ({ defMessage, def, defTool, $ }) => {
    // Define a tool for demonstration
    defTool(
      'calculate',
      'Perform mathematical calculations',
      z.object({
        expression: z.string().describe('Mathematical expression to evaluate')
      }),
      async ({ expression }) => {
        // Simple evaluation (in production, use a safe math parser)
        try {
          const result = eval(expression);
          return { result, expression };
        } catch (error) {
          throw new Error(`Invalid expression: ${expression}`);
        }
      }
    );

    defTool(
      'getWeather',
      'Get current weather for a location',
      z.object({
        location: z.string().describe('City name')
      }),
      async ({ location }) => {
        // Simulated weather data
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
          location,
          temperature: Math.floor(Math.random() * 30) + 10,
          condition: ['Sunny', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 3)]
        };
      }
    );

    // Define some context messages
    defMessage('system', 'You are a helpful assistant with access to calculation and weather tools.');
    defMessage('user', 'What is the weather like in London?');
    defMessage('assistant', 'Let me check the weather for you.');

    // Return the main prompt
    return $`Please help the user with their request. Use the available tools when appropriate.`;
  },
  {
    model: 'gpt-4o-mini',
    system: ['You are a friendly and helpful AI assistant.'],
    label: 'chat-demo'
  }
);

console.log('\n✅ Chat session completed!');
console.log('Result:', JSON.stringify(result, null, 2));
