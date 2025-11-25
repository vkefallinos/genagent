import { z } from 'zod';
import type { Plugin } from './plugins/types.js';

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

/**
 * Hook function type for message history transformations.
 * Receives the current message history and can return a modified version.
 * If undefined is returned, the messages remain unchanged.
 */
export type MessageHistoryHook = (messages: MessageContent[]) => MessageContent[] | undefined | void;

export interface PromptContext {
  defMessage: (name: string, content: string) => void;
  def: (variableName: string, content: string) => void;
  defTool: <T extends z.ZodSchema>(
    name: string,
    description: string,
    schema: T,
    fn: (args: z.infer<T>) => Promise<any> | any
  ) => void;
  defHook: (hook: MessageHistoryHook) => void;
  $: (strings: TemplateStringsArray, ...values: any[]) => string;
}

export interface RunPromptOptions {
  responseSchema?: z.ZodSchema;
  model: string;
  system?: string[];
  label?: string;
  plugins?: Plugin[];
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
  validationAttempts?: Array<{
    attempt: number;
    response: string;
    error: string;
  }>;
}
