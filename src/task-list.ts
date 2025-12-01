import { z } from 'zod';
import type { PromptContext, MessageContent } from './types.js';
import { resolveModelAlias, loadModelInstance } from './agent-executor.js';
import { streamText } from 'ai';

/**
 * Task definition with prompt and validation function
 */
export interface Task {
  /**
   * The task prompt/description to be given to the LLM
   */
  task: string;

  /**
   * Validation function that receives the task result.
   * Returns feedback string if validation fails, or undefined/void if validation passes.
   */
  validation: (result: string) => string | undefined | void;
}

/**
 * Configuration for conversation history compaction
 */
export interface CompactionConfig {
  /**
   * Template for the compaction prompt.
   * Use <TASK_HISTORY> placeholder which will be replaced with the task's message history.
   */
  prompt: string;

  /**
   * Model to use for compaction (can be alias or full provider:model string)
   */
  model: string;
}

/**
 * Options for configuring the task list system
 */
export interface TaskListOptions {
  /**
   * Array of tasks to execute sequentially
   */
  tasks: Task[];

  /**
   * Optional compaction configuration for reducing conversation history
   */
  compaction?: CompactionConfig;
}

/**
 * Internal state for managing task list execution
 */
interface TaskListState {
  tasks: Task[];
  currentTaskIndex: number;
  completedTasks: Array<{ task: string; result: string; compactedHistory?: string }>;
  validationFeedback?: string;
  compactionConfig?: CompactionConfig;
  originalMessages: MessageContent[];
}

/**
 * Compacts conversation history using a specified model
 */
async function compactHistory(
  messages: MessageContent[],
  config: CompactionConfig
): Promise<string> {
  try {
    // Format messages into a readable history string
    const historyText = messages
      .map((m) => `[${m.name}]: ${m.content}`)
      .join('\n\n');

    // Replace placeholder in prompt template
    const compactionPrompt = config.prompt.replace('<TASK_HISTORY>', historyText);

    // Resolve model alias and load model instance
    const resolvedModel = resolveModelAlias(config.model);
    const [provider, modelId] = resolvedModel.split(':');
    const modelInstance = await loadModelInstance(provider, modelId);

    // Call the model to compact the history
    const result = await streamText({
      model: modelInstance,
      messages: [{ role: 'user', content: compactionPrompt }],
      maxSteps: 1,
    });

    return await result.text;
  } catch (error) {
    // If compaction fails, return a fallback summary
    console.error('Compaction failed:', error);
    return `Task completed with ${messages.length} messages. Compaction failed.`;
  }
}

/**
 * Creates a task list system that manages sequential task execution with validation.
 *
 * This function:
 * - Provides a `finishTask` tool for the LLM to complete the current task
 * - Uses message history hooks to keep only task summaries (description + result)
 * - Shows the LLM the current task and upcoming tasks
 * - Validates task results and provides feedback for corrections
 * - Optionally compacts conversation history using a small model
 *
 * @param ctx - The prompt context to register tools and hooks
 * @param tasksOrOptions - Array of tasks or TaskListOptions with compaction config
 *
 * @example
 * ```typescript
 * await runPrompt(
 *   async ({ defTaskList, $ }) => {
 *     defTaskList({
 *       tasks: [
 *         {
 *           task: 'Calculate 5 + 3',
 *           validation: (result) => {
 *             if (result !== '8') return 'Incorrect. Please recalculate.';
 *           }
 *         },
 *         {
 *           task: 'Multiply the previous result by 2',
 *           validation: (result) => {
 *             if (result !== '16') return 'Incorrect. The answer should be 16.';
 *           }
 *         }
 *       ],
 *       compaction: {
 *         prompt: '<TASK_HISTORY> Compact what happened and obvious result of this task',
 *         model: 'small'
 *       }
 *     });
 *
 *     return $`Complete all tasks using the finishTask tool.`;
 *   },
 *   { model: 'openai:gpt-4' }
 * );
 * ```
 */
export function defTaskList(
  ctx: PromptContext,
  tasksOrOptions: Task[] | TaskListOptions
): void {
  // Support both old array format and new options format for backwards compatibility
  const options: TaskListOptions = Array.isArray(tasksOrOptions)
    ? { tasks: tasksOrOptions }
    : tasksOrOptions;

  const { tasks, compaction } = options;

  if (tasks.length === 0) {
    throw new Error('Task list must contain at least one task');
  }

  const state: TaskListState = {
    tasks,
    currentTaskIndex: 0,
    completedTasks: [],
    validationFeedback: undefined,
    compactionConfig: compaction,
    originalMessages: [],
  };

  // Define the finishTask tool
  ctx.defTool(
    'finishTask',
    'Complete the current task with a result. The validation function will check if the result is correct.',
    z.object({
      result: z.string().describe('The result of the current task'),
    }),
    async ({ result }) => {
      const currentTask = state.tasks[state.currentTaskIndex];

      // Run validation
      const feedback = currentTask.validation(result);

      if (feedback) {
        // Validation failed, store feedback to be shown in next message cycle
        state.validationFeedback = feedback;
        return `Validation failed: ${feedback}\n\nPlease review the task and provide a corrected result.`;
      }

      // Task completed successfully
      let compactedHistory: string | undefined;

      // If compaction is configured, compact the conversation history for this task
      if (state.compactionConfig && state.originalMessages.length > 0) {
        compactedHistory = await compactHistory(
          state.originalMessages,
          state.compactionConfig
        );
      }

      state.completedTasks.push({
        task: currentTask.task,
        result,
        compactedHistory,
      });

      // Clear the original messages for the next task
      state.originalMessages = [];

      // Clear any previous validation feedback
      state.validationFeedback = undefined;

      state.currentTaskIndex++;

      // Check if there are more tasks
      if (state.currentTaskIndex < state.tasks.length) {
        const nextTask = state.tasks[state.currentTaskIndex];
        return `✓ Task completed successfully!\n\nNext task: ${nextTask.task}`;
      } else {
        return '✓ All tasks completed successfully! The task list is complete.';
      }
    }
  );

  // Add a hook to manage message history
  ctx.defHook((messages) => {
    // Store original messages for compaction before transforming them
    if (state.compactionConfig) {
      // Only add messages that are part of the current task (after system messages)
      const relevantMessages = messages.filter(
        m => !m.content.includes('TASK LIST MODE ACTIVE') &&
             !m.content.includes('You are working through a task list')
      );
      state.originalMessages = relevantMessages;
    }

    const newMessages: MessageContent[] = [];

    // Add system instructions about the task list
    newMessages.push({
      name: 'system',
      content: [
        'You are working through a task list. Each task must be completed in order.',
        'Use the finishTask tool to submit your result for the current task.',
        'If validation fails, you will receive feedback to correct your result.',
        'Focus only on the current task, but be aware of upcoming tasks.',
        'Previous tasks are summarized below for context.',
      ].join('\n'),
    });

    // Add summaries of completed tasks
    if (state.completedTasks.length > 0) {
      const taskSummaries = state.completedTasks
        .map((ct, i) => {
          // Use compacted history if available, otherwise use simple task + result
          if (ct.compactedHistory) {
            return `Task ${i + 1}: ${ct.task}\n${ct.compactedHistory}`;
          }
          return `Task ${i + 1}: ${ct.task}\nResult: ${ct.result}`;
        })
        .join('\n\n');

      newMessages.push({
        name: 'system',
        content: `Completed tasks (${state.completedTasks.length}/${state.tasks.length}):\n\n${taskSummaries}`,
      });
    }

    // Add information about upcoming tasks (not including current)
    if (state.currentTaskIndex < state.tasks.length - 1) {
      const upcomingTasks = state.tasks
        .slice(state.currentTaskIndex + 1)
        .map((t, i) => `${i + state.currentTaskIndex + 2}. ${t.task}`)
        .join('\n');

      newMessages.push({
        name: 'system',
        content: `Upcoming tasks:\n${upcomingTasks}`,
      });
    }

    // Add current task prompt
    if (state.currentTaskIndex < state.tasks.length) {
      const currentTaskNum = state.currentTaskIndex + 1;
      const currentTask = state.tasks[state.currentTaskIndex];

      newMessages.push({
        name: 'user',
        content: `[Task ${currentTaskNum}/${state.tasks.length}] ${currentTask.task}`,
      });

      // If there's validation feedback from a previous attempt, add it
      if (state.validationFeedback) {
        newMessages.push({
          name: 'system',
          content: `Previous attempt feedback: ${state.validationFeedback}`,
        });
      }
    }

    return newMessages;
  });

  // Add task list instructions to the system
  ctx.defMessage('system', [
    'TASK LIST MODE ACTIVE',
    `Total tasks: ${tasks.length}`,
    'Complete each task in order using the finishTask tool.',
    'Each task will be validated before moving to the next one.',
  ].join('\n'));
}
