import React, { useState, useEffect, useRef } from 'react';

function CheckInPopup(): React.ReactElement {
  const [chunkId, setChunkId] = useState<string>('');
  const [chunkName, setChunkName] = useState<string>('');
  const [showBreakReminder, setShowBreakReminder] = useState<boolean>(false);
  const [onTask, setOnTask] = useState<boolean | null>(null);
  const [taskTag, setTaskTag] = useState<string>('');
  const [flowRating, setFlowRating] = useState<number | null>(null);
  const [moodRating, setMoodRating] = useState<number | null>(null);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load existing tags
    window.electronAPI.checkIns.getUniqueTags().then(setExistingTags);

    window.electronAPI.checkIn.onShow((id, name, breakReminder) => {
      setChunkId(id);
      setChunkName(name);
      setShowBreakReminder(breakReminder);
      // Reset form
      setOnTask(null);
      setTaskTag('');
      setFlowRating(null);
      setMoodRating(null);
      setComments('');
      setShowTagSuggestions(false);
      setSelectedSuggestionIndex(-1);
      // Refresh tags in case new ones were added
      window.electronAPI.checkIns.getUniqueTags().then(setExistingTags);
    });
  }, []);

  // Filter suggestions based on current input
  const filteredSuggestions = existingTags.filter(
    tag => tag.toLowerCase().includes(taskTag.toLowerCase()) && tag.toLowerCase() !== taskTag.toLowerCase()
  );

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTaskTag(e.target.value);
    setShowTagSuggestions(e.target.value.length > 0 && filteredSuggestions.length > 0);
    setSelectedSuggestionIndex(-1);
  };

  const handleTagInputFocus = () => {
    if (taskTag.length > 0 && filteredSuggestions.length > 0) {
      setShowTagSuggestions(true);
    }
  };

  const handleTagInputBlur = () => {
    // Delay hiding to allow click on suggestion
    setTimeout(() => setShowTagSuggestions(false), 150);
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showTagSuggestions || filteredSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
      e.preventDefault();
      selectSuggestion(filteredSuggestions[selectedSuggestionIndex]);
    } else if (e.key === 'Escape') {
      setShowTagSuggestions(false);
    }
  };

  const selectSuggestion = (tag: string) => {
    setTaskTag(tag);
    setShowTagSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  const handleSubmit = async () => {
    if (onTask === null || flowRating === null || moodRating === null) return;

    setSubmitting(true);
    try {
      await window.electronAPI.checkIn.submit({
        chunkId,
        chunkName,
        timestamp: new Date().toISOString(),
        onTask,
        taskTag: taskTag.trim() || undefined,
        flowRating,
        moodRating,
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

  const canSubmit = onTask !== null && flowRating !== null && moodRating !== null && !submitting;

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

        {showBreakReminder && (
          <div className="break-reminder">
            Remember to take a break!
          </div>
        )}

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
          {onTask !== null && (
            <div className="task-tag-container">
              <input
                ref={tagInputRef}
                type="text"
                className="task-tag-input"
                value={taskTag}
                onChange={handleTagInputChange}
                onFocus={handleTagInputFocus}
                onBlur={handleTagInputBlur}
                onKeyDown={handleTagInputKeyDown}
                placeholder={onTask ? "What task? (optional)" : "What are you working on instead?"}
                autoComplete="off"
              />
              {showTagSuggestions && filteredSuggestions.length > 0 && (
                <div className="tag-suggestions">
                  {filteredSuggestions.slice(0, 5).map((tag, index) => (
                    <div
                      key={tag}
                      className={`tag-suggestion ${index === selectedSuggestionIndex ? 'selected' : ''}`}
                      onMouseDown={() => selectSuggestion(tag)}
                    >
                      {tag}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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
          <h3 className="question">How positive is my mood?</h3>
          <div className="likert-scale">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                className={`rating-btn mood ${moodRating === rating ? 'selected' : ''}`}
                onClick={() => setMoodRating(rating)}
              >
                {rating}
              </button>
            ))}
          </div>
          <div className="likert-labels">
            <span>Very negative</span>
            <span>Very positive</span>
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
