/**
 * Test Utilities for GenAgent
 *
 * Provides helper functions and utilities to make testing easier
 */

import { mockLLM, MockLLMResponse } from './mock-llm.js';
import { runPrompt } from '../index.js';
import type { RunPromptOptions } from '../types.js';

/**
 * Run a prompt with mock LLM responses
 *
 * This is a convenience wrapper around runPrompt that automatically
 * configures mock responses before running.
 *
 * @example
 * ```typescript
 * const result = await runPromptWithMock(
 *   async ({ $ }) => $`What is 2+2?`,
 *   ['4'],
 *   { model: 'openai:gpt-4' }
 * );
 * ```
 */
export async function runPromptWithMock(
  promptFn: Parameters<typeof runPrompt>[0],
  mockResponses: Array<MockLLMResponse | string>,
  options?: RunPromptOptions
): Promise<any> {
  // Configure mock responses
  mockLLM.addResponses(mockResponses);

  // Run the prompt (UI disabled by default in tests)
  const result = await runPrompt(promptFn, {
    ...options,
    model: options?.model || 'openai:gpt-4',
  });

  return result;
}

/**
 * Helper to verify that a specific tool was registered
 */
export function expectToolRegistered(toolName: string) {
  const calls = mockLLM.getCalls();

  for (const call of calls) {
    if (!call.tools) continue;

    const hasTool = call.tools.some((tool: any) => tool.toolName === toolName);
    if (hasTool) {
      return; // Tool was registered
    }
  }

  throw new Error(
    `Expected tool "${toolName}" to be registered, but it wasn't found in any calls`
  );
}

/**
 * Helper to get all prompts sent to the LLM
 */
export function getPromptsFromCalls(): any[] {
  const calls = mockLLM.getCalls();
  return calls.flatMap(call => call.prompt);
}

/**
 * Helper to check if a prompt contains specific text
 */
export function expectPromptContaining(text: string) {
  const prompts = getPromptsFromCalls();
  const found = prompts.some(msg => {
    if (typeof msg.content === 'string') {
      return msg.content.includes(text);
    }
    if (Array.isArray(msg.content)) {
      return msg.content.some((part: any) =>
        typeof part === 'string' ? part.includes(text) : part.text?.includes(text)
      );
    }
    return false;
  });

  if (!found) {
    throw new Error(
      `Expected to find prompt containing "${text}", but it wasn't found.\n` +
      `Prompts:\n${JSON.stringify(prompts, null, 2)}`
    );
  }
}

/**
 * Create a mock response that simulates tool usage
 */
export function createToolResponse(
  toolName: string,
  args: Record<string, any>,
  responseText = ''
): MockLLMResponse {
  return {
    text: responseText,
    toolCalls: [{ toolName, args }],
  };
}

/**
 * Create a mock response for task completion
 */
export function createTaskFinishResponse(result: string): MockLLMResponse {
  return createToolResponse('finishTask', { result });
}

/**
 * Create a mock response for dynamic task list operations
 */
export function createDynamicTaskResponse(
  operation: 'createTask' | 'startTask' | 'completeTask' | 'updateTask' | 'deleteTask',
  args: Record<string, any>
): MockLLMResponse {
  return createToolResponse(operation, args);
}
