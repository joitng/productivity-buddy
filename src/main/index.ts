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
import {
  scheduleCheckInsForToday,
  closeCheckInPopup,
  snoozeCheckIn,
  clearAllScheduledCheckIns,
  closeChunkEndPopup,
  snoozeChunkEnd,
  showTimerEndPopup,
  closeTimerEndPopup,
  getTimerDuration,
  getScheduledCheckIns,
  getScheduledChunkEnds,
  hasActiveSnooze,
  scheduleDelayedTimer,
  closeWinddownEndPopup,
  getPendingTimerDuration,
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

  // Schedule check-ins for today
  scheduleCheckInsForToday();

  // Reschedule check-ins at midnight
  scheduleNextDayCheckIns();
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

function registerCheckInHandlers(): void {
  ipcMain.handle('checkin:submit', async (_, data) => {
    const db = getDatabase();
    const now = new Date().toISOString();

    db.insert(schema.checkIns)
      .values({
        id: uuidv4(),
        ...data,
        createdAt: now,
      })
      .run();

    closeCheckInPopup();

    // If user selected a delayed timer, schedule it
    if (data.delayedTimerMinutes && data.delayedTimerMinutes > 0) {
      scheduleDelayedTimer(data.delayedTimerMinutes, 3); // 3 minute wind-down
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

  // Refresh check-in schedule (called when chunks are updated)
  ipcMain.handle('checkin:refresh-schedule', async () => {
    scheduleCheckInsForToday();
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

  // Timer end notification handlers
  ipcMain.handle('timerend:show', async (_, durationMinutes: number) => {
    showTimerEndPopup(durationMinutes);
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
    }
  });
}

function scheduleNextDayCheckIns(): void {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const msUntilMidnight = tomorrow.getTime() - now.getTime();

  setTimeout(() => {
    scheduleCheckInsForToday();
    scheduleNextDayCheckIns(); // Schedule for the next day
  }, msUntilMidnight);
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
