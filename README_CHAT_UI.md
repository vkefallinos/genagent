# Slack-like Chat UI for GenAgent

This document describes the new Slack-like chat interface for GenAgent, which provides an improved user experience with real-time message display, thread support for subagents, and interactive message injection.

## Features

### 🎨 Slack-like Interface
- **Message Bubbles**: Each message is displayed in a Slack-style bubble with sender name and timestamp
- **Tool Call Indicators**: Tool executions are shown inline with messages
- **Streaming Responses**: Real-time text streaming with typing indicators
- **Thread View**: Subagent executions appear as threaded conversations (similar to Slack threads)

### ⚡ Interactive Controls
- **Bottom Input Bar**: Type messages at any time during execution
- **Pause/Resume Button**: Control execution with a clickable button or `Ctrl+P`
- **Message Injection**: Add context or instructions while the agent is running
- **Navigation**: Use arrow keys to browse message history

### 🎯 Keyboard Shortcuts
- `Tab` - Switch focus between messages and input
- `↑/↓` - Navigate message list
- `Enter` - Open thread view (if message has thread)
- `Esc` - Close thread view / Clear selection
- `Ctrl+P` - Pause/Resume execution
- `Ctrl+C` - Cancel execution

## Usage

### Basic Example

```typescript
import { runChatPrompt } from 'genagent';
import { z } from 'zod';

const result = await runChatPrompt(
  async ({ defMessage, defTool, $ }) => {
    // Define tools
    defTool(
      'search',
      'Search for information',
      z.object({ query: z.string() }),
      async ({ query }) => {
        // Your search implementation
        return `Results for: ${query}`;
      }
    );

    // Define conversation history
    defMessage('system', 'You are a helpful assistant.');
    defMessage('user', 'Help me find information about TypeScript.');

    // Return the prompt
    return $`Please assist the user with their request.`;
  },
  {
    model: 'gpt-4o-mini',
    label: 'my-chat-agent'
  }
);
```

### Using the Component Directly

```typescript
import React from 'react';
import { render } from 'ink';
import { AgentChatCLI } from 'genagent';

const { unmount } = render(
  <AgentChatCLI
    promptFn={async (ctx) => {
      // Your prompt logic
      return 'Your prompt here';
    }}
    model="gpt-4o-mini"
    label="my-agent"
    onComplete={(result) => {
      console.log('Done:', result);
      unmount();
    }}
    onError={(error) => {
      console.error('Error:', error);
      unmount();
    }}
  />
);
```

## Component Architecture

The chat UI is built with modular React components:

### Core Components

1. **ChatContainer** - Main layout orchestrator
2. **Header** - Shows status and model info
3. **MessageList** - Scrollable message display
4. **Message** - Individual message bubble
5. **InputBox** - Bottom input with pause button
6. **ThreadView** - Subagent execution display
7. **StreamingIndicator** - Real-time typing display
8. **ToolCallIndicator** - Tool execution status

### State Management

The UI uses React hooks with a reducer pattern:

- `useChatState` - Manages chat messages, threads, and execution state
- `useKeyboardShortcuts` - Centralized keyboard handling

### Data Flow

```
User Input → ChatContainer → AgentChatCLI
                                ↓
                        Execute Agent Logic
                                ↓
                        Update Chat State
                                ↓
                        Render Messages/Tools
```

## Thread Support for Subagents

When your agent uses subagents (via Task tool or defAgent), their execution appears as a thread:

```
Main Message: "I'll explore the codebase for you"
  └── Thread: "Explore UI structure"
      ├── Subagent message 1
      ├── Tool: Glob **/*.tsx
      ├── Subagent message 2
      └── Tool: Read src/ui.tsx
```

Click on a message with a thread to view the full subagent conversation.

## Pause and Message Injection

### Pausing Execution

```typescript
// Execution is running...
// User presses Ctrl+P or clicks pause button
// → Execution pauses after current tool call
// → User can type a message
// → User presses Enter to inject message
// → User clicks resume or presses Ctrl+P again
// → Agent continues with new message in context
```

### Programmatic Control

```typescript
// In the future, you'll be able to access execution control:
const control = getExecutionControl();
control.pause();
control.injectMessage('Please focus on security aspects');
control.resume();
```

## Styling and Colors

The UI uses terminal colors for clarity:

- **Cyan**: Selected items, user messages
- **Blue**: Assistant messages, unselected items
- **Magenta**: Subagent messages, threads
- **Yellow**: Streaming text, running tools
- **Green**: Successful tool results
- **Red**: Errors
- **Gray**: Dimmed/secondary content

## Differences from Original UI

### Old UI (`runPrompt`)
- List-based message display
- Modal for message details
- Limited interactivity
- No message injection

### New Chat UI (`runChatPrompt`)
- Slack-like message bubbles
- Inline tool displays
- Thread view for subagents
- Bottom input for messages
- Pause/resume execution
- Real-time message injection

## Migration Guide

To migrate from the old UI to the chat UI:

### Before (Old UI)
```typescript
import { runPrompt } from 'genagent';

const result = await runPrompt(
  async (ctx) => { /* ... */ },
  { model: 'gpt-4o-mini' }
);
```

### After (Chat UI)
```typescript
import { runChatPrompt } from 'genagent';

const result = await runChatPrompt(
  async (ctx) => { /* ... */ },
  { model: 'gpt-4o-mini' }
);
```

The API is identical! The only change is the function name.

## Future Enhancements

Planned features for the chat UI:

- [ ] Thread persistence across sessions
- [ ] Message editing and deletion
- [ ] Export chat history
- [ ] Custom themes/color schemes
- [ ] Message search and filtering
- [ ] Reaction/feedback on messages
- [ ] Side-by-side thread view
- [ ] Keyboard macro recording

## Component Documentation

For detailed component documentation, see [SLACK_UI_DESIGN.md](./SLACK_UI_DESIGN.md)

## Troubleshooting

### UI Not Rendering Correctly

Ensure your terminal supports:
- Unicode characters (for icons)
- 256 colors
- Cursor positioning

### Keyboard Shortcuts Not Working

Make sure:
- Your terminal captures keyboard input correctly
- No conflicting shell keybindings
- Ink is receiving focus

### Messages Not Updating

Check that:
- State updates are being called
- React hooks are not stale
- No errors in console

## Credits

Built with:
- [Ink](https://github.com/vadimdemedes/ink) - React for CLIs
- [ink-text-input](https://github.com/vadimdemedes/ink-text-input) - Text input component
- [AI SDK](https://sdk.vercel.ai) - AI model integration
- React - Component framework
