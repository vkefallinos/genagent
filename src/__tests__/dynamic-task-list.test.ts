/**
 * Tests for dynamic-task-list.ts example functionality
 */

import { runPrompt } from '../index.js';
import { mockLLM, mockResponseWithTools } from './mock-llm.js';

describe('Dynamic Task List', () => {
  describe('basic dynamic task list', () => {
    it('should create and complete tasks dynamically', async () => {
      mockLLM.addResponses([
        // Create a task
        mockResponseWithTools('Creating task', [
          { toolName: 'createTask', args: { description: 'Design calculator UI' } },
        ]),
        // Start the task
        mockResponseWithTools('Starting task', [
          { toolName: 'startTask', args: { taskId: 1 } },
        ]),
        // Complete the task
        mockResponseWithTools('Completing task', [
          { toolName: 'completeTask', args: { taskId: 1, result: 'UI designed with buttons and display' } },
        ]),
      ]);

      const result = await runPrompt(
        async ({ defDynamicTaskList, $ }) => {
          defDynamicTaskList();

          return $`Create a task for designing a calculator UI, start it, and complete it.`;
        },
        {
          model: 'openai:gpt-4',
          system: ['You are a project planner.'],
        }
      );

      expect(result).toBeDefined();

      // Verify dynamic task list tools were registered
      const calls = mockLLM.getCalls();
      expect(calls[0].tools).toHaveProperty('createTask');
      expect(calls[0].tools).toHaveProperty('startTask');
      expect(calls[0].tools).toHaveProperty('completeTask');
      expect(calls[0].tools).toHaveProperty('updateTask');
      expect(calls[0].tools).toHaveProperty('deleteTask');
      expect(calls[0].tools).toHaveProperty('getTaskList');
    });

    it('should allow updating task descriptions', async () => {
      mockLLM.addResponses([
        mockResponseWithTools('', [
          { toolName: 'createTask', args: { description: 'Implement feature' } },
        ]),
        mockResponseWithTools('', [
          { toolName: 'updateTask', args: { taskId: 1, newDescription: 'Implement user authentication feature' } },
        ]),
        mockResponseWithTools('', [
          { toolName: 'startTask', args: { taskId: 1 } },
        ]),
        mockResponseWithTools('', [
          { toolName: 'completeTask', args: { taskId: 1, result: 'Feature implemented' } },
        ]),
      ]);

      await runPrompt(
        async ({ defDynamicTaskList, $ }) => {
          defDynamicTaskList();

          return $`Create a task, update its description to be more specific, then complete it.`;
        },
        {
          model: 'openai:gpt-4',
        }
      );

      const calls = mockLLM.getCalls();
      expect(calls[0].tools).toHaveProperty('updateTask');
    });

    it('should allow deleting tasks', async () => {
      mockLLM.addResponses([
        mockResponseWithTools('', [
          { toolName: 'createTask', args: { description: 'Task 1' } },
        ]),
        mockResponseWithTools('', [
          { toolName: 'createTask', args: { description: 'Task 2' } },
        ]),
        mockResponseWithTools('', [
          { toolName: 'deleteTask', args: { taskId: 1 } },
        ]),
      ]);

      await runPrompt(
        async ({ defDynamicTaskList, $ }) => {
          defDynamicTaskList();

          return $`Create two tasks, then delete the first one.`;
        },
        {
          model: 'openai:gpt-4',
        }
      );

      const calls = mockLLM.getCalls();
      expect(calls[0].tools).toHaveProperty('deleteTask');
    });

    it('should provide task list status via getTaskList', async () => {
      mockLLM.addResponses([
        mockResponseWithTools('', [
          { toolName: 'createTask', args: { description: 'Task 1' } },
        ]),
        mockResponseWithTools('', [
          { toolName: 'getTaskList', args: {} },
        ]),
      ]);

      await runPrompt(
        async ({ defDynamicTaskList, $ }) => {
          defDynamicTaskList();

          return $`Create a task and check the task list status.`;
        },
        {
          model: 'openai:gpt-4',
        }
      );

      const calls = mockLLM.getCalls();
      expect(calls[0].tools).toHaveProperty('getTaskList');
    });
  });

  describe('multi-phase project planning', () => {
    it('should handle adaptive task creation across phases', async () => {
      mockLLM.addResponses([
        // Phase 1: Research
        mockResponseWithTools('', [
          { toolName: 'createTask', args: { description: 'Research user needs' } },
        ]),
        mockResponseWithTools('', [
          { toolName: 'startTask', args: { taskId: 1 } },
        ]),
        mockResponseWithTools('', [
          { toolName: 'completeTask', args: { taskId: 1, result: 'Users want modern design' } },
        ]),
        // Phase 2: Design (based on research findings)
        mockResponseWithTools('', [
          { toolName: 'createTask', args: { description: 'Create modern design mockups' } },
        ]),
        mockResponseWithTools('', [
          { toolName: 'startTask', args: { taskId: 2 } },
        ]),
        mockResponseWithTools('', [
          { toolName: 'completeTask', args: { taskId: 2, result: 'Mockups completed' } },
        ]),
      ]);

      await runPrompt(
        async ({ defDynamicTaskList, $ }) => {
          defDynamicTaskList();

          return $`Plan and execute a website redesign:
1. Start with research tasks
2. Complete them
3. Based on findings, create design tasks
4. Complete the design phase`;
        },
        {
          model: 'openai:gpt-4',
        }
      );

      expect(mockLLM.getCalls().length).toBeGreaterThan(3);
    });
  });

  describe('task state management', () => {
    it('should track task states: pending, in_progress, completed', async () => {
      mockLLM.addResponses([
        mockResponseWithTools('', [
          { toolName: 'createTask', args: { description: 'Write code' } },
        ]),
        mockResponseWithTools('', [
          { toolName: 'getTaskList', args: {} },
        ]),
        mockResponseWithTools('', [
          { toolName: 'startTask', args: { taskId: 1 } },
        ]),
        mockResponseWithTools('', [
          { toolName: 'getTaskList', args: {} },
        ]),
        mockResponseWithTools('', [
          { toolName: 'completeTask', args: { taskId: 1, result: 'Code written' } },
        ]),
        mockResponseWithTools('', [
          { toolName: 'getTaskList', args: {} },
        ]),
      ]);

      await runPrompt(
        async ({ defDynamicTaskList, $ }) => {
          defDynamicTaskList();

          return $`Create a task, check its status (should be pending),
start it, check status (should be in_progress),
complete it, check status (should be completed).`;
        },
        {
          model: 'openai:gpt-4',
        }
      );

      const calls = mockLLM.getCalls();
      expect(calls.length).toBeGreaterThan(3);
    });
  });

  describe('task refinement workflow', () => {
    it('should support creating, reviewing, updating, and deleting tasks', async () => {
      mockLLM.addResponses([
        // Create initial tasks
        mockResponseWithTools('', [
          { toolName: 'createTask', args: { description: 'Task A' } },
        ]),
        mockResponseWithTools('', [
          { toolName: 'createTask', args: { description: 'Task B' } },
        ]),
        mockResponseWithTools('', [
          { toolName: 'createTask', args: { description: 'Task C' } },
        ]),
        // Review and refine
        mockResponseWithTools('', [
          { toolName: 'updateTask', args: { taskId: 1, newDescription: 'Task A - Updated' } },
        ]),
        mockResponseWithTools('', [
          { toolName: 'deleteTask', args: { taskId: 2 } },
        ]),
        // Complete remaining tasks
        mockResponseWithTools('', [
          { toolName: 'startTask', args: { taskId: 1 } },
        ]),
        mockResponseWithTools('', [
          { toolName: 'completeTask', args: { taskId: 1, result: 'Done' } },
        ]),
        mockResponseWithTools('', [
          { toolName: 'startTask', args: { taskId: 3 } },
        ]),
        mockResponseWithTools('', [
          { toolName: 'completeTask', args: { taskId: 3, result: 'Done' } },
        ]),
      ]);

      await runPrompt(
        async ({ defDynamicTaskList, $ }) => {
          defDynamicTaskList();

          return $`Create 3 tasks, update one, delete one, and complete the remaining tasks.`;
        },
        {
          model: 'openai:gpt-4',
        }
      );

      expect(mockLLM.getCalls().length).toBeGreaterThan(5);
    });
  });

  describe('difference from regular task list', () => {
    it('should have no validation constraints on task completion', async () => {
      // Regular task list requires validation functions
      // Dynamic task list lets agent decide when tasks are complete
      mockLLM.addResponses([
        mockResponseWithTools('', [
          { toolName: 'createTask', args: { description: 'Do something' } },
        ]),
        mockResponseWithTools('', [
          { toolName: 'startTask', args: { taskId: 1 } },
        ]),
        // Agent can complete with any result - no validation
        mockResponseWithTools('', [
          { toolName: 'completeTask', args: { taskId: 1, result: 'Whatever the agent decides' } },
        ]),
      ]);

      await runPrompt(
        async ({ defDynamicTaskList, $ }) => {
          defDynamicTaskList();

          return $`Create a task and complete it with any result you choose.`;
        },
        {
          model: 'openai:gpt-4',
        }
      );

      expect(mockLLM.getCalls().length).toBeGreaterThanOrEqual(1);
    });

    it('should allow agent-controlled task creation during execution', async () => {
      mockLLM.addResponses([
        mockResponseWithTools('', [
          { toolName: 'createTask', args: { description: 'Initial task' } },
        ]),
        mockResponseWithTools('', [
          { toolName: 'startTask', args: { taskId: 1 } },
        ]),
        // Agent discovers need for new task during execution
        mockResponseWithTools('', [
          { toolName: 'createTask', args: { description: 'New task discovered' } },
        ]),
        mockResponseWithTools('', [
          { toolName: 'completeTask', args: { taskId: 1, result: 'Found new requirement' } },
        ]),
        mockResponseWithTools('', [
          { toolName: 'startTask', args: { taskId: 2 } },
        ]),
        mockResponseWithTools('', [
          { toolName: 'completeTask', args: { taskId: 2, result: 'Addressed new requirement' } },
        ]),
      ]);

      await runPrompt(
        async ({ defDynamicTaskList, $ }) => {
          defDynamicTaskList();

          return $`Start with one task. While working on it, discover you need
another task, create it, then complete both tasks.`;
        },
        {
          model: 'openai:gpt-4',
        }
      );

      expect(mockLLM.getCalls().length).toBeGreaterThan(3);
    });
  });
});
