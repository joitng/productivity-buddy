import React, { useState, useEffect, useRef } from 'react';
import type { DopamineMenuItem } from '../shared/types';

function CheckInPopup(): React.ReactElement {
  const [chunkId, setChunkId] = useState<string>('');
  const [chunkName, setChunkName] = useState<string>('');
  const [showBreakReminder, setShowBreakReminder] = useState<boolean>(false);
  const [onTask, setOnTask] = useState<boolean | null>(null);
  const [taskTags, setTaskTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>('');
  const [flowRating, setFlowRating] = useState<number | null>(null);
  const [moodRating, setMoodRating] = useState<number | null>(null);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const tagInputRef = useRef<HTMLInputElement>(null);

  // Page 2 (off-task follow-up) state
  const [currentPage, setCurrentPage] = useState<1 | 2>(1);
  const [wantsDopamineBoost, setWantsDopamineBoost] = useState<boolean | null>(null);
  const [sideItems, setSideItems] = useState<DopamineMenuItem[]>([]);
  const [selectedSide, setSelectedSide] = useState<string | null>(null);
  const [delayedTimerMinutes, setDelayedTimerMinutes] = useState<number | null>(null);

  useEffect(() => {
    // Load existing tags and side items
    window.electronAPI.checkIns.getUniqueTags().then(setExistingTags);
    window.electronAPI.dopamineMenu.getByCategory('sides').then(setSideItems);

    window.electronAPI.checkIn.onShow((id, name, breakReminder) => {
      setChunkId(id);
      setChunkName(name);
      setShowBreakReminder(breakReminder);
      // Reset form
      setCurrentPage(1);
      setOnTask(null);
      setTaskTags([]);
      setTagInput('');
      setFlowRating(null);
      setMoodRating(null);
      setComments('');
      setShowTagSuggestions(false);
      setSelectedSuggestionIndex(-1);
      // Reset page 2 state
      setWantsDopamineBoost(null);
      setSelectedSide(null);
      setDelayedTimerMinutes(null);
      // Refresh tags and side items in case new ones were added
      window.electronAPI.checkIns.getUniqueTags().then(setExistingTags);
      window.electronAPI.dopamineMenu.getByCategory('sides').then(setSideItems);
    });
  }, []);

  // Filter suggestions based on current input, excluding already added tags
  const filteredSuggestions = existingTags.filter(
    tag =>
      tag.toLowerCase().includes(tagInput.toLowerCase()) &&
      tag.toLowerCase() !== tagInput.toLowerCase() &&
      !taskTags.some(t => t.toLowerCase() === tag.toLowerCase())
  );

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !taskTags.some(t => t.toLowerCase() === trimmedTag.toLowerCase())) {
      setTaskTags([...taskTags, trimmedTag]);
    }
    setTagInput('');
    setShowTagSuggestions(false);
    setSelectedSuggestionIndex(-1);
    tagInputRef.current?.focus();
  };

  const removeTag = (indexToRemove: number) => {
    setTaskTags(taskTags.filter((_, index) => index !== indexToRemove));
  };

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Check if comma was typed - add current text as tag
    if (value.endsWith(',')) {
      const tagToAdd = value.slice(0, -1).trim();
      if (tagToAdd) {
        addTag(tagToAdd);
      }
      return;
    }

    setTagInput(value);
    setShowTagSuggestions(value.length > 0 && filteredSuggestions.length > 0);
    setSelectedSuggestionIndex(-1);
  };

  const handleTagInputFocus = () => {
    if (tagInput.length > 0 && filteredSuggestions.length > 0) {
      setShowTagSuggestions(true);
    }
  };

  const handleTagInputBlur = () => {
    // Delay hiding to allow click on suggestion
    setTimeout(() => setShowTagSuggestions(false), 150);
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace to remove last tag when input is empty
    if (e.key === 'Backspace' && tagInput === '' && taskTags.length > 0) {
      removeTag(taskTags.length - 1);
      return;
    }

    // Handle Enter to add current input as tag (when no suggestion selected)
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSuggestionIndex >= 0 && filteredSuggestions.length > 0) {
        addTag(filteredSuggestions[selectedSuggestionIndex]);
      } else if (tagInput.trim()) {
        addTag(tagInput);
      }
      return;
    }

    if (!showTagSuggestions || filteredSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Escape') {
      setShowTagSuggestions(false);
    }
  };

  const selectSuggestion = (tag: string) => {
    addTag(tag);
  };

  const handleNext = () => {
    // Go to page 2 for off-task follow-up
    setCurrentPage(2);
  };

  const handleBack = () => {
    setCurrentPage(1);
  };

  const handleSubmit = async () => {
    if (onTask === null || flowRating === null || moodRating === null) return;

    // If off-task and on page 1, go to page 2 instead
    if (onTask === false && currentPage === 1) {
      handleNext();
      return;
    }

    setSubmitting(true);
    try {
      // Combine tags into comma-separated string
      const allTags = [...taskTags];
      if (tagInput.trim()) {
        allTags.push(tagInput.trim());
      }
      const taskTagString = allTags.join(', ') || undefined;

      await window.electronAPI.checkIn.submit({
        chunkId,
        chunkName,
        timestamp: new Date().toISOString(),
        onTask,
        taskTag: taskTagString,
        flowRating,
        moodRating,
        comments: comments.trim() || undefined,
        // Off-task follow-up fields (only included if off-task)
        wantsDopamineBoost: onTask === false ? wantsDopamineBoost ?? undefined : undefined,
        selectedSide: onTask === false && wantsDopamineBoost ? selectedSide ?? undefined : undefined,
        delayedTimerMinutes: onTask === false ? delayedTimerMinutes ?? undefined : undefined,
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

  const canSubmitPage1 = onTask !== null && flowRating !== null && moodRating !== null && !submitting;
  const canSubmitPage2 = wantsDopamineBoost !== null && !submitting;

  // Page 2: Off-task follow-up
  if (currentPage === 2) {
    return (
      <div className="checkin-popup">
        <div className="popup-header">
          <h1 className="popup-title">Getting Back on Track</h1>
          <button className="close-btn" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="popup-content">
          <div className="question-section">
            <h3 className="question">Do you want a dopamine boost to help you get back on track?</h3>
            <div className="binary-options">
              <button
                className={`option-btn ${wantsDopamineBoost === true ? 'selected yes' : ''}`}
                onClick={() => setWantsDopamineBoost(true)}
              >
                Yes
              </button>
              <button
                className={`option-btn ${wantsDopamineBoost === false ? 'selected no' : ''}`}
                onClick={() => {
                  setWantsDopamineBoost(false);
                  setSelectedSide(null);
                }}
              >
                No
              </button>
            </div>
          </div>

          {wantsDopamineBoost === true && (
            <div className="question-section">
              <h3 className="question">Pick a side from your Dopamine Menu:</h3>
              {sideItems.length === 0 ? (
                <p className="no-sides-message">No sides added yet. Add some in your Dopamine Menu!</p>
              ) : (
                <div className="sides-list">
                  {sideItems.map((item) => (
                    <label key={item.id} className={`side-option ${selectedSide === item.name ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="selectedSide"
                        value={item.name}
                        checked={selectedSide === item.name}
                        onChange={() => setSelectedSide(item.name)}
                      />
                      <span className="side-name">{item.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="question-section">
            <h3 className="question">Set a timer to get back to work?</h3>
            <p className="timer-subtitle">Timer will start after a 3-minute wind-down period</p>
            <div className="timer-options">
              {[10, 15, 25].map((minutes) => (
                <button
                  key={minutes}
                  className={`timer-option-btn ${delayedTimerMinutes === minutes ? 'selected' : ''}`}
                  onClick={() => setDelayedTimerMinutes(delayedTimerMinutes === minutes ? null : minutes)}
                >
                  {minutes} min
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="popup-footer">
          <button className="btn btn-ghost" onClick={handleBack}>
            Back
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!canSubmitPage2}
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    );
  }

  // Page 1: Main check-in form
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
              <div className="task-tag-input-wrapper">
                {taskTags.map((tag, index) => (
                  <span key={index} className="tag-chip">
                    {tag}
                    <button
                      type="button"
                      className="tag-chip-remove"
                      onClick={() => removeTag(index)}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  ref={tagInputRef}
                  type="text"
                  className="task-tag-input"
                  value={tagInput}
                  onChange={handleTagInputChange}
                  onFocus={handleTagInputFocus}
                  onBlur={handleTagInputBlur}
                  onKeyDown={handleTagInputKeyDown}
                  placeholder={taskTags.length === 0 ? (onTask ? "What task? (optional, comma to add)" : "What are you working on? (comma to add)") : "Add another..."}
                  autoComplete="off"
                />
              </div>
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
          disabled={!canSubmitPage1}
        >
          {submitting ? 'Submitting...' : (onTask === false ? 'Next' : 'Submit')}
        </button>
      </div>
    </div>
  );
}

export default CheckInPopup;
