import { BrowserWindow } from 'electron';
import { google } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { getDatabase, schema } from '../../database';

// These should be set via environment variables or a config file
// For now, we'll use placeholders that the user needs to replace
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'YOUR_CLIENT_SECRET';
const REDIRECT_URI = 'http://localhost:8085/oauth2callback';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

let oauth2Client: InstanceType<typeof google.auth.OAuth2> | null = null;

export function getOAuth2Client(): InstanceType<typeof google.auth.OAuth2> {
  if (!oauth2Client) {
    oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  }
  return oauth2Client;
}

export async function startAuthFlow(): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const client = getOAuth2Client();

    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
    });

    const authWindow = new BrowserWindow({
      width: 600,
      height: 800,
      show: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    authWindow.loadURL(authUrl);

    // Listen for redirect
    authWindow.webContents.on('will-redirect', async (event, url) => {
      if (url.startsWith(REDIRECT_URI)) {
        event.preventDefault();
        const urlObj = new URL(url);
        const code = urlObj.searchParams.get('code');

        if (code) {
          try {
            const { tokens } = await client.getToken(code);
            client.setCredentials(tokens);

            // Get user email
            const oauth2 = google.oauth2({ version: 'v2', auth: client });
            const userInfo = await oauth2.userinfo.get();

            // Store tokens
            const db = getDatabase();
            const now = new Date().toISOString();
            const expiresAt = tokens.expiry_date
              ? new Date(tokens.expiry_date).toISOString()
              : new Date(Date.now() + 3600000).toISOString();

            // Delete existing tokens
            db.delete(schema.googleAuthTokens).run();

            // Insert new tokens
            db.insert(schema.googleAuthTokens)
              .values({
                id: uuidv4(),
                accessToken: tokens.access_token || '',
                refreshToken: tokens.refresh_token || '',
                expiresAt,
                email: userInfo.data.email || '',
                createdAt: now,
                updatedAt: now,
              })
              .run();

            authWindow.close();
            resolve({ success: true });
          } catch (err) {
            authWindow.close();
            resolve({ success: false, error: (err as Error).message });
          }
        } else {
          authWindow.close();
          resolve({ success: false, error: 'No authorization code received' });
        }
      }
    });

    authWindow.on('closed', () => {
      resolve({ success: false, error: 'Authentication window was closed' });
    });
  });
}

export async function getAuthStatus(): Promise<{ isAuthenticated: boolean; email?: string }> {
  const db = getDatabase();
  const tokens = db.select().from(schema.googleAuthTokens).get();

  if (!tokens) {
    return { isAuthenticated: false };
  }

  // Check if tokens are expired
  const expiresAt = new Date(tokens.expiresAt);
  if (expiresAt <= new Date()) {
    // Try to refresh
    try {
      await refreshTokens();
      return { isAuthenticated: true, email: tokens.email };
    } catch {
      return { isAuthenticated: false };
    }
  }

  return { isAuthenticated: true, email: tokens.email };
}

export async function refreshTokens(): Promise<void> {
  const db = getDatabase();
  const tokens = db.select().from(schema.googleAuthTokens).get();

  if (!tokens || !tokens.refreshToken) {
    throw new Error('No refresh token available');
  }

  const client = getOAuth2Client();
  client.setCredentials({ refresh_token: tokens.refreshToken });

  const { credentials } = await client.refreshAccessToken();

  const now = new Date().toISOString();
  const expiresAt = credentials.expiry_date
    ? new Date(credentials.expiry_date).toISOString()
    : new Date(Date.now() + 3600000).toISOString();

  db.update(schema.googleAuthTokens)
    .set({
      accessToken: credentials.access_token || tokens.accessToken,
      expiresAt,
      updatedAt: now,
    })
    .where(eq(schema.googleAuthTokens.id, tokens.id))
    .run();
}

export async function logout(): Promise<void> {
  const db = getDatabase();
  db.delete(schema.googleAuthTokens).run();
  db.delete(schema.syncedCalendars).run();
  db.delete(schema.googleCalendarEvents).run();
  oauth2Client = null;
}

export async function getAuthenticatedClient(): Promise<InstanceType<typeof google.auth.OAuth2> | null> {
  const db = getDatabase();
  const tokens = db.select().from(schema.googleAuthTokens).get();

  if (!tokens) {
    return null;
  }

  const client = getOAuth2Client();
  client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });

  // Check if tokens need refresh
  const expiresAt = new Date(tokens.expiresAt);
  if (expiresAt <= new Date()) {
    await refreshTokens();
    const updatedTokens = db.select().from(schema.googleAuthTokens).get();
    if (updatedTokens) {
      client.setCredentials({
        access_token: updatedTokens.accessToken,
        refresh_token: updatedTokens.refreshToken,
      });
    }
  }

  return client;
}
