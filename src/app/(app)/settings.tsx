import { router } from 'expo-router';
import React from 'react';

export default function Settings() {
  React.useEffect(() => {
    router.replace('/transit');
  }, []);

  return null;
}
