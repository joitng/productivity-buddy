import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import type { WeeklyPlanDay, GoogleCalendarEvent } from '../shared/types';
import '../renderer/components/weekly-planner/DayColumn.css';

const HEADLINE_COLORS = [
  '#4c6ef5', '#7950f2', '#f06595', '#fa5252', '#fd7e14',
  '#fab005', '#40c057', '#20c997', '#868e96',
];

function DayPlanPopup(): React.ReactElement {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  const [plan, setPlan] = useState<WeeklyPlanDay | undefined>(undefined);
  const [meetings, setMeetings] = useState<GoogleCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [goals, setGoals] = useState<string[]>([]);
  const [newGoal, setNewGoal] = useState('');
  const [newStarGoal, setNewStarGoal] = useState('');
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const [plans, events] = await Promise.all([
          window.electronAPI.weeklyPlan.getByDateRange(todayStr, todayStr),
          window.electronAPI.googleEvents.getByDateRange(
            new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString(),
            new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()
          ),
        ]);
        if (plans[0]) {
          setPlan(plans[0]);
          setGoals(plans[0].goals || []);
        }
        setMeetings(
          events.filter((e) => {
            const eventDate = format(new Date(e.startTime), 'yyyy-MM-dd');
            const isAccepted =
              e.responseStatus === 'accepted' ||
              e.responseStatus === null ||
              e.responseStatus === undefined;
            return eventDate === todayStr && !e.isAllDay && isAccepted;
          })
        );
      } catch (err) {
        console.error('Failed to load day plan:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (editingField && inputRef.current) inputRef.current.focus();
  }, [editingField]);

  const updateField = async (field: string, value: string | string[] | boolean | null) => {
    try {
      const updated = await window.electronAPI.weeklyPlan.updateField(todayStr, field, value);
      setPlan(updated);
      return updated;
    } catch (err) {
      console.error(`Failed to update field "${field}":`, err);
      throw err;
    }
  };

  const startEditing = (field: string, value: string) => {
    setEditingField(field);
    setEditValue(value);
  };

  const saveEdit = () => {
    if (editingField) {
      updateField(editingField, editValue.trim() || null);
      setEditingField(null);
      setEditValue('');
    }
  };

  const cancelEdit = () => { setEditingField(null); setEditValue(''); };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); }
    else if (e.key === 'Escape') cancelEdit();
  };

  const addGoal = async () => {
    if (!newGoal.trim()) return;
    const goal = newGoal.trim();
    const updatedGoals = [...goals, goal];
    setGoals(updatedGoals);  // optimistic
    setNewGoal('');
    try {
      const updated = await window.electronAPI.weeklyPlan.updateField(todayStr, 'goals', updatedGoals);
      setPlan(updated);
      setGoals(updated.goals || []);
    } catch (err) {
      console.error('Failed to save goal:', err);
      setGoals(goals);  // rollback
    }
  };

  const removeGoal = async (i: number) => {
    const updatedGoals = goals.filter((_, idx) => idx !== i);
    setGoals(updatedGoals);  // optimistic
    try {
      const updated = await window.electronAPI.weeklyPlan.updateField(todayStr, 'goals', updatedGoals);
      setPlan(updated);
      setGoals(updated.goals || []);
    } catch (err) {
      console.error('Failed to remove goal:', err);
      setGoals(goals);  // rollback
    }
  };

  const addStarGoal = async () => {
    if (!newStarGoal.trim()) return;
    const text = newStarGoal.trim();
    setNewStarGoal('');
    try {
      // Sequential to avoid concurrent insert race on new plans
      await updateField('starGoal', text);
      await updateField('starGoalCompleted', false);
    } catch (err) {
      console.error('Failed to save star goal:', err);
    }
  };

  const formatMeetingTime = (e: GoogleCalendarEvent) =>
    `${format(new Date(e.startTime), 'h:mm')}-${format(new Date(e.endTime), 'h:mma').toLowerCase()}`;

  const headlineColor = plan?.primaryLabelColor || '#4c6ef5';

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

  if (loading) {
    return <div className="day-plan-loading">Loading...</div>;
  }

  return (
    <div className="day-plan-popup-shell">
      <div className="day-plan-header">
        <div className="day-plan-title">Today's Plan</div>
        <div className="day-plan-date">{format(today, 'EEEE, MMMM d')}</div>
      </div>

      <div className="day-plan-body day-content">
        {/* Headline */}
        <div className="section primary-label-section">
          <div className="headline-row">
            <div className="headline-content" style={{ color: plan?.primaryLabel ? headlineColor : undefined }}>
              {renderEditableField('primaryLabel', plan?.primaryLabel, 'Add headline...')}
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
                        onClick={(e) => { e.stopPropagation(); updateField('primaryLabelColor', color); setShowColorPicker(false); }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Meetings */}
        <div className="section meetings-section">
          <h4 className="section-title">Meetings</h4>
          {meetings.length === 0 ? (
            <span className="no-meetings">No meetings</span>
          ) : (
            <ul className="meetings-list">
              {meetings.map((m) => (
                <li key={m.id} className="meeting-item">
                  <span className="meeting-time">{formatMeetingTime(m)}</span>
                  <span className="meeting-title">{m.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Goals */}
        <div className="section goals-section">
          <h4 className="section-title">Goals</h4>
          <ol className="goals-list">
            {goals.map((goal, i) => (
              <li key={i} className="goal-item">
                <span className="goal-text">{goal}</span>
                <button className="remove-goal" onClick={() => removeGoal(i)}>×</button>
              </li>
            ))}
          </ol>
          <div className="add-goal">
            <input
              type="text"
              placeholder="Add goal..."
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addGoal(); }}
            />
          </div>
          {plan?.starGoal ? (
            <div className={`star-goal-item ${plan.starGoalCompleted ? 'completed' : ''}`}>
              <input
                type="checkbox"
                className="star-goal-checkbox"
                checked={!!plan.starGoalCompleted}
                onChange={() => updateField('starGoalCompleted', !plan.starGoalCompleted)}
              />
              <span className="star-icon">★</span>
              <span className="star-goal-text">{plan.starGoal}</span>
              <button className="remove-goal" onClick={async () => {
                await updateField('starGoal', null);
                await updateField('starGoalCompleted', false);
              }}>×</button>
            </div>
          ) : (
            <div className="add-star-goal">
              <span className="star-icon">★</span>
              <input
                type="text"
                placeholder="Set star goal..."
                value={newStarGoal}
                onChange={(e) => setNewStarGoal(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addStarGoal(); }}
              />
            </div>
          )}
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

      <div className="day-plan-footer">
        <button className="btn btn-ghost" onClick={() => window.electronAPI.dayPlan.skip()}>
          Skip for now
        </button>
        <button className="btn btn-primary" onClick={() => window.electronAPI.dayPlan.reviewed()}>
          Start my day →
        </button>
      </div>
    </div>
  );
}

export default DayPlanPopup;
