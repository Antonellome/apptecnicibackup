// CIAO. Punto di ingresso dell'applicazione React.

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { GlobalDataProvider } from './contexts/GlobalDataProvider';
import { AuthProvider } from './hooks/useAuth'; // Importa il provider di autenticazione
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Impossibile trovare l'elemento root.");

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      {/* CIAO: AuthProvider ora avvolge l'intera app, fornendo i dati dell'utente. */}
      <AuthProvider>
        {/* CIAO: GlobalDataProvider carica i dati anagrafici (tecnici, navi, etc.). */}
        <GlobalDataProvider>
          <App />
        </GlobalDataProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
