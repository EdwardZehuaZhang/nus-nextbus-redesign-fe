import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

interface KeyboardAwareOptions {
  autoExpand?: boolean;
  maxHeight?: number;
  snapToHeight?: (height: number) => void;
  onKeyboardShow?: (height: number) => void;
  onKeyboardHide?: () => void;
  debounceMs?: number;
}

export const useKeyboardAwareInteraction = (options: KeyboardAwareOptions = {}) => {
  const {
    autoExpand = true,
    maxHeight,
    snapToHeight,
    onKeyboardShow,
    onKeyboardHide,
    debounceMs = 50,
  } = options;

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const handleShow = (e: any) => {
      const height = e?.endCoordinates?.height ?? 0;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        setKeyboardHeight(height);
        setIsKeyboardVisible(true);
        onKeyboardShow?.(height);
        if (autoExpand && snapToHeight && typeof maxHeight === 'number') {
          snapToHeight(maxHeight);
        }
      }, debounceMs);
    };

    const handleHide = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
        onKeyboardHide?.();
      }, debounceMs);
    };

    const showListener = Keyboard.addListener(showEvent, handleShow);
    const hideListener = Keyboard.addListener(hideEvent, handleHide);

    return () => {
      showListener.remove();
      hideListener.remove();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [autoExpand, debounceMs, maxHeight, onKeyboardHide, onKeyboardShow, snapToHeight]);

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  return { isKeyboardVisible, keyboardHeight, dismissKeyboard };
};
