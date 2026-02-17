import React, { useState, useEffect, useCallback } from 'react';
import { useTimer } from '../context/TimerContext';
import './TimerPage.css';

function TimerPage(): React.ReactElement {
  const {
    totalSeconds,
    remainingSeconds,
    isRunning,
    isComplete,
    setTotalSeconds,
    start,
    pause,
    reset,
    adjustTime,
  } = useTimer();

  const [currentTask, setCurrentTask] = useState<string>('');
  const [showBlockerModal, setShowBlockerModal] = useState(false);
  const [hasBlockerLists, setHasBlockerLists] = useState(false);

  // Load the current task and check if blocker lists are configured
  useEffect(() => {
    window.electronAPI.task.getCurrent().then((task) => {
      if (task) {
        setCurrentTask(task);
      }
    });
    // Check if blocklist is configured
    window.electronAPI.settings.get('website-blocker-blocklist').then((bl) => {
      setHasBlockerLists(bl ? JSON.parse(bl).length > 0 : false);
    });
  }, []);

  const startWithBlocking = useCallback(async (block: boolean) => {
    setShowBlockerModal(false);
    if (block) {
      try {
        const result = await window.electronAPI.websiteBlocker.enable();
        if (!result.success) {
          console.error('Failed to enable blocking:', result.error);
        }
      } catch (err) {
        console.error('Blocker error:', err);
      }
    }
    if (currentTask.trim()) {
      window.electronAPI.task.setCurrent(currentTask.trim());
    }
    start();
  }, [currentTask, start]);

  // Wrapped start that saves task first
  const handleStart = useCallback(() => {
    if (currentTask.trim()) {
      window.electronAPI.task.setCurrent(currentTask.trim());
    }
    if (hasBlockerLists) {
      setShowBlockerModal(true);
    } else {
      start();
    }
  }, [currentTask, start, hasBlockerLists]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 0;

  return (
    <div className="timer-page">
      <h1 className="page-title">Timer</h1>

      <div className="timer-container card">
        <div className="timer-display-wrapper">
          <svg className="timer-progress" viewBox="0 0 200 200">
            <circle
              className="timer-progress-bg"
              cx="100"
              cy="100"
              r="90"
              fill="none"
              strokeWidth="8"
            />
            <circle
              className="timer-progress-fill"
              cx="100"
              cy="100"
              r="90"
              fill="none"
              strokeWidth="8"
              strokeDasharray={2 * Math.PI * 90}
              strokeDashoffset={2 * Math.PI * 90 * (1 - progressPercent / 100)}
              transform="rotate(-90 100 100)"
            />
          </svg>
          <div className="timer-display">
            <span className={`timer-time ${isComplete ? 'complete' : ''}`}>
              {formatTime(remainingSeconds)}
            </span>
            {isComplete && <span className="timer-complete-text">Time's up!</span>}
          </div>
        </div>

        <div className="timer-adjust">
          <button
            className="adjust-btn"
            onClick={() => adjustTime(-5)}
            disabled={isRunning || totalSeconds <= 60}
          >
            -5
          </button>
          <button
            className="adjust-btn"
            onClick={() => adjustTime(-1)}
            disabled={isRunning || totalSeconds <= 60}
          >
            -1
          </button>
          <span className="adjust-label">{Math.floor(totalSeconds / 60)} min</span>
          <button
            className="adjust-btn"
            onClick={() => adjustTime(1)}
            disabled={isRunning}
          >
            +1
          </button>
          <button
            className="adjust-btn"
            onClick={() => adjustTime(5)}
            disabled={isRunning}
          >
            +5
          </button>
        </div>

        <div className="timer-controls">
          {!isRunning ? (
            <button className="control-btn start" onClick={handleStart} disabled={remainingSeconds === 0}>
              {remainingSeconds === totalSeconds ? 'Start' : 'Resume'}
            </button>
          ) : (
            <button className="control-btn pause" onClick={pause}>
              Pause
            </button>
          )}
          <button className="control-btn reset" onClick={reset}>
            Reset
          </button>
        </div>

        <div className="task-input-section">
          <input
            type="text"
            className="task-input"
            placeholder="What are you working on? (optional)"
            value={currentTask}
            onChange={(e) => setCurrentTask(e.target.value)}
            disabled={isRunning}
          />
        </div>
      </div>

      <div className="timer-presets">
        <span className="presets-label">Quick presets:</span>
        <div className="preset-buttons">
          {[5, 10, 15, 25, 30].map((mins) => (
            <button
              key={mins}
              className={`preset-btn ${totalSeconds === mins * 60 ? 'active' : ''}`}
              onClick={() => {
                if (!isRunning) {
                  setTotalSeconds(mins * 60);
                }
              }}
              disabled={isRunning}
            >
              {mins}m
            </button>
          ))}
        </div>
      </div>

      {showBlockerModal && (
        <div className="blocker-modal-overlay" onClick={() => setShowBlockerModal(false)}>
          <div className="blocker-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="blocker-modal-title">Block websites during this session?</h3>
            <div className="blocker-modal-options">
              <button
                className="blocker-option"
                onClick={() => startWithBlocking(true)}
              >
                <span className="blocker-option-label">Block listed sites</span>
                <span className="blocker-option-desc">Block sites on your blocklist during this session</span>
              </button>
              <button
                className="blocker-option blocker-option-skip"
                onClick={() => startWithBlocking(false)}
              >
                <span className="blocker-option-label">No blocking</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TimerPage;
