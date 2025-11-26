import { useReducer, useCallback } from 'react';
import { ChatState, ChatMessage, Thread, ExecutionAction, ToolCall } from '../types/chat';

const initialChatState: ChatState = {
  chatMessages: [],
  threads: {},
  activeThreadId: undefined,
  isPaused: false,
  pendingUserMessage: undefined,
  executionState: 'idle',
  currentToolCallId: undefined,
  streamingMessageId: undefined
};

function chatReducer(state: ChatState, action: ExecutionAction): ChatState {
  switch (action.type) {
    case 'PAUSE':
      return { ...state, isPaused: true, executionState: 'paused' };

    case 'RESUME':
      return { ...state, isPaused: false, executionState: 'executing' };

    case 'ADD_MESSAGE':
      return {
        ...state,
        chatMessages: [...state.chatMessages, action.payload]
      };

    case 'UPDATE_MESSAGE': {
      const messages = state.chatMessages.map((msg) =>
        msg.id === action.payload.id ? { ...msg, ...action.payload.updates } : msg
      );
      return { ...state, chatMessages: messages };
    }

    case 'START_STREAMING':
      return {
        ...state,
        streamingMessageId: action.payload.messageId,
        executionState: 'executing'
      };

    case 'UPDATE_STREAMING': {
      const messages = state.chatMessages.map((msg) =>
        msg.id === action.payload.messageId
          ? { ...msg, content: action.payload.content, isStreaming: true }
          : msg
      );
      return { ...state, chatMessages: messages };
    }

    case 'END_STREAMING': {
      const messages = state.chatMessages.map((msg) =>
        msg.id === action.payload.messageId ? { ...msg, isStreaming: false } : msg
      );
      return { ...state, streamingMessageId: undefined, chatMessages: messages };
    }

    case 'ADD_TOOL_CALL': {
      const messages = state.chatMessages.map((msg) =>
        msg.id === action.payload.messageId
          ? {
              ...msg,
              toolCalls: [...(msg.toolCalls || []), action.payload.toolCall]
            }
          : msg
      );
      return { ...state, chatMessages: messages, currentToolCallId: action.payload.toolCall.id };
    }

    case 'UPDATE_TOOL_CALL': {
      const messages = state.chatMessages.map((msg) => ({
        ...msg,
        toolCalls: msg.toolCalls?.map((tc) =>
          tc.id === action.payload.toolCallId ? { ...tc, ...action.payload.updates } : tc
        )
      }));
      return { ...state, chatMessages: messages };
    }

    case 'CREATE_THREAD':
      return {
        ...state,
        threads: { ...state.threads, [action.payload.id]: action.payload }
      };

    case 'UPDATE_THREAD': {
      const thread = state.threads[action.payload.threadId];
      if (!thread) return state;

      return {
        ...state,
        threads: {
          ...state.threads,
          [action.payload.threadId]: { ...thread, ...action.payload.updates }
        }
      };
    }

    case 'OPEN_THREAD':
      return { ...state, activeThreadId: action.payload.threadId };

    case 'CLOSE_THREAD':
      return { ...state, activeThreadId: undefined };

    case 'SET_EXECUTION_STATE':
      return { ...state, executionState: action.payload };

    case 'INJECT_MESSAGE':
      return { ...state, pendingUserMessage: action.payload };

    default:
      return state;
  }
}

export function useChatState() {
  const [state, dispatch] = useReducer(chatReducer, initialChatState);

  const pause = useCallback(() => {
    dispatch({ type: 'PAUSE' });
  }, []);

  const resume = useCallback(() => {
    dispatch({ type: 'RESUME' });
  }, []);

  const addMessage = useCallback((message: ChatMessage) => {
    dispatch({ type: 'ADD_MESSAGE', payload: message });
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<ChatMessage>) => {
    dispatch({ type: 'UPDATE_MESSAGE', payload: { id, updates } });
  }, []);

  const startStreaming = useCallback((messageId: string) => {
    dispatch({ type: 'START_STREAMING', payload: { messageId } });
  }, []);

  const updateStreaming = useCallback((messageId: string, content: string) => {
    dispatch({ type: 'UPDATE_STREAMING', payload: { messageId, content } });
  }, []);

  const endStreaming = useCallback((messageId: string) => {
    dispatch({ type: 'END_STREAMING', payload: { messageId } });
  }, []);

  const addToolCall = useCallback((messageId: string, toolCall: ToolCall) => {
    dispatch({ type: 'ADD_TOOL_CALL', payload: { messageId, toolCall } });
  }, []);

  const updateToolCall = useCallback((toolCallId: string, updates: Partial<ToolCall>) => {
    dispatch({ type: 'UPDATE_TOOL_CALL', payload: { toolCallId, updates } });
  }, []);

  const createThread = useCallback((thread: Thread) => {
    dispatch({ type: 'CREATE_THREAD', payload: thread });
  }, []);

  const updateThread = useCallback((threadId: string, updates: Partial<Thread>) => {
    dispatch({ type: 'UPDATE_THREAD', payload: { threadId, updates } });
  }, []);

  const openThread = useCallback((threadId: string) => {
    dispatch({ type: 'OPEN_THREAD', payload: { threadId } });
  }, []);

  const closeThread = useCallback(() => {
    dispatch({ type: 'CLOSE_THREAD' });
  }, []);

  const setExecutionState = useCallback((executionState: ChatState['executionState']) => {
    dispatch({ type: 'SET_EXECUTION_STATE', payload: executionState });
  }, []);

  const injectMessage = useCallback((message: string) => {
    dispatch({ type: 'INJECT_MESSAGE', payload: message });
  }, []);

  return {
    state,
    actions: {
      pause,
      resume,
      addMessage,
      updateMessage,
      startStreaming,
      updateStreaming,
      endStreaming,
      addToolCall,
      updateToolCall,
      createThread,
      updateThread,
      openThread,
      closeThread,
      setExecutionState,
      injectMessage
    }
  };
}
