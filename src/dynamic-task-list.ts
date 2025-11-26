import { z } from 'zod';
import type { PromptContext, MessageContent } from './types.js';

/**
 * Dynamic task definition
 */
export interface DynamicTask {
  /**
   * Unique identifier for the task
   */
  id: string;

  /**
   * Task description
   */
  description: string;

  /**
   * Current status of the task
   */
  status: 'pending' | 'in_progress' | 'completed';

  /**
   * Result when completed
   */
  result?: string;

  /**
   * Creation timestamp
   */
  createdAt: number;

  /**
   * Completion timestamp
   */
  completedAt?: number;
}

/**
 * Internal state for managing dynamic task list
 */
interface DynamicTaskListState {
  tasks: Map<string, DynamicTask>;
  taskOrder: string[]; // Maintains insertion order
  nextId: number;
}

/**
 * Creates a dynamic task list system that allows agents to create, update, and complete tasks on the fly.
 *
 * This function provides tools for:
 * - Creating new tasks dynamically
 * - Updating pending tasks
 * - Completing tasks with results
 * - Viewing the current task list state
 *
 * @param ctx - The prompt context to register tools and hooks
 *
 * @example
 * ```typescript
 * await runPrompt(
 *   async ({ defDynamicTaskList, $ }) => {
 *     defDynamicTaskList();
 *
 *     return $`You are a project planner. Create a task list for building a web app,
 *              complete the tasks one by one, and add new tasks as you discover them.`;
 *   },
 *   { model: 'openai:gpt-4' }
 * );
 * ```
 */
export function defDynamicTaskList(ctx: PromptContext): void {
  const state: DynamicTaskListState = {
    tasks: new Map(),
    taskOrder: [],
    nextId: 1,
  };

  /**
   * Generate a unique task ID
   */
  const generateTaskId = (): string => {
    return `task-${state.nextId++}`;
  };

  /**
   * Format task list for display
   */
  const formatTaskList = (): string => {
    if (state.taskOrder.length === 0) {
      return 'No tasks in the list.';
    }

    const sections = {
      completed: [] as string[],
      inProgress: [] as string[],
      pending: [] as string[],
    };

    for (const taskId of state.taskOrder) {
      const task = state.tasks.get(taskId)!;
      const taskInfo = `[${task.id}] ${task.description}`;

      if (task.status === 'completed') {
        sections.completed.push(`✓ ${taskInfo}\n  Result: ${task.result}`);
      } else if (task.status === 'in_progress') {
        sections.inProgress.push(`→ ${taskInfo}`);
      } else {
        sections.pending.push(`○ ${taskInfo}`);
      }
    }

    const parts: string[] = [];

    if (sections.completed.length > 0) {
      parts.push(`Completed (${sections.completed.length}):\n${sections.completed.join('\n')}`);
    }

    if (sections.inProgress.length > 0) {
      parts.push(`In Progress (${sections.inProgress.length}):\n${sections.inProgress.join('\n')}`);
    }

    if (sections.pending.length > 0) {
      parts.push(`Pending (${sections.pending.length}):\n${sections.pending.join('\n')}`);
    }

    const total = state.taskOrder.length;
    const completed = sections.completed.length;
    parts.unshift(`Task List Overview: ${completed}/${total} completed\n`);

    return parts.join('\n\n');
  };

  /**
   * Tool: Create a new task
   */
  ctx.defTool(
    'createTask',
    'Create a new task and add it to the task list. Returns the task ID.',
    z.object({
      description: z.string().describe('Clear description of what needs to be done'),
    }),
    async ({ description }) => {
      const taskId = generateTaskId();
      const task: DynamicTask = {
        id: taskId,
        description,
        status: 'pending',
        createdAt: Date.now(),
      };

      state.tasks.set(taskId, task);
      state.taskOrder.push(taskId);

      return `✓ Created task ${taskId}: "${description}"\n\nTotal tasks: ${state.taskOrder.length}`;
    }
  );

  /**
   * Tool: Update a pending task
   */
  ctx.defTool(
    'updateTask',
    'Update the description of a pending task. Cannot update completed or in-progress tasks.',
    z.object({
      taskId: z.string().describe('The ID of the task to update'),
      newDescription: z.string().describe('The new description for the task'),
    }),
    async ({ taskId, newDescription }) => {
      const task = state.tasks.get(taskId);

      if (!task) {
        return `✗ Error: Task ${taskId} not found.`;
      }

      if (task.status === 'completed') {
        return `✗ Error: Cannot update completed task ${taskId}.`;
      }

      if (task.status === 'in_progress') {
        return `✗ Error: Cannot update in-progress task ${taskId}. Complete it first or create a new task.`;
      }

      const oldDescription = task.description;
      task.description = newDescription;

      return `✓ Updated task ${taskId}:\n  Old: "${oldDescription}"\n  New: "${newDescription}"`;
    }
  );

  /**
   * Tool: Start working on a task
   */
  ctx.defTool(
    'startTask',
    'Mark a pending task as in-progress. You should call this before working on a task.',
    z.object({
      taskId: z.string().describe('The ID of the task to start'),
    }),
    async ({ taskId }) => {
      const task = state.tasks.get(taskId);

      if (!task) {
        return `✗ Error: Task ${taskId} not found.`;
      }

      if (task.status === 'completed') {
        return `✗ Error: Task ${taskId} is already completed.`;
      }

      if (task.status === 'in_progress') {
        return `✗ Warning: Task ${taskId} is already in progress.`;
      }

      task.status = 'in_progress';

      return `✓ Started task ${taskId}: "${task.description}"`;
    }
  );

  /**
   * Tool: Complete a task
   */
  ctx.defTool(
    'completeTask',
    'Mark a task as completed with a result. The task should be in-progress before completing.',
    z.object({
      taskId: z.string().describe('The ID of the task to complete'),
      result: z.string().describe('The result or outcome of completing the task'),
    }),
    async ({ taskId, result }) => {
      const task = state.tasks.get(taskId);

      if (!task) {
        return `✗ Error: Task ${taskId} not found.`;
      }

      if (task.status === 'completed') {
        return `✗ Error: Task ${taskId} is already completed.`;
      }

      task.status = 'completed';
      task.result = result;
      task.completedAt = Date.now();

      const completed = state.taskOrder.filter(
        id => state.tasks.get(id)?.status === 'completed'
      ).length;

      const total = state.taskOrder.length;

      if (completed === total) {
        return `✓ Task ${taskId} completed!\n  Result: ${result}\n\n🎉 All tasks completed! (${completed}/${total})`;
      }

      return `✓ Task ${taskId} completed!\n  Result: ${result}\n\nProgress: ${completed}/${total} tasks completed`;
    }
  );

  /**
   * Tool: Get task list
   */
  ctx.defTool(
    'getTaskList',
    'Get the current state of all tasks in the task list.',
    z.object({}),
    async () => {
      return formatTaskList();
    }
  );

  /**
   * Tool: Delete a pending task
   */
  ctx.defTool(
    'deleteTask',
    'Delete a pending task from the list. Cannot delete completed or in-progress tasks.',
    z.object({
      taskId: z.string().describe('The ID of the task to delete'),
    }),
    async ({ taskId }) => {
      const task = state.tasks.get(taskId);

      if (!task) {
        return `✗ Error: Task ${taskId} not found.`;
      }

      if (task.status === 'completed') {
        return `✗ Error: Cannot delete completed task ${taskId}.`;
      }

      if (task.status === 'in_progress') {
        return `✗ Error: Cannot delete in-progress task ${taskId}.`;
      }

      state.tasks.delete(taskId);
      state.taskOrder = state.taskOrder.filter(id => id !== taskId);

      return `✓ Deleted task ${taskId}: "${task.description}"\n\nRemaining tasks: ${state.taskOrder.length}`;
    }
  );

  // Add message hook to show task list context
  ctx.defHook((messages) => {
    // Only add context if there are tasks
    if (state.taskOrder.length === 0) {
      return messages;
    }

    const newMessages: MessageContent[] = [...messages];

    // Insert task list overview before the last user message
    const taskListOverview: MessageContent = {
      name: 'system',
      content: `DYNAMIC TASK LIST STATUS:\n\n${formatTaskList()}\n\nAvailable tools: createTask, updateTask, startTask, completeTask, getTaskList, deleteTask`,
    };

    // Find the last user message index
    let lastUserIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].name === 'user') {
        lastUserIndex = i;
        break;
      }
    }

    if (lastUserIndex >= 0) {
      // Insert before the last user message
      newMessages.splice(lastUserIndex, 0, taskListOverview);
    } else {
      // No user message found, append at the end
      newMessages.push(taskListOverview);
    }

    return newMessages;
  });

  // Add initial system message
  ctx.defMessage('system', [
    'DYNAMIC TASK LIST MODE ACTIVE',
    '',
    'You have access to a dynamic task list system. You can:',
    '- createTask: Add new tasks as you discover them',
    '- updateTask: Modify pending task descriptions',
    '- startTask: Mark a task as in-progress before working on it',
    '- completeTask: Mark a task as done with results',
    '- getTaskList: View current task list state',
    '- deleteTask: Remove pending tasks that are no longer needed',
    '',
    'Work through tasks systematically and add new ones as needed.',
  ].join('\n'));
}
