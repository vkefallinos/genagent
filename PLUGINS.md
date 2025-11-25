# GenAgent Plugin System

The GenAgent plugin system allows you to extend the framework with reusable tools and system prompts. Plugins are modular, composable, and easy to share.

## Plugin Structure

A plugin is an object with three properties:

```typescript
interface Plugin {
  name: string;        // Unique name for the plugin
  system: string;      // System prompt describing the plugin's capabilities
  tools: PluginTool[]; // Array of tools provided by the plugin
}
```

Each tool has:
- `name`: Unique identifier for the tool
- `description`: What the tool does (shown to the AI)
- `schema`: Zod schema defining the tool's parameters
- `execute`: Function that implements the tool's logic

## Creating a Plugin

Use the helper functions to create plugins:

```typescript
import { definePlugin, tool } from 'genagent';
import { z } from 'zod';

export const myPlugin = definePlugin({
  name: 'MyPlugin',
  system: 'Description of what this plugin provides',
  tools: [
    tool(
      'tool_name',
      'What this tool does',
      z.object({
        param: z.string().describe('Parameter description'),
      }),
      async ({ param }) => {
        // Tool implementation
        return { result: 'success' };
      }
    ),
  ],
});
```

## Using Plugins

Import and pass plugins to `runPrompt`:

```typescript
import { runPrompt } from 'genagent';
import { calculatorPlugin } from './plugins/calculator.js';
import { filesystemPlugin } from './plugins/filesystem.js';

const result = await runPrompt(
  async ({ $ }) => {
    return $`Calculate 2 + 2 and save the result to a file.`;
  },
  {
    model: 'openai:gpt-4o-mini',
    plugins: [calculatorPlugin, filesystemPlugin],
    system: ['You are a helpful assistant.'],
  }
);
```

## Example Plugins

### Calculator Plugin

Provides mathematical operations:

```typescript
import { definePlugin, tool } from 'genagent';
import { z } from 'zod';

export const calculatorPlugin = definePlugin({
  name: 'Calculator',
  system: 'You have access to a calculator for mathematical operations.',
  tools: [
    tool(
      'calculate',
      'Perform a calculation',
      z.object({
        expression: z.string().describe('Math expression like "2 + 2"'),
      }),
      async ({ expression }) => {
        const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
        const result = Function(`'use strict'; return (${sanitized})`)();
        return { expression, result, success: true };
      }
    ),
  ],
});
```

### Filesystem Plugin

Provides file operations:

```typescript
import { definePlugin, tool } from 'genagent';
import { z } from 'zod';
import { readFile, writeFile } from 'fs/promises';

export const filesystemPlugin = definePlugin({
  name: 'Filesystem',
  system: 'You have access to filesystem operations.',
  tools: [
    tool(
      'read_file',
      'Read a file',
      z.object({
        path: z.string().describe('File path to read'),
      }),
      async ({ path }) => {
        const content = await readFile(path, 'utf8');
        return { path, content, success: true };
      }
    ),
    tool(
      'write_file',
      'Write a file',
      z.object({
        path: z.string().describe('File path to write'),
        content: z.string().describe('Content to write'),
      }),
      async ({ path, content }) => {
        await writeFile(path, content, 'utf8');
        return { path, success: true };
      }
    ),
  ],
});
```

## Plugin Composition

Plugins are composable - you can combine multiple plugins:

```typescript
const result = await runPrompt(
  async ({ $ }) => {
    return $`Use all available tools to complete this task.`;
  },
  {
    model: 'openai:gpt-4o-mini',
    plugins: [
      calculatorPlugin,
      filesystemPlugin,
      weatherPlugin,
      databasePlugin,
    ],
  }
);
```

## Plugin System Prompts

Each plugin's system prompt is automatically added to the agent's context. The format is:

```
# PluginName

Plugin system prompt text...
```

Plugin system prompts are added before user-provided system prompts, so you can override plugin behavior if needed.

## Best Practices

1. **Clear Descriptions**: Write clear tool descriptions - the AI uses these to decide when to use each tool
2. **Detailed Schemas**: Use Zod's `.describe()` to document each parameter
3. **Error Handling**: Return structured error objects instead of throwing
4. **Return Values**: Return JSON-serializable objects with clear success indicators
5. **Security**: Validate and sanitize inputs, especially for filesystem/network operations
6. **Single Responsibility**: Keep plugins focused on one domain (math, files, API calls, etc.)

## Type Safety

The plugin system is fully typed with TypeScript:

```typescript
import type { Plugin, PluginTool } from 'genagent';

// Your editor will provide full autocomplete and type checking
const myPlugin: Plugin = {
  name: 'MyPlugin',
  system: 'System prompt',
  tools: [
    // Fully typed tool definitions
  ],
};
```

## Running Examples

Check out the example plugins in `examples/plugins/`:

```bash
# Run the plugin demo
npm run dev examples/with-plugins.ts
```

This demonstrates:
- Using individual plugins
- Combining multiple plugins
- Custom prompt functions with plugins
- Advanced plugin usage patterns

## Creating Plugin Packages

You can publish plugins as npm packages:

```typescript
// my-genagent-plugin/index.ts
import { definePlugin, tool } from 'genagent';
import { z } from 'zod';

export const myPlugin = definePlugin({
  // ... plugin definition
});
```

Then users can install and use it:

```bash
npm install my-genagent-plugin
```

```typescript
import { myPlugin } from 'my-genagent-plugin';
import { runPrompt } from 'genagent';

await runPrompt(/* ... */, {
  plugins: [myPlugin],
});
```
