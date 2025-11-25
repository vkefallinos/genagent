import React from 'react';
import { Box, Text } from 'ink';
import { ChatMessage } from '../types/chat';
import { ToolCallIndicator } from './ToolCallIndicator.js';
import { ThreadPreview } from './ThreadPreview.js';

interface MessageProps {
  message: ChatMessage;
  isSelected: boolean;
  isStreaming: boolean;
  threadCount?: number;
  lastThreadActivity?: Date;
  onClick: () => void;
  onThreadClick?: () => void;
}

export const Message: React.FC<MessageProps> = ({
  message,
  isSelected,
  isStreaming,
  threadCount,
  lastThreadActivity,
  onThreadClick
}) => {
  const getSenderIcon = () => {
    switch (message.sender) {
      case 'user':
        return '👤';
      case 'assistant':
        return '🤖';
      case 'subagent':
        return '🔷';
      case 'system':
        return '⚙️';
      default:
        return '💬';
    }
  };

  const getSenderName = () => {
    switch (message.sender) {
      case 'user':
        return 'You';
      case 'assistant':
        return 'GenAgent';
      case 'subagent':
        return 'Subagent';
      case 'system':
        return 'System';
      default:
        return 'Unknown';
    }
  };

  const getSenderColor = () => {
    switch (message.sender) {
      case 'user':
        return 'cyan';
      case 'assistant':
        return 'blue';
      case 'subagent':
        return 'magenta';
      case 'system':
        return 'gray';
      default:
        return 'white';
    }
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const borderColor = isSelected ? 'cyan' : 'gray';
  const backgroundColor = isSelected ? 'bgCyan' : undefined;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
      paddingY={0}
      marginY={0}
    >
      {/* Header: Sender and timestamp */}
      <Box justifyContent="space-between">
        <Box>
          <Text color={getSenderColor()}>
            {getSenderIcon()} <Text bold>{getSenderName()}</Text>
          </Text>
        </Box>
        <Text dimColor>{formatTime(message.timestamp)}</Text>
      </Box>

      {/* Message content */}
      <Box paddingY={0}>
        <Text color={getSenderColor()} backgroundColor={backgroundColor}>
          {message.content}
          {isStreaming && <Text color="cyan">▋</Text>}
        </Text>
      </Box>

      {/* Tool calls */}
      {message.toolCalls && message.toolCalls.length > 0 && (
        <Box flexDirection="column" paddingY={0}>
          <Text dimColor italic>
            🔧 Used {message.toolCalls.length} tool{message.toolCalls.length > 1 ? 's' : ''}
          </Text>
          {message.toolCalls.map((toolCall) => (
            <ToolCallIndicator key={toolCall.id} toolCall={toolCall} compact />
          ))}
        </Box>
      )}

      {/* Thread preview */}
      {threadCount && threadCount > 0 && lastThreadActivity && onThreadClick && (
        <ThreadPreview
          threadId={message.threadId || ''}
          replyCount={threadCount}
          lastActivityTime={lastThreadActivity}
          onClick={onThreadClick}
        />
      )}

      {/* Metadata */}
      {message.metadata && (
        <Box paddingY={0}>
          <Text dimColor>
            {message.metadata.model && `Model: ${message.metadata.model}`}
            {message.metadata.tokens && ` · Tokens: ${message.metadata.tokens}`}
            {message.metadata.duration && ` · ${message.metadata.duration}ms`}
          </Text>
        </Box>
      )}
    </Box>
  );
};
