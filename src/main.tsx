import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { getSavedTheme, applyTheme } from './services/themeService';

// Initialize user's selected accent theme
applyTheme(getSavedTheme());

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
