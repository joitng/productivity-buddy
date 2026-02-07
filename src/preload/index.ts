import { contextBridge, ipcRenderer } from 'electron';
import type {
  ScheduledChunk,
  ChunkOverride,
  DayLabel,
  DayLabelOverride,
  CheckIn,
  GoogleCalendarEvent,
  SyncedCalendar,
  DopamineMenuItem,
  DopamineMenuCategory,
} from '../shared/types';

const electronAPI = {
  // Chunks
  chunks: {
    getAll: (): Promise<ScheduledChunk[]> => ipcRenderer.invoke('db:chunks:getAll'),
    create: (chunk: Omit<ScheduledChunk, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScheduledChunk> =>
      ipcRenderer.invoke('db:chunks:create', chunk),
    update: (id: string, chunk: Partial<ScheduledChunk>): Promise<ScheduledChunk> =>
      ipcRenderer.invoke('db:chunks:update', id, chunk),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('db:chunks:delete', id),
  },

  // Chunk Overrides
  chunkOverrides: {
    getByDateRange: (startDate: string, endDate: string): Promise<ChunkOverride[]> =>
      ipcRenderer.invoke('db:chunk-overrides:getByDateRange', startDate, endDate),
    create: (override: Omit<ChunkOverride, 'id' | 'createdAt'>): Promise<ChunkOverride> =>
      ipcRenderer.invoke('db:chunk-overrides:create', override),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('db:chunk-overrides:delete', id),
  },

  // Day Labels
  dayLabels: {
    getAll: (): Promise<DayLabel[]> => ipcRenderer.invoke('db:day-labels:getAll'),
    create: (label: Omit<DayLabel, 'id' | 'createdAt' | 'updatedAt'>): Promise<DayLabel> =>
      ipcRenderer.invoke('db:day-labels:create', label),
    update: (id: string, label: Partial<DayLabel>): Promise<DayLabel> =>
      ipcRenderer.invoke('db:day-labels:update', id, label),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('db:day-labels:delete', id),
  },

  // Day Label Overrides
  dayLabelOverrides: {
    getByDateRange: (startDate: string, endDate: string): Promise<DayLabelOverride[]> =>
      ipcRenderer.invoke('db:day-label-overrides:getByDateRange', startDate, endDate),
    create: (override: Omit<DayLabelOverride, 'id' | 'createdAt'>): Promise<DayLabelOverride> =>
      ipcRenderer.invoke('db:day-label-overrides:create', override),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('db:day-label-overrides:delete', id),
  },

  // Check-ins
  checkIns: {
    create: (checkIn: Omit<CheckIn, 'id' | 'createdAt'>): Promise<CheckIn> =>
      ipcRenderer.invoke('db:check-ins:create', checkIn),
    getByDateRange: (startDate: string, endDate: string): Promise<CheckIn[]> =>
      ipcRenderer.invoke('db:check-ins:getByDateRange', startDate, endDate),
    getAll: (): Promise<CheckIn[]> =>
      ipcRenderer.invoke('db:check-ins:getAll'),
    getUniqueTags: (): Promise<string[]> =>
      ipcRenderer.invoke('db:check-ins:getUniqueTags'),
  },

  // Google Calendar Events
  googleEvents: {
    getByDateRange: (startDate: string, endDate: string): Promise<GoogleCalendarEvent[]> =>
      ipcRenderer.invoke('db:google-events:getByDateRange', startDate, endDate),
    toggleFixed: (id: string, isFixed: boolean): Promise<void> =>
      ipcRenderer.invoke('db:google-events:toggleFixed', id, isFixed),
    delete: (id: string): Promise<void> =>
      ipcRenderer.invoke('db:google-events:delete', id),
  },

  // Synced Calendars
  syncedCalendars: {
    getAll: (): Promise<SyncedCalendar[]> => ipcRenderer.invoke('db:synced-calendars:getAll'),
    toggle: (id: string, isEnabled: boolean): Promise<void> =>
      ipcRenderer.invoke('db:synced-calendars:toggle', id, isEnabled),
  },

  // App Settings
  settings: {
    get: (key: string): Promise<string | null> => ipcRenderer.invoke('db:settings:get', key),
    set: (key: string, value: string): Promise<void> => ipcRenderer.invoke('db:settings:set', key, value),
  },

  // Google Auth
  google: {
    startAuth: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('google:auth:start'),
    getStatus: (): Promise<{ isAuthenticated: boolean; email?: string }> => ipcRenderer.invoke('google:auth:status'),
    logout: (): Promise<void> => ipcRenderer.invoke('google:auth:logout'),
    sync: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('google:sync'),
  },

  // Check-in popup
  checkIn: {
    submit: (data: Omit<CheckIn, 'id' | 'createdAt'> & { nextTask?: string }): Promise<void> =>
      ipcRenderer.invoke('checkin:submit', data),
    snooze: (): Promise<void> => ipcRenderer.invoke('checkin:snooze'),
    close: (): Promise<void> => ipcRenderer.invoke('checkin:close'),
    refreshSchedule: (): Promise<void> => ipcRenderer.invoke('checkin:refresh-schedule'),
    onShow: (callback: (chunkId: string, chunkName: string, showBreakReminder: boolean, currentTask: string | null) => void): void => {
      ipcRenderer.on('checkin:show', (_, chunkId, chunkName, showBreakReminder, currentTask) => callback(chunkId, chunkName, showBreakReminder, currentTask));
    },
  },

  // Chunk end notification popup
  chunkEnd: {
    dismiss: (): Promise<void> => ipcRenderer.invoke('chunkend:dismiss'),
    snooze: (minutes: number): Promise<void> => ipcRenderer.invoke('chunkend:snooze', minutes),
    onShow: (callback: (chunkName: string) => void): void => {
      ipcRenderer.on('chunkend:show', (_, chunkName) => callback(chunkName));
    },
  },

  // Timer end notification popup
  timerEnd: {
    show: (durationMinutes: number): Promise<void> => ipcRenderer.invoke('timerend:show', durationMinutes),
    dismiss: (): Promise<void> => ipcRenderer.invoke('timerend:dismiss'),
    restart: (): Promise<number> => ipcRenderer.invoke('timerend:restart'),
    onShow: (callback: (durationMinutes: number) => void): void => {
      ipcRenderer.on('timerend:show', (_, durationMinutes) => callback(durationMinutes));
    },
  },

  // Wind-down end notification popup (for delayed timer)
  winddownEnd: {
    dismiss: (): Promise<void> => ipcRenderer.invoke('winddownend:dismiss'),
    startTimer: (): Promise<void> => ipcRenderer.invoke('winddownend:startTimer'),
    onShow: (callback: (timerMinutes: number) => void): void => {
      ipcRenderer.on('winddownend:show', (_, timerMinutes) => callback(timerMinutes));
    },
  },

  // Timer control (for starting timer from main process)
  timer: {
    onStart: (callback: (minutes: number) => void): void => {
      ipcRenderer.on('timer:start', (_, minutes) => callback(minutes));
    },
  },

  // Returning check-in popup (post-wake scenarios)
  returning: {
    submit: (data: { taskDescription: string; timerMinutes: number }): Promise<void> =>
      ipcRenderer.invoke('returning:submit', data),
    dismiss: (): Promise<void> => ipcRenderer.invoke('returning:dismiss'),
    getCurrentTask: (): Promise<string | null> => ipcRenderer.invoke('returning:getCurrentTask'),
    onShow: (callback: (previousTask: string | null) => void): void => {
      ipcRenderer.on('returning:show', (_, previousTask) => callback(previousTask));
    },
  },

  // Debug utilities
  debug: {
    getScheduledNotifications: (): Promise<{
      checkIns: Array<{ chunkId: string; chunkName: string; scheduledTime: string }>;
      chunkEnds: Array<{ chunkId: string; chunkName: string; scheduledTime: string }>;
      activeSnoozes: { checkIn: boolean; chunkEnd: boolean };
    }> => ipcRenderer.invoke('debug:getScheduledNotifications'),
  },

  // Dopamine Menu
  dopamineMenu: {
    getAll: (): Promise<DopamineMenuItem[]> => ipcRenderer.invoke('db:dopamine-menu:getAll'),
    getByCategory: (category: DopamineMenuCategory): Promise<DopamineMenuItem[]> =>
      ipcRenderer.invoke('db:dopamine-menu:getByCategory', category),
    create: (item: Omit<DopamineMenuItem, 'id' | 'createdAt'>): Promise<DopamineMenuItem> =>
      ipcRenderer.invoke('db:dopamine-menu:create', item),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('db:dopamine-menu:delete', id),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for renderer
declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}
