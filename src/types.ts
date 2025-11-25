import { z } from 'zod';

export interface ToolDefinition {
  name: string;
  description: string;
  schema: z.ZodSchema;
  execute: (...args: any[]) => Promise<any> | any;
}

export interface MessageContent {
  name: string;
  content: string;
}

export interface PromptContext {
  defMessage: (name: string, content: string) => void;
  def: (variableName: string, content: string) => void;
  defTool: <T extends z.ZodSchema>(
    name: string,
    description: string,
    schema: T,
    fn: (args: z.infer<T>) => Promise<any> | any
  ) => void;
  $: (strings: TemplateStringsArray, ...values: any[]) => string;
}

export interface RunPromptOptions {
  responseSchema?: z.ZodSchema;
  model: string;
  system?: string[];
  label?: string;
}

export interface AgentState {
  messages: MessageContent[];
  tools: ToolDefinition[];
  currentPrompt: string;
  response?: any;
  error?: string;
  label?: string;
  toolCalls: Array<{
    tool: string;
    args: any;
    result?: any;
    error?: string;
  }>;
}
