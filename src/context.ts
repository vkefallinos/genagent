import { z } from 'zod';
import { PromptContext, MessageContent, ToolDefinition } from './types.js';

export function createContext(
  messages: MessageContent[],
  tools: ToolDefinition[]
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
          content: 'Variables have been defined in this context and can be referenced using $VARIABLE_NAME syntax. When you see $VARIABLE_NAME in prompts, it refers to the corresponding defined variable content.',
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

    $: (strings: TemplateStringsArray, ...values: any[]): string => {
      let result = strings.reduce((acc, str, i) => {
        return acc + str + (values[i] !== undefined ? String(values[i]) : '');
      }, '');

      // Replace variable references ($VARIABLE_NAME) with actual content
      variables.forEach((content, name) => {
        const regex = new RegExp(`\\$${name}\\b`, 'g');
        result = result.replace(regex, content);
      });

      return result;
    },
  };
}
