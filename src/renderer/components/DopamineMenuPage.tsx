import React, { useState, useEffect } from 'react';
import type { DopamineMenuItem, DopamineMenuCategory } from '../../shared/types';
import './DopamineMenuPage.css';

const CATEGORIES: { key: DopamineMenuCategory; title: string; description: string }[] = [
  { key: 'appetizers', title: 'Appetizers', description: 'Quick, small dopamine boosts (5 min or less)' },
  { key: 'mains', title: 'Mains', description: 'Substantial activities for longer breaks' },
  { key: 'sides', title: 'Sides', description: 'Things you can do while doing other things' },
  { key: 'desserts', title: 'Desserts', description: 'Indulgent treats for special occasions' },
];

function DopamineMenuPage(): React.ReactElement {
  const [items, setItems] = useState<DopamineMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItemInputs, setNewItemInputs] = useState<Record<DopamineMenuCategory, string>>({
    appetizers: '',
    mains: '',
    sides: '',
    desserts: '',
  });

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const data = await window.electronAPI.dopamineMenu.getAll();
      setItems(data);
    } catch (error) {
      console.error('Failed to load dopamine menu items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (category: DopamineMenuCategory) => {
    const name = newItemInputs[category].trim();
    if (!name) return;

    try {
      const newItem = await window.electronAPI.dopamineMenu.create({ category, name });
      setItems([...items, newItem]);
      setNewItemInputs({ ...newItemInputs, [category]: '' });
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await window.electronAPI.dopamineMenu.delete(id);
      setItems(items.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, category: DopamineMenuCategory) => {
    if (e.key === 'Enter') {
      handleAddItem(category);
    }
  };

  const getItemsByCategory = (category: DopamineMenuCategory) => {
    return items.filter((item) => item.category === category);
  };

  if (loading) {
    return (
      <div className="dopamine-menu-page">
        <div className="loading">Loading menu...</div>
      </div>
    );
  }

  return (
    <div className="dopamine-menu-page">
      <h1 className="page-title">Dopamine Menu</h1>
      <p className="page-description">
        Build your personal menu of dopamine-boosting activities to help get back on track when you're off-task.
      </p>

      <div className="menu-grid">
        {CATEGORIES.map(({ key, title, description }) => (
          <div key={key} className="menu-category card">
            <div className="category-header">
              <h2 className="category-title">{title}</h2>
              <p className="category-description">{description}</p>
            </div>

            <div className="category-items">
              {getItemsByCategory(key).length === 0 ? (
                <p className="no-items">No items yet</p>
              ) : (
                <ul className="items-list">
                  {getItemsByCategory(key).map((item) => (
                    <li key={item.id} className="menu-item">
                      <span className="item-name">{item.name}</span>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteItem(item.id)}
                        title="Remove item"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="add-item">
              <input
                type="text"
                placeholder={`Add ${title.toLowerCase().slice(0, -1)}...`}
                value={newItemInputs[key]}
                onChange={(e) => setNewItemInputs({ ...newItemInputs, [key]: e.target.value })}
                onKeyDown={(e) => handleKeyDown(e, key)}
              />
              <button
                className="btn btn-primary"
                onClick={() => handleAddItem(key)}
                disabled={!newItemInputs[key].trim()}
              >
                Add
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DopamineMenuPage;
