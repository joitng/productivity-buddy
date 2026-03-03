import React, { useState, useEffect } from 'react';

interface RescheduleSuggestion {
  label: string;
  timestamp: number;
}

function ReturningCheckInPopup(): React.ReactElement {
  const [previousTask, setPreviousTask] = useState<string | null>(null);
  const [taskDescription, setTaskDescription] = useState<string>('');
  const [timerMinutes, setTimerMinutes] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reschedule state
  const [showReschedule, setShowReschedule] = useState(false);
  const [suggestions, setSuggestions] = useState<RescheduleSuggestion[]>([]);
  const [customTime, setCustomTime] = useState<string>('');
  const [rescheduled, setRescheduled] = useState(false);
  const [rescheduledLabel, setRescheduledLabel] = useState<string>('');

  useEffect(() => {
    window.electronAPI.returning.onShow((prevTask) => {
      setPreviousTask(prevTask);
      if (prevTask) {
        setTaskDescription(prevTask);
      } else {
        setTaskDescription('');
      }
      setTimerMinutes(null);
      setShowReschedule(false);
      setSuggestions([]);
      setCustomTime('');
      setRescheduled(false);
      setRescheduledLabel('');
    });
  }, []);

  const handleSubmit = async () => {
    if (!taskDescription.trim() || timerMinutes === null) return;

    setSubmitting(true);
    try {
      await window.electronAPI.returning.submit({
        taskDescription: taskDescription.trim(),
        timerMinutes,
      });
    } catch (error) {
      console.error('Failed to submit returning check-in:', error);
    }
    setSubmitting(false);
  };

  const handleDismiss = async () => {
    await window.electronAPI.returning.dismiss();
  };

  const handleRemindLater = async () => {
    const fetched = await window.electronAPI.returning.getSuggestedTimes();
    setSuggestions(fetched);
    setShowReschedule(true);
    await window.electronAPI.returning.resize(530);
  };

  const handleCancelReschedule = async () => {
    setShowReschedule(false);
    setCustomTime('');
    await window.electronAPI.returning.resize(380);
  };

  const confirmReschedule = async (timestamp: number, label: string) => {
    await window.electronAPI.returning.reschedule(timestamp);
    setRescheduledLabel(label);
    setRescheduled(true);
    setTimeout(async () => {
      await window.electronAPI.returning.dismiss();
    }, 2000);
  };

  const handleSuggestionClick = (suggestion: RescheduleSuggestion) => {
    confirmReschedule(suggestion.timestamp, suggestion.label);
  };

  const getCustomTimestamp = (): number | null => {
    if (!customTime) return null;
    const [hours, minutes] = customTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date.getTime() > Date.now() ? date.getTime() : null;
  };

  const handleSetCustomReminder = () => {
    const timestamp = getCustomTimestamp();
    if (!timestamp) return;
    const [hours, minutes] = customTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    const label = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    confirmReschedule(timestamp, label);
  };

  const canSubmit = taskDescription.trim() && timerMinutes !== null && !submitting;
  const customTimestamp = getCustomTimestamp();

  if (rescheduled) {
    return (
      <div className="returning-popup">
        <div className="popup-header">
          <h1 className="popup-title">Welcome Back!</h1>
        </div>
        <div className="reschedule-confirmed">
          <div className="reschedule-confirmed-icon">&#10003;</div>
          <p className="reschedule-confirmed-text">I'll remind you at</p>
          <p className="reschedule-confirmed-time">{rescheduledLabel}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="returning-popup">
      <div className="popup-header">
        <h1 className="popup-title">Welcome Back!</h1>
        <button className="close-btn" onClick={handleDismiss}>
          ×
        </button>
      </div>

      <div className="popup-content">
        <p className="welcome-message">
          Looks like you were away. Let's get you back on track.
        </p>

        <div className="question-section">
          <h3 className="question">What are you planning to work on?</h3>
          <input
            type="text"
            className="task-input"
            value={taskDescription}
            onChange={(e) => setTaskDescription(e.target.value)}
            placeholder="e.g., Finish the report, Review PRs..."
            autoFocus
          />
          {previousTask && taskDescription !== previousTask && (
            <button
              className="use-previous-btn"
              onClick={() => setTaskDescription(previousTask)}
            >
              Use previous: {previousTask}
            </button>
          )}
        </div>

        <div className="question-section">
          <h3 className="question">How long do you want to focus?</h3>
          <div className="timer-options">
            {[15, 25, 35].map((minutes) => (
              <button
                key={minutes}
                className={`timer-option-btn ${timerMinutes === minutes ? 'selected' : ''}`}
                onClick={() => setTimerMinutes(minutes)}
              >
                {minutes} min
              </button>
            ))}
          </div>
        </div>

        {showReschedule && (
          <div className="reschedule-panel">
            <h3 className="reschedule-title">Remind me when?</h3>

            {suggestions.length > 0 && (
              <div className="suggestions-list">
                {suggestions.map((s) => (
                  <button
                    key={s.timestamp}
                    className="suggestion-btn"
                    onClick={() => handleSuggestionClick(s)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            <div className="reschedule-custom">
              <span className="reschedule-custom-label">
                {suggestions.length > 0 ? 'Or pick a time:' : 'Pick a time:'}
              </span>
              <div className="time-input-row">
                <input
                  type="time"
                  className="time-input"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleSetCustomReminder}
                  disabled={!customTimestamp}
                >
                  Set Reminder
                </button>
              </div>
            </div>

            <button className="btn btn-ghost reschedule-cancel-btn" onClick={handleCancelReschedule}>
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="popup-footer">
        <button className="btn btn-ghost" onClick={handleDismiss}>
          Skip
        </button>
        {!showReschedule && (
          <button className="btn btn-ghost" onClick={handleRemindLater}>
            Remind me later
          </button>
        )}
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {submitting ? 'Starting...' : 'Start Timer'}
        </button>
      </div>
    </div>
  );
}

export default ReturningCheckInPopup;
