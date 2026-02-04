import { Routes, Route } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import NewReportPage from './pages/NewReportPage';
import ReportListPage from './pages/ReportListPage';
import MonthlyReportPage from './pages/MonthlyReportPage';
import AttendancesPage from './pages/AttendancesPage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<PrivateRoute><HomePage /></PrivateRoute>} />
      <Route path="/new-report" element={<PrivateRoute><NewReportPage /></PrivateRoute>} />
      <Route path="/report-list" element={<PrivateRoute><ReportListPage /></PrivateRoute>} />
      <Route path="/monthly-report" element={<PrivateRoute><MonthlyReportPage /></PrivateRoute>} />
      <Route path="/attendances" element={<PrivateRoute><AttendancesPage /></PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
    </Routes>
  );
};

export default App;
