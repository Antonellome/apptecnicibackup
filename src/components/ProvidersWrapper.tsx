
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MasterDataProvider } from '../providers/MasterDataProvider';
import { GlobalDataProvider } from '../providers/GlobalDataProvider';

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
                {children}
            </GlobalDataProvider>
        </MasterDataProvider>
    );
};

export default ProvidersWrapper;
