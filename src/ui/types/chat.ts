export interface ChatMessage {
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

export interface ToolCall {
  id: string;
  tool: string;
  args: any;
  result?: any;
  error?: string;
  status: 'pending' | 'running' | 'success' | 'error';
  startTime: Date;
  endTime?: Date;
}

export interface Thread {
  id: string;
  subagentType: string;
  subagentPrompt: string;
  messages: ChatMessage[];
  toolCalls: ToolCall[];
  status: 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  parentMessageId: string;
}

export interface ChatState {
  chatMessages: ChatMessage[];
  threads: Record<string, Thread>;
  activeThreadId?: string;
  isPaused: boolean;
  pendingUserMessage?: string;
  executionState: 'idle' | 'executing' | 'paused' | 'waiting_for_input';
  currentToolCallId?: string;
  streamingMessageId?: string;
}

export type ExecutionAction =
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; updates: Partial<ChatMessage> } }
  | { type: 'START_STREAMING'; payload: { messageId: string } }
  | { type: 'UPDATE_STREAMING'; payload: { messageId: string; content: string } }
  | { type: 'END_STREAMING'; payload: { messageId: string } }
  | { type: 'ADD_TOOL_CALL'; payload: { messageId: string; toolCall: ToolCall } }
  | { type: 'UPDATE_TOOL_CALL'; payload: { toolCallId: string; updates: Partial<ToolCall> } }
  | { type: 'CREATE_THREAD'; payload: Thread }
  | { type: 'UPDATE_THREAD'; payload: { threadId: string; updates: Partial<Thread> } }
  | { type: 'OPEN_THREAD'; payload: { threadId: string } }
  | { type: 'CLOSE_THREAD' }
  | { type: 'SET_EXECUTION_STATE'; payload: ChatState['executionState'] }
  | { type: 'INJECT_MESSAGE'; payload: string };
