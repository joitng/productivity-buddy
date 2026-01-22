import React from 'react';
import type { CalendarEvent, GoogleCalendarEvent } from '../../../shared/types';
import './EventComponent.css';

interface EventComponentProps {
  event: CalendarEvent;
}

function EventComponent({ event }: EventComponentProps): React.ReactElement {
  const isGoogle = event.resource?.type === 'google';
  const isChunk = event.resource?.type === 'chunk';
  const isFixed = event.resource?.isFixed;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the toggle
    if (!isGoogle) return;

    const googleEvent = event.resource?.originalData as GoogleCalendarEvent;
    if (!googleEvent) return;

    try {
      await window.electronAPI.googleEvents.delete(googleEvent.id);
      // Dispatch custom event to trigger refresh in CalendarPage
      window.dispatchEvent(new CustomEvent('googleEventDeleted'));
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  return (
    <div
      className={`event-content ${isGoogle ? 'google-event' : ''} ${isChunk ? 'chunk-event' : ''}`}
      title={event.title}
    >
      <div className="event-header">
        <span className="event-title">{event.title}</span>
        {isGoogle && (
          <button className="event-delete" onClick={handleDelete} title="Delete from local calendar">
            ×
          </button>
        )}
      </div>
      {isGoogle && (
        <span className={`event-badge ${isFixed ? 'fixed' : 'flexible'}`}>
          {isFixed ? 'F' : 'Flex'}
        </span>
      )}
    </div>
  );
}

export default EventComponent;
