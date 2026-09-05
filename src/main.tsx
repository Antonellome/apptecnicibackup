import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider } from '@/providers/ThemeProvider';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Impossibile trovare l'elemento root.");

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
