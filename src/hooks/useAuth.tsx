// CIAO. Questo file definisce il contesto e l'hook per l'autenticazione.
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth } from '@/utils/firebase'; // CIAO: CORRETTO. IMPORTO DALLA FONTE UNICA.

// Definisce la forma del contesto di autenticazione
interface AuthContextType {
  user: User | null; // L'utente di Firebase o null se non loggato
  loading: boolean;    // Indica se lo stato di autenticazione si sta ancora caricando
  logout: () => Promise<void>; // Funzione per eseguire il logout
}

// Crea il contesto con un valore di default
const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  logout: async () => {} 
});

// Il provider che avvolgerà l'applicazione
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Si mette in ascolto dei cambiamenti di stato dell'autenticazione di Firebase
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    // Pulisce la sottoscrizione quando il componente viene smontato
    return () => unsubscribe();
  }, []);

  // Funzione per eseguire il logout
  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizzato per accedere facilmente al contesto di autenticazione
export const useAuth = () => useContext(AuthContext);
