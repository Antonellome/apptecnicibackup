import { useContext } from 'react';
import { AuthContext, AuthContextType } from '@/contexts/AuthContextDefinition';

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth deve essere usato all\'interno di un AuthProvider');
    }
    return context;
};
