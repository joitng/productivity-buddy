import React from 'react';
import { format, isToday } from 'date-fns';
import type { WeeklyPlanDay } from '../../../shared/types';
import './DayHeader.css';

interface DayHeaderProps {
  date: Date;
  planDay?: WeeklyPlanDay;
}

function DayHeader({ date, planDay }: DayHeaderProps): React.ReactElement {
  const dayName = format(date, 'EEE');
  const dayNumber = format(date, 'd');
  const today = isToday(date);

  const hasLabel = planDay?.primaryLabel;
  const labelColor = planDay?.primaryLabelColor || '#4c6ef5';

  return (
    <div className={`day-header ${today ? 'today' : ''}`}>
      <div className="day-info">
        <span className="day-name">{dayName}</span>
        <span className={`day-number ${today ? 'today-number' : ''}`}>{dayNumber}</span>
      </div>
      {hasLabel && (
        <div
          className="day-label"
          style={{ backgroundColor: `${labelColor}20`, color: labelColor }}
        >
          <span className="label-text">{planDay.primaryLabel}</span>
        </div>
      )}
    </div>
  );
}

export default DayHeader;
