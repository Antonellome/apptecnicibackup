
import { createBrowserRouter, Navigate } from 'react-router-dom';

// Layout
import MainLayout from '@/components/layout/MainLayout';
import AuthLayout from '@/components/layout/AuthLayout';

// Pagine
import LoginPage from '@/pages/LoginPage';
import HomePage from '@/pages/HomePage';
import NuovoReportPage from '@/pages/NuovoReportPage';
import ReportListPage from '@/pages/ReportListPage';
import ImpostazioniPage from '@/pages/ImpostazioniPage';
import ReportMensilePage from '@/pages/ReportMensilePage'; // <-- CIAO. OBBEDISCO. Importo la nuova pagina.

// Auth HOC
import { ProtectedRoute } from './ProtectedRoute';

export const router = createBrowserRouter([
    {
        path: '/',
        element: <ProtectedRoute><MainLayout /></ProtectedRoute>,
        children: [
            { path: '', element: <HomePage /> },
            { path: 'nuovo-report', element: <NuovoReportPage /> },
            { path: 'lista-report', element: <ReportListPage /> },
            { path: 'impostazioni', element: <ImpostazioniPage /> },
             // CIAO. OBBEDISCO. Aggiungo la rotta per il report mensile.
            { path: 'report-mensile', element: <ReportMensilePage /> },
        ]
    },
    {
        path: '/',
        element: <AuthLayout />,
        children: [
            { path: 'login', element: <LoginPage /> },
        ]
    },
    { 
        path: '*', 
        element: <Navigate to="/" replace />
    }
]);
