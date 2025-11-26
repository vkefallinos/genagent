/**
 * Simple example file for use with the genagent CLI
 *
 * Usage: genagent run ./examples/cli-simple.gen.ts
 */

import { PromptContext } from '../src/types.js';

export default async ({ defMessage, def, $ }: PromptContext) => {
  defMessage('user', 'Hello! What is 2 + 2?');
  def('OPERATION', 'basic arithmetic');

  return $`
    Please answer this simple question about $OPERATION.
    Keep your response brief.
  `;
};

export const options = {
  model: 'openai:gpt-4o-mini',
};
