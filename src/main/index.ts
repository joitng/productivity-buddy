import * as dotenv from 'dotenv';
import * as path from 'path';
import { app, BrowserWindow, ipcMain } from 'electron';

// Load environment variables from .env file
// Try multiple paths for dev vs packaged app
const envPaths = [
  path.join(process.cwd(), '.env'),
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../../../.env'),
];

// For packaged app, also try the resources path
if (app.isPackaged) {
  envPaths.unshift(path.join(process.resourcesPath, '.env'));
}

for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) break;
}
import { v4 as uuidv4 } from 'uuid';
import { createMainWindow, getMainWindow } from './windows/mainWindow';
import { registerDatabaseHandlers } from './ipc/databaseHandlers';
import { getDatabase, closeDatabase, schema } from '../database';
import { startAuthFlow, getAuthStatus, logout } from './services/googleAuth';
import { syncCalendars, startAutoSync, stopAutoSync } from './services/googleCalendar';
import { isChunkActiveOnDate } from '../shared/recurrence';
import type { RecurrenceRule } from '../shared/types';
import {
  showCheckInPopup,
  closeCheckInPopup,
  snoozeCheckIn,
  clearAllScheduledCheckIns,
  closeChunkEndPopup,
  snoozeChunkEnd,
  closeTimerEndPopup,
  getTimerDuration,
  getScheduledCheckIns,
  getScheduledChunkEnds,
  hasActiveSnooze,
  scheduleDelayedTimer,
  closeWinddownEndPopup,
  getPendingTimerDuration,
  setupPowerMonitor,
  setCurrentTask,
  getCurrentTask,
  closeReturningCheckInPopup,
  setTimerRunning,
  scheduleChunkStartsForToday,
} from './services/checkInScheduler';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let handlersRegistered = false;

const initializeApp = (): void => {
  if (handlersRegistered) return;
  handlersRegistered = true;

  // Initialize database first
  getDatabase();

  // Register IPC handlers (only once)
  registerDatabaseHandlers();
  registerGoogleHandlers();
  registerCheckInHandlers();

  // Start auto-sync if authenticated
  getAuthStatus().then((status) => {
    if (status.isAuthenticated) {
      startAutoSync(10); // Sync every 10 minutes
    }
  });

  // Set up power monitor for sleep/wake detection
  setupPowerMonitor();

  // Schedule chunk start notifications (shows returning check-in if no timer running)
  scheduleChunkStartsForToday();
};

const createWindow = (): void => {
  // Initialize app (registers handlers only once)
  initializeApp();

  // Create main window
  createMainWindow();
};

function registerGoogleHandlers(): void {
  ipcMain.handle('google:auth:start', async () => {
    const result = await startAuthFlow();
    if (result.success) {
      startAutoSync(10);
    }
    return result;
  });

  ipcMain.handle('google:auth:status', async () => {
    return getAuthStatus();
  });

  ipcMain.handle('google:auth:logout', async () => {
    stopAutoSync();
    await logout();
  });

  ipcMain.handle('google:sync', async () => {
    return syncCalendars();
  });
}

// Helper to find the currently active scheduled chunk based on time
function getCurrentActiveChunk(): { id: string; name: string } | null {
  try {
    const db = getDatabase();
    const chunks = db.select().from(schema.scheduledChunks).all();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes

    // Get overrides for today
    const overrides = db
      .select()
      .from(schema.chunkOverrides)
      .all()
      .filter((o) => o.date === todayStr);

    for (const chunk of chunks) {
      const recurrence = JSON.parse(chunk.recurrence) as RecurrenceRule;

      // Check if chunk is within its date range
      if (chunk.startDate && todayStr < chunk.startDate) continue;
      if (chunk.endDate && todayStr > chunk.endDate) continue;

      // Check if chunk is active today based on recurrence
      if (!isChunkActiveOnDate(recurrence, now)) continue;

      // Check for overrides
      const override = overrides.find((o) => o.chunkId === chunk.id);
      if (override?.action === 'skip') continue;

      // Get effective times and name
      const startTime = override?.modifiedStartTime || chunk.startTime;
      const endTime = override?.modifiedEndTime || chunk.endTime;
      const name = override?.modifiedName || chunk.name;

      // Parse start and end times
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      // Check if current time is within this chunk
      if (currentTime >= startMinutes && currentTime < endMinutes) {
        return { id: chunk.id, name };
      }
    }
  } catch (error) {
    console.error('[getCurrentActiveChunk] Error:', error);
  }
  return null;
}

function registerCheckInHandlers(): void {
  ipcMain.handle('checkin:submit', async (_, data) => {
    try {
      const db = getDatabase();
      const now = new Date().toISOString();

      // Extract nextTask before inserting (it's not a database column)
      const { nextTask, ...checkInData } = data;

      console.log('[CheckIn] Submitting check-in:', JSON.stringify(checkInData, null, 2));

      db.insert(schema.checkIns)
        .values({
          id: uuidv4(),
          ...checkInData,
          createdAt: now,
        })
        .run();

      console.log('[CheckIn] Check-in saved successfully');

      // Save the current task for next check-in (use nextTask if transitioning, otherwise taskTag)
      if (nextTask) {
        setCurrentTask(nextTask);
      } else if (data.taskTag) {
        setCurrentTask(data.taskTag);
      }

      closeCheckInPopup();

      // If user selected a delayed timer, schedule it
      if (data.delayedTimerMinutes && data.delayedTimerMinutes > 0) {
        scheduleDelayedTimer(data.delayedTimerMinutes, 3); // 3 minute wind-down
      }

      return { success: true };
    } catch (error) {
      console.error('[CheckIn] Failed to submit check-in:', error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('checkin:snooze', async () => {
    snoozeCheckIn(5);
  });

  ipcMain.handle('checkin:close', async () => {
    closeCheckInPopup();
  });

  // Chunk end notification handlers
  ipcMain.handle('chunkend:dismiss', async () => {
    closeChunkEndPopup();
  });

  ipcMain.handle('chunkend:snooze', async (_, minutes: number) => {
    snoozeChunkEnd(minutes);
  });

  // Refresh check-in schedule (no longer used - check-ins only happen on timer end)
  ipcMain.handle('checkin:refresh-schedule', async () => {
    // No-op: scheduled chunk check-ins are disabled
  });

  // Get scheduled notifications for debugging
  ipcMain.handle('debug:getScheduledNotifications', async () => {
    const checkIns = getScheduledCheckIns();
    const chunkEnds = getScheduledChunkEnds();
    const snoozes = hasActiveSnooze();
    return {
      checkIns: checkIns.map(c => ({
        ...c,
        scheduledTime: c.scheduledTime.toISOString(),
      })),
      chunkEnds: chunkEnds.map(c => ({
        ...c,
        scheduledTime: c.scheduledTime.toISOString(),
      })),
      activeSnoozes: snoozes,
    };
  });

  // Timer state tracking (for knowing whether to show returning check-in on chunk start)
  ipcMain.handle('timer:setRunning', async (_, running: boolean) => {
    setTimerRunning(running);
  });

  // Timer end notification handlers
  // All timers now trigger a check-in when they end
  ipcMain.handle('timerend:show', async (_, durationMinutes: number) => {
    console.log('[TimerEnd] Timer ended after', durationMinutes, 'minutes - showing check-in');
    setTimerRunning(false);

    // Try to find current active chunk
    const activeChunk = getCurrentActiveChunk();
    const chunkName = activeChunk ? activeChunk.name : `${durationMinutes} min Focus`;
    const chunkId = activeChunk ? activeChunk.id : 'timer-session';

    showCheckInPopup(chunkId, chunkName);
  });

  ipcMain.handle('timerend:dismiss', async () => {
    closeTimerEndPopup();
  });

  ipcMain.handle('timerend:restart', async () => {
    const duration = getTimerDuration();
    closeTimerEndPopup();
    return duration;
  });

  // Wind-down end notification handlers
  ipcMain.handle('winddownend:dismiss', async () => {
    closeWinddownEndPopup();
  });

  ipcMain.handle('winddownend:startTimer', async () => {
    const timerMinutes = getPendingTimerDuration();
    closeWinddownEndPopup();

    // Send message to main window to start the timer
    const mainWindow = getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('timer:start', timerMinutes);
      setTimerRunning(true);
    }
  });

  // Returning check-in handlers (for post-wake scenarios)
  ipcMain.handle('returning:submit', async (_, data: { taskDescription: string; timerMinutes: number }) => {
    // Save the current task for future check-ins
    setCurrentTask(data.taskDescription);
    closeReturningCheckInPopup();

    // Send message to main window to start the timer
    // When timer ends, it will automatically show a check-in (all timers do now)
    const mainWindow = getMainWindow();
    setTimerRunning(true);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('timer:start', data.timerMinutes);
      console.log('[Returning] Started timer for', data.timerMinutes, 'minutes');
    } else {
      console.log('[Returning] WARNING: Main window not available to start timer');
    }
  });

  ipcMain.handle('returning:dismiss', async () => {
    closeReturningCheckInPopup();
  });

  ipcMain.handle('returning:getCurrentTask', async () => {
    return getCurrentTask();
  });

  // Set current task (used by timer page)
  ipcMain.handle('task:setCurrent', async (_, task: string | null) => {
    setCurrentTask(task);
  });

  ipcMain.handle('task:getCurrent', async () => {
    return getCurrentTask();
  });
}

// This method will be called when Electron has finished initialization
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    clearAllScheduledCheckIns();
    stopAutoSync();
    closeDatabase();
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create a window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  clearAllScheduledCheckIns();
  stopAutoSync();
  closeDatabase();
});
