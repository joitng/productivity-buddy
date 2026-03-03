import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import SettingsPage from './components/settings/SettingsPage';
import AnalyticsPage from './components/AnalyticsPage';
import TimerPage from './components/TimerPage';
import DopamineMenuPage from './components/DopamineMenuPage';
import WeeklyPlannerPage from './components/weekly-planner/WeeklyPlannerPage';
import { TimerProvider } from './context/TimerContext';
import './App.css';

type Page = 'settings' | 'analytics' | 'timer' | 'dopamine-menu' | 'weekly-planner';

function App(): React.ReactElement {
  const [currentPage, setCurrentPage] = useState<Page>('weekly-planner');

  useEffect(() => {
    window.electronAPI.navigate.onTimer(() => {
      setCurrentPage('timer');
    });
  }, []);

  const renderPage = (): React.ReactElement => {
    switch (currentPage) {
      case 'settings':
        return <SettingsPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'timer':
        return <TimerPage />;
      case 'dopamine-menu':
        return <DopamineMenuPage />;
      case 'weekly-planner':
        return <WeeklyPlannerPage />;
      default:
        return <WeeklyPlannerPage />;
    }
  };

  return (
    <TimerProvider>
      <div className="app">
        <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
        <main className="main-content">
          {renderPage()}
        </main>
      </div>
    </TimerProvider>
  );
}

export default App;
