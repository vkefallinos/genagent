import { render } from 'ink';
import React from 'react';
import { z } from 'zod';
import { config as dotenvConfig } from 'dotenv';
import { AgentCLI } from './ui.js';
import { PromptContext, RunPromptOptions } from './types.js';
import { resolveModelAlias as resolveModelAliasImpl } from './agent-executor.js';

// Load environment variables from .env file
dotenvConfig();

/**
 * Creates and runs an AI agent with the specified prompt and configuration.
 * The UI manages the agent state using React useState.
 *
 * @param promptFn - Callback function that receives context helpers (defMessage, def, defTool, $)
 * @param options - Configuration options including model, responseSchema, and system prompts
 * @returns Promise resolving to the agent's structured response
 *
 * @example
 * ```typescript
 * const result = await runPrompt(
 *   async ({ defMessage, def, defTool, $ }) => {
 *     defMessage('user', 'What is 2 + 2?');
 *     def('OPERATION', 'addition');
 *     defTool('calculate', 'Perform calculation', z.object({ expr: z.string() }),
 *       async ({ expr }) => eval(expr));
 *     return $`Please answer using the calculate tool for $OPERATION`;
 *   },
 *   {
 *     model: 'openai:gpt-4',
 *     system: ['You are a helpful math assistant']
 *   }
 * );
 * ```
 */
export async function runPrompt<T extends z.ZodSchema = z.ZodAny>(
  promptFn: (ctx: PromptContext) => Promise<string> | string,
  options: RunPromptOptions & { responseSchema?: T }
): Promise<T extends z.ZodSchema ? z.infer<T> : any> {
  return new Promise((resolve, reject) => {
    let appInstance: any = null;

    const element = React.createElement(AgentCLI, {
      promptFn,
      model: options.model,
      responseSchema: options.responseSchema,
      system: options.system,
      label: options.label,
      plugins: options.plugins,
      parentOnStateUpdate: options.parentOnStateUpdate,
      parentState: options.parentState,
      onComplete: (result: any) => {
        // Unmount and resolve (only if not a subagent)
        if (appInstance) {
          appInstance.unmount();
        }
        resolve(result);
      },
      onError: (error: Error) => {
        // Unmount and reject (only if not a subagent)
        if (appInstance) {
          appInstance.unmount();
        }
        reject(error);
      },
    });

    // Only render if not in subagent mode (parentOnStateUpdate not provided)
    appInstance = options.parentOnStateUpdate ? null : render(element);
  });
}

// Export model alias resolver
export { resolveModelAliasImpl as resolveModelAlias };

// Re-export types for consumers
export * from './types.js';
export * from './plugins/types.js';
export * from './task-list.js';

// Re-export host and workspace utilities
export * as host from './host.js';
export * as workspace from './workspace.js';

// Re-export the AgentCLI component for direct use
export { AgentCLI } from './ui.js';
