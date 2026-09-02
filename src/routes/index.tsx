
import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

// Layout
import AuthLayout from '@/components/layout/AuthLayout';
import ProtectedLayout from './ProtectedLayout';

// Helper per il Suspense
const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
    <Suspense fallback={
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <CircularProgress />
        </Box>
    }>
        {children}
    </Suspense>
);

// Pagine caricate in modo "lazy"
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const HomePage = lazy(() => import('@/pages/HomePage'));
const NuovoReportPage = lazy(() => import('@/pages/NuovoReportPage'));
const ReportListPage = lazy(() => import('@/pages/ReportListPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const MonthlyReportPage = lazy(() => import('@/pages/MonthlyReportPage'));
const CheckinPage = lazy(() => import('@/pages/CheckinPage'));
const EditReportPage = lazy(() => import('@/pages/EditReportPage'));
const EditOfflineReportPage = lazy(() => import('@/pages/EditOfflineReportPage'));
const NotifichePage = lazy(() => import('@/pages/NotifichePage'));
const TestVisibilita = lazy(() => import('@/pages/TestVisibilita'));

export const router = createBrowserRouter([
    {
        path: '/',
        element: <ProtectedLayout />,
        children: [
            { path: '', element: <SuspenseWrapper><HomePage /></SuspenseWrapper> },
            { path: 'nuovo-report', element: <SuspenseWrapper><NuovoReportPage /></SuspenseWrapper> },
            { path: 'report/edit/:reportId', element: <SuspenseWrapper><EditReportPage /></SuspenseWrapper> },
            { path: 'report/edit-offline/:reportId', element: <SuspenseWrapper><EditOfflineReportPage /></SuspenseWrapper> },
            { path: 'lista-report', element: <SuspenseWrapper><ReportListPage /></SuspenseWrapper> },
            { path: 'impostazioni', element: <SuspenseWrapper><SettingsPage /></SuspenseWrapper> },
            { path: 'report-mensile', element: <SuspenseWrapper><MonthlyReportPage /></SuspenseWrapper> },
            { path: 'check-in', element: <SuspenseWrapper><CheckinPage /></SuspenseWrapper> },
            { path: 'notifiche', element: <SuspenseWrapper><NotifichePage /></SuspenseWrapper> },
            { path: 'test-visibilita', element: <SuspenseWrapper><TestVisibilita /></SuspenseWrapper> }
        ]
    },
    {
        path: '/login',
        element: <AuthLayout />,
        children: [
            { path: '', element: <SuspenseWrapper><LoginPage /></SuspenseWrapper> },
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
