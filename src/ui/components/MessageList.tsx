import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { ChatMessage, Thread } from '../types/chat';
import { Message } from './Message.js';
import { StreamingIndicator } from './StreamingIndicator.js';

interface MessageListProps {
  messages: ChatMessage[];
  threads: Record<string, Thread>;
  selectedIndex: number;
  onSelectMessage: (index: number) => void;
  onOpenThread?: (threadId: string) => void;
  streamingText?: string;
  streamingMessageId?: string;
  focused?: boolean;
  maxHeight?: number;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  threads,
  selectedIndex,
  onSelectMessage,
  onOpenThread,
  streamingText,
  streamingMessageId,
  focused = true,
  maxHeight = 20
}) => {
  const [scrollOffset, setScrollOffset] = useState(0);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const visibleMessages = messages.length - scrollOffset;
    if (visibleMessages < maxHeight) {
      setScrollOffset(Math.max(0, messages.length - maxHeight));
    }
  }, [messages.length, maxHeight, scrollOffset]);

  useInput((inputChar, key) => {
    if (!focused) return;

    if (key.upArrow) {
      const newIndex = Math.max(0, selectedIndex - 1);
      onSelectMessage(newIndex);

      // Scroll up if needed
      if (newIndex < scrollOffset) {
        setScrollOffset(newIndex);
      }
    } else if (key.downArrow) {
      const newIndex = Math.min(messages.length - 1, selectedIndex + 1);
      onSelectMessage(newIndex);

      // Scroll down if needed
      if (newIndex >= scrollOffset + maxHeight) {
        setScrollOffset(newIndex - maxHeight + 1);
      }
    } else if (key.return && onOpenThread) {
      const selectedMessage = messages[selectedIndex];
      if (selectedMessage?.threadId) {
        onOpenThread(selectedMessage.threadId);
      }
    }
  });

  const visibleMessages = messages.slice(scrollOffset, scrollOffset + maxHeight);

  const getThreadInfo = (message: ChatMessage) => {
    if (!message.threadId) return undefined;

    const thread = threads[message.threadId];
    if (!thread) return undefined;

    return {
      count: thread.messages.length,
      lastActivity: thread.messages[thread.messages.length - 1]?.timestamp || thread.startTime
    };
  };

  return (
    <Box flexDirection="column" flexGrow={1} paddingX={1}>
      {/* Scroll indicator */}
      {scrollOffset > 0 && (
        <Box justifyContent="center">
          <Text dimColor>↑ {scrollOffset} more messages above ↑</Text>
        </Box>
      )}

      {/* Messages */}
      {visibleMessages.length === 0 ? (
        <Box justifyContent="center" alignItems="center" flexGrow={1}>
          <Text dimColor italic>
            No messages yet. Start a conversation below.
          </Text>
        </Box>
      ) : (
        visibleMessages.map((message, index) => {
          const actualIndex = scrollOffset + index;
          const isSelected = actualIndex === selectedIndex;
          const isStreaming = message.id === streamingMessageId;
          const threadInfo = getThreadInfo(message);

          return (
            <Box key={message.id} flexDirection="column" marginY={0}>
              <Message
                message={message}
                isSelected={isSelected}
                isStreaming={isStreaming}
                threadCount={threadInfo?.count}
                lastThreadActivity={threadInfo?.lastActivity}
                onClick={() => onSelectMessage(actualIndex)}
                onThreadClick={
                  message.threadId && onOpenThread
                    ? () => onOpenThread(message.threadId!)
                    : undefined
                }
              />
            </Box>
          );
        })
      )}

      {/* Streaming indicator */}
      {streamingText && (
        <StreamingIndicator text={streamingText} isActive={true} />
      )}

      {/* Scroll indicator */}
      {scrollOffset + maxHeight < messages.length && (
        <Box justifyContent="center">
          <Text dimColor>
            ↓ {messages.length - (scrollOffset + maxHeight)} more messages below ↓
          </Text>
        </Box>
      )}

      {/* Navigation hint */}
      {focused && messages.length > 0 && (
        <Box justifyContent="center" paddingTop={1}>
          <Text dimColor>
            ↑↓ Navigate · Enter Open thread · Tab Switch focus
          </Text>
        </Box>
      )}
    </Box>
  );
};
