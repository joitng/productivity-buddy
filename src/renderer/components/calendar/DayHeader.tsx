import React from 'react';
import { format, isToday } from 'date-fns';
import type { DayLabel } from '../../../shared/types';
import './DayHeader.css';

interface DayHeaderProps {
  date: Date;
  label?: DayLabel & { isOverridden?: boolean };
}

function DayHeader({ date, label }: DayHeaderProps): React.ReactElement {
  const dayName = format(date, 'EEE');
  const dayNumber = format(date, 'd');
  const today = isToday(date);

  return (
    <div className={`day-header ${today ? 'today' : ''}`}>
      <div className="day-info">
        <span className="day-name">{dayName}</span>
        <span className={`day-number ${today ? 'today-number' : ''}`}>{dayNumber}</span>
      </div>
      {label && (
        <div
          className="day-label"
          style={{ backgroundColor: `${label.color}20`, color: label.color }}
        >
          {label.emoji && <span className="label-emoji">{label.emoji}</span>}
          <span className="label-text">{label.label}</span>
        </div>
      )}
    </div>
  );
}

export default DayHeader;
