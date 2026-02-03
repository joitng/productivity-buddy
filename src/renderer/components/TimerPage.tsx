import React from 'react';
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
            <button className="control-btn start" onClick={start} disabled={remainingSeconds === 0}>
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
    </div>
  );
}

export default TimerPage;
