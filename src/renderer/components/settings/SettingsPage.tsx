import React, { useState, useEffect } from 'react';
import type { SyncedCalendar } from '../../../shared/types';
import './SettingsPage.css';

function SettingsPage(): React.ReactElement {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [calendars, setCalendars] = useState<SyncedCalendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const checkAuthStatus = async () => {
    try {
      const status = await window.electronAPI.google.getStatus();
      setIsAuthenticated(status.isAuthenticated);
      setEmail(status.email || null);

      if (status.isAuthenticated) {
        const cals = await window.electronAPI.syncedCalendars.getAll();
        setCalendars(cals);
      }
    } catch (error) {
      console.error('Failed to check auth status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const result = await window.electronAPI.google.startAuth();
      if (result.success) {
        await checkAuthStatus();
        await handleSync();
      } else {
        alert(`Failed to connect: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to connect:', error);
      alert('Failed to connect to Google');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Google account? All synced events will be removed.')) {
      return;
    }
    try {
      await window.electronAPI.google.logout();
      setIsAuthenticated(false);
      setEmail(null);
      setCalendars([]);
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await window.electronAPI.google.sync();
      if (result.success) {
        const cals = await window.electronAPI.syncedCalendars.getAll();
        setCalendars(cals);
      } else {
        alert(`Sync failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to sync:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleCalendar = async (id: string, isEnabled: boolean) => {
    try {
      await window.electronAPI.syncedCalendars.toggle(id, isEnabled);
      setCalendars((prev) =>
        prev.map((cal) => (cal.id === id ? { ...cal, isEnabled } : cal))
      );
    } catch (error) {
      console.error('Failed to toggle calendar:', error);
    }
  };

  if (loading) {
    return (
      <div className="settings-page">
        <div className="loading">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <h1 className="page-title">Settings</h1>

      <section className="settings-section card">
        <h2 className="section-title">Google Calendar</h2>
        <p className="section-description">
          Connect your Google account to sync calendar events.
        </p>

        {isAuthenticated ? (
          <div className="account-connected">
            <div className="account-info">
              <div className="account-avatar">
                {email?.[0]?.toUpperCase() || 'G'}
              </div>
              <div className="account-details">
                <div className="account-email">{email}</div>
                <div className="account-status">Connected</div>
              </div>
            </div>
            <div className="account-actions">
              <button
                className="btn btn-secondary"
                onClick={handleSync}
                disabled={syncing}
              >
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
              <button className="btn btn-ghost" onClick={handleDisconnect}>
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <button
            className="btn btn-primary"
            onClick={handleConnect}
            disabled={connecting}
          >
            {connecting ? 'Connecting...' : 'Connect Google Account'}
          </button>
        )}
      </section>

      {isAuthenticated && calendars.length > 0 && (
        <section className="settings-section card">
          <h2 className="section-title">Calendars to Sync</h2>
          <p className="section-description">
            Select which calendars to display in the app.
          </p>

          <div className="calendars-list">
            {calendars.map((cal) => (
              <label key={cal.id} className="calendar-item">
                <input
                  type="checkbox"
                  checked={cal.isEnabled}
                  onChange={(e) => handleToggleCalendar(cal.id, e.target.checked)}
                />
                <div
                  className="calendar-color"
                  style={{ backgroundColor: cal.color || '#4c6ef5' }}
                />
                <span className="calendar-name">{cal.name}</span>
              </label>
            ))}
          </div>
        </section>
      )}

      <section className="settings-section card">
        <h2 className="section-title">About</h2>
        <div className="about-info">
          <p><strong>Productivity Buddy</strong></p>
          <p className="text-secondary">Version 1.0.0</p>
          <p className="text-secondary">
            A productivity app to help you stay focused with structured time blocks and check-ins.
          </p>
        </div>
      </section>

      <section className="settings-section card">
        <h2 className="section-title">Setup Instructions</h2>
        <div className="setup-instructions">
          <p className="text-secondary">
            To use Google Calendar integration, you need to set up Google OAuth credentials:
          </p>
          <ol className="text-secondary">
            <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer">Google Cloud Console</a></li>
            <li>Create a new project or select existing</li>
            <li>Enable the Google Calendar API</li>
            <li>Create OAuth 2.0 credentials (Desktop app type)</li>
            <li>Set the redirect URI to: <code>http://localhost:8085/oauth2callback</code></li>
            <li>Set environment variables GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET</li>
          </ol>
        </div>
      </section>
    </div>
  );
}

export default SettingsPage;
