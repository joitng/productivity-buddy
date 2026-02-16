import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const scheduledChunks = sqliteTable('scheduled_chunks', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  startTime: text('start_time').notNull(), // HH:mm
  endTime: text('end_time').notNull(), // HH:mm
  recurrence: text('recurrence').notNull(), // JSON string
  color: text('color'),
  startDate: text('start_date'), // YYYY-MM-DD
  endDate: text('end_date'), // YYYY-MM-DD
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const chunkOverrides = sqliteTable('chunk_overrides', {
  id: text('id').primaryKey(),
  chunkId: text('chunk_id').notNull().references(() => scheduledChunks.id, { onDelete: 'cascade' }),
  date: text('date').notNull(), // YYYY-MM-DD
  action: text('action').notNull(), // 'skip' | 'modify'
  modifiedName: text('modified_name'),
  modifiedStartTime: text('modified_start_time'),
  modifiedEndTime: text('modified_end_time'),
  modifiedColor: text('modified_color'),
  createdAt: text('created_at').notNull(),
});

export const dayLabels = sqliteTable('day_labels', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  color: text('color').notNull(),
  emoji: text('emoji'),
  recurrence: text('recurrence').notNull(), // JSON string
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const dayLabelOverrides = sqliteTable('day_label_overrides', {
  id: text('id').primaryKey(),
  dayLabelId: text('day_label_id').notNull().references(() => dayLabels.id, { onDelete: 'cascade' }),
  date: text('date').notNull(), // YYYY-MM-DD
  action: text('action').notNull(), // 'skip' | 'modify'
  modifiedLabel: text('modified_label'),
  modifiedColor: text('modified_color'),
  modifiedEmoji: text('modified_emoji'),
  createdAt: text('created_at').notNull(),
});

export const checkIns = sqliteTable('check_ins', {
  id: text('id').primaryKey(),
  chunkId: text('chunk_id').notNull(), // No foreign key - allows timer-session and other non-chunk IDs
  chunkName: text('chunk_name').notNull(),
  timestamp: text('timestamp').notNull(),
  onTask: integer('on_task', { mode: 'boolean' }).notNull(),
  taskTag: text('task_tag'), // What task user is actually working on
  flowRating: integer('flow_rating').notNull(), // 1-5
  moodRating: integer('mood_rating').notNull().default(3), // 1-5
  comments: text('comments'),
  // Off-task follow-up fields
  wantsDopamineBoost: integer('wants_dopamine_boost', { mode: 'boolean' }), // null if on-task
  selectedSide: text('selected_side'), // Selected dopamine menu side item
  delayedTimerMinutes: integer('delayed_timer_minutes'), // 10, 15, or 25 (null if not selected)
  createdAt: text('created_at').notNull(),
});

// Dopamine Menu Items
export const dopamineMenuItems = sqliteTable('dopamine_menu_items', {
  id: text('id').primaryKey(),
  category: text('category').notNull(), // 'appetizers' | 'mains' | 'sides' | 'desserts'
  name: text('name').notNull(),
  createdAt: text('created_at').notNull(),
});

export const googleCalendarEvents = sqliteTable('google_calendar_events', {
  id: text('id').primaryKey(),
  googleEventId: text('google_event_id').notNull(),
  calendarId: text('calendar_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  isAllDay: integer('is_all_day', { mode: 'boolean' }).notNull().default(false),
  isFixed: integer('is_fixed', { mode: 'boolean' }).notNull().default(true),
  responseStatus: text('response_status'), // 'accepted' | 'declined' | 'tentative' | 'needsAction' | null (organizer/no attendees)
  lastSyncedAt: text('last_synced_at').notNull(),
});

export const syncedCalendars = sqliteTable('synced_calendars', {
  id: text('id').primaryKey(),
  googleCalendarId: text('google_calendar_id').notNull().unique(),
  name: text('name').notNull(),
  color: text('color'),
  isEnabled: integer('is_enabled', { mode: 'boolean' }).notNull().default(true),
  lastSyncedAt: text('last_synced_at'),
});

export const googleAuthTokens = sqliteTable('google_auth_tokens', {
  id: text('id').primaryKey(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  expiresAt: text('expires_at').notNull(),
  email: text('email').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const weeklyPlanDays = sqliteTable('weekly_plan_days', {
  id: text('id').primaryKey(),
  date: text('date').notNull().unique(), // YYYY-MM-DD - one row per day
  primaryLabel: text('primary_label'),
  primaryLabelColor: text('primary_label_color'), // Hex color for the headline
  goals: text('goals'), // JSON string: string[] - numbered list of goals
  morningPlan: text('morning_plan'),
  lunchPlan: text('lunch_plan'),
  afternoonPlan: text('afternoon_plan'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const weeklyTasks = sqliteTable('weekly_tasks', {
  id: text('id').primaryKey(),
  weekStart: text('week_start').notNull(), // YYYY-MM-DD of the Monday of the week
  category: text('category').notNull(), // 'active' | 'focus'
  text: text('text').notNull(),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
