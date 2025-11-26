import React from 'react';
import { Box, Text } from 'ink';

interface ThreadPreviewProps {
  threadId: string;
  replyCount: number;
  lastActivityTime: Date;
  isUnread?: boolean;
  onClick: () => void;
}

export const ThreadPreview: React.FC<ThreadPreviewProps> = ({
  replyCount,
  lastActivityTime,
  isUnread = false
}) => {
  const getTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <Box paddingLeft={2} paddingY={0}>
      <Text color={isUnread ? 'cyan' : 'blue'}>
        💬 {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
      </Text>
      <Text dimColor> · Last: {getTimeAgo(lastActivityTime)}</Text>
      {isUnread && <Text color="cyan"> · New</Text>}
    </Box>
  );
};
