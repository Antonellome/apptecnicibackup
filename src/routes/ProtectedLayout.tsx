
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import FullScreenLoader from '@/components/layout/FullScreenLoader';
import MainLayout from '@/components/layout/MainLayout';

/**
 * Componente di layout che protegge le rotte.
 * Utilizza il componente MainLayout per avvolgere le rotte figlie.
 */
const ProtectedLayout: React.FC = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return <FullScreenLoader />;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // MainLayout contiene già un <Outlet /> al suo interno.
    // Tutte le rotte definite come figlie di ProtectedLayout
    // verranno renderizzate da quell'Outlet.
    return <MainLayout />;
};

export default ProtectedLayout;
