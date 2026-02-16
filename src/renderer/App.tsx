import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import CalendarPage from './components/calendar/CalendarPage';
import ChunksPage from './components/chunks/ChunksPage';
import SettingsPage from './components/settings/SettingsPage';
import AnalyticsPage from './components/AnalyticsPage';
import TimerPage from './components/TimerPage';
import DopamineMenuPage from './components/DopamineMenuPage';
import WeeklyPlannerPage from './components/weekly-planner/WeeklyPlannerPage';
import { TimerProvider } from './context/TimerContext';
import './App.css';

type Page = 'calendar' | 'chunks' | 'settings' | 'analytics' | 'timer' | 'dopamine-menu' | 'weekly-planner';

function App(): React.ReactElement {
  const [currentPage, setCurrentPage] = useState<Page>('weekly-planner');

  const renderPage = (): React.ReactElement => {
    switch (currentPage) {
      case 'calendar':
        return <CalendarPage />;
      case 'chunks':
        return <ChunksPage />;
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
