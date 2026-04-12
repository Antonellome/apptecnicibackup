import { createBrowserRouter, Navigate } from 'react-router-dom';

// Layout
import AuthLayout from '@/components/layout/AuthLayout';

// Pagine
import LoginPage from '@/pages/LoginPage';
import HomePage from '@/pages/HomePage';
import NuovoReportPage from '@/pages/NuovoReportPage';
import ReportListPage from '@/pages/ReportListPage';
import SettingsPage from '@/pages/SettingsPage';
import MonthlyReportPage from '@/pages/MonthlyReportPage';
import CheckinPage from '@/pages/CheckinPage';
import NotifichePage from '@/pages/NotifichePage'; // **CORREZIONE: Importo la pagina Notifiche**

// Auth HOC
import { ProtectedRoute } from './ProtectedRoute';

export const router = createBrowserRouter([
    {
        path: '/',
        element: <ProtectedRoute />,
        children: [
            { path: '', element: <HomePage /> },
            { path: 'nuovo-report', element: <NuovoReportPage /> },
            { path: 'lista-report', element: <ReportListPage /> },
            { path: 'impostazioni', element: <SettingsPage /> },
            { path: 'report-mensile', element: <MonthlyReportPage /> },
            { path: 'check-in', element: <CheckinPage /> },
            { path: 'notifiche', element: <NotifichePage /> }, // **CORREZIONE: Aggiungo la rotta /notifiche**
        ]
    },
    {
        path: '/login',
        element: <AuthLayout />,
        children: [
            { path: '', element: <LoginPage /> },
        ]
    },
    { 
        path: '*',
        element: <Navigate to="/" replace />
    }
]);