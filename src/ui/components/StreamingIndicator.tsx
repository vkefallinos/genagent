import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';

interface StreamingIndicatorProps {
  text: string;
  isActive: boolean;
  sender?: string;
}

export const StreamingIndicator: React.FC<StreamingIndicatorProps> = ({
  text,
  isActive,
  sender = 'GenAgent'
}) => {
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 500);

    return () => clearInterval(interval);
  }, [isActive]);

  if (!isActive && !text) return null;

  return (
    <Box flexDirection="column" paddingX={1} paddingY={0}>
      {isActive && (
        <Text dimColor italic>
          🤖 {sender} is typing...
        </Text>
      )}
      <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1}>
        <Text color="yellow">
          {text}
          {isActive && cursorVisible && <Text color="cyan">▋</Text>}
        </Text>
      </Box>
    </Box>
  );
};
