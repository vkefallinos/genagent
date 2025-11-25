import React, { useState, useEffect } from 'react';
import { Box, Text, Newline } from 'ink';
import { AgentState } from './types.js';

interface AgentUIProps {
  state: AgentState;
  onComplete?: () => void;
}

export const AgentUI: React.FC<AgentUIProps> = ({ state, onComplete }) => {
  const [displayedMessages, setDisplayedMessages] = useState<number>(0);

  useEffect(() => {
    if (displayedMessages < state.messages.length) {
      const timer = setTimeout(() => {
        setDisplayedMessages(displayedMessages + 1);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [displayedMessages, state.messages.length]);

  useEffect(() => {
    if (state.response && onComplete) {
      onComplete();
    }
  }, [state.response, onComplete]);

  return (
    <Box flexDirection="column" padding={1}>
      <Box borderStyle="round" borderColor="cyan" paddingX={1}>
        <Text bold color="cyan">
          🤖 GenAgent
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

      {state.messages.slice(0, displayedMessages).map((msg, idx) => (
        <Box key={idx} flexDirection="column" marginBottom={1}>
          <Text color="blue" bold>
            ▸ {msg.name}:
          </Text>
          <Text>{msg.content}</Text>
        </Box>
      ))}

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
    </Box>
  );
};
