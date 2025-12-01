# GenAgent Test Suite

This directory contains the test suite for GenAgent, including a comprehensive LLM mocking system.

## Quick Start

```bash
# Run all tests
npm test

# Run specific test
npm test -- basic.test

# Watch mode
npm test:watch
```

## Files

- **setup.ts** - Jest configuration and global test setup
- **mock-llm.ts** - Provider-level LLM mocking system
- **test-utils.ts** - Helper functions for writing tests
- **basic.test.ts** - Tests for basic functionality
- **schema-validation.test.ts** - Tests for schema validation
- **task-list.test.ts** - Tests for task list functionality
- **dynamic-task-list.test.ts** - Tests for dynamic task lists

## Writing Tests

Every test file should start with:

```typescript
jest.mock('../agent-executor.js');

import { runPrompt } from '../index.js';
import { mockLLM } from './mock-llm.js';
```

Then configure mock responses and test your code:

```typescript
it('should work', async () => {
  mockLLM.addResponse('Hello!');

  const result = await runPrompt(
    async ({ $ }) => $`Say hello`,
    { model: 'openai:gpt-4' }
  );

  expect(result).toBe('Hello!');
});
```

## Documentation

See [docs/testing.md](../../docs/testing.md) for comprehensive documentation.

## Key Features

✅ No API calls - all LLM interactions are mocked
✅ Provider-level mocking - works like real LLM
✅ Tool execution - tools are actually called
✅ Schema validation - tests validation and retry logic
✅ Task lists - tests sequential and dynamic task execution
✅ Streaming support - can simulate chunk-by-chunk streaming

## Example

```typescript
import { runPrompt } from '../index.js';
import { mockLLM, mockResponseWithTools } from './mock-llm.js';
import { z } from 'zod';

jest.mock('../agent-executor.js');

describe('Calculator', () => {
  it('should use tools to calculate', async () => {
    mockLLM.addResponse({
      text: 'The result is 4',
      toolCalls: [
        { toolName: 'add', args: { a: 2, b: 2 } }
      ]
    });

    const result = await runPrompt(
      async ({ defTool, $ }) => {
        defTool(
          'add',
          'Add two numbers',
          z.object({ a: z.number(), b: z.number() }),
          async ({ a, b }) => a + b
        );

        return $`What is 2 + 2?`;
      },
      { model: 'openai:gpt-4' }
    );

    expect(result).toContain('4');
  });
});
```
