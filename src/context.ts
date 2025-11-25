import { z } from 'zod';
import { PromptContext, MessageContent, ToolDefinition, MessageHistoryHook } from './types.js';

/**
 * Applies all registered hooks to the message history.
 * Each hook receives the current message history and can return a modified version.
 * If a hook returns undefined or void, the messages remain unchanged.
 */
export function applyMessageHooks(
  messages: MessageContent[],
  hooks: MessageHistoryHook[]
): MessageContent[] {
  let currentMessages = messages;

  for (const hook of hooks) {
    const result = hook(currentMessages);
    if (result !== undefined) {
      currentMessages = result;
    }
  }

  return currentMessages;
}

export function createContext(
  messages: MessageContent[],
  tools: ToolDefinition[],
  hooks: MessageHistoryHook[]
): PromptContext {
  const variables = new Map<string, string>();
  let variableInstructionsAdded = false;

  return {
    defMessage: (name: string, content: string) => {
      messages.push({ name, content });
    },

    def: (variableName: string, content: string) => {
      variables.set(variableName, content);

      // Add system instructions about variable references on first use
      if (!variableInstructionsAdded) {
        messages.push({
          name: 'system',
          content: 'Variables have been defined and will be prepended to the user prompt in the format "VARIABLE_NAME: content". You can reference these variables in your response using the $VARIABLE_NAME syntax shown in the prompt.',
        });
        variableInstructionsAdded = true;
      }
    },

    defTool: <T extends z.ZodSchema>(
      name: string,
      description: string,
      schema: T,
      fn: (args: z.infer<T>) => Promise<any> | any
    ) => {
      tools.push({
        name,
        description,
        schema,
        execute: fn,
      });
    },

    defHook: (hook: MessageHistoryHook) => {
      hooks.push(hook);
    },

    $: (strings: TemplateStringsArray, ...values: any[]): string => {
      let result = strings.reduce((acc, str, i) => {
        return acc + str + (values[i] !== undefined ? String(values[i]) : '');
      }, '');

      // Prepend all defined variables to the prompt
      if (variables.size > 0) {
        const variableContext = Array.from(variables.entries())
          .map(([name, content]) => `${name}: ${content}`)
          .join('\n\n');
        result = `${variableContext}\n\n${result}`;
      }

      return result;
    },
  };
}
