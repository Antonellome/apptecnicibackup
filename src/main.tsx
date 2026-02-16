
// CIAO. Punto di ingresso dell'applicazione React.

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { GlobalDataProvider } from './contexts/GlobalDataProvider';
import { AuthProvider } from './hooks/useAuth';
import { ThemeProvider } from './contexts/ThemeContext'; // CIAO: IMPORTO IL PROVIDER CORRETTO!
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Impossibile trovare l'elemento root.");

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      {/* CIAO: Uso il ThemeProvider corretto, dal file di contesto. */}
      <ThemeProvider>
        <AuthProvider>
          <GlobalDataProvider>
            <App />
          </GlobalDataProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
