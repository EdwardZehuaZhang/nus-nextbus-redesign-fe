import { Platform } from 'react-native';

import { getItem, removeItem, setItem } from '@/lib/storage';
import type { LeaveReminderState } from './leave-reminder.types';

const LEAVE_REMINDER_KEY = 'leave_reminder';

let Notifications: typeof import('expo-notifications') | null = null;
let notificationsInitialized = false;

async function initializeNotifications() {
  if (notificationsInitialized) return;
  if (Platform.OS === 'web') return;

  try {
    const expoNotifications = await import('expo-notifications');
    Notifications = expoNotifications;
    expoNotifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    notificationsInitialized = true;
  } catch (error) {
    console.warn('Failed to initialize expo-notifications:', error);
  }
}

export const getLeaveReminderState = () => getItem<LeaveReminderState>(LEAVE_REMINDER_KEY);

export const setLeaveReminderState = async (state: LeaveReminderState) => {
  await setItem(LEAVE_REMINDER_KEY, state);
};

export const clearLeaveReminderState = async () => {
  await removeItem(LEAVE_REMINDER_KEY);
};

export const requestLeaveReminderPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;

  await initializeNotifications();
  if (!Notifications) return false;

  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return !!requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
};

export const scheduleLeaveReminderNotification = async (params: {
  leaveTime: Date;
  originName: string;
  destinationName: string;
}): Promise<string | null> => {
  if (Platform.OS === 'web') return null;

  await initializeNotifications();
  if (!Notifications) return null;

  const now = Date.now();
  if (params.leaveTime.getTime() <= now) {
    return null;
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time to leave',
      body: `Leave now to arrive at ${params.destinationName} on time.`,
      sound: true,
      data: {
        originName: params.originName,
        destinationName: params.destinationName,
      },
    },
    trigger: params.leaveTime,
  });
};

export const cancelLeaveReminderNotification = async (notificationId?: string | null) => {
  if (Platform.OS === 'web') return;
  if (!notificationId) return;
  
  await initializeNotifications();
  if (!Notifications) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.warn('Failed to cancel leave reminder notification:', error);
  }
};
