/**
 * Web Entry Point for Expo
 * Explicitly mounts React to the DOM
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

if (typeof document !== 'undefined') {
  document.title = 'UIRMS Mobile App';
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
} else {
  console.error('Root element not found!');
}
