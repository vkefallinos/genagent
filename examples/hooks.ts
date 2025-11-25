import { runPrompt } from '../src/index.js';
import { z } from 'zod';

/**
 * Example showing how to use message history hooks
 */
async function basicHookExample() {
  console.log('=== Basic Hook Example ===\n');

  const result = await runPrompt(
    async ({ defMessage, defHook, $ }) => {
      // Add some conversation history
      defMessage('user', 'My favorite color is blue');
      defMessage('assistant', 'I see, blue is a great color!');
      defMessage('user', 'I also like programming');

      // Define a hook that adds a system message at the beginning
      defHook((messages) => {
        console.log('Hook called with', messages.length, 'messages');
        return [
          { name: 'system', content: 'Always be enthusiastic in your responses!' },
          ...messages,
        ];
      });

      return $`What do you know about me?`;
    },
    {
      model: 'openai:gpt-4o-mini',
      system: ['You are a helpful assistant.'],
    }
  );

  console.log('\nFinal result:', result);
}

/**
 * Example showing a hook that filters messages
 */
async function filterHookExample() {
  console.log('\n\n=== Filter Hook Example ===\n');

  const result = await runPrompt(
    async ({ defMessage, defHook, $ }) => {
      // Add conversation history
      defMessage('user', 'My name is Alice');
      defMessage('assistant', 'Nice to meet you, Alice!');
      defMessage('user', 'I work as a developer');
      defMessage('assistant', 'That sounds interesting!');
      defMessage('user', 'I also like cats');

      // Hook that keeps only messages mentioning "name" or "cats"
      defHook((messages) => {
        console.log('Filtering messages...');
        return messages.filter(
          (msg) =>
            msg.content.toLowerCase().includes('name') ||
            msg.content.toLowerCase().includes('cats')
        );
      });

      return $`What do you remember about me?`;
    },
    {
      model: 'openai:gpt-4o-mini',
      system: ['You are a helpful assistant with selective memory.'],
    }
  );

  console.log('\nFinal result:', result);
}

/**
 * Example showing multiple hooks chained together
 */
async function multipleHooksExample() {
  console.log('\n\n=== Multiple Hooks Example ===\n');

  const result = await runPrompt(
    async ({ defMessage, defHook, $ }) => {
      defMessage('user', 'Hello there!');
      defMessage('assistant', 'Hi! How can I help?');
      defMessage('user', 'Tell me about TypeScript');

      // First hook: Add metadata
      defHook((messages) => {
        console.log('Hook 1: Adding metadata');
        return messages.map((msg) => ({
          ...msg,
          content: `[${msg.name}] ${msg.content}`,
        }));
      });

      // Second hook: Add summary message
      defHook((messages) => {
        console.log('Hook 2: Adding summary');
        return [
          ...messages,
          {
            name: 'system',
            content: `Summary: Conversation has ${messages.length} messages.`,
          },
        ];
      });

      return $`Continue our conversation about TypeScript`;
    },
    {
      model: 'openai:gpt-4o-mini',
      system: ['You are a programming tutor.'],
    }
  );

  console.log('\nFinal result:', result);
}

/**
 * Example showing a hook that returns undefined (no changes)
 */
async function noOpHookExample() {
  console.log('\n\n=== No-Op Hook Example ===\n');

  const result = await runPrompt(
    async ({ defMessage, defHook, $ }) => {
      defMessage('user', 'What is 2 + 2?');

      // Hook that doesn't modify anything
      defHook((messages) => {
        console.log('Hook inspecting messages but not modifying');
        console.log('Message count:', messages.length);
        // Return undefined to keep messages as-is
        return undefined;
      });

      return $`Please answer my question`;
    },
    {
      model: 'openai:gpt-4o-mini',
      system: ['You are a math tutor.'],
    }
  );

  console.log('\nFinal result:', result);
}

/**
 * Example with hooks in a plugin
 */
async function pluginHookExample() {
  console.log('\n\n=== Plugin Hook Example ===\n');

  const loggingPlugin = {
    name: 'MessageLogger',
    system: 'This plugin logs all messages',
    tools: [],
    hooks: [
      (messages) => {
        console.log('Plugin hook: Logging message count:', messages.length);
        // Add a timestamp to each message
        return messages.map((msg) => ({
          ...msg,
          content: `[${new Date().toISOString()}] ${msg.content}`,
        }));
      },
    ],
  };

  const result = await runPrompt(
    async ({ defMessage, $ }) => {
      defMessage('user', 'Hello!');
      defMessage('assistant', 'Hi there!');

      return $`Tell me a short joke`;
    },
    {
      model: 'openai:gpt-4o-mini',
      system: ['You are a comedian.'],
      plugins: [loggingPlugin],
    }
  );

  console.log('\nFinal result:', result);
}

// Run examples
async function main() {
  try {
    await basicHookExample();
    await filterHookExample();
    await multipleHooksExample();
    await noOpHookExample();
    await pluginHookExample();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
