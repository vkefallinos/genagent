import React from 'react';
import { Box, Text } from 'ink';
import type { MessageContent } from '../../types.js';

interface ToolCallMessageProps {
  message: MessageContent;
  isSelected?: boolean;
  truncate?: boolean;
}

export const ToolCallMessage: React.FC<ToolCallMessageProps> = ({
  message,
  isSelected = false,
  truncate = false,
}) => {
  const { metadata } = message;
  const toolName = metadata?.toolName || 'unknown';
  const args = metadata?.args;
  const result = metadata?.result;
  const error = metadata?.error;

  const argsString = args ? JSON.stringify(args, null, 2) : '';
  const resultString = result ? JSON.stringify(result, null, 2) : '';

  const displayArgs = truncate && argsString.length > 60
    ? `${argsString.substring(0, 60)}...`
    : argsString;

  const displayResult = truncate && resultString.length > 60
    ? `${resultString.substring(0, 60)}...`
    : resultString;

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="cyan" bold>
          {isSelected ? '► ' : '  '}⚡ Tool Call: {toolName}
        </Text>
        {message.timestamp && (
          <Text dimColor> ({new Date(message.timestamp).toLocaleTimeString()})</Text>
        )}
      </Box>

      {args && (
        <Box paddingLeft={2} flexDirection="column">
          <Text dimColor>Args:</Text>
          <Box paddingLeft={1}>
            <Text>{displayArgs}</Text>
          </Box>
        </Box>
      )}

      {result && (
        <Box paddingLeft={2} flexDirection="column">
          <Text color="green">✓ Result:</Text>
          <Box paddingLeft={1}>
            <Text>{displayResult}</Text>
          </Box>
        </Box>
      )}

      {error && (
        <Box paddingLeft={2} flexDirection="column">
          <Text color="red">✗ Error:</Text>
          <Box paddingLeft={1}>
            <Text color="red">{error}</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};
