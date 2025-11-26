import { z } from 'zod';
import { PromptContext, MessageContent, ToolDefinition, MessageHistoryHook, AgentOptions, AgentContext } from './types.js';
import { defTaskList as defTaskListImpl } from './task-list.js';

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

  const ctx: PromptContext = {
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

    defAgent: <T extends z.ZodSchema>(
      name: string,
      description: string,
      inputSchema: T,
      fn: (args: z.infer<T>, ctx: AgentContext) => Promise<string> | string,
      options?: AgentOptions
    ) => {
      // Register the agent as a tool
      tools.push({
        name,
        description,
        schema: inputSchema,
        isAgent: true,
        agentOptions: options,
        execute: async (args: z.infer<T>, currentToolCall?: any, parentOnStateUpdate?: () => void) => {
          // Dynamically import runPrompt to avoid circular dependency
          const { runPrompt } = await import('./index.js');

          // Create the agent's prompt function
          const agentPromptFn = async (agentCtx: PromptContext) => {
            // Create an extended context that includes the input args
            const extendedCtx = {
              ...agentCtx,
              args,
            } as AgentContext;

            // Call the user's agent function to get the prompt
            const prompt = await fn(args, extendedCtx);
            return prompt;
          };

          // Initialize subagent state in the tool call
          if (currentToolCall) {
            currentToolCall.subagentState = {
              messages: [],
              tools: [],
              currentPrompt: '',
              toolCalls: [],
              label: `agent-${name}`,
              validationAttempts: [],
            };
          }

          // Merge default model with agent options
          const runOptions = {
            model: options?.model || 'gpt-4o-mini',
            responseSchema: options?.responseSchema,
            system: options?.system,
            plugins: options?.plugins,
            label: `agent-${name}`,
            parentOnStateUpdate,
            parentState: currentToolCall?.subagentState,
          };

          // Run the agent and return its result
          const result = await runPrompt(agentPromptFn, runOptions);
          return result;
        },
      });
    },

    defHook: (hook: MessageHistoryHook) => {
      hooks.push(hook);
    },

    defTaskList: (tasks) => {
      defTaskListImpl(ctx, tasks);
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

  return ctx;
}
