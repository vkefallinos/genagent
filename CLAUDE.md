# GenAgent - AI Agent Library with Terminal UI

## Overview

GenAgent is a powerful TypeScript library for creating AI agents with beautiful terminal UIs. Built on top of the AI SDK and Ink, it provides a simple yet feature-rich framework for building AI-powered applications with real-time terminal interfaces.

## Architecture

The codebase follows a modular architecture with clear separation of concerns:

### Core Components

- **`index.ts`** - Main entry point exporting `runPrompt` function and utilities
- **`types.ts`** - TypeScript type definitions for entire system
- **`agent-executor.ts`** - Core agent execution logic with model loading and tool conversion
- **`ui.tsx`** - React component providing terminal UI using Ink
- **`context.ts`** - Prompt context creation and management system

### Plugin System

- **`plugins/`** - Modular plugin architecture
  - `types.ts` - Plugin interface definitions
  - `loader.ts` - Plugin loading and registration
  - `index.ts` - Plugin system exports

### Utility Modules

- **`schema-utils.ts`** - Zod schema validation and JSON conversion
- **`providers.ts`** - AI model provider configuration and custom provider support
- **`workspace.ts`** - File system operations utilities
- **`host.ts`** - Terminal/user interaction utilities
- **`task-list.ts`** - Sequential task execution with validation

## Key Features

### 1. Simple API
The main `runPrompt` function provides an intuitive interface:

```typescript
const result = await runPrompt(
  async ({ defMessage, def, defTool, $ }) => {
    defMessage('user', 'My name is Alice');
    def('PROJECT', 'GenAgent');
    defTool('calculate', 'Math operations', schema, handler);
    return $`Analyze this project: $PROJECT`;
  },
  {
    model: 'openai:gpt-4o-mini',
    system: ['You are a helpful assistant.'],
    responseSchema: schema
  }
);
```

### 2. Context Helpers
The prompt context provides several helper functions:

- **`defMessage(name, content)`** - Define conversation messages
- **`def(variableName, content)`** - Define variables for prompt interpolation
- **`defTool(name, description, schema, fn)`** - Register tools
- **`defAgent(name, description, schema, fn, options)`** - Register nested agents
- **`defHook(hook)`** - Register message history transformation hooks
- **`defTaskList(tasks)`** - Define sequential tasks with validation
- **`$(template, ...values)`** - Template literal for prompt building

### 3. Plugin System
Composable plugin architecture for reusable functionality:

```typescript
const plugin = definePlugin({
  name: 'Calculator',
  system: 'You have access to mathematical operations.',
  tools: [
    tool('calculate', 'Perform math', schema, handler),
    // ... more tools
  ]
});
```

### 4. Terminal UI
Real-time terminal interface showing:
- Current prompt and conversation history
- Available tools and their executions
- Streaming responses as they arrive
- Schema validation retries with detailed error feedback
- Final structured responses

### 5. Schema Validation
Automatic response validation with retry logic:
- Converts Zod schemas to JSON schema instructions
- Validates LLM responses against schemas
- Provides detailed error feedback for failed validations
- Retries up to 3 times with error correction

### 6. Task List System
Sequential task execution with validation using `defTaskList`:

```typescript
await runPrompt(
  async ({ defTaskList, $ }) => {
    defTaskList([
      {
        task: 'Calculate 5 + 3',
        validation: (result) => {
          if (result !== '8') return 'Incorrect. Please recalculate.';
        }
      },
      {
        task: 'Multiply previous result by 2',
        validation: (result) => {
          if (result !== '16') return 'Incorrect. The answer should be 16.';
        }
      }
    ]);

    return $`Complete all tasks using the finishTask tool.`;
  },
  { model: 'openai:gpt-4' }
);
```

**How `defTaskList` works:**
- **Sequential Execution**: Tasks must be completed in order
- **Built-in Validation**: Each task has a validation function that checks the result
- **Automatic Tool Registration**: Provides a `finishTask` tool for submitting results
- **Context Management**: Shows completed tasks, current task, and upcoming tasks
- **Retry Logic**: If validation fails, provides feedback and allows correction
- **Message History Hooks**: Automatically manages conversation context for task progression

**Key Features:**
- Tasks are defined with a prompt/description and validation function
- Validation function returns error feedback if result is incorrect, or undefined/void if valid
- System automatically tracks progress and provides context to the LLM
- Failed validations are retried with specific error feedback
- Completed tasks are summarized for context in subsequent tasks

### 7. Host Interactions
Terminal/user interaction utilities:
- `input(prompt)` - Prompt for text input
- `select(prompt, options)` - Single selection menu
- `multiSelect(prompt, options)` - Multiple selection menu
- `confirm(prompt)` - Yes/no confirmation
- `fetch(url)` - HTTP requests
- `exec(command)` - Shell command execution

## Model Resolution

The system supports both direct model specifications and environment variable aliases:

```typescript
// Direct specification
model: 'openai:gpt-4o-mini'

// Alias via environment variable
// GEN_MODEL_LARGE=openai:gpt-4
model: 'large'
```

## Custom Provider Configuration

Custom OpenAI-compatible providers are configured via environment variables:

```bash
# OpenRouter
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_API_BASE=https://openrouter.ai/api/v1/
OPENROUTER_API_TYPE=openai

# Usage
model: 'openrouter:anthropic/claude-3.5-sonnet'
```

## Agent Composition

The `defAgent` function enables nested agent calls:
- Agents can be defined as tools
- Each agent runs with its own context and options
- Supports recursive agent structures
- Results flow back through the call chain

## Message History Hooks

Transform messages before sending to LLM:
- Modify, filter, or augment conversation history
- Used by task list system for context management
- Can be provided by plugins for custom message processing

## State Management

The React component manages agent state:
- Real-time UI updates as operations progress
- State persistence to `.genagent/` directory
- Tool execution tracking with results and errors
- Validation attempt history

## File Operations

Workspace utilities provide common file operations:
- `readText`, `writeText` - Text file I/O
- `readJSON`, `writeJSON` - JSON file handling
- `findFiles`, `grep` - File searching
- `removeFile` - File deletion

## Development Workflow

1. **Build**: `npm run build` - Compiles TypeScript to `dist/`
2. **Development**: `npm run dev` - Watches and recompiles
3. **Examples**: `npm run dev examples/basic.ts` - Run specific examples

## Examples Directory

Comprehensive examples demonstrating all features:
- `basic.ts` - Simple prompts and conversations
- `schema-validation.ts` - Automatic validation and retry logic
- `with-plugins.ts` - Plugin system usage
- `task-list.ts` - Sequential task execution
- `hooks.ts` - Message history transformation
- `model-alias.ts` - Environment variable model aliases
- `plugins/` - Example plugin implementations

## Type Safety

Full TypeScript support throughout:
- Zod schemas for tool parameter validation
- Generic type inference for response schemas
- Plugin interface type checking
- Complete autocomplete in IDEs

## Security Considerations

The framework provides security guidance:
- Input validation for tool parameters
- Sanitization examples for mathematical operations
- File system access warnings
- Plugin security best practices

## Configuration Files

- **`tsconfig.json`** - TypeScript configuration with ES modules
- **`package.json`** - Dependencies and build scripts
- **`.env`** - Environment variables for API keys and custom providers

This architecture enables rapid development of AI agents with rich terminal interfaces, composable functionality through plugins, and robust error handling - all while maintaining type safety and providing an excellent developer experience.