import { z } from 'zod';
import type { PromptContext, MessageContent } from './types.js';
import { createMessage } from './types.js';

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
 * Internal state for managing task list execution
 */
interface TaskListState {
  tasks: Task[];
  currentTaskIndex: number;
  completedTasks: Array<{ task: string; result: string }>;
  validationFeedback?: string;
}

/**
 * Creates a task list system that manages sequential task execution with validation.
 *
 * This function:
 * - Provides a `finishTask` tool for the LLM to complete the current task
 * - Uses message history hooks to keep only task summaries (description + result)
 * - Shows the LLM the current task and upcoming tasks
 * - Validates task results and provides feedback for corrections
 *
 * @param ctx - The prompt context to register tools and hooks
 * @param tasks - Array of tasks with prompts and validation functions
 *
 * @example
 * ```typescript
 * await runPrompt(
 *   async ({ defTaskList, $ }) => {
 *     defTaskList([
 *       {
 *         task: 'Calculate 5 + 3',
 *         validation: (result) => {
 *           if (result !== '8') return 'Incorrect. Please recalculate.';
 *         }
 *       },
 *       {
 *         task: 'Multiply the previous result by 2',
 *         validation: (result) => {
 *           if (result !== '16') return 'Incorrect. The answer should be 16.';
 *         }
 *       }
 *     ]);
 *
 *     return $`Complete all tasks using the finishTask tool.`;
 *   },
 *   { model: 'openai:gpt-4' }
 * );
 * ```
 */
export function defTaskList(
  ctx: PromptContext,
  tasks: Task[]
): void {
  if (tasks.length === 0) {
    throw new Error('Task list must contain at least one task');
  }

  const state: TaskListState = {
    tasks,
    currentTaskIndex: 0,
    completedTasks: [],
    validationFeedback: undefined,
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
      state.completedTasks.push({
        task: currentTask.task,
        result,
      });

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
    const newMessages: MessageContent[] = [];

    // Add system instructions about the task list
    newMessages.push(createMessage(
      'system',
      [
        'You are working through a task list. Each task must be completed in order.',
        'Use the finishTask tool to submit your result for the current task.',
        'If validation fails, you will receive feedback to correct your result.',
        'Focus only on the current task, but be aware of upcoming tasks.',
        'Previous tasks are summarized below for context.',
      ].join('\n')
    ));

    // Add summaries of completed tasks
    if (state.completedTasks.length > 0) {
      const taskSummaries = state.completedTasks
        .map((ct, i) => `Task ${i + 1}: ${ct.task}\nResult: ${ct.result}`)
        .join('\n\n');

      newMessages.push(createMessage(
        'system',
        `Completed tasks (${state.completedTasks.length}/${state.tasks.length}):\n\n${taskSummaries}`
      ));
    }

    // Add information about upcoming tasks (not including current)
    if (state.currentTaskIndex < state.tasks.length - 1) {
      const upcomingTasks = state.tasks
        .slice(state.currentTaskIndex + 1)
        .map((t, i) => `${i + state.currentTaskIndex + 2}. ${t.task}`)
        .join('\n');

      newMessages.push(createMessage(
        'system',
        `Upcoming tasks:\n${upcomingTasks}`
      ));
    }

    // Add current task prompt
    if (state.currentTaskIndex < state.tasks.length) {
      const currentTaskNum = state.currentTaskIndex + 1;
      const currentTask = state.tasks[state.currentTaskIndex];

      newMessages.push(createMessage(
        'user',
        `[Task ${currentTaskNum}/${state.tasks.length}] ${currentTask.task}`
      ));

      // If there's validation feedback from a previous attempt, add it
      if (state.validationFeedback) {
        newMessages.push(createMessage(
          'system',
          `Previous attempt feedback: ${state.validationFeedback}`
        ));
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
