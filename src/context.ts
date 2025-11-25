import { z } from 'zod';
import { PromptContext, MessageContent, ToolDefinition } from './types.js';

export function createContext(
  messages: MessageContent[],
  tools: ToolDefinition[]
): PromptContext {
  return {
    def: (name: string, content: string) => {
      messages.push({ name, content });
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
      return strings.reduce((result, str, i) => {
        return result + str + (values[i] !== undefined ? String(values[i]) : '');
      }, '');
    },
  };
}
