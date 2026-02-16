import React, { useState, useRef, useEffect } from 'react';
import { format, isToday } from 'date-fns';
import type { WeeklyPlanDay, GoogleCalendarEvent } from '../../../shared/types';
import './DayColumn.css';

interface DayColumnProps {
  date: Date;
  plan?: WeeklyPlanDay;
  meetings: GoogleCalendarEvent[];
  onFieldUpdate: (field: string, value: string | string[] | null) => void;
}

const HEADLINE_COLORS = [
  '#4c6ef5', // Blue (default)
  '#7950f2', // Purple
  '#f06595', // Pink
  '#fa5252', // Red
  '#fd7e14', // Orange
  '#fab005', // Yellow
  '#40c057', // Green
  '#20c997', // Teal
  '#868e96', // Gray
];

function DayColumn({ date, plan, meetings, onFieldUpdate }: DayColumnProps): React.ReactElement {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const isCurrentDay = isToday(date);
  const dayName = format(date, 'EEE');
  const dayDate = format(date, 'MMM d');
  const headlineColor = plan?.primaryLabelColor || '#4c6ef5';

  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingField]);

  const startEditing = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const saveEdit = () => {
    if (editingField) {
      const trimmedValue = editValue.trim();
      onFieldUpdate(editingField, trimmedValue || null);
      setEditingField(null);
      setEditValue('');
    }
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  const formatMeetingTime = (event: GoogleCalendarEvent): string => {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    return `${format(start, 'h:mm')}-${format(end, 'h:mma').toLowerCase()}`;
  };

  // Goals handling
  const goals = plan?.goals || [];
  const [newGoal, setNewGoal] = useState('');

  const addGoal = () => {
    if (newGoal.trim()) {
      const updatedGoals = [...goals, newGoal.trim()];
      onFieldUpdate('goals', updatedGoals);
      setNewGoal('');
    }
  };

  const removeGoal = (index: number) => {
    const updatedGoals = goals.filter((_, i) => i !== index);
    onFieldUpdate('goals', updatedGoals);
  };

  const handleColorSelect = (e: React.MouseEvent, color: string) => {
    e.stopPropagation();
    onFieldUpdate('primaryLabelColor', color);
    setShowColorPicker(false);
  };

  const renderEditableField = (field: string, value: string | undefined | null, placeholder: string, multiline = false) => {
    if (editingField === field) {
      if (multiline) {
        return (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            className="edit-input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={3}
          />
        );
      }
      return (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          className="edit-input"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
        />
      );
    }

    return (
      <div
        className={`editable-text ${!value ? 'placeholder' : ''}`}
        onClick={() => startEditing(field, value || '')}
      >
        {value || placeholder}
      </div>
    );
  };

  return (
    <div className={`day-column ${isCurrentDay ? 'today' : ''}`}>
      <div className="day-header">
        <span className="day-name">{dayName}</span>
        <span className="day-date">{dayDate}</span>
      </div>

      <div className="day-content">
        {/* Primary Label */}
        <div className="section primary-label-section">
          <div className="headline-row">
            <div className="headline-content" style={{ color: plan?.primaryLabel ? headlineColor : undefined }}>
              {renderEditableField('primaryLabel', plan?.primaryLabel, 'Add headline...', false)}
            </div>
            {plan?.primaryLabel && (
              <div className="color-picker-container">
                <button
                  className="color-picker-btn"
                  style={{ backgroundColor: headlineColor }}
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  title="Change color"
                />
                {showColorPicker && (
                  <div className="color-picker-dropdown">
                    {HEADLINE_COLORS.map((color) => (
                      <button
                        key={color}
                        className={`color-option ${headlineColor === color ? 'selected' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={(e) => handleColorSelect(e, color)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Meetings (auto-populated) */}
        <div className="section meetings-section">
          <h4 className="section-title">Meetings</h4>
          {meetings.length === 0 ? (
            <span className="no-meetings">No meetings</span>
          ) : (
            <ul className="meetings-list">
              {meetings.map((meeting) => (
                <li key={meeting.id} className="meeting-item">
                  <span className="meeting-time">{formatMeetingTime(meeting)}</span>
                  <span className="meeting-title">{meeting.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Goals */}
        <div className="section goals-section">
          <h4 className="section-title">Goals</h4>
          <ol className="goals-list">
            {goals.map((goal, index) => (
              <li key={index} className="goal-item">
                <span className="goal-text">{goal}</span>
                <button className="remove-goal" onClick={() => removeGoal(index)}>×</button>
              </li>
            ))}
          </ol>
          <div className="add-goal">
            <input
              type="text"
              placeholder="Add goal..."
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addGoal();
              }}
            />
          </div>
        </div>

        {/* Time Blocks */}
        <div className="section time-blocks">
          <div className="time-block">
            <h4 className="block-label">Morning</h4>
            {renderEditableField('morningPlan', plan?.morningPlan, 'Morning plans...', true)}
          </div>
          <div className="time-block">
            <h4 className="block-label">Lunch</h4>
            {renderEditableField('lunchPlan', plan?.lunchPlan, 'Lunch plans...', true)}
          </div>
          <div className="time-block">
            <h4 className="block-label">Afternoon</h4>
            {renderEditableField('afternoonPlan', plan?.afternoonPlan, 'Afternoon plans...', true)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DayColumn;
