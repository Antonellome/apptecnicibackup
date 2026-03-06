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
import NotifichePage from './pages/NotifichePage';
import { AuthProvider } from './contexts/AuthContext';
import { GlobalDataProvider } from './contexts/GlobalDataProvider';
import { SnackbarProvider } from './contexts/SnackbarContext';
import { NotificationProvider } from './contexts/NotificationContext';
import PWAUpdater from './components/PWAUpdater';

const App: React.FC = () => {
  return (
    <SnackbarProvider>
      <PWAUpdater />
      <AuthProvider>
        <NotificationProvider>
          <GlobalDataProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              
              <Route element={<PrivateRoute />}>
                <Route 
                  path="/" 
                  element={<MainLayout />}
                >
                  <Route index element={<HomePage />} />
                  <Route path="lista-report" element={<ReportListPage />} />
                  <Route path="report/nuovo" element={<NuovoReportPage />} />
                  <Route path="report/edit/:reportId" element={<NuovoReportPage />} />
                  <Route path="anagrafiche/:tipo" element={<AnagrafichePage />} />
                  <Route path="report-mensile" element={<MonthlyReportPage />} />
                  <Route path="notifiche" element={<NotifichePage />} />
                  <Route path="impostazioni" element={<SettingsPage />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </GlobalDataProvider>
        </NotificationProvider>
      </AuthProvider>
    </SnackbarProvider>
  );
};

export default App;