# Slack-like Chat Interface - Component Design

## Component Architecture

### 1. **ChatContainer** - Main Layout Component
**Purpose:** Root container managing the entire chat interface layout
**Responsibilities:**
- Layout management (flex-based vertical layout)
- Coordinate state between child components
- Handle keyboard shortcuts and focus management
- Manage pause/resume execution state

**Props:**
```typescript
interface ChatContainerProps {
  state: AgentState;
  onPause: () => void;
  onResume: () => void;
  onSendMessage: (message: string) => void;
  isPaused: boolean;
  isExecuting: boolean;
}
```

**Layout Structure:**
```
┌────────────────────────────────────┐
│ Header (GenAgent Title)            │
├────────────────────────────────────┤
│                                    │
│ MessageList (scrollable)           │
│                                    │
│                                    │
├────────────────────────────────────┤
│ InputBox (with pause button)       │
└────────────────────────────────────┘
```

---

### 2. **MessageList** - Scrollable Message Container
**Purpose:** Displays all main conversation messages with scroll support
**Responsibilities:**
- Render messages in chronological order
- Handle vertical scrolling
- Auto-scroll to bottom on new messages
- Show thread previews for subagent messages
- Highlight selected message

**Props:**
```typescript
interface MessageListProps {
  messages: ChatMessage[];
  selectedIndex: number;
  onSelectMessage: (index: number) => void;
  onOpenThread: (threadId: string) => void;
  streamingText?: string;
}
```

**State:**
```typescript
interface MessageListState {
  scrollOffset: number;
  visibleHeight: number;
  autoScroll: boolean;
}
```

---

### 3. **Message** - Individual Message Component
**Purpose:** Displays a single chat message (user or assistant)
**Responsibilities:**
- Show sender name and timestamp
- Display message content with formatting
- Show tool call indicators
- Display thread count if message has thread
- Highlight when selected
- Show streaming indicator for in-progress messages

**Props:**
```typescript
interface MessageProps {
  message: ChatMessage;
  isSelected: boolean;
  isStreaming: boolean;
  threadCount?: number;
  onClick: () => void;
  onThreadClick: () => void;
}
```

**Visual Structure:**
```
┌────────────────────────────────────┐
│ 👤 User              10:30 AM      │
│ Can you help me refactor this?     │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│ 🤖 GenAgent          10:30 AM      │
│ I'll help you refactor...          │
│ 🔧 Used tool: Read (3 times)       │
│ 💬 1 reply in thread               │
└────────────────────────────────────┘
```

---

### 4. **ThreadView** - Subagent Thread Display
**Purpose:** Shows subagent execution as a threaded conversation
**Responsibilities:**
- Display thread header with subagent info
- Show thread messages in chronological order
- Display tool executions within thread
- Allow closing thread to return to main view
- Scroll independently from main message list

**Props:**
```typescript
interface ThreadViewProps {
  thread: Thread;
  onClose: () => void;
  parentMessage: ChatMessage;
}

interface Thread {
  id: string;
  subagentType: string;
  subagentPrompt: string;
  messages: ChatMessage[];
  toolCalls: ToolCall[];
  status: 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
}
```

**Visual Structure:**
```
┌────────────────────────────────────┐
│ ← Back to main                     │
├────────────────────────────────────┤
│ Thread: Explore UI structure       │
│ Subagent: Explore (running...)     │
├────────────────────────────────────┤
│                                    │
│ 🤖 Explore          10:31 AM       │
│ Starting exploration...            │
│                                    │
│ 🔧 Tool: Glob                      │
│ Args: {"pattern": "**/*.tsx"}      │
│ ✓ Found 15 files                   │
│                                    │
│ 🤖 Explore          10:31 AM       │
│ Found the main UI file...          │
│                                    │
└────────────────────────────────────┘
```

---

### 5. **ThreadMessage** - Message in Thread
**Purpose:** Display individual messages within a thread
**Responsibilities:**
- Similar to Message component but simplified
- Show tool calls inline
- Less visual weight than main messages
- Compact format for thread context

**Props:**
```typescript
interface ThreadMessageProps {
  message: ChatMessage;
  isStreaming: boolean;
  toolCalls?: ToolCall[];
}
```

---

### 6. **InputBox** - Message Input Component
**Purpose:** Allow user to type and send messages
**Responsibilities:**
- Text input handling
- Show pause/resume button
- Handle Enter to send message
- Show typing indicator
- Handle multi-line input
- Show character count or validation

**Props:**
```typescript
interface InputBoxProps {
  onSendMessage: (message: string) => void;
  onPause: () => void;
  onResume: () => void;
  isPaused: boolean;
  isExecuting: boolean;
  disabled?: boolean;
}
```

**Visual Structure:**
```
┌────────────────────────────────────┐
│ ⏸️  │ Type a message...            │
│     │ Enter to send                │
└────────────────────────────────────┘

(When paused)
┌────────────────────────────────────┐
│ ▶️  │ Type a message...            │
│     │ Enter to send                │
└────────────────────────────────────┘
```

---

### 7. **PauseButton** - Execution Control Button
**Purpose:** Pause/resume agent execution
**Responsibilities:**
- Toggle pause state
- Visual feedback for paused state
- Disable when not executing
- Show tooltip/hint

**Props:**
```typescript
interface PauseButtonProps {
  isPaused: boolean;
  isExecuting: boolean;
  onToggle: () => void;
}
```

**States:**
- `⏸️` Pause (when executing)
- `▶️` Resume (when paused)
- `⏹️` Stopped (when not executing)

---

### 8. **StreamingIndicator** - Real-time Response Indicator
**Purpose:** Show streaming text from agent
**Responsibilities:**
- Display streaming text in real-time
- Show typing animation
- Integrate seamlessly with Message component
- Handle long streaming responses

**Props:**
```typescript
interface StreamingIndicatorProps {
  text: string;
  isActive: boolean;
}
```

**Visual:**
```
┌────────────────────────────────────┐
│ 🤖 GenAgent is typing...           │
│ I'll help you refactor the UI into │
│ a Slack-like chat interface...     │
│ ▋                                  │
└────────────────────────────────────┘
```

---

### 9. **ToolCallIndicator** - Tool Execution Display
**Purpose:** Show tool execution status and results
**Responsibilities:**
- Display tool name and status
- Show arguments (collapsed by default)
- Show results or errors
- Color-coded status indicators
- Expandable for details

**Props:**
```typescript
interface ToolCallIndicatorProps {
  toolCall: ToolCall;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

interface ToolCall {
  id: string;
  tool: string;
  args: any;
  result?: any;
  error?: string;
  status: 'pending' | 'running' | 'success' | 'error';
  startTime: Date;
  endTime?: Date;
}
```

**Visual:**
```
(Collapsed)
┌────────────────────────────────────┐
│ 🔧 Read ✓               200ms      │
└────────────────────────────────────┘

(Expanded)
┌────────────────────────────────────┐
│ 🔧 Read ✓               200ms      │
│ Args:                              │
│   file_path: "/home/user/ui.tsx"   │
│ Result:                            │
│   467 lines read successfully      │
└────────────────────────────────────┘
```

---

### 10. **ThreadPreview** - Thread Summary in Main Message
**Purpose:** Show thread summary inline with main message
**Responsibilities:**
- Display thread reply count
- Show last activity timestamp
- Highlight unread threads
- Click to open full thread

**Props:**
```typescript
interface ThreadPreviewProps {
  threadId: string;
  replyCount: number;
  lastActivityTime: Date;
  isUnread: boolean;
  onClick: () => void;
}
```

**Visual:**
```
┌────────────────────────────────────┐
│ 💬 3 replies  Last: 2 min ago      │
└────────────────────────────────────┘
```

---

### 11. **Header** - Chat Interface Header
**Purpose:** Display title and status information
**Responsibilities:**
- Show GenAgent branding
- Display current execution status
- Show connection/model status
- Provide access to settings/help

**Props:**
```typescript
interface HeaderProps {
  status: 'idle' | 'executing' | 'paused' | 'error';
  modelName?: string;
  agentLabel?: string;
}
```

**Visual:**
```
┌────────────────────────────────────┐
│ 🤖 GenAgent - Executing...         │
│ Model: claude-sonnet-4.5           │
└────────────────────────────────────┘
```

---

### 12. **ErrorDisplay** - Error Message Component
**Purpose:** Display errors in chat context
**Responsibilities:**
- Show error messages clearly
- Display stack traces (expandable)
- Provide retry/dismiss actions
- Color-coded for visibility

**Props:**
```typescript
interface ErrorDisplayProps {
  error: Error | string;
  onRetry?: () => void;
  onDismiss?: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}
```

---

## Data Models

### ChatMessage
```typescript
interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system' | 'subagent';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  threadId?: string;
  isStreaming?: boolean;
  metadata?: {
    model?: string;
    tokens?: number;
    duration?: number;
  };
}
```

### AgentState (Extended)
```typescript
interface AgentState {
  // Existing fields
  messages: MessageContent[];
  tools: ToolDefinition[];
  currentPrompt: string;
  response?: any;
  error?: string;
  label?: string;
  streamingText?: string;
  toolCalls: ToolCall[];
  validationAttempts?: ValidationAttempt[];

  // New fields for chat interface
  chatMessages: ChatMessage[];
  threads: Record<string, Thread>;
  activeThreadId?: string;
  isPaused: boolean;
  pendingUserMessage?: string;
  executionState: 'idle' | 'executing' | 'paused' | 'waiting_for_input';
  currentToolCallId?: string;
}
```

---

## Component Interaction Flow

### Normal Execution Flow
```
User types message in InputBox
    ↓
ChatContainer.onSendMessage()
    ↓
Message added to chatMessages[]
    ↓
Agent starts processing
    ↓
StreamingIndicator shows in MessageList
    ↓
Tool calls trigger ToolCallIndicator
    ↓
Final message displayed in MessageList
```

### Subagent Thread Flow
```
Agent calls Task tool
    ↓
New Thread created with unique ID
    ↓
Thread linked to parent ChatMessage
    ↓
ThreadPreview shown in main message
    ↓
User clicks thread preview
    ↓
ThreadView opens showing subagent execution
    ↓
Thread messages stream in real-time
    ↓
Thread completes
    ↓
User can close thread or stay viewing
```

### Pause/Inject Message Flow
```
Agent is executing
    ↓
User types message in InputBox
    ↓
User clicks Pause button
    ↓
Execution pauses after current tool call
    ↓
User sends message via InputBox
    ↓
Message injected into conversation history
    ↓
User clicks Resume button (or it auto-resumes)
    ↓
Agent continues with new message in context
```

---

## Keyboard Shortcuts

- `↑/↓` - Navigate messages
- `Enter` - Open selected message thread (if exists)
- `Esc` - Close thread view / Clear selection
- `Ctrl+P` - Pause/Resume execution
- `Ctrl+C` - Cancel execution
- `Tab` - Focus input box
- `Shift+Enter` - New line in input
- `Enter` - Send message

---

## Color Scheme (Terminal)

- **User messages**: cyan
- **Assistant messages**: blue
- **System messages**: gray/dim
- **Subagent messages**: magenta
- **Tool calls**: yellow
- **Success indicators**: green
- **Error indicators**: red
- **Thread indicators**: cyan/italic
- **Streaming text**: yellow
- **Selected message**: cyan background

---

## Implementation Notes

1. **State Management**: Use React hooks with useReducer for complex state
2. **Scrolling**: Implement virtual scrolling for large message lists
3. **Performance**: Memoize message components to avoid re-renders
4. **Accessibility**: Proper ARIA labels and keyboard navigation
5. **Responsive**: Adapt to different terminal sizes
6. **Persistence**: Save thread state to .genagent folder
7. **Real-time Updates**: Use setState callbacks for streaming
8. **Message Injection**: Queue mechanism for user messages during execution

---

## File Structure

```
src/
├── ui/
│   ├── components/
│   │   ├── ChatContainer.tsx
│   │   ├── MessageList.tsx
│   │   ├── Message.tsx
│   │   ├── ThreadView.tsx
│   │   ├── ThreadMessage.tsx
│   │   ├── InputBox.tsx
│   │   ├── PauseButton.tsx
│   │   ├── StreamingIndicator.tsx
│   │   ├── ToolCallIndicator.tsx
│   │   ├── ThreadPreview.tsx
│   │   ├── Header.tsx
│   │   └── ErrorDisplay.tsx
│   ├── hooks/
│   │   ├── useChatState.ts
│   │   ├── useThreadManagement.ts
│   │   ├── useMessageInjection.ts
│   │   └── useKeyboardShortcuts.ts
│   ├── types/
│   │   ├── chat.ts
│   │   └── thread.ts
│   └── utils/
│       ├── messageFormatter.ts
│       └── scrollManager.ts
└── ui.tsx (legacy, to be replaced)
```
