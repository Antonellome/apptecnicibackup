import { Routes, Route } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RapportinoNew from './pages/RapportinoNew';
import RapportiniList from './pages/RapportiniList';
import RapportinoEdit from './pages/RapportinoEdit';
import MonthlyReportPage from './pages/MonthlyReportPage';
import AttendancesPage from './pages/AttendancesPage';
import SettingsPage from './pages/SettingsPage';

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<PrivateRoute><HomePage /></PrivateRoute>} />
      <Route path="/rapportini" element={<PrivateRoute><RapportiniList /></PrivateRoute>} />
      <Route path="/rapportini/nuovo" element={<PrivateRoute><RapportinoNew /></PrivateRoute>} />
      <Route path="/rapportini/:id" element={<PrivateRoute><RapportinoEdit /></PrivateRoute>} />
      <Route path="/monthly-report" element={<PrivateRoute><MonthlyReportPage /></PrivateRoute>} />
      <Route path="/attendances" element={<PrivateRoute><AttendancesPage /></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
    </Routes>
  );
};

export default App;
