import React from 'react';

import { View } from '@/components/ui';

export const Frame = () => {
  return (
    <View className="flex-col items-center gap-2.5">
      <View
        className="h-1 w-[52px] rounded-[48px]"
        style={{ backgroundColor: '#b6b6b6' }}
      />
    </View>
  );
};
