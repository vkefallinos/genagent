/**
 * Mock LLM System for Testing GenAgent
 *
 * This module provides a comprehensive mocking system for testing GenAgent
 * without making actual LLM API calls. It mocks at the provider level by
 * creating a mock model instance that simulates LLM behavior including tool calls.
 */

import type { LanguageModelV1, LanguageModelV1CallOptions, LanguageModelV1StreamPart } from 'ai';

export interface MockLLMResponse {
  /** The text response to return */
  text: string;
  /** Tool calls to simulate (optional) */
  toolCalls?: Array<{
    toolName: string;
    args: Record<string, any>;
  }>;
  /** Simulate streaming by chunks (optional, defaults to returning all text at once) */
  streamChunks?: string[];
  /** Delay between chunks in ms (optional, defaults to 0) */
  streamDelay?: number;
}

export interface MockLLMCall {
  prompt: any[];
  mode: any;
  tools?: any[];
}

class MockLLMSystem {
  private responses: MockLLMResponse[] = [];
  private currentResponseIndex = 0;
  private calls: MockLLMCall[] = [];

  /**
   * Add a mock response to the queue
   */
  addResponse(response: MockLLMResponse | string) {
    if (typeof response === 'string') {
      this.responses.push({ text: response });
    } else {
      this.responses.push(response);
    }
  }

  /**
   * Add multiple mock responses at once
   */
  addResponses(responses: Array<MockLLMResponse | string>) {
    responses.forEach(r => this.addResponse(r));
  }

  /**
   * Get the next mock response
   */
  getNextResponse(): MockLLMResponse {
    if (this.currentResponseIndex >= this.responses.length) {
      throw new Error(
        `No mock response configured for call #${this.currentResponseIndex + 1}. ` +
        `Only ${this.responses.length} response(s) were configured.`
      );
    }
    return this.responses[this.currentResponseIndex++];
  }

  /**
   * Get all recorded LLM calls
   */
  getCalls(): MockLLMCall[] {
    return this.calls;
  }

  /**
   * Get the last LLM call
   */
  getLastCall(): MockLLMCall | undefined {
    return this.calls[this.calls.length - 1];
  }

  /**
   * Clear all recorded calls and responses
   */
  reset() {
    this.responses = [];
    this.currentResponseIndex = 0;
    this.calls = [];
  }

  /**
   * Record a call
   */
  recordCall(options: LanguageModelV1CallOptions) {
    this.calls.push({
      prompt: options.prompt,
      mode: options.mode,
      tools: (options as any).tools,
    });
  }

  /**
   * Create a mock model instance that simulates LLM behavior
   */
  createMockModel(provider: string, modelId: string): LanguageModelV1 {
    const self = this;

    return {
      specificationVersion: 'v1',
      provider,
      modelId,
      defaultObjectGenerationMode: 'json',

      async doGenerate(options: LanguageModelV1CallOptions): Promise<any> {
        self.recordCall(options);
        const response = self.getNextResponse();

        // Build tool calls if specified
        const toolCalls = response.toolCalls?.map((tc, i) => ({
          toolCallType: 'function' as const,
          toolCallId: `call_${Date.now()}_${i}`,
          toolName: tc.toolName,
          args: JSON.stringify(tc.args),
        })) || [];

        return {
          text: response.text,
          toolCalls,
          finishReason: toolCalls.length > 0 ? 'tool-calls' : 'stop',
          usage: {
            promptTokens: 100,
            completionTokens: 50,
          },
          rawCall: { rawPrompt: null, rawSettings: {} },
          warnings: [],
        };
      },

      async doStream(options: LanguageModelV1CallOptions): Promise<any> {
        self.recordCall(options);
        const response = self.getNextResponse();
        const chunks = response.streamChunks || [response.text];
        const delay = response.streamDelay || 0;

        // Create an async generator for the stream
        async function* streamGenerator(): AsyncIterableIterator<LanguageModelV1StreamPart> {
          // Yield tool calls first if any
          if (response.toolCalls && response.toolCalls.length > 0) {
            for (let i = 0; i < response.toolCalls.length; i++) {
              const tc = response.toolCalls[i];
              const toolCallId = `call_${Date.now()}_${i}`;

              yield {
                type: 'tool-call',
                toolCallType: 'function',
                toolCallId,
                toolName: tc.toolName,
                args: JSON.stringify(tc.args),
              };

              if (delay > 0) {
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            }
          }

          // Yield text deltas
          for (const chunk of chunks) {
            if (delay > 0 && chunk !== chunks[0]) {
              await new Promise(resolve => setTimeout(resolve, delay));
            }

            yield {
              type: 'text-delta',
              textDelta: chunk,
            };
          }

          // Yield finish
          yield {
            type: 'finish',
            finishReason: response.toolCalls && response.toolCalls.length > 0 ? 'tool-calls' : 'stop',
            usage: {
              promptTokens: 100,
              completionTokens: 50,
            },
          };
        }

        return {
          stream: streamGenerator(),
          rawCall: { rawPrompt: null, rawSettings: {} },
          warnings: [],
        };
      },
    };
  }
}

// Export singleton instance
export const mockLLM = new MockLLMSystem();

/**
 * Mock implementation for loadModelInstance
 */
export async function mockLoadModelInstance(provider: string, modelId: string): Promise<LanguageModelV1> {
  return mockLLM.createMockModel(provider, modelId);
}

/**
 * Helper to create a mock response with tool calls
 */
export function mockResponseWithTools(
  text: string,
  toolCalls: Array<{ toolName: string; args: Record<string, any> }>
): MockLLMResponse {
  return { text, toolCalls };
}

/**
 * Helper to create a streaming mock response
 */
export function mockStreamingResponse(
  chunks: string[],
  delay = 0
): MockLLMResponse {
  return {
    text: chunks.join(''),
    streamChunks: chunks,
    streamDelay: delay,
  };
}
