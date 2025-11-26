import React, { useState } from 'react';
import { Box, Text } from 'ink';
import type { MessageContent } from '../../types.js';

interface SubagentMessageProps {
  message: MessageContent;
  isSelected?: boolean;
  truncate?: boolean;
}

export const SubagentMessage: React.FC<SubagentMessageProps> = ({
  message,
  isSelected = false,
  truncate = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { metadata } = message;
  const subagentLabel = metadata?.subagentLabel || 'subagent';
  const subagentMessages = metadata?.subagentMessages || [];
  const result = metadata?.result;
  const error = metadata?.error;
  const executionTime = metadata?.executionTime;

  const resultString = result ? JSON.stringify(result, null, 2) : '';
  const displayResult = truncate && resultString.length > 60
    ? `${resultString.substring(0, 60)}...`
    : resultString;

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="magenta" paddingX={1}>
      <Box>
        <Text color="magenta" bold>
          {isSelected ? '► ' : '  '}🤖 Subagent: {subagentLabel}
        </Text>
        {executionTime && (
          <Text dimColor> ({executionTime}ms)</Text>
        )}
      </Box>

      <Box paddingLeft={1}>
        <Text dimColor>
          {isExpanded ? '▼' : '▶'} {isExpanded ? 'Click to collapse' : 'Click to expand'} ({subagentMessages.length} messages)
        </Text>
      </Box>

      {isExpanded && subagentMessages.length > 0 && (
        <Box flexDirection="column" paddingLeft={2} marginTop={1}>
          <Text dimColor>📋 Subagent Messages:</Text>
          {subagentMessages.map((msg, idx) => (
            <Box key={msg.id || idx} paddingLeft={1} flexDirection="column" marginTop={idx > 0 ? 1 : 0}>
              <Text color={msg.name === 'user' ? 'blue' : 'green'}>
                • {msg.name}: {truncate && msg.content.length > 50 ? `${msg.content.substring(0, 50)}...` : msg.content}
              </Text>
            </Box>
          ))}
        </Box>
      )}

      {result && (
        <Box paddingLeft={2} flexDirection="column" marginTop={1}>
          <Text color="green">✓ Result:</Text>
          <Box paddingLeft={1}>
            <Text>{displayResult}</Text>
          </Box>
        </Box>
      )}

      {error && (
        <Box paddingLeft={2} flexDirection="column" marginTop={1}>
          <Text color="red">✗ Error:</Text>
          <Box paddingLeft={1}>
            <Text color="red">{error}</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};
