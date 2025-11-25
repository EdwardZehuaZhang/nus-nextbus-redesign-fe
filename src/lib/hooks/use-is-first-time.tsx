import { useState, useCallback } from 'react';
import { storage, getItem, setItem } from '../storage';

const IS_FIRST_TIME = 'IS_FIRST_TIME';

export const useIsFirstTime = () => {
  const [isFirstTime, setIsFirstTimeState] = useState<boolean>(() => {
    const stored = getItem<boolean>(IS_FIRST_TIME);
    return stored === null ? true : stored;
  });

  const setIsFirstTime = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    const newValue = typeof value === 'function' ? value(isFirstTime) : value;
    setIsFirstTimeState(newValue);
    setItem(IS_FIRST_TIME, newValue);
  }, [isFirstTime]);

  return [isFirstTime, setIsFirstTime] as const;
};
