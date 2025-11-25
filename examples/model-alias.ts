import { runPrompt } from '../src/index.js';
import { z } from 'zod';

/**
 * Example demonstrating model aliases.
 * Requires GEN_MODEL_LARGE to be set in .env file.
 * Example: GEN_MODEL_LARGE=openai:gpt-4o-mini
 */
async function modelAliasExample() {
  console.log('=== Model Alias Example ===\n');

  // Test 1: Using a model alias
  try {
    console.log('Test 1: Using model alias "large"...');
    const result = await runPrompt(
      async ({ $ }) => {
        return $`What is 2 + 2? Answer in one word.`;
      },
      {
        model: 'large',
        system: ['You are a helpful math assistant.'],
      }
    );

    console.log('✓ Success with alias "large":', result);
  } catch (error) {
    console.error('✗ Failed with alias:', error instanceof Error ? error.message : String(error));
  }

  // Test 2: Using full provider:modelId format (should still work)
  try {
    console.log('\nTest 2: Using full format "openai:gpt-4o-mini"...');
    const result = await runPrompt(
      async ({ $ }) => {
        return $`What is 3 + 3? Answer in one word.`;
      },
      {
        model: 'openai:gpt-4o-mini',
        system: ['You are a helpful math assistant.'],
      }
    );

    console.log('✓ Success with full format:', result);
  } catch (error) {
    console.error('✗ Failed with full format:', error instanceof Error ? error.message : String(error));
  }

  // Test 3: Using undefined alias (should fail with helpful error)
  try {
    console.log('\nTest 3: Using undefined alias "undefined_alias"...');
    const result = await runPrompt(
      async ({ $ }) => {
        return $`What is 4 + 4? Answer in one word.`;
      },
      {
        model: 'undefined_alias',
        system: ['You are a helpful math assistant.'],
      }
    );

    console.log('Unexpected success:', result);
  } catch (error) {
    console.log('✓ Expected error for undefined alias:', error instanceof Error ? error.message : String(error));
  }

  // Test 4: Using alias with sub-agent
  try {
    console.log('\nTest 4: Using alias with sub-agent...');
    const result = await runPrompt(
      async ({ defAgent, $ }) => {
        defAgent(
          'calculator',
          'Performs simple calculations',
          z.object({
            a: z.number(),
            b: z.number(),
            operation: z.enum(['add', 'multiply']),
          }),
          async ({ a, b, operation }) => {
            const result = operation === 'add' ? a + b : a * b;
            return `The result of ${operation}ing ${a} and ${b} is ${result}`;
          },
          {
            model: 'large', // Using alias for sub-agent
          }
        );

        return $`Use the calculator tool to add 5 and 3.`;
      },
      {
        model: 'openai:gpt-4o-mini',
        system: ['You are a helpful assistant. Use the calculator tool.'],
      }
    );

    console.log('✓ Success with sub-agent alias:', result);
  } catch (error) {
    console.error('✗ Failed with sub-agent alias:', error instanceof Error ? error.message : String(error));
  }
}

// Run example
async function main() {
  try {
    await modelAliasExample();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
