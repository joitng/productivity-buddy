import React, { useState } from 'react';
import type { WeeklyTask, WeeklyTaskCategory } from '../../../shared/types';
import './DayColumn.css';
import './WeeklyTasks.css';

interface WeeklyTasksProps {
  tasks: WeeklyTask[];
  onAddTask: (category: WeeklyTaskCategory, text: string) => void;
  onToggleTask: (id: string, completed: boolean) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (id: string, text: string) => void;
}

function WeeklyTasks({
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onUpdateTask,
}: WeeklyTasksProps): React.ReactElement {
  const [newActiveTask, setNewActiveTask] = useState('');
  const [newFocusTask, setNewFocusTask] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const activeTasks = tasks.filter((t) => t.category === 'active');
  const focusTasks = tasks.filter((t) => t.category === 'focus');

  const handleAddTask = (category: WeeklyTaskCategory) => {
    const text = category === 'active' ? newActiveTask : newFocusTask;
    if (text.trim()) {
      onAddTask(category, text.trim());
      if (category === 'active') {
        setNewActiveTask('');
      } else {
        setNewFocusTask('');
      }
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

  const renderTaskList = (
    categoryTasks: WeeklyTask[],
    category: WeeklyTaskCategory,
    newTaskValue: string,
    setNewTaskValue: (value: string) => void
  ) => {
    const completedCount = categoryTasks.filter((t) => t.completed).length;
    const totalCount = categoryTasks.length;

    return (
      <div className={`task-category ${category}`}>
        <div className="category-header">
          <h3 className="category-title">
            {category === 'active' ? 'Active Tasks' : 'Focus Tasks'}
          </h3>
          {totalCount > 0 && (
            <span className="task-count">
              {completedCount}/{totalCount}
            </span>
          )}
        </div>
        <p className="category-description">
          {category === 'active'
            ? 'Tasks requiring active energy'
            : 'Deep work requiring focused attention'}
        </p>

        <ul className="task-list">
          {categoryTasks.map((task) => (
            <li key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
              <label className="task-checkbox">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={(e) => onToggleTask(task.id, e.target.checked)}
                />
                <span className="checkmark" />
              </label>

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
                title="Delete task"
              >
                ×
              </button>
            </li>
          ))}
        </ul>

        <div className="add-task">
          <input
            type="text"
            placeholder={`Add ${category} task...`}
            value={newTaskValue}
            onChange={(e) => setNewTaskValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddTask(category);
            }}
          />
          <button
            className="add-task-btn"
            onClick={() => handleAddTask(category)}
            disabled={!newTaskValue.trim()}
          >
            +
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="weekly-tasks day-column">
      <div className="day-header">
        <span className="day-name">Tasks</span>
        <span className="day-date">This Week</span>
      </div>
      <div className="day-content">
        {renderTaskList(activeTasks, 'active', newActiveTask, setNewActiveTask)}
        {renderTaskList(focusTasks, 'focus', newFocusTask, setNewFocusTask)}
      </div>
    </div>
  );
}

export default WeeklyTasks;
