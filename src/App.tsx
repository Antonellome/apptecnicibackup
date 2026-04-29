import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box, Typography } from '@mui/material';

// Import dei Provider
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SnackbarProvider } from '@/contexts/SnackbarContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { MasterDataProvider } from '@/contexts/MasterDataProvider'; 

// Import dei Layout
import AuthLayout from '@/components/layout/AuthLayout';
import MainLayout from '@/components/layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';

// Lazy loading delle Pagine
const LoginPage = React.lazy(() => import('@/pages/LoginPage'));
const HomePage = React.lazy(() => import('@/pages/HomePage'));
const NotifichePage = React.lazy(() => import('@/pages/NotifichePage'));
const NuovoReportPage = React.lazy(() => import('@/pages/NuovoReportPage'));
const ReportListPage = React.lazy(() => import('@/pages/ReportListPage'));
const ReportMensilePage = React.lazy(() => import('@/pages/MonthlyReportPage'));
const ImpostazioniPage = React.lazy(() => import('@/pages/SettingsPage'));
const EditReportPage = React.lazy(() => import('@/pages/EditReportPage'));
// --- ECCO LA CORREZIONE: IMPORTO LA PAGINA CHECK-IN ---
const CheckinPage = React.lazy(() => import('@/pages/CheckinPage'));


const AppGatekeeper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile, loading } = useAuth();

  if (loading || (user && !userProfile?.categoria?.id)) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Caricamento dati utente...</Typography>
      </Box>
    );
  }

  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider>
      <SnackbarProvider>
        <AuthProvider>
          <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>}>
            <Routes>
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />} />
              </Route>

              <Route 
                element={
                  <ProtectedRoute>
                    <AppGatekeeper>
                      <NotificationProvider>
                        <MasterDataProvider>
                          <MainLayout />
                        </MasterDataProvider>
                      </NotificationProvider>
                    </AppGatekeeper>
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<HomePage />} />
                <Route path="/notifiche" element={<NotifichePage />} />
                {/* --- ECCO LA CORREZIONE: AGGIUNGO LA ROTTA MANCANTE --- */}
                <Route path="/check-in" element={<CheckinPage />} />
                <Route path="/nuovo-report" element={<NuovoReportPage />} />
                <Route path="/lista-report" element={<ReportListPage />} />
                <Route path="/report-mensile" element={<ReportMensilePage />} />
                <Route path="/impostazioni" element={<ImpostazioniPage />} />
                <Route path="/report/edit/:reportId" element={<EditReportPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </AuthProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;
