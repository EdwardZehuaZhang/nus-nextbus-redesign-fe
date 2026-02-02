import React, { useEffect, useState } from 'react';
import { Text } from '@/components/ui';

const AnimatedDots = ({ interval = 500 }: { interval?: number }) => {
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setDotCount((prev) => (prev === 3 ? 1 : prev + 1));
    }, interval);

    return () => clearInterval(timer);
  }, [interval]);

  return <Text>{'.'.repeat(dotCount)}</Text>;
};

export { AnimatedDots };
