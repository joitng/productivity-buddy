import { BrowserWindow } from 'electron';
import { getDatabase, schema } from '../../database';
import type { ScheduledChunk, RecurrenceRule } from '../../shared/types';
import { isChunkActiveOnDate } from '../../shared/recurrence';

interface ScheduledCheckIn {
  chunkId: string;
  chunkName: string;
  scheduledTime: Date;
  timeout: NodeJS.Timeout;
}

interface ScheduledChunkEnd {
  chunkId: string;
  chunkName: string;
  scheduledTime: Date;
  timeout: NodeJS.Timeout;
}

let checkInWindow: BrowserWindow | null = null;
let chunkEndWindow: BrowserWindow | null = null;
let scheduledCheckIns: ScheduledCheckIn[] = [];
let scheduledChunkEnds: ScheduledChunkEnd[] = [];
let currentChunkId: string | null = null;
let currentChunkName: string | null = null;
let currentEndChunkName: string | null = null;
let snoozeTimeout: NodeJS.Timeout | null = null;
let chunkEndSnoozeTimeout: NodeJS.Timeout | null = null;
let checkInCounter: number = 0; // Track check-in count for break reminders

declare const CHECKIN_WINDOW_WEBPACK_ENTRY: string;
declare const CHECKIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;
declare const CHUNK_END_WINDOW_WEBPACK_ENTRY: string;
declare const CHUNK_END_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

export function scheduleCheckInsForToday(): void {
  // Clear existing scheduled check-ins
  clearAllScheduledCheckIns();

  const db = getDatabase();
  const chunks = db.select().from(schema.scheduledChunks).all();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Get overrides for today
  const overrides = db
    .select()
    .from(schema.chunkOverrides)
    .all()
    .filter((o) => o.date === todayStr);

  // Collect all potential check-ins first
  const allPotentialCheckIns: { chunkId: string; chunkName: string; time: Date }[] = [];

  for (const chunk of chunks) {
    const recurrence = JSON.parse(chunk.recurrence) as RecurrenceRule;

    // Check if chunk is within its date range
    if (chunk.startDate && todayStr < chunk.startDate) {
      continue; // Chunk hasn't started yet
    }
    if (chunk.endDate && todayStr > chunk.endDate) {
      continue; // Chunk has ended
    }

    // Check if chunk is active today based on recurrence pattern
    if (!isChunkActiveOnDate(recurrence, today)) {
      continue;
    }

    // Check for overrides
    const override = overrides.find((o) => o.chunkId === chunk.id);
    if (override?.action === 'skip') {
      continue;
    }

    // Get effective times
    const startTime = override?.modifiedStartTime || chunk.startTime;
    const endTime = override?.modifiedEndTime || chunk.endTime;
    const name = override?.modifiedName || chunk.name;

    // Calculate check-in times for this chunk
    const checkInTimes = calculateCheckInTimes(startTime, endTime, today);

    for (const checkInTime of checkInTimes) {
      // Only consider future check-ins
      if (checkInTime > new Date()) {
        allPotentialCheckIns.push({
          chunkId: chunk.id,
          chunkName: name,
          time: checkInTime,
        });
      }
    }
  }

  // Sort all check-ins by time
  allPotentialCheckIns.sort((a, b) => a.time.getTime() - b.time.getTime());

  // Filter to ensure minimum 25-minute gap between ALL check-ins
  const minGapMs = 25 * 60 * 1000;
  const filteredCheckIns: typeof allPotentialCheckIns = [];

  for (const checkIn of allPotentialCheckIns) {
    const lastCheckIn = filteredCheckIns[filteredCheckIns.length - 1];
    if (!lastCheckIn || checkIn.time.getTime() - lastCheckIn.time.getTime() >= minGapMs) {
      filteredCheckIns.push(checkIn);
    }
  }

  // Schedule the filtered check-ins
  for (const checkIn of filteredCheckIns) {
    const timeout = setTimeout(() => {
      showCheckInPopup(checkIn.chunkId, checkIn.chunkName);
    }, checkIn.time.getTime() - Date.now());

    scheduledCheckIns.push({
      chunkId: checkIn.chunkId,
      chunkName: checkIn.chunkName,
      scheduledTime: checkIn.time,
      timeout,
    });
  }

  console.log(`Scheduled ${scheduledCheckIns.length} check-ins for today`);

  // Schedule chunk end notifications
  scheduleChunkEndNotifications(chunks, overrides, today, todayStr);
}

function scheduleChunkEndNotifications(
  chunks: Array<{ id: string; name: string; startTime: string; endTime: string; recurrence: string; startDate: string | null; endDate: string | null }>,
  overrides: Array<{ chunkId: string; date: string; action: string; modifiedName: string | null; modifiedStartTime: string | null; modifiedEndTime: string | null }>,
  today: Date,
  todayStr: string
): void {
  // Clear existing scheduled chunk ends
  for (const chunkEnd of scheduledChunkEnds) {
    clearTimeout(chunkEnd.timeout);
  }
  scheduledChunkEnds = [];

  for (const chunk of chunks) {
    const recurrence = JSON.parse(chunk.recurrence) as RecurrenceRule;

    // Check if chunk is within its date range
    if (chunk.startDate && todayStr < chunk.startDate) {
      continue;
    }
    if (chunk.endDate && todayStr > chunk.endDate) {
      continue;
    }

    // Check if chunk is active today based on recurrence pattern
    if (!isChunkActiveOnDate(recurrence, today)) {
      continue;
    }

    // Check for overrides
    const override = overrides.find((o) => o.chunkId === chunk.id);
    if (override?.action === 'skip') {
      continue;
    }

    // Get effective end time and name
    const endTime = override?.modifiedEndTime || chunk.endTime;
    const name = override?.modifiedName || chunk.name;

    // Calculate end time for today
    const [endHour, endMin] = endTime.split(':').map(Number);
    const endDate = new Date(today);
    endDate.setHours(endHour, endMin, 0, 0);

    // Only schedule if end time is in the future
    if (endDate > new Date()) {
      const timeout = setTimeout(() => {
        showChunkEndPopup(chunk.id, name);
      }, endDate.getTime() - Date.now());

      scheduledChunkEnds.push({
        chunkId: chunk.id,
        chunkName: name,
        scheduledTime: endDate,
        timeout,
      });
    }
  }

  console.log(`Scheduled ${scheduledChunkEnds.length} chunk end notifications for today`);
}

function calculateCheckInTimes(startTime: string, endTime: string, date: Date): Date[] {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const startDate = new Date(date);
  startDate.setHours(startHour, startMin, 0, 0);

  const endDate = new Date(date);
  endDate.setHours(endHour, endMin, 0, 0);

  // Calculate chunk duration in minutes
  const durationMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60);

  // Skip if chunk is too short
  if (durationMinutes < 15) {
    return [];
  }

  // Calculate number of check-ins (~1 per 30 minutes, min 1, max 8)
  const numCheckIns = Math.min(8, Math.max(1, Math.floor(durationMinutes / 30)));

  // Buffer time at start and end (5 minutes)
  const bufferMinutes = 5;
  const usableStart = new Date(startDate.getTime() + bufferMinutes * 60 * 1000);
  const usableEnd = new Date(endDate.getTime() - bufferMinutes * 60 * 1000);
  const usableDuration = usableEnd.getTime() - usableStart.getTime();

  if (usableDuration <= 0) {
    return [];
  }

  // Divide into segments and place one check-in randomly in each
  const segmentDuration = usableDuration / numCheckIns;
  const checkInTimes: Date[] = [];
  const minGapMs = 25 * 60 * 1000; // 25 minutes minimum gap

  for (let i = 0; i < numCheckIns; i++) {
    const segmentStart = usableStart.getTime() + i * segmentDuration;
    const segmentEnd = segmentStart + segmentDuration;

    // Random time within segment
    let checkInTime = new Date(segmentStart + Math.random() * (segmentEnd - segmentStart));

    // Ensure minimum gap from previous check-in
    if (checkInTimes.length > 0) {
      const lastCheckIn = checkInTimes[checkInTimes.length - 1];
      const minTime = new Date(lastCheckIn.getTime() + minGapMs);
      if (checkInTime < minTime) {
        checkInTime = minTime;
      }
    }

    // Don't exceed usable end time
    if (checkInTime < usableEnd) {
      checkInTimes.push(checkInTime);
    }
  }

  return checkInTimes;
}

export function showCheckInPopup(chunkId: string, chunkName: string): void {
  // Increment counter and determine if this is a break reminder check-in
  checkInCounter++;
  const showBreakReminder = checkInCounter % 2 === 0;

  if (checkInWindow && !checkInWindow.isDestroyed()) {
    checkInWindow.focus();
    checkInWindow.webContents.send('checkin:show', chunkId, chunkName, showBreakReminder);
    return;
  }

  currentChunkId = chunkId;
  currentChunkName = chunkName;

  checkInWindow = new BrowserWindow({
    width: 400,
    height: 580,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: CHECKIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  checkInWindow.loadURL(CHECKIN_WINDOW_WEBPACK_ENTRY);

  // Center on screen
  checkInWindow.center();

  checkInWindow.webContents.on('did-finish-load', () => {
    checkInWindow?.webContents.send('checkin:show', chunkId, chunkName, showBreakReminder);
  });

  checkInWindow.on('closed', () => {
    checkInWindow = null;
    currentChunkId = null;
    currentChunkName = null;
  });
}

export function closeCheckInPopup(): void {
  if (checkInWindow && !checkInWindow.isDestroyed()) {
    checkInWindow.close();
  }
  checkInWindow = null;
}

export function showChunkEndPopup(chunkId: string, chunkName: string): void {
  if (chunkEndWindow && !chunkEndWindow.isDestroyed()) {
    chunkEndWindow.focus();
    chunkEndWindow.webContents.send('chunkend:show', chunkName);
    return;
  }

  currentEndChunkName = chunkName;

  chunkEndWindow = new BrowserWindow({
    width: 350,
    height: 250,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: CHUNK_END_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  chunkEndWindow.loadURL(CHUNK_END_WINDOW_WEBPACK_ENTRY);

  // Center on screen
  chunkEndWindow.center();

  chunkEndWindow.webContents.on('did-finish-load', () => {
    chunkEndWindow?.webContents.send('chunkend:show', chunkName);
  });

  chunkEndWindow.on('closed', () => {
    chunkEndWindow = null;
    currentEndChunkName = null;
  });
}

export function closeChunkEndPopup(): void {
  if (chunkEndWindow && !chunkEndWindow.isDestroyed()) {
    chunkEndWindow.close();
  }
  chunkEndWindow = null;
}

export function snoozeChunkEnd(minutes: number = 5): void {
  closeChunkEndPopup();

  if (currentEndChunkName) {
    const chunkName = currentEndChunkName;

    chunkEndSnoozeTimeout = setTimeout(() => {
      showChunkEndPopup('', chunkName);
    }, minutes * 60 * 1000);
  }
}

export function snoozeCheckIn(minutes: number = 5): void {
  closeCheckInPopup();

  if (currentChunkId && currentChunkName) {
    const chunkId = currentChunkId;
    const chunkName = currentChunkName;

    snoozeTimeout = setTimeout(() => {
      showCheckInPopup(chunkId, chunkName);
    }, minutes * 60 * 1000);
  }
}

export function clearAllScheduledCheckIns(): void {
  for (const checkIn of scheduledCheckIns) {
    clearTimeout(checkIn.timeout);
  }
  scheduledCheckIns = [];

  for (const chunkEnd of scheduledChunkEnds) {
    clearTimeout(chunkEnd.timeout);
  }
  scheduledChunkEnds = [];

  if (snoozeTimeout) {
    clearTimeout(snoozeTimeout);
    snoozeTimeout = null;
  }

  if (chunkEndSnoozeTimeout) {
    clearTimeout(chunkEndSnoozeTimeout);
    chunkEndSnoozeTimeout = null;
  }
}

export function getScheduledCheckIns(): { chunkId: string; chunkName: string; scheduledTime: Date }[] {
  return scheduledCheckIns.map(({ chunkId, chunkName, scheduledTime }) => ({
    chunkId,
    chunkName,
    scheduledTime,
  }));
}
