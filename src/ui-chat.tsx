import React, { useEffect, useState } from 'react';
import { render } from 'ink';
import { ChatContainer } from './ui/components/index.js';
import { useChatState } from './ui/hooks/useChatState.js';
import { ChatMessage, ToolCall } from './ui/types/chat.js';
import type { AgentState, AgentOptions, PromptContext, ExecutionControl } from './types.js';
import { createContext, applyMessageHooks } from './context.js';
import {
  executeAgent,
  resolveModelAlias,
  loadModelInstance,
  convertToolsToAIFormat,
  buildConversationMessages
} from './agent-executor.js';
import { createSchemaInstructions } from './schema-utils.js';

interface AgentChatCLIProps {
  promptFn: (ctx: PromptContext) => Promise<string> | string;
  model?: string;
  responseSchema?: any;
  system?: string[];
  label?: string;
  plugins?: any[];
  headless?: boolean;
  onComplete?: (response: any) => void;
  onError?: (error: Error) => void;
}

const AgentChatCLI: React.FC<AgentChatCLIProps> = ({
  promptFn,
  model = 'gpt-4o-mini',
  responseSchema,
  system = [],
  label = 'agent',
  plugins = [],
  headless = false,
  onComplete,
  onError
}) => {
  const { state: chatState, actions } = useChatState();
  const [agentState, setAgentState] = useState<AgentState>({
    messages: [],
    tools: [],
    currentPrompt: '',
    toolCalls: [],
    label,
    validationAttempts: [],
    isPaused: false,
    executionState: 'idle'
  });
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionControl, setExecutionControl] = useState<ExecutionControl | null>(null);

  // Initialize execution
  useEffect(() => {
    const executePrompt = async () => {
      try {
        setIsExecuting(true);
        actions.setExecutionState('executing');
        setAgentState((prev) => ({ ...prev, executionState: 'executing' }));

        // Create execution control
        let pausedRef = { value: false };
        let pendingMessageRef = { value: undefined as string | undefined };

        const control: ExecutionControl = {
          pause: () => {
            pausedRef.value = true;
            actions.pause();
            setAgentState((prev) => ({ ...prev, isPaused: true, executionState: 'paused' }));
          },
          resume: () => {
            pausedRef.value = false;
            actions.resume();
            setAgentState((prev) => ({ ...prev, isPaused: false, executionState: 'executing' }));
          },
          isPaused: () => pausedRef.value,
          injectMessage: (message: string) => {
            pendingMessageRef.value = message;
            actions.injectMessage(message);
            setAgentState((prev) => ({ ...prev, pendingUserMessage: message }));
          },
          getPendingMessage: () => {
            const msg = pendingMessageRef.value;
            pendingMessageRef.value = undefined;
            return msg;
          }
        };

        setExecutionControl(control);

        // Initialize arrays for context
        const messages: any[] = [];
        const tools: any[] = [];
        const hooks: any[] = [];

        // Create thread handler for subagents
        const threadHandler = {
          createThread: async (
            name: string,
            description: string,
            prompt: string,
            runOptions: any,
            subMessages: any[],
            subTools: any[],
            subHooks: any[]
          ) => {
            // Find the current parent message (last assistant message)
            const parentMessage = chatState.chatMessages.find(
              (msg) => msg.sender === 'assistant' && !msg.threadId
            );

            if (!parentMessage) {
              console.warn('No parent message found for thread');
              // Fallback to runPrompt
              const { runPrompt } = await import('./index.js');
              return await runPrompt(
                async (ctx) => {
                  return prompt;
                },
                runOptions
              );
            }

            // Create a new thread
            const threadId = `thread-${Date.now()}-${Math.random()}`;
            const thread: any = {
              id: threadId,
              subagentType: name,
              subagentPrompt: description,
              messages: [],
              toolCalls: [],
              status: 'running',
              startTime: new Date(),
              parentMessageId: parentMessage.id
            };

            // Add thread to state
            actions.createThread(thread);

            // Link thread to parent message
            actions.updateMessage(parentMessage.id, { threadId });

            try {
              // Resolve model and execute subagent
              const resolvedModel = resolveModelAlias(runOptions.model);
              const [provider, modelId] = resolvedModel.split(':');
              const modelInstance = await loadModelInstance(provider, modelId);

              const systemPrompts = runOptions.system || [];
              if (runOptions.responseSchema) {
                systemPrompts.push(createSchemaInstructions(runOptions.responseSchema));
              }

              // Create subagent state
              const subState: any = {
                messages: subMessages,
                tools: subTools,
                currentPrompt: prompt,
                toolCalls: [],
                streamingText: undefined
              };

              const updateSubState = () => {
                // Update thread messages when substate changes
                if (subState.streamingText) {
                  const lastThreadMessage = thread.messages[thread.messages.length - 1];
                  if (lastThreadMessage) {
                    actions.updateThread(threadId, {
                      messages: thread.messages.map((msg: any, idx: number) =>
                        idx === thread.messages.length - 1
                          ? { ...msg, content: subState.streamingText, isStreaming: true }
                          : msg
                      )
                    });
                  }
                }
              };

              // Convert tools
              const aiTools = convertToolsToAIFormat(subState.tools, subState, updateSubState);

              // Build conversation
              const conversationMessages = buildConversationMessages(
                subState.messages,
                subHooks,
                prompt
              );

              // Execute subagent
              const result = await executeAgent({
                modelInstance,
                systemPrompts,
                conversationMessages,
                aiTools,
                responseSchema: runOptions.responseSchema,
                state: subState,
                hooks: subHooks,
                promptResult: prompt,
                transformedMessages: applyMessageHooks([...subState.messages], subHooks),
                onStateUpdate: updateSubState
              });

              // Update thread as completed
              actions.updateThread(threadId, {
                status: 'completed',
                endTime: new Date()
              });

              return result;
            } catch (error) {
              // Update thread as failed
              actions.updateThread(threadId, {
                status: 'failed',
                endTime: new Date()
              });
              throw error;
            }
          }
        };

        // Create context with thread handler
        const ctx = createContext(messages, tools, hooks, threadHandler);

        // Execute user's prompt function
        const initialPrompt = await promptFn(ctx);

        // Add initial prompt as user message
        const initialMessage: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random()}`,
          sender: 'user',
          content: initialPrompt,
          timestamp: new Date(),
          isStreaming: false
        };
        actions.addMessage(initialMessage);

        const state = agentState;
        state.currentPrompt = initialPrompt;
        state.messages = messages;
        state.tools = tools;

        const updateState = () => {
          setAgentState({ ...state });
        };

        // Resolve model
        const resolvedModel = resolveModelAlias(model);
        const [provider, modelId] = resolvedModel.split(':');
        const modelInstance = await loadModelInstance(provider, modelId);

        // Build system prompts
        const systemPrompts = [...system];
        if (responseSchema) {
          systemPrompts.push(createSchemaInstructions(responseSchema));
        }

        // Convert tools to AI format
        const aiTools = convertToolsToAIFormat(state.tools, state, updateState);

        // Build conversation messages
        const conversationMessages = buildConversationMessages(
          state.messages,
          hooks,
          initialPrompt
        );

        // Execute the agent
        const result = await executeAgent({
          modelInstance,
          systemPrompts,
          conversationMessages,
          aiTools,
          responseSchema,
          state,
          hooks,
          promptResult: initialPrompt,
          transformedMessages: applyMessageHooks([...state.messages], hooks),
          onStateUpdate: updateState
        });

        // Add final response as assistant message
        const responseMessage: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random()}`,
          sender: 'assistant',
          content: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
          timestamp: new Date(),
          isStreaming: false
        };
        actions.addMessage(responseMessage);

        state.response = result;
        state.executionState = 'idle';
        setAgentState({ ...state });
        actions.setExecutionState('idle');

        if (onComplete) {
          onComplete(result);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setAgentState((prev) => ({
          ...prev,
          error: errorMessage,
          executionState: 'idle'
        }));
        actions.setExecutionState('idle');

        // Add error message
        const errorChatMessage: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random()}`,
          sender: 'system',
          content: `Error: ${errorMessage}`,
          timestamp: new Date(),
          isStreaming: false
        };
        actions.addMessage(errorChatMessage);

        if (onError) {
          onError(error instanceof Error ? error : new Error(String(error)));
        }
      } finally {
        setIsExecuting(false);
      }
    };

    executePrompt();
  }, []);

  // Convert AgentState tool calls to ChatMessage tool calls
  useEffect(() => {
    if (agentState.toolCalls && agentState.toolCalls.length > 0 && chatState.chatMessages.length > 0) {
      const lastMessage = chatState.chatMessages[chatState.chatMessages.length - 1];
      if (lastMessage.sender === 'assistant') {
        const lastToolCall = agentState.toolCalls[agentState.toolCalls.length - 1];

        const toolCall: ToolCall = {
          id: `tool-${Date.now()}-${Math.random()}`,
          tool: lastToolCall.tool,
          args: lastToolCall.args,
          result: lastToolCall.result,
          error: lastToolCall.error,
          status: lastToolCall.error ? 'error' : lastToolCall.result ? 'success' : 'running',
          startTime: new Date(),
          endTime: lastToolCall.result || lastToolCall.error ? new Date() : undefined
        };

        // Check if this tool call already exists
        const existingToolCalls = lastMessage.toolCalls || [];
        const alreadyExists = existingToolCalls.some(
          (tc) =>
            tc.tool === toolCall.tool && JSON.stringify(tc.args) === JSON.stringify(toolCall.args)
        );

        if (!alreadyExists) {
          actions.addToolCall(lastMessage.id, toolCall);
        }
      }
    }
  }, [agentState.toolCalls, chatState.chatMessages, actions]);

  // Handle streaming text
  useEffect(() => {
    if (agentState.streamingText && chatState.chatMessages.length > 0) {
      const lastMessage = chatState.chatMessages[chatState.chatMessages.length - 1];
      if (lastMessage.sender === 'assistant') {
        if (!chatState.streamingMessageId) {
          actions.startStreaming(lastMessage.id);
        }
        actions.updateStreaming(lastMessage.id, agentState.streamingText);
      }
    } else if (!agentState.streamingText && chatState.streamingMessageId) {
      actions.endStreaming(chatState.streamingMessageId);
    }
  }, [agentState.streamingText, chatState.chatMessages, chatState.streamingMessageId, actions]);

  const handlePause = () => {
    if (executionControl) {
      executionControl.pause();
    }
  };

  const handleResume = () => {
    if (executionControl) {
      executionControl.resume();
    }
  };

  const handleSendMessage = (message: string) => {
    // Add user message to chat
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      sender: 'user',
      content: message,
      timestamp: new Date(),
      isStreaming: false
    };
    actions.addMessage(userMessage);

    // Inject message into execution
    if (executionControl) {
      executionControl.injectMessage(message);
    }
  };

  // In headless mode, don't render UI
  if (headless) {
    return null;
  }

  return (
    <ChatContainer
      messages={chatState.chatMessages}
      threads={chatState.threads}
      isPaused={chatState.isPaused}
      isExecuting={isExecuting}
      executionState={chatState.executionState}
      streamingText={agentState.streamingText}
      streamingMessageId={chatState.streamingMessageId}
      modelName={model}
      agentLabel={label}
      onPause={handlePause}
      onResume={handleResume}
      onSendMessage={handleSendMessage}
    />
  );
};

export function runChatPrompt(
  promptFn: (ctx: PromptContext) => Promise<string> | string,
  options: AgentOptions & { label?: string } = { model: 'gpt-4o-mini' }
): Promise<any> {
  return new Promise((resolve, reject) => {
    // In headless mode, don't render UI at all
    if (options.headless) {
      // Import and use the regular runPrompt for headless execution
      import('./index.js').then(({ runPrompt }) => {
        runPrompt(promptFn, {
          model: options.model || 'gpt-4o-mini',
          responseSchema: options.responseSchema,
          system: options.system,
          label: options.label,
          plugins: options.plugins
        })
          .then(resolve)
          .catch(reject);
      });
      return;
    }

    const { unmount } = render(
      <AgentChatCLI
        promptFn={promptFn}
        {...options}
        onComplete={(result) => {
          unmount();
          resolve(result);
        }}
        onError={(error) => {
          unmount();
          reject(error);
        }}
      />
    );
  });
}

export { AgentChatCLI };
