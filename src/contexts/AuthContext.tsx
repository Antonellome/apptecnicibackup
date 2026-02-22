// CIAO. Questo file definisce il contesto e l'hook per l'autenticazione in modo robusto.
import { useState, useEffect, createContext, ReactNode, useMemo, useCallback } from 'react';
import { onAuthStateChanged, User, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/utils/firebase';

// Definisce la forma del contesto di autenticazione
interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

// Crea il contesto. Il valore di default non viene mai usato grazie al provider.
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Il provider che avvolgerà l'applicazione
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // L'effetto per iscriversi ai cambiamenti di stato di Firebase.
  // Questo viene eseguito solo una volta al montaggio del componente.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    // Pulisce l'iscrizione quando il componente viene smontato
    return () => unsubscribe();
  }, []);

  // Funzione di logout, memoizzata con useCallback per la stabilità referenziale.
  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  // Funzione di reset password, memoizzata con useCallback.
  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  // **LA CORREZIONE CHIAVE È QUI**
  // Memoizziamo l'oggetto 'value' del contesto con useMemo.
  // Questo oggetto verrà ricreato solo se 'user' o 'loading' cambiano.
  // Questo previene ri-renderizzazioni inutili e garantisce la stabilità dello stato.
  const value = useMemo(() => ({
    user,
    loading,
    logout,
    resetPassword,
  }), [user, loading, logout, resetPassword]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
