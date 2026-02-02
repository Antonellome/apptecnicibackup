import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthProvider'; // Corretto il percorso

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve essere usato all\'interno di un AuthProvider');
  }
  return context;
};
