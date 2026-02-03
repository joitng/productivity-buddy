import React from 'react';
import { createRoot } from 'react-dom/client';
import TimerEndPopup from './TimerEndPopup';
import './styles.css';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<TimerEndPopup />);
}
