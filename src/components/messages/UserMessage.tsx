import React from 'react';
import { Box, Text } from 'ink';
import type { MessageContent } from '../../types.js';

interface UserMessageProps {
  message: MessageContent;
  isSelected?: boolean;
  truncate?: boolean;
}

export const UserMessage: React.FC<UserMessageProps> = ({
  message,
  isSelected = false,
  truncate = false,
}) => {
  const content = truncate && message.content.length > 80
    ? `${message.content.substring(0, 80)}...`
    : message.content;

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="blue" bold>
          {isSelected ? '► ' : '  '}👤 User
        </Text>
        {message.timestamp && (
          <Text dimColor> ({new Date(message.timestamp).toLocaleTimeString()})</Text>
        )}
      </Box>
      <Box paddingLeft={2}>
        <Text>{content}</Text>
      </Box>
    </Box>
  );
};
