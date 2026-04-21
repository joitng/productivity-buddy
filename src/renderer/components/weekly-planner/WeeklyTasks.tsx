import React, { useState, useRef } from 'react';
import type { WeeklyTask } from '../../../shared/types';
import './DayColumn.css';
import './WeeklyTasks.css';

interface WeeklyTasksProps {
  tasks: WeeklyTask[];
  onAddTask: (text: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (id: string, text: string) => void;
  onReorderTasks: (reordered: WeeklyTask[]) => void;
}

function WeeklyTasks({
  tasks,
  onAddTask,
  onDeleteTask,
  onUpdateTask,
  onReorderTasks,
}: WeeklyTasksProps): React.ReactElement {
  const [newTask, setNewTask] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragIdRef = useRef<string | null>(null);

  const handleAdd = () => {
    if (newTask.trim()) {
      onAddTask(newTask.trim());
      setNewTask('');
    }
  };

  const startEditing = (task: WeeklyTask) => {
    setEditingId(task.id);
    setEditText(task.text);
  };

  const saveEdit = () => {
    if (editingId && editText.trim()) {
      onUpdateTask(editingId, editText.trim());
    }
    setEditingId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    dragIdRef.current = id;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== dragIdRef.current) setDragOverId(id);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = dragIdRef.current;
    if (!sourceId || sourceId === targetId) return;

    const reordered = [...tasks];
    const fromIdx = reordered.findIndex((t) => t.id === sourceId);
    const toIdx = reordered.findIndex((t) => t.id === targetId);
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    setDragOverId(null);
    dragIdRef.current = null;
    onReorderTasks(reordered);
  };

  const handleDragEnd = () => {
    setDragOverId(null);
    dragIdRef.current = null;
  };

  return (
    <div className="weekly-tasks day-column">
      <div className="day-header">
        <span className="day-name">Foci for the week</span>
      </div>
      <div className="day-content">
        <ul className="task-list">
          {tasks.map((task) => (
            <li
              key={task.id}
              className={`task-item${dragOverId === task.id ? ' drag-over' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, task.id)}
              onDragOver={(e) => handleDragOver(e, task.id)}
              onDrop={(e) => handleDrop(e, task.id)}
              onDragEnd={handleDragEnd}
            >
              <span className="drag-handle" title="Drag to reorder">⠿</span>
              <span className="task-bullet">•</span>

              {editingId === task.id ? (
                <input
                  type="text"
                  className="task-edit-input"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  autoFocus
                />
              ) : (
                <span className="task-text" onClick={() => startEditing(task)}>
                  {task.text}
                </span>
              )}

              <button
                className="task-delete"
                onClick={() => onDeleteTask(task.id)}
                title="Delete"
              >
                ×
              </button>
            </li>
          ))}
        </ul>

        <div className="add-task">
          <input
            type="text"
            placeholder="Add a focus..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
            }}
          />
          <button
            className="add-task-btn"
            onClick={handleAdd}
            disabled={!newTask.trim()}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

export default WeeklyTasks;
