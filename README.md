# GenAgent 🤖

A powerful TypeScript library for creating AI agents with beautiful terminal UIs. Built on top of [AI SDK](https://ai-sdk.dev/) and [Ink](https://github.com/vadimdemedes/ink).

## Features

✨ **Simple API** - Clean, intuitive interface for defining agents
🛠️ **Tool Support** - Easy tool definition with Zod schemas
📊 **Structured Responses** - Type-safe responses with Zod validation
🎨 **Beautiful UI** - Real-time terminal interface powered by Ink
🔄 **Conversation Management** - Built-in message history handling
🎯 **Type-Safe** - Full TypeScript support with excellent inference

## Installation

```bash
npm install genagent ai zod
```

You'll also need to install your AI provider of choice:

```bash
# For OpenAI
npm install openai

# For Anthropic
npm install @anthropic-ai/sdk

# For other providers, check AI SDK documentation
```

## Quick Start

```typescript
import { runPrompt } from 'genagent';
import { z } from 'zod';

// Simple prompt
const result = await runPrompt(
  async ({ $ }) => {
    return $`What is the capital of France?`;
  },
  {
    model: 'openai:gpt-4o-mini',
    system: ['You are a helpful assistant.'],
  }
);

console.log(result); // "Paris"
```

## API Reference

### `runPrompt(promptFn, options)`

The main function to create and run an AI agent.

#### Parameters

**`promptFn: (ctx: PromptContext) => string | Promise<string>`**

A function that receives a context object and returns the prompt string. The context provides:

- **`def(name, content)`** - Define a message in the conversation
  - `name`: Role name ('user', 'assistant', 'system')
  - `content`: Message content

- **`defTool(name, description, schema, fn)`** - Define a tool the agent can use
  - `name`: Tool name
  - `description`: What the tool does
  - `schema`: Zod schema for tool parameters
  - `fn`: Async function to execute the tool

- **`$(strings, ...values)`** - Template literal tag for building prompts
  - Allows string interpolation in prompts

**`options: RunPromptOptions`**

Configuration object:

- **`model: string`** (required) - Model in format `provider:modelId`
  - Example: `'openai:gpt-4o-mini'`, `'anthropic:claude-3-5-sonnet'`

- **`system?: string[]`** - Array of system prompts

- **`responseSchema?: ZodSchema`** - Optional Zod schema to validate and parse response

#### Returns

`Promise<T>` - Returns the agent's response. If `responseSchema` is provided, returns typed data matching the schema. Otherwise returns a string.

## Examples

### Basic Conversation

```typescript
const result = await runPrompt(
  async ({ def, $ }) => {
    def('user', 'My name is Alice');
    def('assistant', 'Nice to meet you, Alice!');

    return $`What is my name?`;
  },
  {
    model: 'openai:gpt-4o-mini',
    system: ['You are a helpful assistant with good memory.'],
  }
);
```

### Using Tools

```typescript
const result = await runPrompt(
  async ({ defTool, $ }) => {
    // Define a calculation tool
    defTool(
      'calculate',
      'Perform mathematical calculations',
      z.object({
        expression: z.string().describe('Math expression to evaluate'),
      }),
      async ({ expression }) => {
        return eval(expression); // Use a proper math library in production!
      }
    );

    // Define a weather tool
    defTool(
      'getWeather',
      'Get current weather',
      z.object({
        location: z.string(),
      }),
      async ({ location }) => {
        // Call weather API
        return { temp: 72, condition: 'sunny' };
      }
    );

    return $`What is 10 * 5 + 3? Also, what's the weather in NYC?`;
  },
  {
    model: 'openai:gpt-4o-mini',
    system: ['You are a helpful assistant. Use tools when appropriate.'],
  }
);
```

### Structured Responses

```typescript
const responseSchema = z.object({
  summary: z.string(),
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  keywords: z.array(z.string()),
});

const result = await runPrompt(
  async ({ $ }) => {
    return $`Analyze this text: "I love TypeScript! It makes coding so much better."

    Return JSON with: summary, sentiment, and keywords`;
  },
  {
    model: 'openai:gpt-4o-mini',
    responseSchema,
    system: ['You are a text analysis expert. Always return valid JSON.'],
  }
);

// result is fully typed!
console.log(result.sentiment); // 'positive'
console.log(result.keywords);  // string[]
```

### Template Literals with Variables

```typescript
const userName = 'Alice';
const userAge = 30;

const result = await runPrompt(
  async ({ $ }) => {
    return $`Hello! My name is ${userName} and I am ${userAge} years old.
             What year was I born?`;
  },
  {
    model: 'openai:gpt-4o-mini',
  }
);
```

### Complete Example: Task Planner Agent

```typescript
import { runPrompt } from 'genagent';
import { z } from 'zod';

const taskSchema = z.object({
  title: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  estimatedTime: z.number().describe('Estimated time in minutes'),
  subtasks: z.array(z.string()),
});

const responseSchema = z.object({
  tasks: z.array(taskSchema),
  totalEstimatedTime: z.number(),
});

async function planProject(projectDescription: string) {
  return await runPrompt(
    async ({ def, defTool, $ }) => {
      // Add conversation context
      def('system', 'You are an expert project planner.');

      // Define tool to check calendar
      defTool(
        'checkAvailability',
        'Check if a time slot is available',
        z.object({
          date: z.string(),
          duration: z.number(),
        }),
        async ({ date, duration }) => {
          // Check calendar API
          return { available: true };
        }
      );

      return $`Break down this project into tasks: ${projectDescription}

              Return a JSON with tasks array and totalEstimatedTime.`;
    },
    {
      model: 'openai:gpt-4',
      responseSchema,
      system: [
        'Break down projects into actionable tasks.',
        'Be realistic with time estimates.',
        'Consider dependencies between tasks.',
      ],
    }
  );
}

// Use it
const plan = await planProject('Build a todo app with React');
console.log(`Total time: ${plan.totalEstimatedTime} minutes`);
plan.tasks.forEach(task => {
  console.log(`- ${task.title} (${task.priority})`);
});
```

## Terminal UI

GenAgent automatically displays a beautiful terminal UI showing:

- 📝 Current prompt
- 💬 Conversation messages
- 🔧 Available tools
- ⚡ Tool executions in real-time
- ✅ Final response
- ❌ Errors (if any)

The UI updates in real-time as your agent processes the request.

## Model Providers

GenAgent supports all AI SDK providers:

```typescript
// OpenAI
model: 'openai:gpt-4o-mini'
model: 'openai:gpt-4'

// Anthropic
model: 'anthropic:claude-3-5-sonnet-20241022'

// Google
model: 'google:gemini-1.5-pro'

// And many more...
```

Make sure to install the corresponding provider package and set up your API keys:

```bash
export OPENAI_API_KEY=your_key_here
export ANTHROPIC_API_KEY=your_key_here
```

### OpenAI-Compatible Providers

GenAgent supports custom OpenAI-compatible API providers like OpenRouter, Z.AI, and others. Configure them using environment variables:

**1. Create a `.env` file in your project root:**

```bash
# OpenRouter
OPENROUTER_API_BASE=https://openrouter.ai/api/v1/
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_API_TYPE=openai

# Z.AI
ZAI_API_KEY=c1f7190...
ZAI_API_BASE=https://api.z.ai/api/coding/paas/v4
ZAI_API_TYPE=openai
```

**2. Use them in your code:**

```typescript
// OpenRouter
const result = await runPrompt(
  async ({ $ }) => $`Your prompt`,
  {
    model: 'openrouter:anthropic/claude-3.5-sonnet',
    system: ['You are a helpful assistant.'],
  }
);

// Z.AI
const result = await runPrompt(
  async ({ $ }) => $`Your prompt`,
  {
    model: 'zai:your-model-id',
    system: ['You are a helpful assistant.'],
  }
);
```

**Adding new custom providers:**

Follow the pattern `{PROVIDER_NAME}_API_KEY`, `{PROVIDER_NAME}_API_BASE`, and `{PROVIDER_NAME}_API_TYPE=openai`, where `PROVIDER_NAME` is the uppercase version of the provider identifier you'll use in your code.

For example, to add a provider called "myapi":

```bash
# .env
MYAPI_API_KEY=your-key
MYAPI_API_BASE=https://api.myapi.com/v1
MYAPI_API_TYPE=openai
```

```typescript
// Use in code
model: 'myapi:model-name'
```

## TypeScript Support

GenAgent is written in TypeScript and provides excellent type inference:

```typescript
// Response type is inferred from schema
const schema = z.object({
  name: z.string(),
  age: z.number(),
});

const result = await runPrompt(
  async ({ $ }) => $`...`,
  { model: 'openai:gpt-4', responseSchema: schema }
);

// TypeScript knows result.name is string and result.age is number!
result.name.toUpperCase(); // ✅
result.age.toFixed(2);     // ✅
```

## Error Handling

```typescript
try {
  const result = await runPrompt(
    async ({ $ }) => $`Your prompt`,
    { model: 'openai:gpt-4' }
  );
} catch (error) {
  console.error('Agent failed:', error);
}
```

Errors are also displayed in the terminal UI with details.

## Best Practices

1. **Use descriptive tool names and descriptions** - Helps the AI understand when to use them
2. **Validate tool parameters with Zod** - Ensures type safety and clear parameter documentation
3. **Provide good system prompts** - Guides the agent's behavior
4. **Use responseSchema for structured data** - Gets type-safe, validated responses
5. **Keep prompts focused** - Better results with clear, specific prompts

## Examples Directory

Check out the `examples/` directory for more:

- `examples/quickstart.ts` - Simple weather agent
- `examples/basic.ts` - Comprehensive examples of all features

Run examples:

```bash
npm run build
node dist/examples/quickstart.js
```

## Contributing

Contributions welcome! Please open an issue or PR.

## License

MIT

## Credits

Built with:
- [AI SDK](https://ai-sdk.dev/) - Universal AI SDK
- [Ink](https://github.com/vadimdemedes/ink) - React for CLIs
- [Zod](https://zod.dev/) - TypeScript-first schema validation
