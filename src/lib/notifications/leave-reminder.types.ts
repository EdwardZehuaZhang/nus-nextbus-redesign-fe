export type LeaveReminderState = {
  enabled: boolean;
  arrivalTimeISO: string;
  leaveTimeISO: string;
  routeSignature: string;
  notificationId?: string;
  originName: string;
  destinationName: string;
};