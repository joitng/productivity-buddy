import React, { useState, useEffect } from 'react';

function ChunkEndPopup(): React.ReactElement {
  const [chunkName, setChunkName] = useState<string>('');

  useEffect(() => {
    window.electronAPI.chunkEnd.onShow((name) => {
      setChunkName(name);
    });
  }, []);

  const handleDismiss = async () => {
    await window.electronAPI.chunkEnd.dismiss();
  };

  const handleSnooze = async (minutes: number) => {
    await window.electronAPI.chunkEnd.snooze(minutes);
  };

  return (
    <div className="chunk-end-popup">
      <div className="popup-header">
        <h1 className="popup-title">Time's Up!</h1>
        <button className="close-btn" onClick={handleDismiss}>
          ×
        </button>
      </div>

      <div className="popup-content">
        <div className="chunk-info">
          <span className="chunk-label">Ending now:</span>
          <span className="chunk-name">{chunkName || 'Loading...'}</span>
        </div>

        <p className="message">Your scheduled time chunk is ending.</p>
      </div>

      <div className="popup-footer">
        <button className="btn btn-ghost" onClick={() => handleSnooze(5)}>
          +5 min
        </button>
        <button className="btn btn-ghost" onClick={() => handleSnooze(10)}>
          +10 min
        </button>
        <button className="btn btn-primary" onClick={handleDismiss}>
          Got it
        </button>
      </div>
    </div>
  );
}

export default ChunkEndPopup;
