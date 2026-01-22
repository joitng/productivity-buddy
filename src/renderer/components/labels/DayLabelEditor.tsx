import React, { useState } from 'react';
import type { DayLabel, RecurrenceRule } from '../../../shared/types';
import RecurrenceSelector from '../chunks/RecurrenceSelector';
import './DayLabelEditor.css';

const COLORS = [
  '#4c6ef5', // Blue
  '#7950f2', // Violet
  '#be4bdb', // Grape
  '#f06595', // Pink
  '#fa5252', // Red
  '#fd7e14', // Orange
  '#fab005', // Yellow
  '#40c057', // Green
  '#20c997', // Teal
  '#15aabf', // Cyan
];

const EMOJIS = ['', '🎯', '💼', '🧘', '📚', '🏃', '💡', '🔧', '📝', '🎨', '🤝', '🌟'];

interface DayLabelEditorProps {
  label?: DayLabel;
  onSave: (data: Omit<DayLabel, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

function DayLabelEditor({ label, onSave, onCancel }: DayLabelEditorProps): React.ReactElement {
  const [labelText, setLabelText] = useState(label?.label || '');
  const [color, setColor] = useState(label?.color || COLORS[0]);
  const [emoji, setEmoji] = useState(label?.emoji || '');
  const [recurrence, setRecurrence] = useState<RecurrenceRule>(
    label?.recurrence || { type: 'weekly', daysOfWeek: [1] }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!labelText.trim()) return;

    onSave({
      label: labelText.trim(),
      color,
      emoji: emoji || undefined,
      recurrence,
    });
  };

  return (
    <form className="label-editor" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="labelText">Label</label>
        <input
          id="labelText"
          type="text"
          value={labelText}
          onChange={(e) => setLabelText(e.target.value)}
          placeholder="e.g., Focus Day, Meeting Day"
          required
        />
      </div>

      <div className="form-group">
        <label>Color</label>
        <div className="color-picker">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`color-option ${color === c ? 'selected' : ''}`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Emoji (optional)</label>
        <div className="emoji-picker">
          {EMOJIS.map((e, i) => (
            <button
              key={i}
              type="button"
              className={`emoji-option ${emoji === e ? 'selected' : ''}`}
              onClick={() => setEmoji(e)}
            >
              {e || 'None'}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Recurrence</label>
        <RecurrenceSelector value={recurrence} onChange={setRecurrence} />
      </div>

      <div className="preview">
        <label>Preview</label>
        <div
          className="preview-badge"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {emoji && <span>{emoji}</span>}
          <span>{labelText || 'Label'}</span>
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          {label ? 'Save Changes' : 'Create Label'}
        </button>
      </div>
    </form>
  );
}

export default DayLabelEditor;
