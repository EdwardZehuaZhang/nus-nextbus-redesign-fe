import type { LeaveReminderState } from './leave-reminder.types';

export const getLeaveReminderState = () => null as LeaveReminderState | null;

export const setLeaveReminderState = async (_state: LeaveReminderState) => {};

export const clearLeaveReminderState = async () => {};

export const requestLeaveReminderPermissions = async (): Promise<boolean> => false;

export const scheduleLeaveReminderNotification = async (_params: {
  leaveTime: Date;
  originName: string;
  destinationName: string;
}): Promise<string | null> => null;

export const cancelLeaveReminderNotification = async (_notificationId?: string | null) => {};