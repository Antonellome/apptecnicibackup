import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { getThemeOptions } from "./theme";
import { RefreshProvider } from "./contexts/RefreshContext";
import { AuthProvider } from "./hooks/useAuth";

// Import dei componenti di pagina e di layout con i nomi corretti
import MainLayout from "./components/MainLayout";
import HomePage from "./pages/HomePage";
import Report from "./pages/ReportPage";
import ReportListPage from "./pages/ReportListPage"; // Nome corretto
import LoginPage from "./pages/LoginPage";
import PrivateRoute from "./components/PrivateRoute";
import Notifiche from "./pages/Notifiche"; // Nome corretto

const theme = createTheme(getThemeOptions());

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <AuthProvider>
          <RefreshProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              {/* Rotte protette che usano il MainLayout */}
              <Route element={<PrivateRoute><MainLayout /></PrivateRoute>}>
                <Route path="/" element={<HomePage />} />
                <Route path="/report/:id" element={<Report />} />
                <Route path="/reports" element={<ReportListPage />} />
                <Route path="/notifiche" element={<Notifiche />} />
              </Route>

            </Routes>
          </RefreshProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
