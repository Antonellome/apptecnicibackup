
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import PrivateRoute from './components/PrivateRoute';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import ReportListPage from './pages/ReportListPage';
import NuovoReportPage from './pages/NuovoReportPage';
import EditReportPage from './pages/EditReportPage';
// RIMOSSO: AnagrafichePage non fa parte di questa applicazione
// import AnagrafichePage from './pages/AnagrafichePage'; 
import SettingsPage from './pages/SettingsPage';
import MonthlyReportPage from './pages/MonthlyReportPage';
import NotifichePage from './pages/NotifichePage';
import CheckinPage from './pages/CheckinPage';
import { AuthProvider } from './contexts/AuthContext';
import { SnackbarProvider } from './contexts/SnackbarContext';
import { NotificationProvider } from './contexts/NotificationContext';
import PWAUpdater from './components/PWAUpdater';
import { MasterDataProvider } from './contexts/MasterDataProvider';

const App: React.FC = () => {
  return (
    <SnackbarProvider>
      <PWAUpdater />
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route path="/" element={<PrivateRoute />}>

              <Route element={
                <MasterDataProvider>
                  <MainLayout />
                </MasterDataProvider>
              }>
                <Route index element={<HomePage />} />
                <Route path="lista-report" element={<ReportListPage />} />
                <Route path="nuovo-report" element={<NuovoReportPage />} /> 
                <Route path="report/edit/:reportId" element={<EditReportPage />} />
                <Route path="check-in" element={<CheckinPage />} />
                {/* RIMOSSO: rotta non pertinente a questa applicazione */}
                {/* <Route path="anagrafiche/:tipo" element={<AnagrafichePage />} /> */}
                <Route path="report-mensile" element={<MonthlyReportPage />} />
                <Route path="notifiche" element={<NotifichePage />} />
                <Route path="impostazioni" element={<SettingsPage />} />
              </Route>
              
            </Route>

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </SnackbarProvider>
  );
};

export default App;
