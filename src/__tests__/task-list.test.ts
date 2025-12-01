/**
 * Tests for task-list.ts example functionality
 */

import { runPrompt } from '../index.js';
import { mockLLM, mockResponseWithTools } from './mock-llm.js';

describe('Task List', () => {
  describe('basicTaskListExample', () => {
    it('should execute tasks sequentially with validation', async () => {
      // Mock responses for each task completion
      mockLLM.addResponses([
        mockResponseWithTools('Completing task 1', [{ toolName: 'finishTask', args: { result: '8' } }]),
        mockResponseWithTools('Completing task 2', [{ toolName: 'finishTask', args: { result: '16' } }]),
        mockResponseWithTools('Completing task 3', [{ toolName: 'finishTask', args: { result: '10' } }]),
      ]);

      const result = await runPrompt(
        async ({ defTaskList, $ }) => {
          defTaskList([
            {
              task: 'Calculate 5 + 3',
              validation: (result) => {
                const num = parseInt(result.trim());
                if (num !== 8) {
                  return `Incorrect. The result should be 8, but you provided ${result}`;
                }
              },
            },
            {
              task: 'Multiply the previous result by 2',
              validation: (result) => {
                const num = parseInt(result.trim());
                if (num !== 16) {
                  return `Incorrect. The result should be 16 (8 * 2), but you provided ${result}`;
                }
              },
            },
            {
              task: 'Subtract 6 from the previous result',
              validation: (result) => {
                const num = parseInt(result.trim());
                if (num !== 10) {
                  return `Incorrect. The result should be 10 (16 - 6), but you provided ${result}`;
                }
              },
            },
          ]);

          return $`Complete all tasks in the task list. Use the finishTask tool to submit each result.`;
        },
        {
          model: 'openai:gpt-4',
          system: ['You are a helpful math assistant.'],
        }
      );

      expect(result).toBeDefined();
      expect(mockLLM.getCalls().length).toBeGreaterThan(0);
    });
  });
});
