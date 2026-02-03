import React, { useState, useEffect } from 'react';

function WinddownEndPopup(): React.ReactElement {
  const [timerMinutes, setTimerMinutes] = useState<number>(0);

  useEffect(() => {
    window.electronAPI.winddownEnd.onShow((minutes) => {
      setTimerMinutes(minutes);
    });
  }, []);

  const handleDismiss = async () => {
    await window.electronAPI.winddownEnd.dismiss();
  };

  const handleStartTimer = async () => {
    await window.electronAPI.winddownEnd.startTimer();
  };

  return (
    <div className="winddown-end-popup">
      <div className="popup-header">
        <h1 className="popup-title">Wind-down Complete!</h1>
        <button className="close-btn" onClick={handleDismiss}>
          ×
        </button>
      </div>

      <div className="popup-content">
        <div className="timer-icon">🎯</div>
        <p className="message">Time to get back on track!</p>
        <p className="submessage">
          Your {timerMinutes}-minute focus timer is ready to start.
        </p>
      </div>

      <div className="popup-footer">
        <button className="btn btn-ghost" onClick={handleDismiss}>
          Skip Timer
        </button>
        <button className="btn btn-primary" onClick={handleStartTimer}>
          Start Timer
        </button>
      </div>
    </div>
  );
}

export default WinddownEndPopup;
