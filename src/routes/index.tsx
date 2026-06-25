import { createBrowserRouter, Navigate } from 'react-router-dom';

// Layout
import AuthLayout from '@/components/layout/AuthLayout';
import ProtectedLayout from './ProtectedLayout'; 

// Pagine
import LoginPage from '@/pages/LoginPage';
import HomePage from '@/pages/HomePage';
import NuovoReportPage from '@/pages/NuovoReportPage';
import ReportListPage from '@/pages/ReportListPage';
import SettingsPage from '@/pages/SettingsPage';
import MonthlyReportPage from '@/pages/MonthlyReportPage';
import CheckinPage from '@/pages/CheckinPage';
import EditReportPage from '@/pages/EditReportPage';
import EditOfflineReportPage from '@/pages/EditOfflineReportPage';
import NotifichePage from '@/pages/NotifichePage';
import TestVisibilita from '@/pages/TestVisibilita'; // Importa la pagina di test

export const router = createBrowserRouter([
    {
        path: '/',
        element: <ProtectedLayout />,
        children: [
            { path: '', element: <HomePage /> },
            { path: 'nuovo-report', element: <NuovoReportPage /> },
            { path: 'report/edit/:reportId', element: <EditReportPage /> },
            { path: 'report/edit-offline/:reportId', element: <EditOfflineReportPage /> },
            { path: 'lista-report', element: <ReportListPage /> },
            { path: 'impostazioni', element: <SettingsPage /> },
            { path: 'report-mensile', element: <MonthlyReportPage /> },
            { path: 'check-in', element: <CheckinPage /> },
            { path: 'notifiche', element: <NotifichePage /> },
            { path: 'test-visibilita', element: <TestVisibilita /> } // Aggiungi la rotta di test
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
], {
    future: {
        v7_relativeSplatPath: true,
    },
});
