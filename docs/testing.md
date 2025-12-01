# Testing GenAgent with LLM Mocking

This document describes the test system for GenAgent, which allows testing the library without making actual LLM API calls.

## Overview

The GenAgent test system provides comprehensive LLM mocking at the provider level, allowing you to:

- Test all library features without API keys or network calls
- Simulate LLM responses including text, tool calls, and streaming
- Verify that tools are called with correct arguments
- Test schema validation and retry logic
- Test task lists and dynamic task management

## Quick Start

### Running Tests

```bash
# Install dependencies (if not already installed)
npm install

# Run all tests
npm test

# Run specific test file
npm test -- basic.test

# Run tests in watch mode
npm test:watch
```

### Writing Your First Test

```typescript
import { runPrompt } from '../index.js';
import { mockLLM } from './mock-llm.js';

// Mock the agent-executor module
jest.mock('../agent-executor.js');

describe('My Feature', () => {
  it('should return a response', async () => {
    // Configure mock response
    mockLLM.addResponse('Hello, World!');

    // Run your code
    const result = await runPrompt(
      async ({ $ }) => $`Say hello`,
      { model: 'openai:gpt-4' }
    );

    // Assert
    expect(result).toBe('Hello, World!');
  });
});
```

## Mock LLM System

### Architecture

The mock system works at the provider level by intercepting `loadModelInstance()` calls and returning a mock model that simulates LLM behavior.

```
runPrompt()
  → loadModelInstance() [MOCKED]
    → mockLLM.createMockModel()
      → doStream() / doGenerate()
        → returns configured mock responses
```

### Configuring Mock Responses

#### Simple Text Response

```typescript
mockLLM.addResponse('Paris');
```

#### Response with Tool Calls

```typescript
import { mockResponseWithTools } from './mock-llm.js';

mockLLM.addResponse(
  mockResponseWithTools('Result calculated', [
    { toolName: 'calculate', args: { expression: '2 + 2' } }
  ])
);
```

#### Multiple Responses (for retries or multi-step interactions)

```typescript
mockLLM.addResponses([
  'First response',
  'Second response',
  'Third response'
]);
```

#### Streaming Response

```typescript
import { mockStreamingResponse } from './mock-llm.js';

mockLLM.addResponse(
  mockStreamingResponse(['Hello', ' ', 'World', '!'], 10) // 10ms delay between chunks
);
```

## Testing Examples

### Testing Basic Prompts

```typescript
describe('basicExample', () => {
  it('should execute a simple prompt', async () => {
    mockLLM.addResponse('Paris');

    const result = await runPrompt(
      async ({ $ }) => $`What is the capital of France?`,
      { model: 'openai:gpt-4' }
    );

    expect(result).toBe('Paris');
  });
});
```

### Testing Tools

```typescript
describe('toolExample', () => {
  it('should execute tools', async () => {
    mockLLM.addResponse({
      text: 'The result is 4',
      toolCalls: [
        { toolName: 'calculate', args: { expression: '2 + 2' } }
      ]
    });

    const result = await runPrompt(
      async ({ defTool, $ }) => {
        defTool(
          'calculate',
          'Perform calculations',
          z.object({ expression: z.string() }),
          async ({ expression }) => eval(expression)
        );

        return $`What is 2 + 2?`;
      },
      { model: 'openai:gpt-4' }
    );

    expect(result).toContain('4');
  });
});
```

### Testing Schema Validation

```typescript
describe('schemaValidation', () => {
  it('should validate response against schema', async () => {
    const validData = {
      name: 'John',
      age: 30,
      email: 'john@example.com'
    };

    mockLLM.addResponse(JSON.stringify(validData));

    const schema = z.object({
      name: z.string(),
      age: z.number(),
      email: z.string().email()
    });

    const result = await runPrompt(
      async ({ $ }) => $`Create a user profile`,
      {
        model: 'openai:gpt-4',
        responseSchema: schema
      }
    );

    expect(result).toEqual(validData);
  });

  it('should retry on validation failure', async () => {
    const invalid = { name: 'John', age: 30, email: 'invalid' };
    const valid = { name: 'John', age: 30, email: 'john@example.com' };

    // First response fails, second succeeds
    mockLLM.addResponses([
      JSON.stringify(invalid),
      JSON.stringify(valid)
    ]);

    const schema = z.object({
      name: z.string(),
      age: z.number(),
      email: z.string().email()
    });

    const result = await runPrompt(
      async ({ $ }) => $`Create a user profile`,
      { model: 'openai:gpt-4', responseSchema: schema }
    );

    expect(result.email).toBe('john@example.com');
    expect(mockLLM.getCalls()).toHaveLength(2); // Verify retry occurred
  });
});
```

### Testing Task Lists

```typescript
describe('taskList', () => {
  it('should execute tasks sequentially', async () => {
    mockLLM.addResponses([
      mockResponseWithTools('Task 1 done', [
        { toolName: 'finishTask', args: { result: '8' } }
      ]),
      mockResponseWithTools('Task 2 done', [
        { toolName: 'finishTask', args: { result: '16' } }
      ])
    ]);

    const result = await runPrompt(
      async ({ defTaskList, $ }) => {
        defTaskList([
          {
            task: 'Calculate 5 + 3',
            validation: (result) => {
              if (parseInt(result) !== 8) {
                return `Expected 8, got ${result}`;
              }
            }
          },
          {
            task: 'Multiply previous result by 2',
            validation: (result) => {
              if (parseInt(result) !== 16) {
                return `Expected 16, got ${result}`;
              }
            }
          }
        ]);

        return $`Complete all tasks`;
      },
      { model: 'openai:gpt-4' }
    );

    expect(result).toBeDefined();
  });
});
```

### Testing Dynamic Task Lists

```typescript
describe('dynamicTaskList', () => {
  it('should allow agent to create and manage tasks', async () => {
    mockLLM.addResponses([
      mockResponseWithTools('Creating task', [
        { toolName: 'createTask', args: { description: 'Design UI' } }
      ]),
      mockResponseWithTools('Starting task', [
        { toolName: 'startTask', args: { taskId: 1 } }
      ]),
      mockResponseWithTools('Completing task', [
        { toolName: 'completeTask', args: { taskId: 1, result: 'UI designed' } }
      ])
    ]);

    const result = await runPrompt(
      async ({ defDynamicTaskList, $ }) => {
        defDynamicTaskList();
        return $`Create a task, start it, and complete it`;
      },
      { model: 'openai:gpt-4' }
    );

    expect(result).toBeDefined();
  });
});
```

## Test Utilities

### mockLLM API

#### `addResponse(response)`
Add a single mock response.

```typescript
mockLLM.addResponse('Hello');
mockLLM.addResponse({ text: 'Hello', toolCalls: [...] });
```

#### `addResponses(responses)`
Add multiple mock responses at once.

```typescript
mockLLM.addResponses(['Response 1', 'Response 2', 'Response 3']);
```

#### `getCalls()`
Get all recorded LLM calls for assertions.

```typescript
const calls = mockLLM.getCalls();
expect(calls).toHaveLength(2);
expect(calls[0].tools).toBeDefined();
```

#### `getLastCall()`
Get the most recent LLM call.

```typescript
const lastCall = mockLLM.getLastCall();
expect(lastCall?.prompt).toBeDefined();
```

####`reset()`
Clear all responses and recorded calls (automatically called between tests).

```typescript
mockLLM.reset();
```

### Helper Functions

#### `mockResponseWithTools(text, toolCalls)`
Create a response that includes tool calls.

```typescript
import { mockResponseWithTools } from './mock-llm.js';

const response = mockResponseWithTools('Done', [
  { toolName: 'myTool', args: { param: 'value' } }
]);
```

#### `mockStreamingResponse(chunks, delay?)`
Create a streaming response with optional delay between chunks.

```typescript
import { mockStreamingResponse } from './mock-llm.js';

const response = mockStreamingResponse(
  ['Hello', ' ', 'World'],
  10 // 10ms delay between chunks
);
```

## Best Practices

### 1. Always Mock the Agent Executor

Add this line at the top of every test file:

```typescript
jest.mock('../agent-executor.js');
```

### 2. Configure Responses Before Running Code

```typescript
// ✅ Good
mockLLM.addResponse('Response');
const result = await runPrompt(...);

// ❌ Bad - response not configured
const result = await runPrompt(...);
```

### 3. Reset is Automatic

The mock system automatically resets between tests via the setup file. You don't need to manually call `reset()` unless you want to clear responses mid-test.

### 4. Test Both Success and Failure Cases

```typescript
it('should handle validation failures', async () => {
  // First response fails, second succeeds
  mockLLM.addResponses([invalidResponse, validResponse]);
  // ...test retry logic
});
```

### 5. Verify LLM Calls When Needed

```typescript
const calls = mockLLM.getCalls();
expect(calls).toHaveLength(2); // Verify retry occurred
expect(calls[0].tools).toBeDefined(); // Verify tools were registered
```

## File Structure

```
src/__tests__/
├── setup.ts                    # Jest setup file
├── mock-llm.ts                 # LLM mocking system
├── test-utils.ts               # Test helper functions
├── basic.test.ts               # Tests for basic functionality
├── schema-validation.test.ts   # Tests for schema validation
├── task-list.test.ts           # Tests for task lists
└── dynamic-task-list.test.ts   # Tests for dynamic task lists

src/__mocks__/
└── agent-executor.ts           # Manual mock for agent-executor module
```

## Troubleshooting

### "No mock response configured"

This error means you didn't configure enough responses for the number of LLM calls:

```typescript
// ❌ Only one response, but code makes two LLM calls
mockLLM.addResponse('Response 1');

// ✅ Configure all needed responses
mockLLM.addResponses(['Response 1', 'Response 2']);
```

### TypeScript Errors in Tests

The Jest config disables TypeScript diagnostics for tests. If you're seeing type errors, make sure your `jest.config.js` has:

```javascript
transform: {
  '^.+\\.tsx?$': ['ts-jest', {
    useESM: true,
    isolatedModules: true,
    diagnostics: false,
  }],
}
```

### Tests Hanging

If tests hang, it usually means:
1. The code is waiting for user input (shouldn't happen in tests)
2. A promise isn't resolving (check your mock responses)
3. The mock system isn't properly installed

## Examples

See the `src/__tests__/` directory for comprehensive examples:

- **basic.test.ts** - Simple prompts, messages, tools, and schemas
- **schema-validation.test.ts** - Schema validation and retry logic
- **task-list.test.ts** - Sequential task execution with validation
- **dynamic-task-list.test.ts** - Agent-controlled task management

## Further Reading

- [Jest Documentation](https://jestjs.io/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [AI SDK Documentation](https://sdk.vercel.ai/docs)
