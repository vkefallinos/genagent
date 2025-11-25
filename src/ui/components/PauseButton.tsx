import React from 'react';
import { Box, Text } from 'ink';

interface PauseButtonProps {
  isPaused: boolean;
  isExecuting: boolean;
  onToggle: () => void;
  focused?: boolean;
}

export const PauseButton: React.FC<PauseButtonProps> = ({
  isPaused,
  isExecuting,
  onToggle,
  focused = false
}) => {
  const getIcon = () => {
    if (!isExecuting) return '⏹️';
    return isPaused ? '▶️' : '⏸️';
  };

  const getColor = () => {
    if (!isExecuting) return 'gray';
    if (focused) return 'cyan';
    return isPaused ? 'green' : 'yellow';
  };

  const isDisabled = !isExecuting;

  return (
    <Box>
      <Text color={getColor()} dimColor={isDisabled}>
        {getIcon()}
      </Text>
    </Box>
  );
};
