import { google, calendar_v3 } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { getDatabase, schema } from '../../database';
import { getAuthenticatedClient } from './googleAuth';

let syncInterval: NodeJS.Timeout | null = null;

export async function syncCalendars(): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getAuthenticatedClient();
    if (!client) {
      return { success: false, error: 'Not authenticated' };
    }

    const calendar = google.calendar({ version: 'v3', auth: client });
    const db = getDatabase();
    const now = new Date().toISOString();

    // Get list of calendars
    const calendarList = await calendar.calendarList.list();
    const calendars = calendarList.data.items || [];

    // Sync calendar list
    for (const cal of calendars) {
      if (!cal.id) continue;

      const existing = db
        .select()
        .from(schema.syncedCalendars)
        .where(eq(schema.syncedCalendars.googleCalendarId, cal.id))
        .get();

      if (!existing) {
        db.insert(schema.syncedCalendars)
          .values({
            id: uuidv4(),
            googleCalendarId: cal.id,
            name: cal.summary || 'Unnamed Calendar',
            color: cal.backgroundColor,
            isEnabled: cal.primary === true, // Enable primary calendar by default
            lastSyncedAt: now,
          })
          .run();
      }
    }

    // Get enabled calendars
    const enabledCalendars = db
      .select()
      .from(schema.syncedCalendars)
      .where(eq(schema.syncedCalendars.isEnabled, true))
      .all();

    // Sync events from enabled calendars
    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - 7); // Past week
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + 30); // Next month

    for (const cal of enabledCalendars) {
      try {
        const events = await calendar.events.list({
          calendarId: cal.googleCalendarId,
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
        });

        const eventItems = events.data.items || [];

        for (const event of eventItems) {
          if (!event.id) continue;

          const startTime = getEventTime(event.start);
          const endTime = getEventTime(event.end);
          const isAllDay = !event.start?.dateTime;

          const existing = db
            .select()
            .from(schema.googleCalendarEvents)
            .where(eq(schema.googleCalendarEvents.googleEventId, event.id))
            .get();

          if (existing) {
            // Update existing event
            db.update(schema.googleCalendarEvents)
              .set({
                title: event.summary || 'Untitled',
                description: event.description,
                startTime,
                endTime,
                isAllDay,
                lastSyncedAt: now,
              })
              .where(eq(schema.googleCalendarEvents.googleEventId, event.id))
              .run();
          } else {
            // Insert new event
            db.insert(schema.googleCalendarEvents)
              .values({
                id: uuidv4(),
                googleEventId: event.id,
                calendarId: cal.googleCalendarId,
                title: event.summary || 'Untitled',
                description: event.description,
                startTime,
                endTime,
                isAllDay,
                isFixed: true, // Default to fixed
                lastSyncedAt: now,
              })
              .run();
          }
        }

        // Update calendar sync time
        db.update(schema.syncedCalendars)
          .set({ lastSyncedAt: now })
          .where(eq(schema.syncedCalendars.id, cal.id))
          .run();
      } catch (calError) {
        console.error(`Error syncing calendar ${cal.name}:`, calError);
      }
    }

    // Clean up old events (older than 30 days)
    const oldThreshold = new Date();
    oldThreshold.setDate(oldThreshold.getDate() - 30);
    db.delete(schema.googleCalendarEvents)
      .where(eq(schema.googleCalendarEvents.endTime, oldThreshold.toISOString()))
      .run();

    return { success: true };
  } catch (error) {
    console.error('Sync error:', error);
    return { success: false, error: (error as Error).message };
  }
}

function getEventTime(eventTime: calendar_v3.Schema$EventDateTime | undefined): string {
  if (!eventTime) {
    return new Date().toISOString();
  }
  if (eventTime.dateTime) {
    return eventTime.dateTime;
  }
  if (eventTime.date) {
    // For all-day events, treat the date as local midnight to avoid timezone shifts
    // e.g., "2024-01-30" becomes "2024-01-30T00:00:00" in local time
    return `${eventTime.date}T00:00:00`;
  }
  return new Date().toISOString();
}

export function startAutoSync(intervalMinutes: number = 10): void {
  if (syncInterval) {
    clearInterval(syncInterval);
  }

  // Initial sync
  syncCalendars();

  // Schedule recurring syncs
  syncInterval = setInterval(
    () => {
      syncCalendars();
    },
    intervalMinutes * 60 * 1000
  );
}

export function stopAutoSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}
