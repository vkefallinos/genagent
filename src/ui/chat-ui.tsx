import React, { useEffect, useState } from 'react';
import { render } from 'ink';
import { ChatContainer } from './components.js';
import { useChatState } from './hooks/useChatState.js';
import { ChatMessage, Thread, ToolCall } from './types/chat.js';
import { AgentState } from '../types';

interface ChatUIProps {
  state: AgentState;
  modelName?: string;
  agentLabel?: string;
  onStateUpdate: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onSendMessage?: (message: string) => void;
}

const ChatUI: React.FC<ChatUIProps> = ({
  state,
  modelName,
  agentLabel,
  onStateUpdate,
  onPause,
  onResume,
  onSendMessage
}) => {
  const { state: chatState, actions } = useChatState();
  const [lastMessageCount, setLastMessageCount] = useState(0);

  // Convert AgentState messages to ChatMessages
  useEffect(() => {
    // Only add new messages
    if (state.messages.length > lastMessageCount) {
      const newMessages = state.messages.slice(lastMessageCount);

      newMessages.forEach((msg) => {
        const chatMessage: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random()}`,
          sender: msg.name === 'user' ? 'user' : 'assistant',
          content: msg.content,
          timestamp: new Date(),
          toolCalls: [],
          isStreaming: false
        };
        actions.addMessage(chatMessage);
      });

      setLastMessageCount(state.messages.length);
    }
  }, [state.messages, lastMessageCount, actions]);

  // Handle streaming text
  useEffect(() => {
    if (state.streamingText && chatState.streamingMessageId) {
      actions.updateStreaming(chatState.streamingMessageId, state.streamingText);
    } else if (state.streamingText && chatState.chatMessages.length > 0) {
      // Start streaming on last message
      const lastMessage = chatState.chatMessages[chatState.chatMessages.length - 1];
      actions.startStreaming(lastMessage.id);
      actions.updateStreaming(lastMessage.id, state.streamingText);
    }
  }, [state.streamingText, chatState.streamingMessageId, chatState.chatMessages, actions]);

  // Handle tool calls
  useEffect(() => {
    if (state.toolCalls && state.toolCalls.length > 0 && chatState.chatMessages.length > 0) {
      const lastMessage = chatState.chatMessages[chatState.chatMessages.length - 1];
      const lastToolCall = state.toolCalls[state.toolCalls.length - 1];

      // Convert to ChatMessage ToolCall format
      const toolCall: ToolCall = {
        id: `tool-${Date.now()}-${Math.random()}`,
        tool: lastToolCall.tool,
        args: lastToolCall.args,
        result: lastToolCall.result,
        error: lastToolCall.error,
        status: lastToolCall.error ? 'error' : lastToolCall.result ? 'success' : 'running',
        startTime: new Date(),
        endTime: lastToolCall.result || lastToolCall.error ? new Date() : undefined
      };

      // Check if this tool call already exists
      const existingToolCalls = lastMessage.toolCalls || [];
      const alreadyExists = existingToolCalls.some(
        (tc) => tc.tool === toolCall.tool && JSON.stringify(tc.args) === JSON.stringify(toolCall.args)
      );

      if (!alreadyExists) {
        actions.addToolCall(lastMessage.id, toolCall);
      }
    }
  }, [state.toolCalls, chatState.chatMessages, actions]);

  const handlePause = () => {
    actions.pause();
    if (onPause) onPause();
  };

  const handleResume = () => {
    actions.resume();
    if (onResume) onResume();
  };

  const handleSendMessage = (message: string) => {
    // Add user message to chat
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      sender: 'user',
      content: message,
      timestamp: new Date(),
      isStreaming: false
    };
    actions.addMessage(userMessage);

    // Inject message into execution
    actions.injectMessage(message);
    if (onSendMessage) onSendMessage(message);
  };

  return (
    <ChatContainer
      messages={chatState.chatMessages}
      threads={chatState.threads}
      isPaused={chatState.isPaused}
      isExecuting={state.executionState === 'executing'}
      executionState={chatState.executionState}
      streamingText={state.streamingText}
      streamingMessageId={chatState.streamingMessageId}
      modelName={modelName}
      agentLabel={agentLabel}
      onPause={handlePause}
      onResume={handleResume}
      onSendMessage={handleSendMessage}
    />
  );
};

export function renderChatUI(props: ChatUIProps) {
  const { unmount } = render(<ChatUI {...props} />);
  return { unmount };
}
