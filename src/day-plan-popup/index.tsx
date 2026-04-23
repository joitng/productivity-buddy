import React from 'react';
import { createRoot } from 'react-dom/client';
import DayPlanPopup from './DayPlanPopup';
import './styles.css';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<DayPlanPopup />);
}
