/**
 * Type definitions for GenAgent .gen.ts files
 *
 * This file enables type checking and IDE autocomplete for GenAgent files.
 * Automatically created when first running 'genagent run <file.gen.ts>'
 */

declare module '*.gen.ts' {
  import { PromptContext, RunPromptOptions } from 'genagent';

  /**
   * GenAgent file module
   *
   * Export a default async function that accepts PromptContext
   * and an options object with at least a model property.
   *
   * @example
   * export default async ({ defMessage, def, defTool, $ }) => {
   *   defMessage('user', 'Hello');
   *   return $`Process this...`;
   * };
   *
   * export const options = {
   *   model: 'openai:gpt-4'
   * };
   */

  export default function promptFn(ctx: PromptContext): Promise<string> | string;
  export const options: RunPromptOptions;
}

declare module '*.gen.js' {
  import { PromptContext, RunPromptOptions } from 'genagent';

  export default function promptFn(ctx: PromptContext): Promise<string> | string;
  export const options: RunPromptOptions;
}
