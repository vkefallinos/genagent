import React from 'react';
import { Box } from 'ink';
import type { MessageContent } from '../../types.js';
import { UserMessage } from './UserMessage.js';
import { AssistantMessage } from './AssistantMessage.js';
import { SystemMessage } from './SystemMessage.js';
import { ToolCallMessage } from './ToolCallMessage.js';
import { SubagentMessage } from './SubagentMessage.js';

interface MessageListProps {
  messages: MessageContent[];
  selectedIndex?: number;
  truncate?: boolean;
}

/**
 * Renders a single message based on its type
 */
const MessageItem: React.FC<{
  message: MessageContent;
  isSelected: boolean;
  truncate?: boolean;
}> = ({ message, isSelected, truncate }) => {
  const type = message.type || message.name;

  switch (type) {
    case 'user':
      return <UserMessage message={message} isSelected={isSelected} truncate={truncate} />;

    case 'system':
      return <SystemMessage message={message} isSelected={isSelected} truncate={truncate} />;

    case 'tool_call':
      return <ToolCallMessage message={message} isSelected={isSelected} truncate={truncate} />;

    case 'subagent':
      return <SubagentMessage message={message} isSelected={isSelected} truncate={truncate} />;

    case 'assistant':
    default:
      return <AssistantMessage message={message} isSelected={isSelected} truncate={truncate} />;
  }
};

/**
 * MessageList component that renders a list of messages with appropriate components
 */
export const MessageList: React.FC<MessageListProps> = ({
  messages,
  selectedIndex,
  truncate = false,
}) => {
  // Filter out child messages (those with parentId) from top-level display
  const topLevelMessages = messages.filter((msg) => !msg.parentId);

  return (
    <Box flexDirection="column">
      {topLevelMessages.map((message, index) => (
        <Box key={message.id || index} marginTop={index > 0 ? 1 : 0}>
          <MessageItem
            message={message}
            isSelected={selectedIndex === index}
            truncate={truncate}
          />
        </Box>
      ))}
    </Box>
  );
};
