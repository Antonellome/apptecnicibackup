// CIAO. Questo file definisce il contesto e l'hook per l'autenticazione.
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/utils/firebase'; 

// Definisce la forma del contesto di autenticazione
interface AuthContextType {
  user: User | null; 
  loading: boolean;    
  logout: () => Promise<void>; 
  resetPassword: (email: string) => Promise<void>; // CIAO: Aggiungo la funzione di reset
}

// Crea il contesto con un valore di default
const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  logout: async () => {}, 
  resetPassword: async () => {} // CIAO: Aggiungo il default
});

// Il provider che avvolgerà l'applicazione
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  // CIAO: Implemento la funzione per il reset della password
  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizzato per accedere facilmente al contesto di autenticazione
export const useAuth = () => useContext(AuthContext);
