import { app, BrowserWindow, ipcMain } from 'electron';
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
} from './services/checkInScheduler';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = (): void => {
  // Initialize database first
  getDatabase();

  // Register IPC handlers
  registerDatabaseHandlers();
  registerGoogleHandlers();
  registerCheckInHandlers();

  // Create main window
  createMainWindow();

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
