import React from 'react';
import './Sidebar.css';

type Page = 'settings' | 'analytics' | 'timer' | 'dopamine-menu' | 'weekly-planner';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const navItems: { id: Page; label: string; icon: string }[] = [
  { id: 'weekly-planner', label: 'Weekly Planner', icon: 'Wk' },
  { id: 'timer', label: 'Timer', icon: 'Tmr' },
  { id: 'dopamine-menu', label: 'Dopamine Menu', icon: 'Dop' },
  { id: 'analytics', label: 'Analytics', icon: 'Ana' },
  { id: 'settings', label: 'Settings', icon: 'Set' },
];

function Sidebar({ currentPage, onNavigate }: SidebarProps): React.ReactElement {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-title">Productivity Buddy</h1>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <span className="version">v1.0.0</span>
      </div>
    </aside>
  );
}

export default Sidebar;
