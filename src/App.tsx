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
// Corrected import to the newly created GlobalDataProvider
import { GlobalDataProvider } from './contexts/GlobalDataProvider';

const App: React.FC = () => {
  return (
    // Wrap the entire application with the GlobalDataProvider
    <GlobalDataProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        {/* PrivateRoute handles authentication */}
        <Route element={<PrivateRoute />}>
          {/* MainLayout is now a child of the provider */}
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
            {/* The notifications route has been removed as per instructions */}
            <Route path="impostazioni" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </GlobalDataProvider>
  );
};

export default App;
