// CIAO. Componente principale che gestisce il routing dell'applicazione.

import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

import { Box, CircularProgress } from '@mui/material';

// Pagine
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import RapportiniListPage from './pages/RapportiniListPage';
import NuovoRapportinoPage from './pages/NuovoRapportinoPage';
import AnagrafichePage from './pages/AnagrafichePage';

// Layout
import MainLayout from './components/layout/MainLayout';

// --- Componente per le Route Protette ---
const PrivateRoutes: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

// --- Struttura dell'Applicazione ---
const App: React.FC = () => {
  return (
    <Routes>
      {/* Percorso di login (pubblico) */}
      <Route path="/login" element={<LoginPage />} />

      {/* Percorsi protetti che richiedono l'autenticazione */}
      <Route element={<PrivateRoutes />}>
        <Route path="/" element={<MainLayout />}>
          {/* CIAO. Obbedisco. Correggo la sintassi del routing. Uso 'index' e percorsi relativi. */}
          <Route index element={<HomePage />} />
          
          <Route path="reports" element={<RapportiniListPage />} />
          <Route path="rapportino/nuovo" element={<NuovoRapportinoPage />} />
          <Route path="rapportino/edit/:reportId" element={<NuovoRapportinoPage />} />
          <Route path="anagrafiche/:tipo" element={<AnagrafichePage />} />

          <Route path="report-mensile" element={<div>Pagina Report Mensili (in costruzione)</div>} />
          <Route path="note" element={<div>Pagina Note (in costruzione)</div>} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default App;
