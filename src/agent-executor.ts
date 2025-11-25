import { streamText, tool as aiTool } from 'ai';
import { z } from 'zod';
import { AgentState, ToolDefinition, MessageContent, MessageHistoryHook } from './types.js';
import { createCustomProviderModel } from './providers.js';
import { createSchemaInstructions, formatValidationError } from './schema-utils.js';
import { applyMessageHooks } from './context.js';

/**
 * Resolves model aliases from environment variables.
 * If the model string contains a colon, it's returned as-is.
 * Otherwise, it's treated as an alias and resolved from GEN_MODEL_{ALIAS} env var.
 */
export function resolveModelAlias(model: string): string {
  if (model.includes(':')) {
    return model;
  }

  const envKey = `GEN_MODEL_${model.toUpperCase()}`;
  const resolvedModel = process.env[envKey];

  if (!resolvedModel) {
    throw new Error(
      `Model alias "${model}" not found. ` +
      `Please define ${envKey} in your .env file with format "provider:modelId" ` +
      `(e.g., ${envKey}=openai:gpt-4)`
    );
  }

  return resolvedModel;
}

/**
 * Loads the model instance from the provider string
 */
export async function loadModelInstance(provider: string, modelId: string): Promise<any> {
  // First, try to create a custom OpenAI-compatible provider
  let modelInstance = createCustomProviderModel(provider, modelId);

  if (modelInstance) {
    return modelInstance;
  }

  // If no custom provider, fall back to standard provider import
  try {
    let providerModule;
    try {
      providerModule = await import(`@ai-sdk/${provider}`);
    } catch {
      providerModule = await import(provider);
    }

    if (!providerModule[provider]) {
      throw new Error(`Provider ${provider} not found in module`);
    }

    return providerModule[provider](modelId);
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

/**
 * Converts tools to AI SDK format and wraps them with state tracking
 */
export function convertToolsToAIFormat(
  tools: ToolDefinition[],
  state: AgentState,
  onStateUpdate: () => void
): Record<string, any> {
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
        onStateUpdate();

        try {
          const result = await t.execute(args);
          toolCall.result = result;
          onStateUpdate();
          return result;
        } catch (error) {
          toolCall.error = error instanceof Error ? error.message : String(error);
          onStateUpdate();
          throw error;
        }
      },
    });
  });

  return aiTools;
}

/**
 * Builds the conversation messages for the AI model
 */
export function buildConversationMessages(
  messages: MessageContent[],
  hooks: MessageHistoryHook[],
  promptResult: string
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const transformedMessages = applyMessageHooks([...messages], hooks);

  return [
    ...transformedMessages.map((m) => ({
      role: (m.name === 'system' ? 'system' : m.name === 'user' ? 'user' : 'assistant') as 'system' | 'user' | 'assistant',
      content: m.content,
    })),
    {
      role: 'user' as const,
      content: promptResult,
    },
  ];
}

export interface ExecuteAgentOptions {
  modelInstance: any;
  systemPrompts: string[];
  conversationMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  aiTools: Record<string, any>;
  responseSchema?: z.ZodSchema;
  state: AgentState;
  hooks: MessageHistoryHook[];
  promptResult: string;
  transformedMessages: MessageContent[];
  onStateUpdate: () => void;
}

/**
 * Executes the agent with retry logic for schema validation
 */
export async function executeAgent(options: ExecuteAgentOptions): Promise<any> {
  const {
    modelInstance,
    systemPrompts,
    conversationMessages,
    aiTools,
    responseSchema,
    state,
    hooks,
    promptResult,
    transformedMessages,
    onStateUpdate,
  } = options;

  const maxValidationRetries = 3;
  let currentMessages = [...conversationMessages];

  for (let attempt = 0; attempt <= maxValidationRetries; attempt++) {
    const result = await streamText({
      model: modelInstance,
      messages: currentMessages,
      system: systemPrompts.join('\n\n'),
      tools: Object.keys(aiTools).length > 0 ? aiTools : undefined,
      maxSteps: 10,
    });

    // Stream the text chunks and update state in real-time
    let streamedText = '';
    for await (const textPart of result.textStream) {
      streamedText += textPart;
      state.streamingText = streamedText;
      onStateUpdate();
    }

    // Get the final complete text
    const finalText = await result.text;

    // If no schema validation is required, return the response text
    if (!responseSchema) {
      return finalText;
    }

    // Attempt to parse and validate against schema
    try {
      let parsed;
      try {
        parsed = JSON.parse(finalText);
      } catch {
        // If parsing fails, try to extract JSON from text
        const jsonMatch = finalText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Response does not contain valid JSON');
        }
      }

      // Validate against schema
      const validatedResponse = responseSchema.parse(parsed);
      return validatedResponse;
    } catch (error) {
      // Track validation attempt
      const validationError = error instanceof z.ZodError
        ? formatValidationError(error)
        : error instanceof Error
          ? error.message
          : String(error);

      if (!state.validationAttempts) {
        state.validationAttempts = [];
      }

      state.validationAttempts.push({
        attempt: attempt + 1,
        response: finalText,
        error: validationError,
      });
      onStateUpdate();

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
          content: finalText,
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
}
