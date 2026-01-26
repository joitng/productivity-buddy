import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views, View, SlotInfo } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addDays, startOfDay, endOfDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import type { ScheduledChunk, GoogleCalendarEvent, DayLabel, ChunkOverride, DayLabelOverride, CalendarEvent } from '../../../shared/types';
import { isChunkActiveOnDate } from '../../../shared/recurrence';
import DayHeader from './DayHeader';
import EventComponent from './EventComponent';
import ChunkEditor from '../chunks/ChunkEditor';
import './CalendarPage.css';

const locales = { 'en-US': enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

function CalendarPage(): React.ReactElement {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>(Views.WEEK);
  const [chunks, setChunks] = useState<ScheduledChunk[]>([]);
  const [chunkOverrides, setChunkOverrides] = useState<ChunkOverride[]>([]);
  const [dayLabels, setDayLabels] = useState<DayLabel[]>([]);
  const [dayLabelOverrides, setDayLabelOverrides] = useState<DayLabelOverride[]>([]);
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showChunkEditor, setShowChunkEditor] = useState(false);
  const [newChunkSlot, setNewChunkSlot] = useState<{ startTime: string; endTime: string; dayOfWeek: number; date: string } | null>(null);
  const [editingChunk, setEditingChunk] = useState<ScheduledChunk | null>(null);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [showEditScopeDialog, setShowEditScopeDialog] = useState(false);
  const [editAfterThisMode, setEditAfterThisMode] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      const weekEnd = addDays(weekStart, 7);
      const startStr = format(weekStart, 'yyyy-MM-dd');
      const endStr = format(weekEnd, 'yyyy-MM-dd');

      const [chunksData, overridesData, labelsData, labelOverridesData, eventsData] = await Promise.all([
        window.electronAPI.chunks.getAll(),
        window.electronAPI.chunkOverrides.getByDateRange(startStr, endStr),
        window.electronAPI.dayLabels.getAll(),
        window.electronAPI.dayLabelOverrides.getByDateRange(startStr, endStr),
        window.electronAPI.googleEvents.getByDateRange(
          weekStart.toISOString(),
          weekEnd.toISOString()
        ),
      ]);

      setChunks(chunksData);
      setChunkOverrides(overridesData);
      setDayLabels(labelsData);
      setDayLabelOverrides(labelOverridesData);
      setGoogleEvents(eventsData);
    } catch (error) {
      console.error('Failed to load calendar data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for event deletions from EventComponent
  useEffect(() => {
    const handleEventDeleted = () => {
      loadData();
    };
    window.addEventListener('googleEventDeleted', handleEventDeleted);
    return () => {
      window.removeEventListener('googleEventDeleted', handleEventDeleted);
    };
  }, [loadData]);

  const events = useMemo((): CalendarEvent[] => {
    const result: CalendarEvent[] = [];
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });

    // Add chunks for each day they apply to
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      const dateStr = format(date, 'yyyy-MM-dd');

      for (const chunk of chunks) {
        // Check date range first
        if (chunk.startDate && dateStr < chunk.startDate) continue;
        if (chunk.endDate && dateStr > chunk.endDate) continue;

        if (!isChunkActiveOnDate(chunk.recurrence, date)) continue;

        // Check for overrides
        const override = chunkOverrides.find(
          (o) => o.chunkId === chunk.id && o.date === dateStr
        );
        if (override?.action === 'skip') continue;

        const startTime = override?.modifiedStartTime || chunk.startTime;
        const endTime = override?.modifiedEndTime || chunk.endTime;
        const name = override?.modifiedName || chunk.name;
        const color = override?.modifiedColor || chunk.color;

        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);

        const start = new Date(date);
        start.setHours(startHour, startMin, 0, 0);

        const end = new Date(date);
        end.setHours(endHour, endMin, 0, 0);

        result.push({
          id: `chunk-${chunk.id}-${dateStr}`,
          title: name,
          start,
          end,
          resource: {
            type: 'chunk',
            color: color || '#4c6ef5',
            originalData: chunk,
          },
        });
      }
    }

    // Add Google Calendar events
    for (const event of googleEvents) {
      result.push({
        id: `google-${event.id}`,
        title: event.title,
        start: new Date(event.startTime),
        end: new Date(event.endTime),
        allDay: event.isAllDay,
        resource: {
          type: 'google',
          isFixed: event.isFixed,
          originalData: event,
        },
      });
    }

    return result;
  }, [chunks, chunkOverrides, googleEvents, currentDate]);

  const dayLabelsForWeek = useMemo(() => {
    const result: Map<string, DayLabel & { isOverridden?: boolean }> = new Map();
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });

    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      const dateStr = format(date, 'yyyy-MM-dd');

      for (const label of dayLabels) {
        if (!isChunkActiveOnDate(label.recurrence, date)) continue;

        const override = dayLabelOverrides.find(
          (o) => o.dayLabelId === label.id && o.date === dateStr
        );
        if (override?.action === 'skip') continue;

        result.set(dateStr, {
          ...label,
          label: override?.modifiedLabel || label.label,
          color: override?.modifiedColor || label.color,
          emoji: override?.modifiedEmoji || label.emoji,
          isOverridden: !!override,
        });
      }
    }

    return result;
  }, [dayLabels, dayLabelOverrides, currentDate]);

  const handleNavigate = (date: Date) => {
    setCurrentDate(date);
  };

  const handleViewChange = (newView: View) => {
    setView(newView);
  };

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    const startTime = format(slotInfo.start, 'HH:mm');
    const endTime = format(slotInfo.end, 'HH:mm');
    const dayOfWeek = getDay(slotInfo.start);
    const date = format(slotInfo.start, 'yyyy-MM-dd');

    setNewChunkSlot({ startTime, endTime, dayOfWeek, date });
    setEditingChunk(null);
    setShowChunkEditor(true);
  };

  const handleSaveChunk = async (data: Omit<ScheduledChunk, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await window.electronAPI.chunks.create(data);
      setShowChunkEditor(false);
      setNewChunkSlot(null);
      await loadData();
      await window.electronAPI.checkIn.refreshSchedule();
    } catch (error) {
      console.error('Failed to create chunk:', error);
    }
  };

  const handleCancelChunkEditor = () => {
    setShowChunkEditor(false);
    setNewChunkSlot(null);
    setEditingChunk(null);
    setEditingDate(null);
    setEditAfterThisMode(false);
  };

  const handleEditAll = () => {
    setShowEditScopeDialog(false);
    setShowChunkEditor(true);
  };

  const handleEditThisOnly = () => {
    // Close scope dialog and open editor in "this occurrence" mode
    setShowEditScopeDialog(false);
    if (editingChunk && editingDate) {
      // Set up for creating an override
      setNewChunkSlot({
        startTime: editingChunk.startTime,
        endTime: editingChunk.endTime,
        dayOfWeek: getDay(new Date(editingDate)),
        date: editingDate,
      });
      setShowChunkEditor(true);
    }
  };

  const handleEditAfterThis = () => {
    // Close scope dialog and open editor for "all after this" mode
    setShowEditScopeDialog(false);
    setEditAfterThisMode(true);
    setShowChunkEditor(true);
  };

  const handleCancelEditScope = () => {
    setShowEditScopeDialog(false);
    setEditingChunk(null);
    setEditingDate(null);
    setEditAfterThisMode(false);
  };

  const handleDeleteThisOnly = async () => {
    if (!editingChunk || !editingDate) return;

    try {
      // Check if an override already exists for this chunk/date
      const existingOverride = chunkOverrides.find(
        (o) => o.chunkId === editingChunk.id && o.date === editingDate
      );

      if (existingOverride) {
        await window.electronAPI.chunkOverrides.delete(existingOverride.id);
      }

      // Create a skip override for this date
      await window.electronAPI.chunkOverrides.create({
        chunkId: editingChunk.id,
        date: editingDate,
        action: 'skip',
      });

      setShowEditScopeDialog(false);
      setEditingChunk(null);
      setEditingDate(null);
      await loadData();
      await window.electronAPI.checkIn.refreshSchedule();
    } catch (error) {
      console.error('Failed to delete this occurrence:', error);
    }
  };

  const handleDeleteAfterThis = async () => {
    if (!editingChunk || !editingDate) return;

    try {
      // Set the chunk's end date to the day before selected date
      const selectedDate = new Date(editingDate);
      const dayBefore = addDays(selectedDate, -1);
      const dayBeforeStr = format(dayBefore, 'yyyy-MM-dd');

      await window.electronAPI.chunks.update(editingChunk.id, {
        endDate: dayBeforeStr,
      });

      setShowEditScopeDialog(false);
      setEditingChunk(null);
      setEditingDate(null);
      await loadData();
      await window.electronAPI.checkIn.refreshSchedule();
    } catch (error) {
      console.error('Failed to delete after this:', error);
    }
  };

  const handleDeleteAll = async () => {
    if (!editingChunk) return;

    try {
      await window.electronAPI.chunks.delete(editingChunk.id);

      setShowEditScopeDialog(false);
      setEditingChunk(null);
      setEditingDate(null);
      await loadData();
      await window.electronAPI.checkIn.refreshSchedule();
    } catch (error) {
      console.error('Failed to delete chunk:', error);
    }
  };

  const handleUpdateChunk = async (data: Omit<ScheduledChunk, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingChunk) return;

    try {
      await window.electronAPI.chunks.update(editingChunk.id, data);
      setShowChunkEditor(false);
      setEditingChunk(null);
      setEditingDate(null);
      await loadData();
      await window.electronAPI.checkIn.refreshSchedule();
    } catch (error) {
      console.error('Failed to update chunk:', error);
    }
  };

  const handleCreateOverride = async (data: Omit<ScheduledChunk, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingChunk || !editingDate) return;

    try {
      // Check if an override already exists for this chunk/date
      const existingOverride = chunkOverrides.find(
        (o) => o.chunkId === editingChunk.id && o.date === editingDate
      );

      if (existingOverride) {
        // Delete the existing override first
        await window.electronAPI.chunkOverrides.delete(existingOverride.id);
      }

      // Create a new override for this specific date
      await window.electronAPI.chunkOverrides.create({
        chunkId: editingChunk.id,
        date: editingDate,
        action: 'modify',
        modifiedName: data.name,
        modifiedStartTime: data.startTime,
        modifiedEndTime: data.endTime,
        modifiedColor: data.color,
      });
      setShowChunkEditor(false);
      setNewChunkSlot(null);
      setEditingChunk(null);
      setEditingDate(null);
      await loadData();
      await window.electronAPI.checkIn.refreshSchedule();
    } catch (error) {
      console.error('Failed to create override:', error);
    }
  };

  const handleEditAfterThisSave = async (data: Omit<ScheduledChunk, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingChunk || !editingDate) return;

    try {
      // Calculate the day before the selected date for the original chunk's end date
      const selectedDate = new Date(editingDate);
      const dayBefore = addDays(selectedDate, -1);
      const dayBeforeStr = format(dayBefore, 'yyyy-MM-dd');

      // Update the existing chunk to end the day before
      await window.electronAPI.chunks.update(editingChunk.id, {
        endDate: dayBeforeStr,
      });

      // Create a new chunk starting from the selected date with the new properties
      await window.electronAPI.chunks.create({
        ...data,
        startDate: editingDate,
      });

      setShowChunkEditor(false);
      setEditingChunk(null);
      setEditingDate(null);
      setEditAfterThisMode(false);
      await loadData();
      await window.electronAPI.checkIn.refreshSchedule();
    } catch (error) {
      console.error('Failed to edit after this:', error);
    }
  };

  const handleSelectEvent = async (event: CalendarEvent) => {
    // Handle Google events - toggle fixed/flexible
    if (event.resource?.type === 'google') {
      const googleEvent = event.resource.originalData as GoogleCalendarEvent;
      const newIsFixed = !googleEvent.isFixed;

      try {
        await window.electronAPI.googleEvents.toggleFixed(googleEvent.id, newIsFixed);

        // Update local state immediately for responsive UI
        setGoogleEvents((prev) =>
          prev.map((e) =>
            e.id === googleEvent.id ? { ...e, isFixed: newIsFixed } : e
          )
        );
      } catch (error) {
        console.error('Failed to toggle event fixed status:', error);
      }
      return;
    }

    // Handle chunk events - show edit scope dialog
    if (event.resource?.type === 'chunk') {
      const chunk = event.resource.originalData as ScheduledChunk;
      const dateStr = format(event.start, 'yyyy-MM-dd');
      setEditingChunk(chunk);
      setEditingDate(dateStr);
      setShowEditScopeDialog(true);
    }
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    const resource = event.resource;
    let backgroundColor = '#4c6ef5';
    let borderColor = '#4c6ef5';
    let textColor = 'white';
    let opacity = 1;

    if (resource?.type === 'chunk') {
      backgroundColor = resource.color || '#4c6ef5';
      borderColor = resource.color || '#4c6ef5';
      opacity = 0.75;
    } else if (resource?.type === 'google') {
      if (resource.isFixed) {
        backgroundColor = '#868e96';
        borderColor = '#868e96';
        opacity = 0.7;
      } else {
        backgroundColor = 'transparent';
        borderColor = '#6c757d';
        textColor = '#495057';
      }
    }

    const isFlexibleGoogle = resource?.type === 'google' && !resource.isFixed;

    return {
      className: resource?.type === 'chunk' ? 'chunk-event-wrapper' : 'google-event-wrapper',
      style: {
        backgroundColor,
        border: isFlexibleGoogle ? `1px solid ${borderColor}` : `1px solid ${borderColor}`,
        borderLeftWidth: '3px',
        borderLeftColor: borderColor,
        color: textColor,
        opacity,
      },
    };
  };

  const components = {
    event: EventComponent,
    header: ({ date }: { date: Date }) => (
      <DayHeader date={date} label={dayLabelsForWeek.get(format(date, 'yyyy-MM-dd'))} />
    ),
  };

  if (loading) {
    return (
      <div className="calendar-page">
        <div className="loading">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="calendar-page">
      <div className="calendar-container">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          date={currentDate}
          view={view}
          onNavigate={handleNavigate}
          onView={handleViewChange}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          selectable
          views={[Views.WEEK, Views.DAY]}
          defaultView={Views.WEEK}
          step={15}
          timeslots={4}
          min={new Date(2024, 0, 1, 6, 0)}
          max={new Date(2024, 0, 1, 22, 0)}
          eventPropGetter={eventStyleGetter}
          components={components}
          formats={{
            timeGutterFormat: (date: Date) => format(date, 'h a'),
            eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
              `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`,
          }}
        />
      </div>

      {/* Edit scope dialog - shown when clicking existing chunk */}
      {showEditScopeDialog && editingChunk && (
        <div className="chunk-editor-modal">
          <div className="chunk-editor-modal-content edit-scope-dialog">
            <h3>{editingChunk.name}</h3>

            <div className="scope-section">
              <p className="scope-label">Edit</p>
              <div className="edit-scope-buttons">
                <button className="btn btn-secondary" onClick={handleEditThisOnly}>
                  This only
                </button>
                <button className="btn btn-secondary" onClick={handleEditAfterThis}>
                  This &amp; future
                </button>
                <button className="btn btn-secondary" onClick={handleEditAll}>
                  All
                </button>
              </div>
            </div>

            <div className="scope-section">
              <p className="scope-label">Delete</p>
              <div className="edit-scope-buttons">
                <button className="btn btn-danger-outline" onClick={handleDeleteThisOnly}>
                  This only
                </button>
                <button className="btn btn-danger-outline" onClick={handleDeleteAfterThis}>
                  This &amp; future
                </button>
                <button className="btn btn-danger" onClick={handleDeleteAll}>
                  All
                </button>
              </div>
            </div>

            <div className="edit-scope-buttons" style={{ marginTop: 'var(--spacing-md)' }}>
              <button className="btn btn-secondary" onClick={handleCancelEditScope}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chunk editor modal - for creating new or editing */}
      {showChunkEditor && (
        <div className="chunk-editor-modal">
          <div className="chunk-editor-modal-content">
            <h3>
              {editingChunk
                ? newChunkSlot
                  ? 'Edit This Occurrence'
                  : editAfterThisMode
                  ? 'Edit This & Future Occurrences'
                  : 'Edit Schedule Chunk'
                : 'Create Schedule Chunk'}
            </h3>
            <ChunkEditor
              chunk={
                editingChunk
                  ? {
                      ...editingChunk,
                      startTime: newChunkSlot?.startTime || editingChunk.startTime,
                      endTime: newChunkSlot?.endTime || editingChunk.endTime,
                      // Clear date range when editing after this, as the new chunk will have its own range
                      startDate: editAfterThisMode ? undefined : editingChunk.startDate,
                      endDate: editAfterThisMode ? undefined : editingChunk.endDate,
                    }
                  : newChunkSlot
                  ? {
                      id: '',
                      name: '',
                      startTime: newChunkSlot.startTime,
                      endTime: newChunkSlot.endTime,
                      recurrence: { type: 'weekly', daysOfWeek: [newChunkSlot.dayOfWeek] },
                      createdAt: '',
                      updatedAt: '',
                    }
                  : undefined
              }
              onSave={
                editingChunk
                  ? newChunkSlot
                    ? handleCreateOverride
                    : editAfterThisMode
                    ? handleEditAfterThisSave
                    : handleUpdateChunk
                  : handleSaveChunk
              }
              onCancel={handleCancelChunkEditor}
              specificDate={newChunkSlot?.date || editingDate || undefined}
              hideRecurrence={!!(editingChunk && newChunkSlot)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default CalendarPage;
