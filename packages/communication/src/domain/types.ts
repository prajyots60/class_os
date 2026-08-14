export type AnnouncementTargetType = 'institute' | 'batch';
export type AnnouncementStatus = 'draft' | 'published' | 'archived';

export type NotificationRecipientType = 'staff' | 'parent' | 'student';
export type NotificationPriority = 'critical' | 'important' | 'informational';
export type NotificationCategory =
  | 'attendance'
  | 'fee'
  | 'assessment'
  | 'homework'
  | 'announcement'
  | 'emergency'
  | 'general';
export type NotificationChannel = 'in_app';
