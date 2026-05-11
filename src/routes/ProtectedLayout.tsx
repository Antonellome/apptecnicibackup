import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { MasterDataProvider } from '@/contexts/MasterDataProvider';
import MainLayout from '@/components/layout/MainLayout'; // Corretto

export const ProtectedLayout: React.FC = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div>Caricamento...</div>; // O un componente di caricamento più sofisticato
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return (
        <MasterDataProvider>
            <MainLayout>
                <Outlet />
            </MainLayout>
        </MasterDataProvider>
    );
};