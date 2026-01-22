import React, { useState } from 'react';
import type { ScheduledChunk, RecurrenceRule } from '../../../shared/types';
import RecurrenceSelector from './RecurrenceSelector';
import './ChunkEditor.css';

const COLORS = [
  '#4c6ef5', // Blue
  '#7950f2', // Violet
  '#be4bdb', // Grape
  '#f06595', // Pink
  '#fa5252', // Red
  '#fd7e14', // Orange
  '#fab005', // Yellow
  '#40c057', // Green
  '#20c997', // Teal
  '#15aabf', // Cyan
];

interface ChunkEditorProps {
  chunk?: ScheduledChunk;
  onSave: (data: Omit<ScheduledChunk, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  specificDate?: string; // For "No repeat" option
  hideRecurrence?: boolean; // Hide recurrence when editing single occurrence
}

function ChunkEditor({ chunk, onSave, onCancel, specificDate, hideRecurrence }: ChunkEditorProps): React.ReactElement {
  const [name, setName] = useState(chunk?.name || '');
  const [startTime, setStartTime] = useState(chunk?.startTime || '09:00');
  const [endTime, setEndTime] = useState(chunk?.endTime || '12:00');
  const [color, setColor] = useState(chunk?.color || COLORS[0]);
  const [recurrence, setRecurrence] = useState<RecurrenceRule>(
    chunk?.recurrence || { type: 'weekly', daysOfWeek: [1, 2, 3, 4, 5] }
  );
  const [startDate, setStartDate] = useState(chunk?.startDate || '');
  const [endDate, setEndDate] = useState(chunk?.endDate || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // For biweekly, set anchor date from startDate, specificDate, or today
    let finalRecurrence = recurrence;
    if (recurrence.type === 'biweekly') {
      const anchorDate = startDate || specificDate || new Date().toISOString().split('T')[0];
      finalRecurrence = { ...recurrence, anchorDate };
    }

    onSave({
      name: name.trim(),
      startTime,
      endTime,
      color,
      recurrence: finalRecurrence,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  };

  return (
    <form className="chunk-editor" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="name">Name</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Deep Work, Morning Focus"
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="startTime">Start Time</label>
          <input
            id="startTime"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="endTime">End Time</label>
          <input
            id="endTime"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label>Color</label>
        <div className="color-picker">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`color-option ${color === c ? 'selected' : ''}`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>

      {!hideRecurrence && (
        <div className="form-group">
          <label>Recurrence</label>
          <RecurrenceSelector value={recurrence} onChange={setRecurrence} specificDate={specificDate} />
        </div>
      )}

      {!hideRecurrence && recurrence.type !== 'once' && (
        <div className="form-group">
          <label>Date Range (optional)</label>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startDate">Start Date</label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="endDate">End Date</label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          {chunk ? 'Save Changes' : 'Create Chunk'}
        </button>
      </div>
    </form>
  );
}

export default ChunkEditor;
