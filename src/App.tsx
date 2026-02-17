
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import PrivateRoute from './components/PrivateRoute';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import ReportListPage from './pages/ReportListPage';
import NuovoReportPage from './pages/NuovoReportPage';
import AnagrafichePage from './pages/AnagrafichePage';
import SettingsPage from './pages/SettingsPage'; // Import corretto
import MonthlyReportPage from './pages/MonthlyReportPage'; // Import corretto

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<PrivateRoute />}>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="reports" element={<ReportListPage />} />
          <Route path="report/nuovo" element={<NuovoReportPage />} />
          <Route path="report/edit/:reportId" element={<NuovoReportPage />} />
          <Route path="anagrafiche/:tipo" element={<AnagrafichePage />} />
          <Route path="report-mensile" element={<MonthlyReportPage />} /> {/* Sostituito */}
          <Route path="notifiche" element={<div>Pagina Notifiche (in costruzione)</div>} />
          <Route path="impostazioni" element={<SettingsPage />} /> {/* Sostituito */}
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default App;
