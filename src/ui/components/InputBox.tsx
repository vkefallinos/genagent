import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { PauseButton } from './PauseButton';

interface InputBoxProps {
  onSendMessage: (message: string) => void;
  onPause: () => void;
  onResume: () => void;
  isPaused: boolean;
  isExecuting: boolean;
  disabled?: boolean;
  focused?: boolean;
}

export const InputBox: React.FC<InputBoxProps> = ({
  onSendMessage,
  onPause,
  onResume,
  isPaused,
  isExecuting,
  disabled = false,
  focused = true
}) => {
  const [input, setInput] = useState('');
  const [pauseButtonFocused, setPauseButtonFocused] = useState(false);

  useInput((inputChar, key) => {
    if (!focused) return;

    // Handle Ctrl+P for pause/resume
    if (key.ctrl && inputChar === 'p') {
      if (isPaused) {
        onResume();
      } else {
        onPause();
      }
      return;
    }

    // Handle left arrow for pause, right arrow for resume
    if (key.leftArrow && isExecuting && !pauseButtonFocused) {
      if (!isPaused) {
        onPause();
      }
      return;
    }

    if (key.rightArrow && isExecuting && !pauseButtonFocused) {
      if (isPaused) {
        onResume();
      }
      return;
    }

    // Handle Tab to toggle focus
    if (key.tab) {
      setPauseButtonFocused(!pauseButtonFocused);
      return;
    }

    // Handle pause button when focused
    if (pauseButtonFocused) {
      if (key.return || inputChar === ' ') {
        if (isPaused) {
          onResume();
        } else {
          onPause();
        }
      }
      // Also handle left/right arrows when pause button is focused
      if (key.leftArrow) {
        if (!isPaused) onPause();
      }
      if (key.rightArrow) {
        if (isPaused) onResume();
      }
      return;
    }
  });

  const handleSubmit = (value: string) => {
    if (value.trim()) {
      onSendMessage(value.trim());
      setInput('');
    }
  };

  return (
    <Box borderStyle="round" borderColor={focused ? 'cyan' : 'gray'} paddingX={1}>
      <Box marginRight={1}>
        <PauseButton
          isPaused={isPaused}
          isExecuting={isExecuting}
          onToggle={isPaused ? onResume : onPause}
          focused={pauseButtonFocused}
        />
      </Box>
      <Box flexDirection="column" flexGrow={1}>
        {focused && !pauseButtonFocused ? (
          <TextInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            placeholder="Type a message..."
            showCursor={true}
          />
        ) : (
          <Text dimColor>
            {input || 'Type a message...'}
          </Text>
        )}
        <Text dimColor>
          {focused && !pauseButtonFocused ? 'Enter to send · ←→ pause/resume · Ctrl+P pause/resume' : 'Tab to switch focus · ←→ pause/resume'}
        </Text>
      </Box>
    </Box>
  );
};
