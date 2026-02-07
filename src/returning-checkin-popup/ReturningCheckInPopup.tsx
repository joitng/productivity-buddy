import React, { useState, useEffect } from 'react';

function ReturningCheckInPopup(): React.ReactElement {
  const [previousTask, setPreviousTask] = useState<string | null>(null);
  const [taskDescription, setTaskDescription] = useState<string>('');
  const [timerMinutes, setTimerMinutes] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    window.electronAPI.returning.onShow((prevTask) => {
      setPreviousTask(prevTask);
      // Pre-fill with previous task if available
      if (prevTask) {
        setTaskDescription(prevTask);
      } else {
        setTaskDescription('');
      }
      setTimerMinutes(null);
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

  const canSubmit = taskDescription.trim() && timerMinutes !== null && !submitting;

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
      </div>

      <div className="popup-footer">
        <button className="btn btn-ghost" onClick={handleDismiss}>
          Skip
        </button>
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
