import React, { useState, useEffect, useMemo } from 'react';
import type { ScheduledChunk } from '../../../shared/types';
import ChunkEditor from './ChunkEditor';
import './ChunksPage.css';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function ChunksPage(): React.ReactElement {
  const [chunks, setChunks] = useState<ScheduledChunk[]>([]);
  const [editingChunk, setEditingChunk] = useState<ScheduledChunk | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [collapsedDays, setCollapsedDays] = useState<Set<number>>(new Set());

  const loadChunks = async () => {
    try {
      const data = await window.electronAPI.chunks.getAll();
      setChunks(data);
    } catch (error) {
      console.error('Failed to load chunks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChunks();
  }, []);

  const handleCreate = () => {
    setIsCreating(true);
    setEditingChunk(null);
  };

  const handleEdit = (chunk: ScheduledChunk) => {
    setEditingChunk(chunk);
    setIsCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this time chunk?')) return;
    try {
      await window.electronAPI.chunks.delete(id);
      await loadChunks();
    } catch (error) {
      console.error('Failed to delete chunk:', error);
    }
  };

  const handleSave = async (data: Omit<ScheduledChunk, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingChunk) {
        await window.electronAPI.chunks.update(editingChunk.id, data);
      } else {
        await window.electronAPI.chunks.create(data);
      }
      setEditingChunk(null);
      setIsCreating(false);
      await loadChunks();
    } catch (error) {
      console.error('Failed to save chunk:', error);
    }
  };

  const handleCancel = () => {
    setEditingChunk(null);
    setIsCreating(false);
  };

  const toggleDay = (day: number) => {
    setCollapsedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
  };

  // Group chunks by day of week and sort by time
  const chunksByDay = useMemo(() => {
    const grouped: Map<number, ScheduledChunk[]> = new Map();

    // Initialize all days
    for (let i = 0; i < 7; i++) {
      grouped.set(i, []);
    }

    for (const chunk of chunks) {
      const days = chunk.recurrence.daysOfWeek || [];
      for (const day of days) {
        grouped.get(day)?.push(chunk);
      }
    }

    // Sort each day's chunks by start time
    for (const [, dayChunks] of grouped) {
      dayChunks.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }

    return grouped;
  }, [chunks]);

  if (loading) {
    return (
      <div className="chunks-page">
        <div className="loading">Loading time chunks...</div>
      </div>
    );
  }

  return (
    <div className="chunks-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Time Chunks</h1>
          <p className="page-description">
            Define structured blocks of time for focused work. Check-in popups will appear during these chunks.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleCreate}>
          + New Chunk
        </button>
      </div>

      {(isCreating || editingChunk) && (
        <div className="editor-card card">
          <h3 className="editor-title">{editingChunk ? 'Edit Chunk' : 'Create New Chunk'}</h3>
          <ChunkEditor
            chunk={editingChunk || undefined}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      )}

      <div className="chunks-list">
        {chunks.length === 0 ? (
          <div className="empty-state card">
            <p>No time chunks yet. Create your first chunk to start tracking productivity.</p>
          </div>
        ) : (
          DAY_NAMES.map((dayName, dayIndex) => {
            const dayChunks = chunksByDay.get(dayIndex) || [];
            const isCollapsed = collapsedDays.has(dayIndex);

            return (
              <div key={dayIndex} className="day-section">
                <button
                  className="day-header-toggle"
                  onClick={() => toggleDay(dayIndex)}
                >
                  <span className={`toggle-icon ${isCollapsed ? 'collapsed' : ''}`}>▼</span>
                  <span className="day-name">{dayName}</span>
                  <span className="chunk-count">{dayChunks.length}</span>
                </button>

                {!isCollapsed && (
                  <div className="day-chunks">
                    {dayChunks.length === 0 ? (
                      <div className="day-empty">No chunks scheduled</div>
                    ) : (
                      dayChunks.map((chunk) => (
                        <div key={`${dayIndex}-${chunk.id}`} className="chunk-card card">
                          <div className="chunk-header">
                            <div
                              className="chunk-color"
                              style={{ backgroundColor: chunk.color || '#4c6ef5' }}
                            />
                            <div className="chunk-info">
                              <h3 className="chunk-name">{chunk.name}</h3>
                              <div className="chunk-time">
                                {chunk.startTime} - {chunk.endTime}
                              </div>
                            </div>
                          </div>
                          <div className="chunk-actions">
                            <button className="btn btn-ghost" onClick={() => handleEdit(chunk)}>
                              Edit
                            </button>
                            <button className="btn btn-ghost" onClick={() => handleDelete(chunk.id)}>
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ChunksPage;
