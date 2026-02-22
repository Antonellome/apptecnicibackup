import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import PrivateRoute from './components/PrivateRoute';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import ReportListPage from './pages/ReportListPage';
import NuovoReportPage from './pages/NuovoReportPage';
import AnagrafichePage from './pages/AnagrafichePage';
import SettingsPage from './pages/SettingsPage';
import MonthlyReportPage from './pages/MonthlyReportPage';
import NotificationsPage from './pages/Notifiche';
import { DataProvider } from './contexts/DataProvider';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      {/* PrivateRoute si occupa solo dell'autenticazione */}
      <Route element={<PrivateRoute />}>
        {/* DataProvider avvolge il Layout e tutte le pagine figlie */}
        <Route 
          path="/" 
          element={
            <DataProvider>
              <MainLayout />
            </DataProvider>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="lista-report" element={<ReportListPage />} />
          <Route path="report/nuovo" element={<NuovoReportPage />} />
          <Route path="report/edit/:reportId" element={<NuovoReportPage />} />
          <Route path="anagrafiche/:tipo" element={<AnagrafichePage />} />
          <Route path="report-mensile" element={<MonthlyReportPage />} />
          <Route path="notifiche" element={<NotificationsPage />} />
          <Route path="impostazioni" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default App;
