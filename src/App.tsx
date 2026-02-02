import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthProvider'; // Corretto: import da contexts
import { useAuth } from './hooks/useAuth';           // Corretto: import da hooks
import { Box, CircularProgress } from '@mui/material';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import NewReportPage from './pages/NewReportPage';
import ReportListPage from './pages/ReportListPage';
import MonthlyReportPage from './pages/MonthlyReportPage';
import AttendancesPage from './pages/AttendancesPage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';

// Componente per le route protette
const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

// Componente separato per le rotte in modo che possa usare l'hook useAuth
const AppRoutes = () => {
  return (
    <Router>
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
    </Router>
  );
};

// App principale che fornisce il contesto
const App = () => {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
};

export default App;
