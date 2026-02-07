import { useContext } from 'react';
import { AuthContext, type AuthContextType } from '@/contexts/AuthContext';

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve essere utilizzato all\'interno di un AuthProvider");
  }
  return context;
};
