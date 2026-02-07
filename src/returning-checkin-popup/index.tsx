import React from 'react';
import { createRoot } from 'react-dom/client';
import ReturningCheckInPopup from './ReturningCheckInPopup';
import './styles.css';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<ReturningCheckInPopup />);
}
