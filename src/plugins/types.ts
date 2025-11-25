import { z } from 'zod';
import type { MessageContent, MessageHistoryHook } from '../types.js';

/**
 * Represents a tool that can be used by the AI agent
 */
export interface PluginTool {
  name: string;
  description: string;
  schema: z.ZodSchema;
  execute: (...args: any[]) => Promise<any> | any;
}

/**
 * Plugin definition that can be imported and registered with genagent
 */
export interface Plugin {
  /**
   * Unique name for the plugin
   */
  name: string;

  /**
   * System prompt to add context about this plugin's capabilities
   */
  system: string;

  /**
   * Array of tools provided by this plugin
   */
  tools: PluginTool[];

  /**
   * Optional array of message history hooks that transform messages before LLM calls
   */
  hooks?: MessageHistoryHook[];
}

/**
 * Helper function to create a plugin tool
 */
export function tool(
  name: string,
  description: string,
  schema: z.ZodSchema,
  execute: (...args: any[]) => Promise<any> | any
): PluginTool {
  return {
    name,
    description,
    schema,
    execute,
  };
}

/**
 * Helper function to create a message history hook
 */
export function hook(
  fn: (messages: MessageContent[]) => MessageContent[] | undefined | void
): MessageHistoryHook {
  return fn;
}

/**
 * Helper function to create a plugin
 */
export function definePlugin(plugin: Plugin): Plugin {
  return plugin;
}
