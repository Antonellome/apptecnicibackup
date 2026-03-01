
import { createBrowserRouter, Navigate } from 'react-router-dom';

// Layout
import AuthLayout from '@/components/layout/AuthLayout';

// Pagine
import LoginPage from '@/pages/LoginPage';
import HomePage from '@/pages/HomePage';
import NuovoReportPage from '@/pages/NuovoReportPage';
import ReportListPage from '@/pages/ReportListPage';
import SettingsPage from '@/pages/SettingsPage'; // Corretto
import MonthlyReportPage from '@/pages/MonthlyReportPage';

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
            { path: 'impostazioni', element: <SettingsPage /> }, // Corretto
            { path: 'report-mensile', element: <MonthlyReportPage /> },
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
