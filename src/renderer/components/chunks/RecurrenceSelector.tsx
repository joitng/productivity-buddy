import React from 'react';
import type { RecurrenceRule, RecurrenceType } from '../../../shared/types';
import './RecurrenceSelector.css';

const DAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface RecurrenceSelectorProps {
  value: RecurrenceRule;
  onChange: (rule: RecurrenceRule) => void;
  specificDate?: string; // For 'once' type, pre-fill the date
}

function RecurrenceSelector({ value, onChange, specificDate }: RecurrenceSelectorProps): React.ReactElement {
  const handleTypeChange = (type: RecurrenceType) => {
    switch (type) {
      case 'once':
        onChange({ type, specificDate: value.specificDate || specificDate || new Date().toISOString().split('T')[0] });
        break;
      case 'weekly':
        onChange({ type, daysOfWeek: value.daysOfWeek || [1, 2, 3, 4, 5] });
        break;
      case 'biweekly':
        onChange({ type, daysOfWeek: value.daysOfWeek || [1, 2, 3, 4, 5] });
        break;
      case 'monthly':
        onChange({ type, dayOfMonth: value.dayOfMonth || 1 });
        break;
      case 'nth_weekday':
        onChange({ type, nthWeek: value.nthWeek || 1, weekday: value.weekday || 1 });
        break;
    }
  };

  const toggleDay = (day: number) => {
    const currentDays = value.daysOfWeek || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day].sort();
    onChange({ ...value, daysOfWeek: newDays });
  };

  return (
    <div className="recurrence-selector">
      <div className="recurrence-type">
        <select
          value={value.type}
          onChange={(e) => handleTypeChange(e.target.value as RecurrenceType)}
        >
          <option value="once">No repeat</option>
          <option value="weekly">Weekly</option>
          <option value="biweekly">Every Two Weeks</option>
          <option value="monthly">Monthly (day of month)</option>
          <option value="nth_weekday">Monthly (nth weekday)</option>
        </select>
      </div>

      {value.type === 'once' && (
        <div className="once-selector">
          <label>Date:</label>
          <input
            type="date"
            value={value.specificDate || ''}
            onChange={(e) => onChange({ ...value, specificDate: e.target.value })}
          />
        </div>
      )}

      {(value.type === 'weekly' || value.type === 'biweekly') && (
        <div className="days-selector">
          {DAYS.map((day) => (
            <button
              key={day.value}
              type="button"
              className={`day-btn ${value.daysOfWeek?.includes(day.value) ? 'selected' : ''}`}
              onClick={() => toggleDay(day.value)}
            >
              {day.label}
            </button>
          ))}
        </div>
      )}

      {value.type === 'monthly' && (
        <div className="monthly-selector">
          <label>Day of month:</label>
          <select
            value={value.dayOfMonth || 1}
            onChange={(e) => onChange({ ...value, dayOfMonth: Number(e.target.value) })}
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </div>
      )}

      {value.type === 'nth_weekday' && (
        <div className="nth-weekday-selector">
          <select
            value={value.nthWeek || 1}
            onChange={(e) => onChange({ ...value, nthWeek: Number(e.target.value) })}
          >
            <option value={1}>1st</option>
            <option value={2}>2nd</option>
            <option value={3}>3rd</option>
            <option value={4}>4th</option>
            <option value={5}>5th</option>
          </select>
          <select
            value={value.weekday ?? 1}
            onChange={(e) => onChange({ ...value, weekday: Number(e.target.value) })}
          >
            {DAY_NAMES.map((name, i) => (
              <option key={i} value={i}>
                {name}
              </option>
            ))}
          </select>
          <span className="nth-label">of each month</span>
        </div>
      )}
    </div>
  );
}

export default RecurrenceSelector;
