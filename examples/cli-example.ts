/**
 * Example file for use with the genagent CLI
 *
 * Usage: genagent run ./examples/cli-example.ts
 */

import { PromptContext } from '../src/types.js';
import { z } from 'zod';

export default async ({ defMessage, def, defTool, $ }: PromptContext) => {
  defMessage('user', 'What is the capital of France?');

  defTool(
    'answer_question',
    'Provide an answer to a question',
    z.object({
      answer: z.string().describe('The answer to the question'),
      confidence: z.number().min(0).max(1).describe('Confidence level 0-1'),
    }),
    async ({ answer, confidence }) => {
      return `Answer: ${answer} (Confidence: ${(confidence * 100).toFixed(0)}%)`;
    }
  );

  return $`Answer the question using the available tool. Be concise.`;
};

export const options = {
  model: 'openai:gpt-4o-mini',
  system: ['You are a helpful geography assistant.'],
};
