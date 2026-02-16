import { google, calendar_v3 } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, gte, lte } from 'drizzle-orm';
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

    // Get authenticated user's email for RSVP status lookup
    const tokens = db.select().from(schema.googleAuthTokens).get();
    const userEmail = tokens?.email?.toLowerCase();

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

        // Track which Google event IDs we received from the API
        const syncedGoogleEventIds: string[] = [];

        for (const event of eventItems) {
          if (!event.id) continue;

          // Handle cancelled events (deleted or moved recurring instances)
          if (event.status === 'cancelled') {
            db.delete(schema.googleCalendarEvents)
              .where(eq(schema.googleCalendarEvents.googleEventId, event.id))
              .run();
            continue;
          }

          syncedGoogleEventIds.push(event.id);

          const startTime = getEventTime(event.start);
          const endTime = getEventTime(event.end);
          const isAllDay = !event.start?.dateTime;

          // Get user's RSVP status from attendees array
          let responseStatus: string | null = null;
          if (userEmail && event.attendees) {
            const userAttendee = event.attendees.find(
              (a) => a.email?.toLowerCase() === userEmail || a.self === true
            );
            if (userAttendee) {
              responseStatus = userAttendee.responseStatus || null;
            }
          }

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
                responseStatus,
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
                responseStatus,
                lastSyncedAt: now,
              })
              .run();
          }
        }

        // Delete events that exist in our database for this calendar within the sync range
        // but were NOT returned by the API (meaning they were deleted from Google Calendar)
        const localEventsInRange = db
          .select()
          .from(schema.googleCalendarEvents)
          .where(
            and(
              eq(schema.googleCalendarEvents.calendarId, cal.googleCalendarId),
              gte(schema.googleCalendarEvents.startTime, timeMin.toISOString()),
              lte(schema.googleCalendarEvents.startTime, timeMax.toISOString())
            )
          )
          .all();

        for (const localEvent of localEventsInRange) {
          if (!syncedGoogleEventIds.includes(localEvent.googleEventId)) {
            console.log(`[CalendarSync] Deleting event "${localEvent.title}" - no longer exists in Google Calendar`);
            db.delete(schema.googleCalendarEvents)
              .where(eq(schema.googleCalendarEvents.id, localEvent.id))
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

    // Clean up old events (older than 30 days past)
    const oldThreshold = new Date();
    oldThreshold.setDate(oldThreshold.getDate() - 30);
    db.delete(schema.googleCalendarEvents)
      .where(lte(schema.googleCalendarEvents.endTime, oldThreshold.toISOString()))
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
    // Normalize to UTC ISO string for consistent string comparisons in queries
    // This handles timezone offsets like "2024-02-15T10:00:00-08:00" correctly
    return new Date(eventTime.dateTime).toISOString();
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
