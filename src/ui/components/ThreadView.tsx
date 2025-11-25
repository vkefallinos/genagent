import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Thread, ChatMessage } from '../types/chat';
import { ThreadMessage } from './ThreadMessage';

interface ThreadViewProps {
  thread: Thread;
  parentMessage: ChatMessage;
  onClose: () => void;
  streamingText?: string;
  streamingMessageId?: string;
}

export const ThreadView: React.FC<ThreadViewProps> = ({
  thread,
  parentMessage,
  onClose,
  streamingText,
  streamingMessageId
}) => {
  const [scrollOffset, setScrollOffset] = useState(0);
  const maxHeight = 15;

  useInput((inputChar, key) => {
    if (key.escape || inputChar === 'q') {
      onClose();
    } else if (key.upArrow) {
      setScrollOffset(Math.max(0, scrollOffset - 1));
    } else if (key.downArrow) {
      setScrollOffset(
        Math.min(Math.max(0, thread.messages.length - maxHeight), scrollOffset + 1)
      );
    }
  });

  const getStatusIcon = () => {
    switch (thread.status) {
      case 'completed':
        return '✓';
      case 'failed':
        return '✗';
      case 'running':
        return '⏳';
      default:
        return '⋯';
    }
  };

  const getStatusColor = () => {
    switch (thread.status) {
      case 'completed':
        return 'green';
      case 'failed':
        return 'red';
      case 'running':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  const getDuration = () => {
    if (!thread.endTime) return 'running...';
    const duration = thread.endTime.getTime() - thread.startTime.getTime();
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(1)}s`;
  };

  const visibleMessages = thread.messages.slice(scrollOffset, scrollOffset + maxHeight);

  return (
    <Box flexDirection="column" flexGrow={1} borderStyle="double" borderColor="magenta" paddingX={1}>
      {/* Header */}
      <Box flexDirection="column" borderBottom borderColor="magenta" paddingBottom={1}>
        <Box justifyContent="space-between">
          <Text color="cyan" bold>
            ← Back (Esc)
          </Text>
          <Text color={getStatusColor()}>
            {getStatusIcon()} {thread.status}
          </Text>
        </Box>

        <Box paddingTop={0}>
          <Text bold color="magenta">
            Thread: {thread.subagentType}
          </Text>
        </Box>

        <Box paddingY={0}>
          <Text dimColor italic>
            {thread.subagentPrompt.slice(0, 100)}
            {thread.subagentPrompt.length > 100 ? '...' : ''}
          </Text>
        </Box>

        <Box justifyContent="space-between" paddingY={0}>
          <Text dimColor>
            {thread.messages.length} messages · {thread.toolCalls.length} tools
          </Text>
          <Text dimColor>
            {getDuration()}
          </Text>
        </Box>
      </Box>

      {/* Parent message context */}
      <Box
        flexDirection="column"
        borderBottom
        borderColor="gray"
        paddingY={1}
        paddingX={1}
      >
        <Text dimColor italic>
          In response to:
        </Text>
        <Text color="blue">"{parentMessage.content.slice(0, 100)}..."</Text>
      </Box>

      {/* Scroll indicator */}
      {scrollOffset > 0 && (
        <Box justifyContent="center">
          <Text dimColor>↑ {scrollOffset} more messages ↑</Text>
        </Box>
      )}

      {/* Thread messages */}
      <Box flexDirection="column" flexGrow={1} paddingY={1}>
        {visibleMessages.length === 0 ? (
          <Box justifyContent="center" alignItems="center" flexGrow={1}>
            <Text dimColor italic>
              Thread is starting...
            </Text>
          </Box>
        ) : (
          visibleMessages.map((message) => {
            const isStreaming = message.id === streamingMessageId;
            return (
              <ThreadMessage
                key={message.id}
                message={message}
                isStreaming={isStreaming}
              />
            );
          })
        )}

        {/* Streaming text */}
        {streamingText && streamingMessageId === thread.messages[thread.messages.length - 1]?.id && (
          <Box paddingX={1} paddingY={0}>
            <Text color="magenta">
              {streamingText}
              <Text color="cyan">▋</Text>
            </Text>
          </Box>
        )}
      </Box>

      {/* Scroll indicator */}
      {scrollOffset + maxHeight < thread.messages.length && (
        <Box justifyContent="center">
          <Text dimColor>↓ {thread.messages.length - (scrollOffset + maxHeight)} more ↓</Text>
        </Box>
      )}

      {/* Navigation hint */}
      <Box justifyContent="center" borderTop borderColor="magenta" paddingTop={1}>
        <Text dimColor>
          ↑↓ Scroll · Esc/q Close thread
        </Text>
      </Box>
    </Box>
  );
};
