import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as schema from './schema';

let db: BetterSQLite3Database<typeof schema> | null = null;
let sqliteDb: Database.Database | null = null;

export function getDatabase(): BetterSQLite3Database<typeof schema> {
  if (db) return db;

  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'productivity-buddy.db');

  // Ensure directory exists
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  sqliteDb = new Database(dbPath);
  db = drizzle(sqliteDb, { schema });

  // Initialize tables
  initializeDatabase();

  return db;
}

function initializeDatabase(): void {
  if (!sqliteDb) return;

  // Disable foreign key enforcement (allows timer-session and other non-chunk IDs in check_ins)
  sqliteDb.exec(`PRAGMA foreign_keys = OFF;`);

  // Create tables if they don't exist
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS scheduled_chunks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      recurrence TEXT NOT NULL,
      color TEXT,
      start_date TEXT,
      end_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chunk_overrides (
      id TEXT PRIMARY KEY,
      chunk_id TEXT NOT NULL REFERENCES scheduled_chunks(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      action TEXT NOT NULL,
      modified_name TEXT,
      modified_start_time TEXT,
      modified_end_time TEXT,
      modified_color TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS day_labels (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      color TEXT NOT NULL,
      emoji TEXT,
      recurrence TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS day_label_overrides (
      id TEXT PRIMARY KEY,
      day_label_id TEXT NOT NULL REFERENCES day_labels(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      action TEXT NOT NULL,
      modified_label TEXT,
      modified_color TEXT,
      modified_emoji TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS check_ins (
      id TEXT PRIMARY KEY,
      chunk_id TEXT NOT NULL REFERENCES scheduled_chunks(id) ON DELETE CASCADE,
      timestamp TEXT NOT NULL,
      on_task INTEGER NOT NULL,
      flow_rating INTEGER NOT NULL,
      comments TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS google_calendar_events (
      id TEXT PRIMARY KEY,
      google_event_id TEXT NOT NULL,
      calendar_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      is_all_day INTEGER NOT NULL DEFAULT 0,
      is_fixed INTEGER NOT NULL DEFAULT 1,
      last_synced_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS synced_calendars (
      id TEXT PRIMARY KEY,
      google_calendar_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      color TEXT,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      last_synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS google_auth_tokens (
      id TEXT PRIMARY KEY,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dopamine_menu_items (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS weekly_plan_days (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL UNIQUE,
      primary_label TEXT,
      goals TEXT,
      morning_plan TEXT,
      lunch_plan TEXT,
      afternoon_plan TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_chunk_overrides_date ON chunk_overrides(date);
    CREATE INDEX IF NOT EXISTS idx_chunk_overrides_chunk_id ON chunk_overrides(chunk_id);
    CREATE INDEX IF NOT EXISTS idx_day_label_overrides_date ON day_label_overrides(date);
    CREATE INDEX IF NOT EXISTS idx_check_ins_timestamp ON check_ins(timestamp);
    CREATE INDEX IF NOT EXISTS idx_google_events_start ON google_calendar_events(start_time);
    CREATE INDEX IF NOT EXISTS idx_weekly_plan_days_date ON weekly_plan_days(date);

    CREATE TABLE IF NOT EXISTS weekly_tasks (
      id TEXT PRIMARY KEY,
      week_start TEXT NOT NULL,
      category TEXT NOT NULL,
      text TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_weekly_tasks_week_start ON weekly_tasks(week_start);
  `);

  // Migration: Add modified_color column to chunk_overrides if it doesn't exist
  try {
    sqliteDb.exec(`ALTER TABLE chunk_overrides ADD COLUMN modified_color TEXT;`);
  } catch {
    // Column already exists, ignore error
  }

  // Migration: Add start_date and end_date columns to scheduled_chunks
  try {
    sqliteDb.exec(`ALTER TABLE scheduled_chunks ADD COLUMN start_date TEXT;`);
  } catch {
    // Column already exists, ignore error
  }
  try {
    sqliteDb.exec(`ALTER TABLE scheduled_chunks ADD COLUMN end_date TEXT;`);
  } catch {
    // Column already exists, ignore error
  }

  // Migration: Add chunk_name column to check_ins
  try {
    sqliteDb.exec(`ALTER TABLE check_ins ADD COLUMN chunk_name TEXT NOT NULL DEFAULT '';`);
  } catch {
    // Column already exists, ignore error
  }

  // Migration: Add task_tag column to check_ins
  try {
    sqliteDb.exec(`ALTER TABLE check_ins ADD COLUMN task_tag TEXT;`);
  } catch {
    // Column already exists, ignore error
  }

  // Migration: Add mood_rating column to check_ins
  try {
    sqliteDb.exec(`ALTER TABLE check_ins ADD COLUMN mood_rating INTEGER NOT NULL DEFAULT 3;`);
  } catch {
    // Column already exists, ignore error
  }

  // Migration: Add dopamine boost columns to check_ins
  try {
    sqliteDb.exec(`ALTER TABLE check_ins ADD COLUMN wants_dopamine_boost INTEGER;`);
  } catch {
    // Column already exists, ignore error
  }
  try {
    sqliteDb.exec(`ALTER TABLE check_ins ADD COLUMN selected_side TEXT;`);
  } catch {
    // Column already exists, ignore error
  }
  try {
    sqliteDb.exec(`ALTER TABLE check_ins ADD COLUMN delayed_timer_minutes INTEGER;`);
  } catch {
    // Column already exists, ignore error
  }

  // Migration: Add primary_label_color column to weekly_plan_days
  try {
    sqliteDb.exec(`ALTER TABLE weekly_plan_days ADD COLUMN primary_label_color TEXT;`);
  } catch {
    // Column already exists, ignore error
  }

  // Migration: Add response_status column to google_calendar_events
  try {
    sqliteDb.exec(`ALTER TABLE google_calendar_events ADD COLUMN response_status TEXT;`);
  } catch {
    // Column already exists, ignore error
  }
}

export function closeDatabase(): void {
  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
    db = null;
  }
}

export { schema };
