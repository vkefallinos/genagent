import React from 'react';
import { Box, Text } from 'ink';
import { ChatMessage } from '../types/chat';
import { ToolCallIndicator } from './ToolCallIndicator';

interface ThreadMessageProps {
  message: ChatMessage;
  isStreaming: boolean;
}

export const ThreadMessage: React.FC<ThreadMessageProps> = ({ message, isStreaming }) => {
  const getSenderIcon = () => {
    switch (message.sender) {
      case 'user':
        return '👤';
      case 'assistant':
      case 'subagent':
        return '🔷';
      case 'system':
        return '⚙️';
      default:
        return '💬';
    }
  };

  const getSenderName = () => {
    if (message.sender === 'subagent') return 'Subagent';
    if (message.sender === 'user') return 'You';
    if (message.sender === 'system') return 'System';
    return 'Agent';
  };

  const getSenderColor = () => {
    switch (message.sender) {
      case 'user':
        return 'cyan';
      case 'subagent':
        return 'magenta';
      case 'system':
        return 'gray';
      default:
        return 'blue';
    }
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <Box flexDirection="column" paddingX={1} paddingY={0} marginY={0}>
      {/* Header */}
      <Box justifyContent="space-between">
        <Box>
          <Text color={getSenderColor()}>
            {getSenderIcon()} {getSenderName()}
          </Text>
        </Box>
        <Text dimColor>
          {formatTime(message.timestamp)}
        </Text>
      </Box>

      {/* Content */}
      <Box paddingLeft={2} paddingY={0}>
        <Text color={getSenderColor()}>
          {message.content}
          {isStreaming && <Text color="cyan">▋</Text>}
        </Text>
      </Box>

      {/* Tool calls */}
      {message.toolCalls && message.toolCalls.length > 0 && (
        <Box flexDirection="column" paddingY={0}>
          {message.toolCalls.map((toolCall) => (
            <ToolCallIndicator key={toolCall.id} toolCall={toolCall} compact />
          ))}
        </Box>
      )}
    </Box>
  );
};
