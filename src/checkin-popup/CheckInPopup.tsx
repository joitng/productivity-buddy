import React, { useState, useEffect } from 'react';

function CheckInPopup(): React.ReactElement {
  const [chunkId, setChunkId] = useState<string>('');
  const [chunkName, setChunkName] = useState<string>('');
  const [onTask, setOnTask] = useState<boolean | null>(null);
  const [flowRating, setFlowRating] = useState<number | null>(null);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    window.electronAPI.checkIn.onShow((id, name) => {
      setChunkId(id);
      setChunkName(name);
      // Reset form
      setOnTask(null);
      setFlowRating(null);
      setComments('');
    });
  }, []);

  const handleSubmit = async () => {
    if (onTask === null || flowRating === null) return;

    setSubmitting(true);
    try {
      await window.electronAPI.checkIn.submit({
        chunkId,
        chunkName,
        timestamp: new Date().toISOString(),
        onTask,
        flowRating,
        comments: comments.trim() || undefined,
      });
    } catch (error) {
      console.error('Failed to submit check-in:', error);
    }
    setSubmitting(false);
  };

  const handleSnooze = async () => {
    await window.electronAPI.checkIn.snooze();
  };

  const handleClose = async () => {
    await window.electronAPI.checkIn.close();
  };

  const canSubmit = onTask !== null && flowRating !== null && !submitting;

  return (
    <div className="checkin-popup">
      <div className="popup-header">
        <h1 className="popup-title">Check-in</h1>
        <button className="close-btn" onClick={handleClose}>
          ×
        </button>
      </div>

      <div className="popup-content">
        <div className="chunk-info">
          <span className="chunk-label">Current chunk:</span>
          <span className="chunk-name">{chunkName || 'Loading...'}</span>
        </div>

        <div className="question-section">
          <h3 className="question">Am I working on what's scheduled?</h3>
          <div className="binary-options">
            <button
              className={`option-btn ${onTask === true ? 'selected yes' : ''}`}
              onClick={() => setOnTask(true)}
            >
              Yes
            </button>
            <button
              className={`option-btn ${onTask === false ? 'selected no' : ''}`}
              onClick={() => setOnTask(false)}
            >
              No
            </button>
          </div>
        </div>

        <div className="question-section">
          <h3 className="question">Am I in positive flow?</h3>
          <div className="likert-scale">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                className={`rating-btn ${flowRating === rating ? 'selected' : ''}`}
                onClick={() => setFlowRating(rating)}
              >
                {rating}
              </button>
            ))}
          </div>
          <div className="likert-labels">
            <span>Not at all</span>
            <span>Very much</span>
          </div>
        </div>

        <div className="question-section">
          <h3 className="question">Any thoughts? (optional)</h3>
          <textarea
            className="comments-input"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="What's on your mind..."
            rows={3}
          />
        </div>
      </div>

      <div className="popup-footer">
        <button className="btn btn-ghost" onClick={handleSnooze}>
          Snooze 5 min
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </div>
  );
}

export default CheckInPopup;
