
import React from 'react';
import { useAuth } from '@/hooks/useAuth'; // Corretto: Importa dal percorso corretto dell'hook
import { MasterDataProvider } from '../contexts/MasterDataProvider';
import { GlobalDataProvider } from '../contexts/GlobalDataProvider';
import { NotificationProvider } from '../contexts/NotificationContext';
import AppInitializer from './AppInitializer';

interface ProvidersWrapperProps {
    children: React.ReactNode;
}

const ProvidersWrapper: React.FC<ProvidersWrapperProps> = ({ children }) => {
    const { user } = useAuth();

    // La prop `key` forza React a ri-montare i componenti quando il valore della chiave cambia.
    // In questo caso, quando l'utente fa login/logout, `user.uid` cambia, causando il reset
    // completo e pulito di tutti gli stati interni dei provider, eliminando così la necessità
    // di chiamate a `setState` negli `useEffect` che causavano gli errori di linting.
    // Usiamo `user?.uid` o una stringa statica per garantire che la chiave sia sempre presente.
    return (
        <MasterDataProvider key={`master-${user?.uid || 'logged-out'}`}>
            <GlobalDataProvider>
                <NotificationProvider>
                    <AppInitializer>
                        {children}
                    </AppInitializer>
                </NotificationProvider>
            </GlobalDataProvider>
        </MasterDataProvider>
    );
};

export default ProvidersWrapper;
