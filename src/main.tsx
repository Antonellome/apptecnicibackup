import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// Force rebuild to apply latest changes - 2024-07-27
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Impossibile trovare l'elemento root.");

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
