import { runPrompt } from '../src/index.js';
import { z } from 'zod';

/**
 * Basic example showing simple prompt execution
 */
async function basicExample() {
  console.log('=== Basic Example ===\n');

  const result = await runPrompt(
    async ({ $ }) => {
      return $`What is the capital of France? Answer in one word.`;
    },
    {
      model: 'openai:gpt-4o-mini',
      system: ['You are a helpful geography assistant.'],
    }
  );

  console.log('\nFinal result:', result);
}

/**
 * Example with conversation history using defMessage()
 */
async function conversationExample() {
  console.log('\n\n=== Conversation Example ===\n');

  const result = await runPrompt(
    async ({ defMessage, $ }) => {
      defMessage('user', 'My name is Alice');
      defMessage('assistant', 'Nice to meet you, Alice!');
      defMessage('user', 'I like programming in TypeScript');

      return $`What is my name and what do I like?`;
    },
    {
      model: 'openai:gpt-4o-mini',
      system: ['You are a helpful assistant with good memory.'],
    }
  );

  console.log('\nFinal result:', result);
}

/**
 * Example with tools using defTool()
 */
async function toolExample() {
  console.log('\n\n=== Tool Example ===\n');

  const result = await runPrompt(
    async ({ defTool, $ }) => {
      defTool(
        'calculate',
        'Perform mathematical calculations',
        z.object({
          expression: z.string().describe('Mathematical expression to evaluate'),
        }),
        async ({ expression }) => {
          // Simple safe calculator (in production, use a proper math library)
          const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
          return eval(sanitized);
        }
      );

      defTool(
        'getWeather',
        'Get weather for a location',
        z.object({
          location: z.string().describe('City name'),
        }),
        async ({ location }) => {
          // Mock weather API
          return {
            location,
            temperature: Math.floor(Math.random() * 30) + 10,
            condition: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)],
          };
        }
      );

      return $`What is 25 * 4 + 10? Also, what's the weather like in Paris?`;
    },
    {
      model: 'openai:gpt-4o-mini',
      system: ['You are a helpful assistant. Use tools when needed.'],
    }
  );

  console.log('\nFinal result:', result);
}

/**
 * Example with structured response schema
 */
async function structuredResponseExample() {
  console.log('\n\n=== Structured Response Example ===\n');

  const responseSchema = z.object({
    summary: z.string(),
    keyPoints: z.array(z.string()),
    sentiment: z.enum(['positive', 'negative', 'neutral']),
  });

  const result = await runPrompt(
    async ({ $ }) => {
      return $`Analyze this text: "TypeScript is a great language for building scalable applications.
                It provides type safety and excellent tooling. However, it can have a learning curve."

                Return your analysis as JSON matching this structure:
                {
                  "summary": "brief summary",
                  "keyPoints": ["point 1", "point 2"],
                  "sentiment": "positive|negative|neutral"
                }`;
    },
    {
      model: 'openai:gpt-4o-mini',
      responseSchema,
      system: ['You are a text analysis expert. Always return valid JSON.'],
    }
  );

  console.log('\nFinal result:', result);
  console.log('Type-safe access:', result.keyPoints);
}

/**
 * Complex example combining all features
 */
async function complexExample() {
  console.log('\n\n=== Complex Example ===\n');

  const responseSchema = z.object({
    result: z.number(),
    explanation: z.string(),
  });

  const result = await runPrompt(
    async ({ defMessage, defTool, $ }) => {
      // Set up conversation context
      defMessage('system', 'You are a math tutor who explains your reasoning.');
      defMessage('user', 'I need help with calculations');

      // Define tools
      defTool(
        'multiply',
        'Multiply two numbers',
        z.object({
          a: z.number(),
          b: z.number(),
        }),
        async ({ a, b }) => a * b
      );

      defTool(
        'add',
        'Add two numbers',
        z.object({
          a: z.number(),
          b: z.number(),
        }),
        async ({ a, b }) => a + b
      );

      // Template literal for interpolation
      const num1 = 15;
      const num2 = 7;

      return $`Calculate (${num1} * ${num2}) + 100 using the tools.
              Return JSON: { "result": <number>, "explanation": "<your explanation>" }`;
    },
    {
      model: 'openai:gpt-4o-mini',
      responseSchema,
      system: ['Always use the provided tools and explain your steps.'],
    }
  );

  console.log('\nFinal result:', result);
}

/**
 * Example using def() for variable references
 */
async function variableExample() {
  console.log('\n\n=== Variable Reference Example ===\n');

  const result = await runPrompt(
    async ({ def, $ }) => {
      // Define variables that can be referenced in prompts
      def('MY_PLAN', 'First, analyze the requirements. Then, design the solution. Finally, implement and test.');
      def('PROJECT_NAME', 'GenAgent AI Library');
      def('GUIDELINES', 'Use TypeScript best practices and ensure type safety throughout.');

      return $`I'm working on $PROJECT_NAME. Here's my plan: $MY_PLAN

Please provide feedback on this approach. Keep in mind: $GUIDELINES`;
    },
    {
      model: 'openai:gpt-4o-mini',
      system: ['You are a helpful software development advisor.'],
    }
  );

  console.log('\nFinal result:', result);
}

// Run examples
async function main() {
  try {
    await basicExample();
    await conversationExample();
    await variableExample();
    await toolExample();
    await structuredResponseExample();
    await complexExample();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
