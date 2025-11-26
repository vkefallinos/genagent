import React, { useState, useEffect } from 'react';
import { Box, Text, Newline, useInput } from 'ink';
import { z } from 'zod';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { AgentState, PromptContext, ToolDefinition, MessageContent, MessageHistoryHook } from './types.js';
import { createContext, applyMessageHooks } from './context.js';
import { loadPlugins } from './plugins/loader.js';
import { createSchemaInstructions } from './schema-utils.js';
import {
  resolveModelAlias,
  loadModelInstance,
  convertToolsToAIFormat,
  buildConversationMessages,
  executeAgent,
} from './agent-executor.js';

interface MessageModalProps {
  state: AgentState;
  messageIndex: number;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
}

const MessageModal: React.FC<MessageModalProps> = ({ state, messageIndex, onClose, onNavigate }) => {
  const [scrollOffset, setScrollOffset] = useState(0);
  const message = state.messages[messageIndex];
  const maxVisibleLines = 20;

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

      <Box flexDirection="column" paddingX={2} paddingTop={1}>
        <Text color="blue" bold>
          From: {message.name}
        </Text>
      </Box>

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

interface AgentUIDisplayProps {
  state: AgentState;
}

const AgentUIDisplay: React.FC<AgentUIDisplayProps> = ({ state }) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [showModal, setShowModal] = useState<boolean>(false);

  useInput((input, key) => {
    if (showModal) {
      return;
    }

    if (key.upArrow && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    } else if (key.downArrow && selectedIndex < state.messages.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    } else if (key.return && state.messages.length > 0) {
      setShowModal(true);
    }
  });

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

      {state.validationAttempts && state.validationAttempts.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="yellow" bold>
            🔄 Validation Retries:
          </Text>
          {state.validationAttempts.map((attempt, idx) => (
            <Box key={idx} flexDirection="column" paddingLeft={2} marginTop={1}>
              <Text color="cyan">
                Attempt {attempt.attempt}:
              </Text>
              <Text color="gray" dimColor>
                Response: {attempt.response.substring(0, 100)}
                {attempt.response.length > 100 && '...'}
              </Text>
              <Text color="red">
                ✗ {attempt.error.split('\n')[0]}
                {attempt.error.split('\n').length > 1 && '...'}
              </Text>
            </Box>
          ))}
        </Box>
      )}

      {state.streamingText && !state.response && (
        <Box flexDirection="column" marginTop={1} borderStyle="round" borderColor="yellow" paddingX={1}>
          <Text color="yellow" bold>
            ⏳ Streaming Response:
          </Text>
          <Text>{state.streamingText}</Text>
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

export interface AgentCLIProps<T extends z.ZodSchema = z.ZodAny> {
  promptFn: (ctx: PromptContext) => Promise<string> | string;
  model: string;
  responseSchema?: T;
  system?: string[];
  label?: string;
  plugins?: any[];
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
  parentOnStateUpdate?: () => void;
  parentState?: AgentState;
}

/**
 * Main CLI component that manages agent state and orchestrates execution
 */
export const AgentCLI = <T extends z.ZodSchema = z.ZodAny,>(props: AgentCLIProps<T>) => {
  const { promptFn, model, responseSchema, system, label, plugins, onComplete, onError, parentOnStateUpdate, parentState } = props;

  // Determine if this is a subagent (headless mode)
  const isSubagent = !!parentOnStateUpdate && !!parentState;

  // Agent state managed by React (only used if not a subagent)
  const [state, setState] = useState<AgentState>({
    messages: [],
    tools: [],
    currentPrompt: '',
    toolCalls: [],
    label,
    validationAttempts: [],
  });

  const [isExecuting, setIsExecuting] = useState(false);

  // Callback to trigger UI updates
  const updateState = () => {
    setState((prev) => ({ ...prev }));
  };

  // Save state to file
  const saveStateToFile = async (currentState: AgentState) => {
    if (!currentState.label) return;

    try {
      const dir = '.genagent';
      await mkdir(dir, { recursive: true });

      const filePath = join(dir, `${currentState.label}.json`);
      await writeFile(filePath, JSON.stringify(currentState, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save state to file:', error);
    }
  };

  // Execute the agent
  useEffect(() => {
    if (isExecuting) return;

    const executePrompt = async () => {
      setIsExecuting(true);

      const messages: MessageContent[] = [];
      const tools: ToolDefinition[] = [];
      const hooks: MessageHistoryHook[] = [];

      // Create a mutable state object for agent execution
      let mutableState: AgentState | null = null;

      try {
        // Create context and execute prompt function
        const ctx = createContext(messages, tools, hooks);

        // Load plugins if provided
        const pluginSystemPrompts = plugins ? loadPlugins(ctx, plugins) : [];

        const promptResult = await promptFn(ctx);

        // Initialize mutable state object
        // If this is a subagent, use the provided parent state; otherwise create new state
        if (isSubagent && parentState) {
          // Use the parent-provided state (which is actually the subagent's own state)
          mutableState = parentState;
          // Update it with current execution info
          mutableState.messages = [...messages];
          mutableState.tools = [...tools];
          mutableState.currentPrompt = promptResult;
        } else {
          mutableState = {
            messages: [...messages],
            tools: [...tools],
            currentPrompt: promptResult,
            toolCalls: [],
            label,
            validationAttempts: [],
          };
        }

        // Update state callback that references mutableState
        const updateMutableState = () => {
          if (isSubagent && parentOnStateUpdate) {
            // Use parent's update callback when in subagent mode
            parentOnStateUpdate();
          } else if (mutableState) {
            setState({ ...mutableState });
          }
        };

        // Update state with prompt and messages
        updateMutableState();

        // Resolve model alias
        const resolvedModel = resolveModelAlias(model);
        const [provider, modelId] = resolvedModel.split(':');

        if (!provider || !modelId) {
          throw new Error('Model must be in format "provider:modelId" (e.g., "openai:gpt-4")');
        }

        // Load model instance
        const modelInstance = await loadModelInstance(provider, modelId);

        // Convert tools to AI SDK format
        const aiTools = convertToolsToAIFormat(tools, mutableState, updateMutableState);

        // Add schema instructions to system prompts if responseSchema is provided
        const systemPrompts = [
          ...pluginSystemPrompts,
          ...(system ? system : [])
        ];
        if (responseSchema) {
          systemPrompts.push(createSchemaInstructions(responseSchema));
        }

        // Build conversation messages
        const transformedMessages = applyMessageHooks([...messages], hooks);
        const conversationMessages = buildConversationMessages(messages, hooks, promptResult);

        // Execute agent
        const finalResponse = await executeAgent({
          modelInstance,
          systemPrompts,
          conversationMessages,
          aiTools,
          responseSchema,
          state: mutableState,
          hooks,
          promptResult,
          transformedMessages,
          onStateUpdate: updateMutableState,
        });

        // Update state with response and clear streaming text
        // Only set response if not a subagent (subagent returns result via tool execution)
        if (!isSubagent) {
          mutableState.response = finalResponse;
          mutableState.streamingText = undefined;
          setState({ ...mutableState });
          saveStateToFile(mutableState);

          // Wait a bit to show final state
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } else {
          // For subagents, just clear streaming text
          mutableState.streamingText = undefined;
          if (parentOnStateUpdate) {
            parentOnStateUpdate();
          }
        }

        if (onComplete) {
          onComplete(finalResponse);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Use mutableState if it exists, otherwise use current state
        const errorState = mutableState || state;

        // Only set error in state if not a subagent
        if (!isSubagent) {
          errorState.error = errorMessage;
          setState({ ...errorState });
          saveStateToFile(errorState);

          // Wait a bit to show error
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        if (onError) {
          onError(error instanceof Error ? error : new Error(errorMessage));
        }
      }
    };

    executePrompt();
  }, []);

  // If this is a subagent, don't render anything (headless mode)
  if (isSubagent) {
    return null;
  }

  return <AgentUIDisplay state={state} />;
};

// Export for backward compatibility
export const AgentUI = AgentUIDisplay;
