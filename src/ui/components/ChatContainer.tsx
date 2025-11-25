import React, { useState, useEffect } from 'react';
import { Box, useInput, useApp } from 'ink';
import { Header } from './Header.js';
import { MessageList } from './MessageList.js';
import { ThreadView } from './ThreadView.js';
import { InputBox } from './InputBox.js';
import { ChatMessage, Thread } from '../types/chat';

interface ChatContainerProps {
  messages: ChatMessage[];
  threads: Record<string, Thread>;
  isPaused: boolean;
  isExecuting: boolean;
  executionState: 'idle' | 'executing' | 'paused' | 'waiting_for_input';
  streamingText?: string;
  streamingMessageId?: string;
  modelName?: string;
  agentLabel?: string;
  onPause: () => void;
  onResume: () => void;
  onSendMessage: (message: string) => void;
  onCancel?: () => void;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  threads,
  isPaused,
  isExecuting,
  executionState,
  streamingText,
  streamingMessageId,
  modelName,
  agentLabel,
  onPause,
  onResume,
  onSendMessage,
  onCancel
}) => {
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(0);
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>();
  const [focusedComponent, setFocusedComponent] = useState<'messages' | 'input'>('input');
  const { exit } = useApp();

  // Update selected index when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setSelectedMessageIndex(Math.min(selectedMessageIndex, messages.length - 1));
    }
  }, [messages.length]);

  // Global keyboard shortcuts
  useInput((inputChar, key) => {
    // Ctrl+C to cancel/exit
    if (key.ctrl && inputChar === 'c') {
      if (onCancel) {
        onCancel();
      } else {
        exit();
      }
      return;
    }

    // Escape to close thread
    if (key.escape && activeThreadId) {
      setActiveThreadId(undefined);
      return;
    }

    // Tab to switch focus between messages and input
    if (key.tab && !activeThreadId) {
      setFocusedComponent((prev) => (prev === 'messages' ? 'input' : 'messages'));
      return;
    }
  });

  const handleOpenThread = (threadId: string) => {
    setActiveThreadId(threadId);
  };

  const handleCloseThread = () => {
    setActiveThreadId(undefined);
  };

  const getStatus = (): 'idle' | 'executing' | 'paused' | 'error' => {
    if (isPaused) return 'paused';
    if (isExecuting) return 'executing';
    return 'idle';
  };

  const activeThread = activeThreadId ? threads[activeThreadId] : undefined;
  const parentMessage = activeThread
    ? messages.find((msg) => msg.id === activeThread.parentMessageId)
    : undefined;

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Header status={getStatus()} modelName={modelName} agentLabel={agentLabel} />

      {/* Main content area */}
      <Box flexGrow={1} flexDirection="column" minHeight={0}>
        {activeThread && parentMessage ? (
          <ThreadView
            thread={activeThread}
            parentMessage={parentMessage}
            onClose={handleCloseThread}
            streamingText={streamingText}
            streamingMessageId={streamingMessageId}
          />
        ) : (
          <MessageList
            messages={messages}
            threads={threads}
            selectedIndex={selectedMessageIndex}
            onSelectMessage={setSelectedMessageIndex}
            onOpenThread={handleOpenThread}
            streamingText={streamingText}
            streamingMessageId={streamingMessageId}
            focused={focusedComponent === 'messages'}
          />
        )}
      </Box>

      {/* Input box */}
      {!activeThreadId && (
        <InputBox
          onSendMessage={onSendMessage}
          onPause={onPause}
          onResume={onResume}
          isPaused={isPaused}
          isExecuting={isExecuting}
          focused={focusedComponent === 'input'}
        />
      )}
    </Box>
  );
};
