import React from 'react';
import { Box, Text } from 'ink';

interface HeaderProps {
  status: 'idle' | 'executing' | 'paused' | 'error';
  modelName?: string;
  agentLabel?: string;
}

export const Header: React.FC<HeaderProps> = ({ status, modelName, agentLabel }) => {
  const getStatusText = () => {
    switch (status) {
      case 'executing':
        return 'Executing...';
      case 'paused':
        return 'Paused';
      case 'error':
        return 'Error';
      default:
        return 'Idle';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'executing':
        return 'yellow';
      case 'paused':
        return 'cyan';
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  };

  return (
    <Box borderStyle="round" borderColor="cyan" paddingX={1} flexDirection="column">
      <Box justifyContent="space-between">
        <Text bold color="cyan">
          🤖 GenAgent {agentLabel ? `- ${agentLabel}` : ''}
        </Text>
        <Text color={getStatusColor()}>{getStatusText()}</Text>
      </Box>
      {modelName && (
        <Box>
          <Text dimColor>Model: {modelName}</Text>
        </Box>
      )}
    </Box>
  );
};
