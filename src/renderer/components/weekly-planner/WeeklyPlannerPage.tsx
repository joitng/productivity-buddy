import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { startOfWeek, addDays, format, addWeeks, subWeeks } from 'date-fns';
import type { WeeklyPlanDay, GoogleCalendarEvent, WeeklyTask, WeeklyTaskCategory } from '../../../shared/types';
import DayColumn from './DayColumn';
import WeeklyTasks from './WeeklyTasks';
import './WeeklyPlannerPage.css';

function WeeklyPlannerPage(): React.ReactElement {
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday start
  );
  const [planDays, setPlanDays] = useState<Map<string, WeeklyPlanDay>>(new Map());
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [weeklyTasks, setWeeklyTasks] = useState<WeeklyTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate array of 7 dates for current week
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const startStr = format(currentWeekStart, 'yyyy-MM-dd');
      const endStr = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');

      const [plans, events, tasks] = await Promise.all([
        window.electronAPI.weeklyPlan.getByDateRange(startStr, endStr),
        window.electronAPI.googleEvents.getByDateRange(
          currentWeekStart.toISOString(),
          addDays(currentWeekStart, 7).toISOString()
        ),
        window.electronAPI.weeklyTasks.getByWeek(startStr),
      ]);

      const planMap = new Map<string, WeeklyPlanDay>();
      for (const plan of plans) {
        planMap.set(plan.date, plan);
      }
      setPlanDays(planMap);
      setGoogleEvents(events);
      setWeeklyTasks(tasks);
    } catch (error) {
      console.error('Failed to load weekly planner data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentWeekStart]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFieldUpdate = async (date: string, field: string, value: string | string[] | null) => {
    try {
      const updated = await window.electronAPI.weeklyPlan.updateField(date, field, value);
      setPlanDays((prev) => new Map(prev).set(date, updated));
    } catch (error) {
      console.error('Failed to update field:', error);
    }
  };

  const getMeetingsForDate = (date: Date): GoogleCalendarEvent[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return googleEvents.filter((event) => {
      const eventDate = format(new Date(event.startTime), 'yyyy-MM-dd');
      // Only show events for this date that are:
      // - Not all-day events
      // - User has RSVP'd 'accepted' OR responseStatus is null (organizer/no attendees)
      const isAccepted = event.responseStatus === 'accepted' || event.responseStatus === null || event.responseStatus === undefined;
      return eventDate === dateStr && !event.isAllDay && isAccepted;
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeekStart((prev) =>
      direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1)
    );
  };

  const goToThisWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  // Weekly Tasks handlers
  const handleAddTask = async (category: WeeklyTaskCategory, text: string) => {
    try {
      const newTask = await window.electronAPI.weeklyTasks.create({
        weekStart: weekStartStr,
        category,
        text,
        completed: false,
        sortOrder: weeklyTasks.filter((t) => t.category === category).length,
      });
      setWeeklyTasks((prev) => [...prev, newTask]);
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  const handleToggleTask = async (id: string, completed: boolean) => {
    try {
      await window.electronAPI.weeklyTasks.update(id, { completed });
      setWeeklyTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed } : t))
      );
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await window.electronAPI.weeklyTasks.delete(id);
      setWeeklyTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleUpdateTask = async (id: string, text: string) => {
    try {
      await window.electronAPI.weeklyTasks.update(id, { text });
      setWeeklyTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, text } : t))
      );
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  if (loading) {
    return (
      <div className="weekly-planner-page">
        <div className="loading">Loading weekly planner...</div>
      </div>
    );
  }

  return (
    <div className="weekly-planner-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Weekly Planner</h1>
          <p className="page-description">
            Plan your week with daily goals, time blocks, and auto-synced meetings.
          </p>
        </div>
        <div className="week-navigation">
          <button className="btn btn-secondary" onClick={() => navigateWeek('prev')}>
            &larr; Prev
          </button>
          <button className="btn btn-ghost" onClick={goToThisWeek}>
            This Week
          </button>
          <button className="btn btn-secondary" onClick={() => navigateWeek('next')}>
            Next &rarr;
          </button>
        </div>
      </div>

      <div className="week-header">
        <span className="week-label">
          Week of {format(currentWeekStart, 'MMM d, yyyy')}
        </span>
      </div>

      <div className="week-grid">
        {weekDates.map((date) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const dayPlan = planDays.get(dateStr);
          const meetings = getMeetingsForDate(date);

          return (
            <DayColumn
              key={dateStr}
              date={date}
              plan={dayPlan}
              meetings={meetings}
              onFieldUpdate={(field, value) => handleFieldUpdate(dateStr, field, value)}
            />
          );
        })}
        <WeeklyTasks
          tasks={weeklyTasks}
          onAddTask={handleAddTask}
          onToggleTask={handleToggleTask}
          onDeleteTask={handleDeleteTask}
          onUpdateTask={handleUpdateTask}
        />
      </div>
    </div>
  );
}

export default WeeklyPlannerPage;
