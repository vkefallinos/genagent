/**
 * Tests for basic.ts example functionality
 */

import { runPrompt } from '../index.js';
import { mockLLM } from './mock-llm.js';
import { z } from 'zod';

describe('Basic Examples', () => {
  describe('basicExample', () => {
    it('should execute a simple prompt and return a response', async () => {
      mockLLM.addResponse('Paris');

      const result = await runPrompt(
        async ({ $ }) => {
          return $`What is the capital of France? Answer in one word.`;
        },
        {
          model: 'openai:gpt-4',
          system: ['You are a helpful geography assistant.'],
        }
      );

      expect(result).toBe('Paris');

      // Verify the LLM was called
      const calls = mockLLM.getCalls();
      expect(calls.length).toBeGreaterThan(0);
    });
  });

  describe('conversationExample', () => {
    it('should include conversation history in messages', async () => {
      mockLLM.addResponse('Your name is Alice and you like programming in TypeScript.');

      const result = await runPrompt(
        async ({ defMessage, $ }) => {
          defMessage('user', 'My name is Alice');
          defMessage('assistant', 'Nice to meet you, Alice!');
          defMessage('user', 'I like programming in TypeScript');

          return $`What is my name and what do I like?`;
        },
        {
          model: 'openai:gpt-4',
          system: ['You are a helpful assistant with good memory.'],
        }
      );

      expect(result).toContain('Alice');

      // Verify LLM was called with prompts
      const calls = mockLLM.getCalls();
      expect(calls.length).toBeGreaterThan(0);
      expect(calls[0].prompt).toBeDefined();
    });
  });

  describe('toolExample', () => {
    it('should register and execute tools', async () => {
      mockLLM.addResponse({
        text: 'The calculation result is 110 and the weather in Paris is sunny at 22°C.',
        toolCalls: [
          { toolName: 'calculate', args: { expression: '25 * 4 + 10' } },
          { toolName: 'getWeather', args: { location: 'Paris' } },
        ],
      });

      const result = await runPrompt(
        async ({ defTool, $ }) => {
          defTool(
            'calculate',
            'Perform mathematical calculations',
            z.object({
              expression: z.string().describe('Mathematical expression to evaluate'),
            }),
            async ({ expression }) => {
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
              return {
                location,
                temperature: 22,
                condition: 'sunny',
              };
            }
          );

          return $`What is 25 * 4 + 10? Also, what's the weather like in Paris?`;
        },
        {
          model: 'openai:gpt-4',
          system: ['You are a helpful assistant. Use tools when needed.'],
        }
      );

      expect(result).toBeDefined();

      // Verify tools were registered and LLM was called
      const calls = mockLLM.getCalls();
      expect(calls.length).toBeGreaterThan(0);
      expect(calls[0].tools).toBeDefined();
    });
  });

  describe('structuredResponseExample', () => {
    it('should validate response against schema', async () => {
      const validResponse = {
        summary: 'TypeScript is great but has a learning curve',
        keyPoints: ['Type safety', 'Excellent tooling', 'Learning curve'],
        sentiment: 'positive',
      };

      mockLLM.addResponse(JSON.stringify(validResponse));

      const responseSchema = z.object({
        summary: z.string(),
        keyPoints: z.array(z.string()),
        sentiment: z.enum(['positive', 'negative', 'neutral']),
      });

      const result = await runPrompt(
        async ({ $ }) => {
          return $`Analyze this text: "TypeScript is a great language..."`;
        },
        {
          model: 'openai:gpt-4',
          responseSchema,
          system: ['You are a text analysis expert. Always return valid JSON.'],
        }
      );

      expect(result).toEqual(validResponse);
      expect(result.keyPoints).toHaveLength(3);
      expect(result.sentiment).toBe('positive');
    });

    it('should retry validation on invalid response', async () => {
      const invalidResponse = {
        summary: 'Test',
        keyPoints: ['Point 1'],
        sentiment: 'invalid', // Invalid enum value
      };

      const validResponse = {
        summary: 'Test',
        keyPoints: ['Point 1'],
        sentiment: 'positive',
      };

      // First response will fail validation, second will succeed
      mockLLM.addResponses([
        JSON.stringify(invalidResponse),
        JSON.stringify(validResponse),
      ]);

      const responseSchema = z.object({
        summary: z.string(),
        keyPoints: z.array(z.string()),
        sentiment: z.enum(['positive', 'negative', 'neutral']),
      });

      const result = await runPrompt(
        async ({ $ }) => $`Analyze something`,
        {
          model: 'openai:gpt-4',
          responseSchema,
        }
      );

      expect(result.sentiment).toBe('positive');
      expect(mockLLM.getCalls()).toHaveLength(2); // Should have retried
    });
  });

  describe('complexExample', () => {
    it('should combine messages, tools, and schema validation', async () => {
      mockLLM.addResponse({
        text: JSON.stringify({
          result: 205,
          explanation: 'I multiplied 15 by 7 to get 105, then added 100 to get 205',
        }),
        toolCalls: [
          { toolName: 'multiply', args: { a: 15, b: 7 } },
          { toolName: 'add', args: { a: 105, b: 100 } },
        ],
      });

      const responseSchema = z.object({
        result: z.number(),
        explanation: z.string(),
      });

      const result = await runPrompt(
        async ({ defMessage, defTool, $ }) => {
          defMessage('system', 'You are a math tutor who explains your reasoning.');
          defMessage('user', 'I need help with calculations');

          defTool(
            'multiply',
            'Multiply two numbers',
            z.object({ a: z.number(), b: z.number() }),
            async ({ a, b }) => a * b
          );

          defTool(
            'add',
            'Add two numbers',
            z.object({ a: z.number(), b: z.number() }),
            async ({ a, b }) => a + b
          );

          const num1 = 15;
          const num2 = 7;

          return $`Calculate (${num1} * ${num2}) + 100 using the tools.`;
        },
        {
          model: 'openai:gpt-4',
          responseSchema,
          system: ['Always use the provided tools and explain your steps.'],
        }
      );

      expect(result.result).toBe(205);
      expect(result.explanation).toContain('205');

      const calls = mockLLM.getCalls();
      expect(calls.length).toBeGreaterThan(0);
    });
  });

  describe('variableExample', () => {
    it('should interpolate variables using def()', async () => {
      mockLLM.addResponse('Your plan looks solid! Following TypeScript best practices is crucial.');

      const result = await runPrompt(
        async ({ def, $ }) => {
          def('MY_PLAN', 'First, analyze. Then, design. Finally, implement.');
          def('PROJECT_NAME', 'GenAgent AI Library');
          def('GUIDELINES', 'Use TypeScript best practices.');

          return $`I'm working on $PROJECT_NAME. Here's my plan: $MY_PLAN. Guidelines: $GUIDELINES`;
        },
        {
          model: 'openai:gpt-4',
          system: ['You are a helpful software development advisor.'],
        }
      );

      expect(result).toContain('plan');

      // Verify the LLM was called
      const calls = mockLLM.getCalls();
      expect(calls.length).toBeGreaterThan(0);
    });
  });
});
