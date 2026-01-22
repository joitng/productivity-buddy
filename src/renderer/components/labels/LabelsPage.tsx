import React, { useState, useEffect } from 'react';
import type { DayLabel, RecurrenceRule } from '../../../shared/types';
import DayLabelEditor from './DayLabelEditor';
import { describeRecurrence } from '../../../shared/recurrence';
import './LabelsPage.css';

function LabelsPage(): React.ReactElement {
  const [labels, setLabels] = useState<DayLabel[]>([]);
  const [editingLabel, setEditingLabel] = useState<DayLabel | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadLabels = async () => {
    try {
      const data = await window.electronAPI.dayLabels.getAll();
      setLabels(data);
    } catch (error) {
      console.error('Failed to load labels:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLabels();
  }, []);

  const handleCreate = () => {
    setIsCreating(true);
    setEditingLabel(null);
  };

  const handleEdit = (label: DayLabel) => {
    setEditingLabel(label);
    setIsCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this day label?')) return;
    try {
      await window.electronAPI.dayLabels.delete(id);
      await loadLabels();
    } catch (error) {
      console.error('Failed to delete label:', error);
    }
  };

  const handleSave = async (data: Omit<DayLabel, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingLabel) {
        await window.electronAPI.dayLabels.update(editingLabel.id, data);
      } else {
        await window.electronAPI.dayLabels.create(data);
      }
      setEditingLabel(null);
      setIsCreating(false);
      await loadLabels();
    } catch (error) {
      console.error('Failed to save label:', error);
    }
  };

  const handleCancel = () => {
    setEditingLabel(null);
    setIsCreating(false);
  };

  if (loading) {
    return (
      <div className="labels-page">
        <div className="loading">Loading day labels...</div>
      </div>
    );
  }

  return (
    <div className="labels-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Day Labels</h1>
          <p className="page-description">
            Add themes or labels to days to help organize your week (e.g., "Focus Day", "Meeting Day").
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleCreate}>
          + New Label
        </button>
      </div>

      {(isCreating || editingLabel) && (
        <div className="editor-card card">
          <h3 className="editor-title">{editingLabel ? 'Edit Label' : 'Create New Label'}</h3>
          <DayLabelEditor
            label={editingLabel || undefined}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      )}

      <div className="labels-list">
        {labels.length === 0 ? (
          <div className="empty-state card">
            <p>No day labels yet. Create labels to theme your days.</p>
          </div>
        ) : (
          labels.map((label) => (
            <div key={label.id} className="label-card card">
              <div className="label-header">
                <div
                  className="label-badge"
                  style={{ backgroundColor: `${label.color}20`, color: label.color }}
                >
                  {label.emoji && <span className="label-emoji">{label.emoji}</span>}
                  <span>{label.label}</span>
                </div>
              </div>
              <div className="label-recurrence">
                {describeRecurrence(label.recurrence)}
              </div>
              <div className="label-actions">
                <button className="btn btn-ghost" onClick={() => handleEdit(label)}>
                  Edit
                </button>
                <button className="btn btn-ghost" onClick={() => handleDelete(label.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default LabelsPage;
