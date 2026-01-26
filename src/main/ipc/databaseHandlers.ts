import { ipcMain } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, gte, lte } from 'drizzle-orm';
import { getDatabase, schema } from '../../database';
import type { ScheduledChunk, ChunkOverride, DayLabel, DayLabelOverride, CheckIn, RecurrenceRule } from '../../shared/types';

export function registerDatabaseHandlers(): void {
  const db = getDatabase();

  // Scheduled Chunks
  ipcMain.handle('db:chunks:getAll', async () => {
    const chunks = db.select().from(schema.scheduledChunks).all();
    return chunks.map((c) => ({
      ...c,
      recurrence: JSON.parse(c.recurrence) as RecurrenceRule,
    }));
  });

  ipcMain.handle('db:chunks:create', async (_, chunk: Omit<ScheduledChunk, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newChunk = {
      id: uuidv4(),
      ...chunk,
      recurrence: JSON.stringify(chunk.recurrence),
      createdAt: now,
      updatedAt: now,
    };
    db.insert(schema.scheduledChunks).values(newChunk).run();
    return {
      ...newChunk,
      recurrence: chunk.recurrence,
    };
  });

  ipcMain.handle('db:chunks:update', async (_, id: string, chunk: Partial<ScheduledChunk>) => {
    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = { updatedAt: now };

    // Explicitly handle each field to ensure undefined values become null
    if ('name' in chunk) updateData.name = chunk.name;
    if ('startTime' in chunk) updateData.startTime = chunk.startTime;
    if ('endTime' in chunk) updateData.endTime = chunk.endTime;
    if ('color' in chunk) updateData.color = chunk.color ?? null;
    if ('startDate' in chunk) updateData.startDate = chunk.startDate ?? null;
    if ('endDate' in chunk) updateData.endDate = chunk.endDate ?? null;
    if ('recurrence' in chunk && chunk.recurrence) {
      updateData.recurrence = JSON.stringify(chunk.recurrence);
    }

    db.update(schema.scheduledChunks).set(updateData).where(eq(schema.scheduledChunks.id, id)).run();
    const updated = db.select().from(schema.scheduledChunks).where(eq(schema.scheduledChunks.id, id)).get();
    if (!updated) throw new Error('Chunk not found');
    return {
      ...updated,
      recurrence: JSON.parse(updated.recurrence) as RecurrenceRule,
    };
  });

  ipcMain.handle('db:chunks:delete', async (_, id: string) => {
    db.delete(schema.scheduledChunks).where(eq(schema.scheduledChunks.id, id)).run();
  });

  // Chunk Overrides
  ipcMain.handle('db:chunk-overrides:getByDateRange', async (_, startDate: string, endDate: string) => {
    return db
      .select()
      .from(schema.chunkOverrides)
      .where(and(gte(schema.chunkOverrides.date, startDate), lte(schema.chunkOverrides.date, endDate)))
      .all();
  });

  ipcMain.handle('db:chunk-overrides:create', async (_, override: Omit<ChunkOverride, 'id' | 'createdAt'>) => {
    const now = new Date().toISOString();
    const newOverride = {
      id: uuidv4(),
      ...override,
      createdAt: now,
    };
    db.insert(schema.chunkOverrides).values(newOverride).run();
    return newOverride;
  });

  ipcMain.handle('db:chunk-overrides:delete', async (_, id: string) => {
    db.delete(schema.chunkOverrides).where(eq(schema.chunkOverrides.id, id)).run();
  });

  // Day Labels
  ipcMain.handle('db:day-labels:getAll', async () => {
    const labels = db.select().from(schema.dayLabels).all();
    return labels.map((l) => ({
      ...l,
      recurrence: JSON.parse(l.recurrence) as RecurrenceRule,
    }));
  });

  ipcMain.handle('db:day-labels:create', async (_, label: Omit<DayLabel, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newLabel = {
      id: uuidv4(),
      ...label,
      recurrence: JSON.stringify(label.recurrence),
      createdAt: now,
      updatedAt: now,
    };
    db.insert(schema.dayLabels).values(newLabel).run();
    return {
      ...newLabel,
      recurrence: label.recurrence,
    };
  });

  ipcMain.handle('db:day-labels:update', async (_, id: string, label: Partial<DayLabel>) => {
    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = { ...label, updatedAt: now };
    if (label.recurrence) {
      updateData.recurrence = JSON.stringify(label.recurrence);
    }
    db.update(schema.dayLabels).set(updateData).where(eq(schema.dayLabels.id, id)).run();
    const updated = db.select().from(schema.dayLabels).where(eq(schema.dayLabels.id, id)).get();
    if (!updated) throw new Error('Day label not found');
    return {
      ...updated,
      recurrence: JSON.parse(updated.recurrence) as RecurrenceRule,
    };
  });

  ipcMain.handle('db:day-labels:delete', async (_, id: string) => {
    db.delete(schema.dayLabels).where(eq(schema.dayLabels.id, id)).run();
  });

  // Day Label Overrides
  ipcMain.handle('db:day-label-overrides:getByDateRange', async (_, startDate: string, endDate: string) => {
    return db
      .select()
      .from(schema.dayLabelOverrides)
      .where(and(gte(schema.dayLabelOverrides.date, startDate), lte(schema.dayLabelOverrides.date, endDate)))
      .all();
  });

  ipcMain.handle('db:day-label-overrides:create', async (_, override: Omit<DayLabelOverride, 'id' | 'createdAt'>) => {
    const now = new Date().toISOString();
    const newOverride = {
      id: uuidv4(),
      ...override,
      createdAt: now,
    };
    db.insert(schema.dayLabelOverrides).values(newOverride).run();
    return newOverride;
  });

  ipcMain.handle('db:day-label-overrides:delete', async (_, id: string) => {
    db.delete(schema.dayLabelOverrides).where(eq(schema.dayLabelOverrides.id, id)).run();
  });

  // Check-ins
  ipcMain.handle('db:check-ins:create', async (_, checkIn: Omit<CheckIn, 'id' | 'createdAt'>) => {
    const now = new Date().toISOString();
    const newCheckIn = {
      id: uuidv4(),
      ...checkIn,
      createdAt: now,
    };
    db.insert(schema.checkIns).values(newCheckIn).run();
    return newCheckIn;
  });

  ipcMain.handle('db:check-ins:getByDateRange', async (_, startDate: string, endDate: string) => {
    return db
      .select()
      .from(schema.checkIns)
      .where(and(gte(schema.checkIns.timestamp, startDate), lte(schema.checkIns.timestamp, endDate)))
      .all();
  });

  ipcMain.handle('db:check-ins:getAll', async () => {
    return db.select().from(schema.checkIns).all();
  });

  ipcMain.handle('db:check-ins:getUniqueTags', async () => {
    const checkIns = db.select({ taskTag: schema.checkIns.taskTag }).from(schema.checkIns).all();
    const tags = new Set<string>();
    for (const checkIn of checkIns) {
      if (checkIn.taskTag && checkIn.taskTag.trim()) {
        tags.add(checkIn.taskTag.trim());
      }
    }
    return Array.from(tags).sort();
  });

  // Google Calendar Events
  ipcMain.handle('db:google-events:getByDateRange', async (_, startDate: string, endDate: string) => {
    return db
      .select()
      .from(schema.googleCalendarEvents)
      .where(
        and(
          gte(schema.googleCalendarEvents.startTime, startDate),
          lte(schema.googleCalendarEvents.startTime, endDate)
        )
      )
      .all();
  });

  ipcMain.handle('db:google-events:toggleFixed', async (_, id: string, isFixed: boolean) => {
    db.update(schema.googleCalendarEvents).set({ isFixed }).where(eq(schema.googleCalendarEvents.id, id)).run();
  });

  ipcMain.handle('db:google-events:delete', async (_, id: string) => {
    db.delete(schema.googleCalendarEvents).where(eq(schema.googleCalendarEvents.id, id)).run();
  });

  // Synced Calendars
  ipcMain.handle('db:synced-calendars:getAll', async () => {
    return db.select().from(schema.syncedCalendars).all();
  });

  ipcMain.handle('db:synced-calendars:toggle', async (_, id: string, isEnabled: boolean) => {
    db.update(schema.syncedCalendars).set({ isEnabled }).where(eq(schema.syncedCalendars.id, id)).run();
  });

  // App Settings
  ipcMain.handle('db:settings:get', async (_, key: string) => {
    const setting = db.select().from(schema.appSettings).where(eq(schema.appSettings.key, key)).get();
    return setting?.value ?? null;
  });

  ipcMain.handle('db:settings:set', async (_, key: string, value: string) => {
    db.insert(schema.appSettings)
      .values({ key, value })
      .onConflictDoUpdate({ target: schema.appSettings.key, set: { value } })
      .run();
  });
}
