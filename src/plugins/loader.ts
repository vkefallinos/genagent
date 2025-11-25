import { Plugin } from './types.js';
import { PromptContext } from '../types.js';

/**
 * Loads plugins into the prompt context
 * @param ctx The prompt context to register plugins with
 * @param plugins Array of plugins to load
 * @returns Array of system prompts from all plugins
 */
export function loadPlugins(
  ctx: PromptContext,
  plugins: Plugin[]
): string[] {
  const systemPrompts: string[] = [];

  for (const plugin of plugins) {
    // Register all tools from the plugin
    for (const tool of plugin.tools) {
      ctx.defTool(
        tool.name,
        tool.description,
        tool.schema,
        tool.execute
      );
    }

    // Register all hooks from the plugin
    if (plugin.hooks) {
      for (const hook of plugin.hooks) {
        ctx.defHook(hook);
      }
    }

    // Collect system prompts
    if (plugin.system) {
      systemPrompts.push(`# ${plugin.name}\n\n${plugin.system}`);
    }
  }

  return systemPrompts;
}
