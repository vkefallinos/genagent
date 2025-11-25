import React, { useState, useEffect } from 'react';
import { Box, Text, Newline, useInput } from 'ink';
import { AgentState } from './types.js';

interface AgentUIProps {
  state: AgentState;
  onComplete?: () => void;
}

interface MessageModalProps {
  message: { name: string; content: string };
  onClose: () => void;
}

const MessageModal: React.FC<MessageModalProps> = ({ message, onClose }) => {
  useInput((input, key) => {
    if (key.escape || input === 'q') {
      onClose();
    }
  });

  return (
    <Box
      position="absolute"
      width="100%"
      height="100%"
      flexDirection="column"
      padding={2}
      borderStyle="double"
      borderColor="cyan"
    >
      <Box flexDirection="column" marginBottom={1}>
        <Text color="cyan" bold>
          📝 Message Details
        </Text>
        <Text dimColor>(Press ESC or 'q' to close)</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text color="blue" bold>
          From: {message.name}
        </Text>
      </Box>

      <Box flexDirection="column" paddingX={1}>
        <Text color="yellow" bold>
          Content:
        </Text>
        <Text>{message.content}</Text>
      </Box>
    </Box>
  );
};

export const AgentUI: React.FC<AgentUIProps> = ({ state, onComplete }) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [showModal, setShowModal] = useState<boolean>(false);

  useInput((input, key) => {
    if (showModal) {
      return; // Modal handles its own input
    }

    if (key.upArrow && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    } else if (key.downArrow && selectedIndex < state.messages.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    } else if (key.return && state.messages.length > 0) {
      setShowModal(true);
    }
  });

  useEffect(() => {
    if (state.response && onComplete) {
      onComplete();
    }
  }, [state.response, onComplete]);

  return (
    <Box flexDirection="column" padding={1}>
      <Box borderStyle="round" borderColor="cyan" paddingX={1}>
        <Text bold color="cyan">
          🤖 GenAgent{state.label ? ` - ${state.label}` : ''}
        </Text>
      </Box>

      <Newline />

      {state.currentPrompt && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="yellow" bold>
            📝 Prompt:
          </Text>
          <Text dimColor>{state.currentPrompt.substring(0, 200)}{state.currentPrompt.length > 200 ? '...' : ''}</Text>
        </Box>
      )}

      {state.messages.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="green" bold>
            💬 Messages: (Use ↑↓ to navigate, Enter to view details)
          </Text>
        </Box>
      )}

      {state.messages.map((msg, idx) => {
        const isSelected = idx === selectedIndex;
        const truncatedContent = msg.content.length > 80
          ? msg.content.substring(0, 80) + '...'
          : msg.content;

        return (
          <Box key={idx} flexDirection="column" marginBottom={1}>
            <Text color={isSelected ? "cyan" : "blue"} bold backgroundColor={isSelected ? "blue" : undefined}>
              {isSelected ? '► ' : '  '}▸ {msg.name}:
            </Text>
            <Text dimColor={!isSelected}>{truncatedContent}</Text>
          </Box>
        );
      })}

      {state.tools.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="magenta" bold>
            🔧 Tools Available: {state.tools.length}
          </Text>
          {state.tools.map((tool, idx) => (
            <Text key={idx} dimColor>
              • {tool.name}: {tool.description}
            </Text>
          ))}
        </Box>
      )}

      {state.toolCalls.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="green" bold>
            ⚡ Tool Executions:
          </Text>
          {state.toolCalls.map((call, idx) => (
            <Box key={idx} flexDirection="column" paddingLeft={2}>
              <Text>
                • {call.tool}(
                <Text color="gray">{JSON.stringify(call.args)}</Text>)
              </Text>
              {call.result && (
                <Text color="green">
                  ✓ {JSON.stringify(call.result).substring(0, 100)}
                </Text>
              )}
              {call.error && (
                <Text color="red">✗ {call.error}</Text>
              )}
            </Box>
          ))}
        </Box>
      )}

      {state.response && (
        <Box flexDirection="column" marginTop={1} borderStyle="round" borderColor="green" paddingX={1}>
          <Text color="green" bold>
            ✓ Response:
          </Text>
          <Text>{JSON.stringify(state.response, null, 2)}</Text>
        </Box>
      )}

      {state.error && (
        <Box flexDirection="column" marginTop={1} borderStyle="round" borderColor="red" paddingX={1}>
          <Text color="red" bold>
            ✗ Error:
          </Text>
          <Text>{state.error}</Text>
        </Box>
      )}

      {showModal && state.messages[selectedIndex] && (
        <MessageModal
          message={state.messages[selectedIndex]}
          onClose={() => setShowModal(false)}
        />
      )}
    </Box>
  );
};
