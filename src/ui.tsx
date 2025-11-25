import React, { useState, useEffect } from 'react';
import { Box, Text, Newline, useInput } from 'ink';
import { AgentState } from './types.js';

interface AgentUIProps {
  state: AgentState;
  onComplete?: () => void;
}

interface MessageModalProps {
  state: AgentState;
  messageIndex: number;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
}

const MessageModal: React.FC<MessageModalProps> = ({ state, messageIndex, onClose, onNavigate }) => {
  const [scrollOffset, setScrollOffset] = useState(0);
  const message = state.messages[messageIndex];
  const maxVisibleLines = 20; // Approximate lines visible in terminal

  // Split content into lines for scrolling
  const contentLines = message.content.split('\n');
  const visibleContent = contentLines.slice(scrollOffset, scrollOffset + maxVisibleLines);
  const canScrollUp = scrollOffset > 0;
  const canScrollDown = scrollOffset + maxVisibleLines < contentLines.length;
  const canGoLeft = messageIndex > 0;
  const canGoRight = messageIndex < state.messages.length - 1;

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      onClose();
    } else if (key.upArrow && canScrollUp) {
      setScrollOffset(Math.max(0, scrollOffset - 1));
    } else if (key.downArrow && canScrollDown) {
      setScrollOffset(scrollOffset + 1);
    } else if (key.leftArrow && canGoLeft) {
      setScrollOffset(0);
      onNavigate(messageIndex - 1);
    } else if (key.rightArrow && canGoRight) {
      setScrollOffset(0);
      onNavigate(messageIndex + 1);
    }
  });

  return (
    <Box
      position="absolute"
      width="100%"
      height="100%"
      flexDirection="column"
      borderStyle="double"
      borderColor="cyan"
    >
      {/* Header */}
      <Box flexDirection="column" paddingX={2} paddingTop={1}>
        <Box justifyContent="space-between">
          <Text color="cyan" bold>
            📝 Message Details [{messageIndex + 1}/{state.messages.length}]
          </Text>
          <Text dimColor>
            {canGoLeft && '← '} ESC/q: close {canGoRight && ' →'}
          </Text>
        </Box>
        <Text dimColor>
          {canScrollUp && '↑ '} {canScrollDown && '↓ scroll '}
          {canGoLeft && ' ← prev'} {canGoRight && ' next →'}
        </Text>
      </Box>

      {/* Message metadata */}
      <Box flexDirection="column" paddingX={2} paddingTop={1}>
        <Text color="blue" bold>
          From: {message.name}
        </Text>
      </Box>

      {/* Message content */}
      <Box flexDirection="column" paddingX={2} paddingTop={1} flexGrow={1}>
        <Text color="yellow" bold>
          Content: {canScrollUp || canScrollDown ? `(line ${scrollOffset + 1}/${contentLines.length})` : ''}
        </Text>
        <Box flexDirection="column" paddingTop={1}>
          {visibleContent.map((line, idx) => (
            <Text key={idx}>{line}</Text>
          ))}
        </Box>
        {canScrollDown && (
          <Text color="gray" italic>
            ... ({contentLines.length - scrollOffset - maxVisibleLines} more lines)
          </Text>
        )}
      </Box>

      {/* Tool calls section */}
      {state.toolCalls.length > 0 && (
        <Box flexDirection="column" paddingX={2} paddingTop={1} borderTop borderColor="gray">
          <Text color="magenta" bold>
            🔧 Tool Calls ({state.toolCalls.length}):
          </Text>
          {state.toolCalls.map((call, idx) => (
            <Box key={idx} flexDirection="column" paddingLeft={2} paddingTop={1}>
              <Text color="cyan">
                {idx + 1}. {call.tool}
              </Text>
              <Text color="gray" dimColor>
                Args: {JSON.stringify(call.args)}
              </Text>
              {call.result && (
                <Text color="green">
                  ✓ Result: {typeof call.result === 'string'
                    ? call.result.substring(0, 100)
                    : JSON.stringify(call.result).substring(0, 100)}
                  {(typeof call.result === 'string' ? call.result : JSON.stringify(call.result)).length > 100 && '...'}
                </Text>
              )}
              {call.error && (
                <Text color="red">
                  ✗ Error: {call.error}
                </Text>
              )}
            </Box>
          ))}
        </Box>
      )}
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
          state={state}
          messageIndex={selectedIndex}
          onClose={() => setShowModal(false)}
          onNavigate={(newIndex) => setSelectedIndex(newIndex)}
        />
      )}
    </Box>
  );
};
