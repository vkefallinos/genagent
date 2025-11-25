import { generateText, tool as aiTool } from 'ai';
import { render } from 'ink';
import React from 'react';
import { z } from 'zod';
import { config as dotenvConfig } from 'dotenv';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { createContext, applyMessageHooks } from './context.js';
import { AgentUI } from './ui.js';
import {
  PromptContext,
  RunPromptOptions,
  MessageContent,
  ToolDefinition,
  AgentState,
  MessageHistoryHook,
} from './types.js';
import { createCustomProviderModel } from './providers.js';
import { createSchemaInstructions, formatValidationError } from './schema-utils.js';
import { loadPlugins } from './plugins/loader.js';

// Load environment variables from .env file
dotenvConfig();

/**
 * Saves the agent state to .genagent/<label>.json
 */
async function saveStateToFile(state: AgentState): Promise<void> {
  if (!state.label) return;

  try {
    const dir = '.genagent';
    await mkdir(dir, { recursive: true });

    const filePath = join(dir, `${state.label}.json`);
    await writeFile(filePath, JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save state to file:', error);
  }
}

/**
 * Creates and runs an AI agent with the specified prompt and configuration.
 *
 * @param promptFn - Callback function that receives context helpers (defMessage, def, defTool, $)
 * @param options - Configuration options including model, responseSchema, and system prompts
 * @returns Promise resolving to the agent's structured response
 *
 * @example
 * ```typescript
 * const result = await runPrompt(
 *   async ({ defMessage, def, defTool, $ }) => {
 *     defMessage('user', 'What is 2 + 2?');
 *     def('OPERATION', 'addition');  // Will be prepended as "OPERATION: addition"
 *     defTool('calculate', 'Perform calculation', z.object({ expr: z.string() }),
 *       async ({ expr }) => eval(expr));
 *     return $`Please answer using the calculate tool for $OPERATION`;
 *   },
 *   {
 *     model: 'openai:gpt-4',
 *     system: ['You are a helpful math assistant']
 *   }
 * );
 * ```
 */
export async function runPrompt<T extends z.ZodSchema = z.ZodAny>(
  promptFn: (ctx: PromptContext) => Promise<string> | string,
  options: RunPromptOptions & { responseSchema?: T }
): Promise<T extends z.ZodSchema ? z.infer<T> : any> {
  const messages: MessageContent[] = [];
  const tools: ToolDefinition[] = [];
  const hooks: MessageHistoryHook[] = [];
  const state: AgentState = {
    messages: [],
    tools: [],
    currentPrompt: '',
    toolCalls: [],
    label: options.label,
    validationAttempts: [],
  };

  // Create context and execute prompt function
  const ctx = createContext(messages, tools, hooks);

  // Load plugins if provided
  const pluginSystemPrompts = options.plugins ? loadPlugins(ctx, options.plugins) : [];

  const promptResult = await promptFn(ctx);
  state.currentPrompt = promptResult;

  // Copy messages to state for UI
  state.messages = [...messages];
  state.tools = [...tools];

  // Render UI
  let appInstance: any;
  const renderUI = () => {
    const element = React.createElement(AgentUI, { state });
    if (appInstance) {
      appInstance.rerender(element);
    } else {
      appInstance = render(element);
    }
  };

  renderUI();

  try {
    // Parse model string (format: provider:modelId)
    const [provider, modelId] = options.model.split(':');
    if (!provider || !modelId) {
      throw new Error('Model must be in format "provider:modelId" (e.g., "openai:gpt-4")');
    }

    // Convert tools to AI SDK format
    const aiTools: Record<string, any> = {};
    tools.forEach((t) => {
      aiTools[t.name] = aiTool({
        description: t.description,
        parameters: t.schema,
        execute: async (args) => {
          const toolCall = {
            tool: t.name,
            args,
            result: undefined as any,
            error: undefined as string | undefined,
          };
          state.toolCalls.push(toolCall);
          renderUI();

          try {
            const result = await t.execute(args);
            toolCall.result = result;
            renderUI();
            return result;
          } catch (error) {
            toolCall.error = error instanceof Error ? error.message : String(error);
            renderUI();
            throw error;
          }
        },
      });
    });

    // Add schema instructions to system prompts if responseSchema is provided
    const systemPrompts = [
      ...pluginSystemPrompts,
      ...(options.system ? options.system : [])
    ];
    if (options.responseSchema) {
      systemPrompts.push(createSchemaInstructions(options.responseSchema));
    }

    // Apply message hooks to transform the message history
    const transformedMessages = applyMessageHooks([...messages], hooks);

    // Build conversation messages
    const conversationMessages = [
      ...transformedMessages.map((m) => ({
        role: (m.name === 'system' ? 'system' : m.name === 'user' ? 'user' : 'assistant') as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
      {
        role: 'user' as const,
        content: promptResult,
      },
    ];

    // Create model instance dynamically
    let modelInstance;

    // First, try to create a custom OpenAI-compatible provider
    modelInstance = createCustomProviderModel(provider, modelId);

    // If no custom provider, fall back to standard provider import
    if (!modelInstance) {
      try {
        // Try standard AI SDK provider first (@ai-sdk/{provider})
        let providerModule;
        try {
          providerModule = await import(`@ai-sdk/${provider}`);
        } catch {
          // Fall back to direct provider import
          providerModule = await import(provider);
        }

        if (!providerModule[provider]) {
          throw new Error(`Provider ${provider} not found in module`);
        }
        modelInstance = providerModule[provider](modelId);
      } catch (error) {
        throw new Error(
          `Failed to load model provider "${provider}". ` +
          `Make sure to install it: npm install @ai-sdk/${provider}\n` +
          `Or configure custom provider in .env with ${provider.toUpperCase()}_API_KEY, ` +
          `${provider.toUpperCase()}_API_BASE, and ${provider.toUpperCase()}_API_TYPE=openai\n` +
          `Error: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // Generate response with retry logic for schema validation
    let finalResponse;
    const maxValidationRetries = 3;
    let currentMessages = [...conversationMessages];

    for (let attempt = 0; attempt <= maxValidationRetries; attempt++) {
      const response = await generateText({
        model: modelInstance,
        messages: currentMessages,
        system: systemPrompts.join('\n\n'),
        tools: Object.keys(aiTools).length > 0 ? aiTools : undefined,
        maxSteps: 10,
      });

      // If no schema validation is required, return the response text
      if (!options.responseSchema) {
        finalResponse = response.text;
        break;
      }

      // Attempt to parse and validate against schema
      try {
        // First try parsing the entire response as JSON
        let parsed;
        try {
          parsed = JSON.parse(response.text);
        } catch {
          // If parsing fails, try to extract JSON from text
          const jsonMatch = response.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('Response does not contain valid JSON');
          }
        }

        // Validate against schema
        finalResponse = options.responseSchema.parse(parsed);

        // Validation successful, break out of retry loop
        break;
      } catch (error) {
        // Track validation attempt
        const validationError = error instanceof z.ZodError
          ? formatValidationError(error)
          : error instanceof Error
            ? error.message
            : String(error);

        state.validationAttempts!.push({
          attempt: attempt + 1,
          response: response.text,
          error: validationError,
        });
        renderUI();

        // If this was the last retry, throw the error
        if (attempt === maxValidationRetries) {
          throw new Error(
            `Failed to get valid response after ${maxValidationRetries + 1} attempts. ` +
            `Last error: ${validationError}`
          );
        }

        // Apply hooks before preparing retry messages
        const retryMessages = applyMessageHooks([...transformedMessages], hooks);

        // Prepare retry with error feedback
        currentMessages = [
          ...retryMessages.map((m) => ({
            role: (m.name === 'system' ? 'system' : m.name === 'user' ? 'user' : 'assistant') as 'system' | 'user' | 'assistant',
            content: m.content,
          })),
          {
            role: 'user' as const,
            content: promptResult,
          },
          {
            role: 'assistant' as const,
            content: response.text,
          },
          {
            role: 'user' as const,
            content: error instanceof z.ZodError
              ? formatValidationError(error)
              : `Your response could not be parsed as valid JSON. Error: ${error instanceof Error ? error.message : String(error)}\n\nPlease provide a valid JSON response matching the required schema.`,
          },
        ];
      }
    }

    state.response = finalResponse;
    renderUI();

    // Save state to file
    await saveStateToFile(state);

    // Wait a bit to show final state
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Cleanup
    if (appInstance) {
      appInstance.unmount();
    }

    return finalResponse;
  } catch (error) {
    state.error = error instanceof Error ? error.message : String(error);
    renderUI();

    // Save state to file (including error)
    await saveStateToFile(state);

    // Wait a bit to show error
    await new Promise((resolve) => setTimeout(resolve, 2000));

    if (appInstance) {
      appInstance.unmount();
    }

    throw error;
  }
}

// Re-export types for consumers
export * from './types.js';
export * from './plugins/types.js';
