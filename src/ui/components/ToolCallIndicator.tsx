import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { ToolCall } from '../types/chat';

interface ToolCallIndicatorProps {
  toolCall: ToolCall;
  compact?: boolean;
}

export const ToolCallIndicator: React.FC<ToolCallIndicatorProps> = ({
  toolCall,
  compact = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusIcon = () => {
    switch (toolCall.status) {
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      case 'running':
        return '⏳';
      default:
        return '⋯';
    }
  };

  const getStatusColor = () => {
    switch (toolCall.status) {
      case 'success':
        return 'green';
      case 'error':
        return 'red';
      case 'running':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  const getDuration = () => {
    if (!toolCall.endTime) return '';
    const duration = toolCall.endTime.getTime() - toolCall.startTime.getTime();
    return `${duration}ms`;
  };

  const truncate = (str: string, maxLength: number) => {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + '...';
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string') return value;
    return JSON.stringify(value, null, 2);
  };

  if (compact) {
    return (
      <Box>
        <Text color="yellow">🔧 </Text>
        <Text color="cyan">{toolCall.tool}</Text>
        <Text color={getStatusColor()}> {getStatusIcon()}</Text>
        {toolCall.endTime && <Text dimColor> {getDuration()}</Text>}
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingLeft={2} paddingY={0}>
      <Box>
        <Text color="yellow">🔧 </Text>
        <Text color="cyan">{toolCall.tool}</Text>
        <Text color={getStatusColor()}> {getStatusIcon()}</Text>
        {toolCall.endTime && <Text dimColor> {getDuration()}</Text>}
      </Box>

      {isExpanded && (
        <Box flexDirection="column" paddingLeft={2}>
          <Text dimColor>Args:</Text>
          <Text dimColor>{truncate(formatValue(toolCall.args), 200)}</Text>

          {toolCall.result && (
            <>
              <Text dimColor>Result:</Text>
              <Text color="green">{truncate(formatValue(toolCall.result), 200)}</Text>
            </>
          )}

          {toolCall.error && (
            <>
              <Text dimColor>Error:</Text>
              <Text color="red">{truncate(toolCall.error, 200)}</Text>
            </>
          )}
        </Box>
      )}
    </Box>
  );
};
