# Headless Mode

Headless mode allows you to run GenAgent without any UI, making it suitable for automated scripts, CI/CD pipelines, server-side execution, and batch processing.

## Usage

Simply add `headless: true` to your options:

```typescript
import { runChatPrompt } from 'genagent';

const result = await runChatPrompt(
  async (ctx) => {
    // Your prompt logic
    return 'Your prompt here';
  },
  {
    model: 'gpt-4o-mini',
    headless: true  // Disable chat UI
  }
);
```

## When to Use Headless Mode

### ✅ Good Use Cases

- **Automated Scripts**: Running agents in cron jobs or scheduled tasks
- **CI/CD Pipelines**: Using agents in GitHub Actions, GitLab CI, etc.
- **Server-Side**: Running agents on backend servers without terminals
- **Batch Processing**: Processing multiple tasks sequentially
- **Testing**: Running tests that don't need visual feedback
- **API Endpoints**: Using agents to handle HTTP requests

### ❌ Not Recommended For

- **Interactive Development**: You won't see real-time progress
- **Debugging**: Hard to see what's happening without UI
- **Learning**: The chat UI helps understand agent behavior
- **Complex Workflows**: Threads and tool calls are easier to follow in UI

## Examples

### Simple Headless Execution

```typescript
import { runChatPrompt } from 'genagent';
import { z } from 'zod';

(async () => {
  const result = await runChatPrompt(
    async ({ defTool, defMessage, $ }) => {
      defTool(
        'calculate',
        'Perform calculations',
        z.object({ expression: z.string() }),
        async ({ expression }) => eval(expression)
      );

      defMessage('user', 'What is 42 * 1337?');

      return $`Answer using the calculate tool.`;
    },
    {
      model: 'gpt-4o-mini',
      headless: true
    }
  );

  console.log('Result:', result);
})();
```

### Headless with defAgent (Subagents)

```typescript
import { runChatPrompt } from 'genagent';
import { z } from 'zod';

(async () => {
  const results = await runChatPrompt(
    async ({ defAgent, $ }) => {
      // Subagents work in headless mode too!
      defAgent(
        'researcher',
        'Research topics',
        z.object({ topic: z.string() }),
        async ({ topic }, ctx) => {
          return `Research: ${topic}`;
        }
      );

      return $`Use the researcher to study quantum computing.`;
    },
    {
      model: 'gpt-4o-mini',
      headless: true
    }
  );

  console.log('Research complete:', results);
})();
```

### Batch Processing with Headless Mode

```typescript
import { runChatPrompt } from 'genagent';

const topics = ['AI', 'Blockchain', 'Quantum Computing'];

for (const topic of topics) {
  const result = await runChatPrompt(
    async ({ $ }) => $`Summarize ${topic} in 2 sentences.`,
    {
      model: 'gpt-4o-mini',
      headless: true,
      label: `summary-${topic}`
    }
  );

  console.log(`${topic}:`, result);
}
```

### CI/CD Integration

```yaml
# .github/workflows/agent-task.yml
name: Run Agent Task

on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight

jobs:
  agent-task:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install genagent
      - run: node agent-task.js
```

```javascript
// agent-task.js
import { runChatPrompt } from 'genagent';

const result = await runChatPrompt(
  async ({ $ }) => $`Generate daily report.`,
  {
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    headless: true
  }
);

console.log('Daily report:', result);
```

## Technical Details

### How It Works

When `headless: true` is set:

1. **No UI Rendering**: The chat interface is not rendered
2. **Falls Back to runPrompt**: Uses the original execution engine
3. **Same API**: All features work the same (tools, subagents, etc.)
4. **Promise-Based**: Returns a promise with the result
5. **No Ink Components**: Doesn't load React/Ink overhead

### Performance

Headless mode is **slightly faster** because:
- No UI rendering overhead
- No terminal I/O operations
- Lower memory footprint
- Faster startup time

### Differences from Chat UI Mode

| Feature | Chat UI | Headless |
|---------|---------|----------|
| Visual Progress | ✅ Yes | ❌ No |
| Real-time Streaming | ✅ Visible | ✅ Works (not visible) |
| Pause/Resume | ✅ Interactive | ❌ Not available |
| Message Injection | ✅ Interactive | ❌ Not available |
| Thread View | ✅ Visible | ✅ Works (not visible) |
| Tool Execution | ✅ Visible | ✅ Works (not visible) |
| Keyboard Shortcuts | ✅ Available | ❌ Not available |
| Logging | ⚠️ UI only | ✅ Use console.log |

## Logging in Headless Mode

Since you can't see the UI, use logging:

```typescript
await runChatPrompt(
  async ({ defTool, $ }) => {
    defTool(
      'myTool',
      'Does something',
      z.object({ input: z.string() }),
      async ({ input }) => {
        console.log('Tool called with:', input);
        const result = doWork(input);
        console.log('Tool result:', result);
        return result;
      }
    );

    console.log('Starting agent execution...');
    return $`Do the task`;
  },
  {
    headless: true
  }
);

console.log('Agent finished!');
```

## Error Handling

Always wrap headless execution in try/catch:

```typescript
try {
  const result = await runChatPrompt(
    async ({ $ }) => $`Your prompt`,
    { headless: true }
  );

  console.log('Success:', result);
} catch (error) {
  console.error('Agent failed:', error);
  process.exit(1);
}
```

## Environment Variables

Useful environment variables for headless execution:

```bash
# Set model
export GEN_MODEL_DEFAULT=openai:gpt-4o-mini

# Set API keys
export OPENAI_API_KEY=sk-...

# Set custom provider
export CUSTOM_PROVIDER_API_KEY=...
export CUSTOM_PROVIDER_API_BASE=https://...
```

## Migration from Chat UI to Headless

```typescript
// Before (Chat UI)
const result = await runChatPrompt(
  async (ctx) => { /* ... */ },
  { model: 'gpt-4o-mini' }
);

// After (Headless)
const result = await runChatPrompt(
  async (ctx) => { /* ... */ },  // Same code!
  {
    model: 'gpt-4o-mini',
    headless: true  // Just add this
  }
);
```

## Best Practices

1. **Always use headless for automation**: Don't run interactive UI in cron jobs
2. **Add comprehensive logging**: You can't see what's happening
3. **Handle errors properly**: Wrap in try/catch and exit with codes
4. **Set timeouts**: Prevent hanging in automated environments
5. **Use environment variables**: Don't hardcode API keys
6. **Test with UI first**: Debug with chat UI, deploy with headless

## Examples Directory

See the `examples/` directory for complete examples:

- `examples/headless-example.ts` - Basic headless usage
- `examples/chat-with-defagent.ts` - Subagents with chat UI
- `examples/chat-ui-example.ts` - Interactive chat UI

## Troubleshooting

### Agent Hangs in Headless Mode

```typescript
// Add timeout wrapper
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Timeout')), 30000)
);

const result = await Promise.race([
  runChatPrompt(/* ... */, { headless: true }),
  timeoutPromise
]);
```

### No Output Visible

```typescript
// Add console.log throughout your code
defTool('myTool', 'desc', schema, async (args) => {
  console.log('Tool started:', args);
  const result = await doWork(args);
  console.log('Tool finished:', result);
  return result;
});
```

### Memory Leaks in Long-Running Processes

```typescript
// Run agent in isolated function
async function runAgentTask() {
  const result = await runChatPrompt(
    /* ... */,
    { headless: true }
  );
  return result;
}

// Call and let GC clean up
const result = await runAgentTask();
```

## See Also

- [README_CHAT_UI.md](./README_CHAT_UI.md) - Chat UI documentation
- [SLACK_UI_DESIGN.md](./SLACK_UI_DESIGN.md) - UI component architecture
- [examples/](./examples/) - Example scripts
