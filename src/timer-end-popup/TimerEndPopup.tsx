import React, { useState, useEffect } from 'react';

function TimerEndPopup(): React.ReactElement {
  const [duration, setDuration] = useState<number>(0);

  useEffect(() => {
    window.electronAPI.timerEnd.onShow((durationMinutes) => {
      setDuration(durationMinutes);
    });
  }, []);

  const handleDismiss = async () => {
    await window.electronAPI.timerEnd.dismiss();
  };

  const handleRestart = async () => {
    await window.electronAPI.timerEnd.restart();
  };

  const formatDuration = (minutes: number): string => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes} min`;
  };

  return (
    <div className="timer-end-popup">
      <div className="popup-header">
        <h1 className="popup-title">Timer Complete!</h1>
        <button className="close-btn" onClick={handleDismiss}>
          ×
        </button>
      </div>

      <div className="popup-content">
        <div className="timer-icon">⏱️</div>
        <div className="timer-duration">{formatDuration(duration)}</div>
        <p className="message">Your timer has finished.</p>
      </div>

      <div className="popup-footer">
        <button className="btn btn-ghost" onClick={handleRestart}>
          Restart
        </button>
        <button className="btn btn-primary" onClick={handleDismiss}>
          Done
        </button>
      </div>
    </div>
  );
}

export default TimerEndPopup;
