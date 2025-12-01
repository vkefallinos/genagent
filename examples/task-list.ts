import { runPrompt } from '../src/index.js';
import { z } from 'zod';

/**
 * Example showing basic task list usage with validation
 */
async function basicTaskListExample() {
  console.log('=== Basic Task List Example ===\n');

  const result = await runPrompt(
    async ({ defTaskList, $ }) => {
      defTaskList([
        {
          task: 'Calculate 5 + 3',
          validation: (result) => {
            const num = parseInt(result.trim());
            if (num !== 8) {
              return `Incorrect. The result should be 8, but you provided ${result}`;
            }
          },
        },
        {
          task: 'Multiply the previous result by 2',
          validation: (result) => {
            const num = parseInt(result.trim());
            if (num !== 16) {
              return `Incorrect. The result should be 16 (8 * 2), but you provided ${result}`;
            }
          },
        },
        {
          task: 'Subtract 6 from the previous result',
          validation: (result) => {
            const num = parseInt(result.trim());
            if (num !== 10) {
              return `Incorrect. The result should be 10 (16 - 6), but you provided ${result}`;
            }
          },
        },
      ]);

      return $`Complete all tasks in the task list. Use the finishTask tool to submit each result.`;
    },
    {
      model: 'large',
      system: ['You are a helpful math assistant.'],
    }
  );

  console.log('\nFinal result:', result);
}

/**
 * Example showing task list with string validation
 */
async function stringValidationExample() {
  console.log('\n\n=== String Validation Task List Example ===\n');

  const result = await runPrompt(
    async ({ defTaskList, $ }) => {
      defTaskList([
        {
          task: 'Write a greeting that includes the word "hello"',
          validation: (result) => {
            if (!result.toLowerCase().includes('hello')) {
              return 'Your greeting must include the word "hello"';
            }
          },
        },
        {
          task: 'Write a farewell message that includes the word "goodbye"',
          validation: (result) => {
            if (!result.toLowerCase().includes('goodbye')) {
              return 'Your farewell must include the word "goodbye"';
            }
          },
        },
      ]);

      return $`Complete all tasks in the task list.`;
    },
    {
      model: 'large',
      system: ['You are a friendly assistant.'],
    }
  );

  console.log('\nFinal result:', result);
}

/**
 * Example showing task list with complex validation
 */
async function complexValidationExample() {
  console.log('\n\n=== Complex Validation Task List Example ===\n');

  const result = await runPrompt(
    async ({ defTaskList, $ }) => {
      const validColors = ['red', 'blue', 'green', 'yellow'];
      let chosenColor = '';

      defTaskList([
        {
          task: `Choose one color from this list: ${validColors.join(', ')}`,
          validation: (result) => {
            const color = result.trim().toLowerCase();
            if (!validColors.includes(color)) {
              return `You must choose one of: ${validColors.join(', ')}. You provided: ${result}`;
            }
            chosenColor = color;
          },
        },
        {
          task: 'Name an object that is typically the color you chose',
          validation: (result) => {
            if (result.length < 3) {
              return 'Please provide a longer answer (at least 3 characters)';
            }
            if (!result.toLowerCase().includes(chosenColor)) {
              return `Your answer should mention the color "${chosenColor}"`;
            }
          },
        },
      ]);

      return $`Complete all tasks in the task list.`;
    },
    {
      model: 'large',
      system: ['You are a helpful assistant.'],
    }
  );

  console.log('\nFinal result:', result);
}

/**
 * Example showing task list with intentional validation failures
 */
async function validationRetryExample() {
  console.log('\n\n=== Validation Retry Example ===\n');

  const result = await runPrompt(
    async ({ defTaskList, $ }) => {
      defTaskList([
        {
          task: 'Provide the number 42',
          validation: (result) => {
            const num = parseInt(result.trim());
            if (num !== 42) {
              return `The answer must be exactly 42. You provided: ${result}`;
            }
          },
        },
        {
          task: 'Provide a word with exactly 5 letters',
          validation: (result) => {
            const word = result.trim();
            if (word.length !== 5) {
              return `The word must have exactly 5 letters. Your word "${word}" has ${word.length} letters.`;
            }
          },
        },
      ]);

      return $`Complete all tasks. Make sure to follow the validation rules carefully.`;
    },
    {
      model: 'large',
      system: ['You are a helpful assistant.'],
    }
  );

  console.log('\nFinal result:', result);
}

/**
 * Example showing task list with conversation history compaction
 */
async function compactionExample() {
  console.log('\n\n=== Compaction Example ===\n');

  const result = await runPrompt(
    async ({ defTaskList, defTool, $ }) => {
      // Add a tool that simulates complex interactions
      defTool(
        'calculate',
        'Perform a mathematical calculation',
        z.object({
          operation: z.enum(['add', 'multiply', 'subtract']).describe('The operation to perform'),
          a: z.number().describe('First number'),
          b: z.number().describe('Second number'),
        }),
        async ({ operation, a, b }) => {
          if (operation === 'add') return a + b;
          if (operation === 'multiply') return a * b;
          if (operation === 'subtract') return a - b;
          throw new Error('Invalid operation');
        }
      );

      defTaskList({
        tasks: [
          {
            task: 'Calculate 5 + 3 using the calculate tool',
            validation: (result) => {
              const num = parseInt(result.trim());
              if (num !== 8) {
                return `Incorrect. The result should be 8, but you provided ${result}`;
              }
            },
          },
          {
            task: 'Multiply the previous result by 2 using the calculate tool',
            validation: (result) => {
              const num = parseInt(result.trim());
              if (num !== 16) {
                return `Incorrect. The result should be 16 (8 * 2), but you provided ${result}`;
              }
            },
          },
          {
            task: 'Subtract 6 from the previous result using the calculate tool',
            validation: (result) => {
              const num = parseInt(result.trim());
              if (num !== 10) {
                return `Incorrect. The result should be 10 (16 - 6), but you provided ${result}`;
              }
            },
          },
        ],
        compaction: {
          prompt: 'Given this task history:\n\n<TASK_HISTORY>\n\nProvide a brief 1-2 sentence summary of what happened and the obvious result.',
          model: 'small',
        },
      });

      return $`Complete all tasks in the task list. Use the calculate tool for calculations and the finishTask tool to submit each result.`;
    },
    {
      model: 'large',
      system: ['You are a helpful math assistant.'],
    }
  );

  console.log('\nFinal result:', result);
}

// Run examples
async function main() {
  try {
    await basicTaskListExample();
    await stringValidationExample();
    await complexValidationExample();
    await validationRetryExample();
    await compactionExample();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
