// Recurrence types
export type RecurrenceType = 'once' | 'weekly' | 'biweekly' | 'monthly' | 'nth_weekday';

export interface RecurrenceRule {
  type: RecurrenceType;
  daysOfWeek?: number[]; // 0-6 for Sunday-Saturday
  dayOfMonth?: number; // 1-31 for monthly
  nthWeek?: number; // 1-5 for nth weekday of month
  weekday?: number; // 0-6 for nth weekday
  specificDate?: string; // YYYY-MM-DD for 'once' type
  anchorDate?: string; // YYYY-MM-DD for biweekly - the starting reference date
}

// Scheduled Chunks
export interface ScheduledChunk {
  id: string;
  name: string;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  recurrence: RecurrenceRule;
  color?: string;
  startDate?: string; // YYYY-MM-DD - when the chunk becomes active
  endDate?: string; // YYYY-MM-DD - when the chunk stops being active
  createdAt: string;
  updatedAt: string;
}

export interface ChunkOverride {
  id: string;
  chunkId: string;
  date: string; // YYYY-MM-DD
  action: 'skip' | 'modify';
  modifiedName?: string;
  modifiedStartTime?: string;
  modifiedEndTime?: string;
  modifiedColor?: string;
  createdAt: string;
}

// Day Labels
export interface DayLabel {
  id: string;
  label: string;
  color: string;
  emoji?: string;
  recurrence: RecurrenceRule;
  createdAt: string;
  updatedAt: string;
}

export interface DayLabelOverride {
  id: string;
  dayLabelId: string;
  date: string; // YYYY-MM-DD
  action: 'skip' | 'modify';
  modifiedLabel?: string;
  modifiedColor?: string;
  modifiedEmoji?: string;
  createdAt: string;
}

// Check-ins
export interface CheckIn {
  id: string;
  chunkId: string;
  chunkName: string;
  timestamp: string;
  onTask: boolean;
  taskTag?: string; // What task the user is actually working on
  flowRating: number; // 1-5
  moodRating: number; // 1-5
  comments?: string;
  // Off-task follow-up fields
  wantsDopamineBoost?: boolean; // null/undefined if on-task
  selectedSide?: string; // Selected dopamine menu side item
  delayedTimerMinutes?: number; // 10, 15, or 25 (null if not selected)
  createdAt: string;
}

// Dopamine Menu
export type DopamineMenuCategory = 'appetizers' | 'mains' | 'sides' | 'desserts';

export interface DopamineMenuItem {
  id: string;
  category: DopamineMenuCategory;
  name: string;
  createdAt: string;
}

// Google Calendar
export interface GoogleCalendarEvent {
  id: string;
  googleEventId: string;
  calendarId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  isFixed: boolean;
  lastSyncedAt: string;
}

export interface SyncedCalendar {
  id: string;
  googleCalendarId: string;
  name: string;
  color?: string;
  isEnabled: boolean;
  lastSyncedAt?: string;
}

export interface GoogleAuthTokens {
  id: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

// App Settings
export interface AppSetting {
  key: string;
  value: string;
}

// Calendar display types
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: {
    type: 'chunk' | 'google' | 'label';
    color?: string;
    isFixed?: boolean;
    originalData?: ScheduledChunk | GoogleCalendarEvent | DayLabel;
  };
}

// IPC Channel types
export type IpcChannels = {
  // Database operations
  'db:chunks:getAll': () => ScheduledChunk[];
  'db:chunks:create': (chunk: Omit<ScheduledChunk, 'id' | 'createdAt' | 'updatedAt'>) => ScheduledChunk;
  'db:chunks:update': (id: string, chunk: Partial<ScheduledChunk>) => ScheduledChunk;
  'db:chunks:delete': (id: string) => void;

  'db:chunk-overrides:getByDateRange': (startDate: string, endDate: string) => ChunkOverride[];
  'db:chunk-overrides:create': (override: Omit<ChunkOverride, 'id' | 'createdAt'>) => ChunkOverride;
  'db:chunk-overrides:delete': (id: string) => void;

  'db:day-labels:getAll': () => DayLabel[];
  'db:day-labels:create': (label: Omit<DayLabel, 'id' | 'createdAt' | 'updatedAt'>) => DayLabel;
  'db:day-labels:update': (id: string, label: Partial<DayLabel>) => DayLabel;
  'db:day-labels:delete': (id: string) => void;

  'db:day-label-overrides:getByDateRange': (startDate: string, endDate: string) => DayLabelOverride[];
  'db:day-label-overrides:create': (override: Omit<DayLabelOverride, 'id' | 'createdAt'>) => DayLabelOverride;
  'db:day-label-overrides:delete': (id: string) => void;

  'db:check-ins:create': (checkIn: Omit<CheckIn, 'id' | 'createdAt'>) => CheckIn;
  'db:check-ins:getByDateRange': (startDate: string, endDate: string) => CheckIn[];

  'db:google-events:getByDateRange': (startDate: string, endDate: string) => GoogleCalendarEvent[];
  'db:google-events:toggleFixed': (id: string, isFixed: boolean) => void;

  'db:synced-calendars:getAll': () => SyncedCalendar[];
  'db:synced-calendars:toggle': (id: string, isEnabled: boolean) => void;

  'db:settings:get': (key: string) => string | null;
  'db:settings:set': (key: string, value: string) => void;

  // Google Auth
  'google:auth:start': () => { success: boolean; error?: string };
  'google:auth:status': () => { isAuthenticated: boolean; email?: string };
  'google:auth:logout': () => void;
  'google:sync': () => { success: boolean; error?: string };

  // Check-in popup
  'checkin:show': (chunkId: string, chunkName: string) => void;
  'checkin:submit': (data: Omit<CheckIn, 'id' | 'createdAt'>) => void;
  'checkin:snooze': () => void;
  'checkin:close': () => void;
};
