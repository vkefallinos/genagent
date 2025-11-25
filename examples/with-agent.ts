import { runPrompt } from '../src/index.js';
import { z } from 'zod';

/**
 * Example demonstrating how to use defAgent to create sub-agents that can be called as tools.
 * This shows a main agent that has access to a specialized research agent.
 */

// Main agent that can call a research agent
const result = await runPrompt(
  async (ctx) => {
    // Define a research agent that specializes in gathering information
    ctx.defAgent(
      'research_agent',
      'A specialized agent that researches topics and provides detailed information',
      z.object({
        topic: z.string().describe('The topic to research'),
        focus: z.string().describe('Specific aspect to focus on'),
      }),
      async (args, agentCtx) => {
        // The agent context provides access to all the same tools
        // and the args contain the input parameters
        return agentCtx.$`You are a research specialist.

Research the following topic: ${args.topic}
Focus specifically on: ${args.focus}

Provide a concise, factual summary of your findings.`;
      },
      {
        model: 'gpt-4o-mini',
        system: ['You are a helpful research assistant with expertise in gathering and summarizing information.'],
      }
    );

    // Define a code analysis agent
    ctx.defAgent(
      'code_analyzer',
      'Analyzes code and provides insights about its structure and quality',
      z.object({
        code: z.string().describe('The code to analyze'),
        language: z.string().describe('Programming language'),
      }),
      async (args, agentCtx) => {
        return agentCtx.$`You are a code analysis expert.

Analyze the following ${args.language} code:

\`\`\`${args.language}
${args.code}
\`\`\`

Provide insights about:
1. Code quality
2. Potential issues
3. Suggestions for improvement`;
      },
      {
        model: 'gpt-4o-mini',
        responseSchema: z.object({
          quality_score: z.number().min(0).max(10),
          issues: z.array(z.string()),
          suggestions: z.array(z.string()),
        }),
      }
    );

    return ctx.$`You are a helpful assistant with access to specialized agents.

The user wants to know about the history of artificial intelligence and also needs help
analyzing some Python code.

Use your research_agent to learn about AI history, focusing on neural networks.
Then use your code_analyzer to analyze this Python function:

\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)
\`\`\`

Combine the insights from both agents to provide a comprehensive response.`;
  },
  {
    model: 'gpt-4o-mini',
  }
);

console.log('\n=== Result ===');
console.log(result);
