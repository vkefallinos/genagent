import { z } from 'zod';
import type { Plugin } from './plugins/types.js';
import type { Task } from './task-list.js';

export interface ToolDefinition {
  name: string;
  description: string;
  schema: z.ZodSchema;
  execute: (...args: any[]) => Promise<any> | any;
}

export interface AgentOptions {
  model?: string;
  responseSchema?: z.ZodSchema;
  system?: string[];
  plugins?: Plugin[];
}

export interface AgentContext extends PromptContext {
  args: any;
}

export type MessageType =
  | 'user'
  | 'assistant'
  | 'system'
  | 'tool_call'
  | 'tool_result'
  | 'subagent';

export interface MessageMetadata {
  toolName?: string;
  args?: any;
  result?: any;
  error?: string;
  subagentLabel?: string;
  subagentMessages?: MessageContent[];
  executionTime?: number;
}

export interface MessageContent {
  id: string;
  name: string;
  content: string;
  type?: MessageType;
  timestamp?: number;
  parentId?: string;
  metadata?: MessageMetadata;
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
  defAgent: <T extends z.ZodSchema, R = any>(
    name: string,
    description: string,
    inputSchema: T,
    fn: (args: z.infer<T>, ctx: AgentContext) => Promise<string> | string,
    options?: AgentOptions
  ) => void;
  defHook: (hook: MessageHistoryHook) => void;
  defTaskList: (tasks: Task[]) => void;
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
  streamingText?: string;
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

/**
 * Utility function to create a message with proper ID and timestamp
 */
export function createMessage(
  name: string,
  content: string,
  type?: MessageType,
  metadata?: MessageMetadata,
  parentId?: string
): MessageContent {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    content,
    type: type || (name === 'user' ? 'user' : name === 'system' ? 'system' : 'assistant'),
    timestamp: Date.now(),
    parentId,
    metadata,
  };
}
