
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import FullScreenLoader from '@/components/layout/FullScreenLoader';
import MainLayout from '@/components/layout/MainLayout';
import { useFcmToken } from '@/hooks/useFcmToken';

const ProtectedLayout: React.FC = () => {
    const { user, loading } = useAuth();
    useFcmToken();

    if (loading) {
        return <FullScreenLoader />;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <MainLayout />;
};

export default ProtectedLayout;
