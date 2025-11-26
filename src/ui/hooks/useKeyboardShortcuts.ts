import { useEffect, useRef } from 'react';

export function useKeyboardShortcuts(callbacks: {
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onFocusInput?: () => void;
  onEscape?: () => void;
}) {
  const callbacksRef = useRef(callbacks);

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  // Note: Actual keyboard handling is done via useInput in components
  // This hook is a placeholder for centralized shortcut management
  return {};
}
