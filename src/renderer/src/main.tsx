import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { LocatorProvider } from './components/LocatorProvider';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <LocatorProvider />
    <App />
  </React.StrictMode>
);
