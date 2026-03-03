// CIAO. Questo file definisce il contesto e l'hook per l'autenticazione in modo robusto.
import { useState, useEffect, createContext, ReactNode, useMemo, useCallback } from 'react';
import { onAuthStateChanged, User, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '@/utils/firebase';
import { doc, getDoc, DocumentReference } from 'firebase/firestore';

// Rappresenta l'oggetto categoria, una volta risolto il riferimento
export interface Categoria {
    id: string;
    nome: string;
}

// Rappresenta il profilo completo dell'utente
export interface UserProfile {
    uid: string;
    email: string;
    nome: string;
    cognome: string;
    attivo: boolean;
    categoria?: Categoria;
}

// Definisce la forma del contesto di autenticazione
export interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

// Crea il contesto. Il valore di default non viene mai usato grazie al provider.
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Il provider che avvolgerà l'applicazione
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // L'effetto per iscriversi ai cambiamenti di stato di Firebase.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      setUser(currentUser);
      
      if (currentUser) {
          try {
              const userDocRef = doc(db, 'tecnici', currentUser.uid);
              const userDocSnap = await getDoc(userDocRef);

              if (userDocSnap.exists()) {
                  const userData = userDocSnap.data();
                  let categoriaData: Categoria | undefined = undefined;

                  if (userData.categoria && userData.categoria instanceof DocumentReference) {
                      const categoriaRef = userData.categoria as DocumentReference;
                      const categoriaSnap = await getDoc(categoriaRef);
                      if (categoriaSnap.exists()) {
                          categoriaData = {
                              id: categoriaSnap.id,
                              nome: categoriaSnap.data().nome
                          };
                      }
                  }

                  setUserProfile({
                      uid: currentUser.uid,
                      email: currentUser.email || '',
                      nome: userData.nome,
                      cognome: userData.cognome,
                      attivo: userData.attivo,
                      categoria: categoriaData
                  });
              } else {
                  setUserProfile(null);
              }
          } catch (error) {
              console.error("Errore nel caricamento del profilo utente:", error);
              setUserProfile(null);
          }
      } else {
          setUserProfile(null);
      }
      
      setLoading(false);
    });
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

  // Memoizziamo l'oggetto 'value' del contesto con useMemo.
  const value = useMemo(() => ({
    user,
    userProfile,
    loading,
    logout,
    resetPassword,
  }), [user, userProfile, loading, logout, resetPassword]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};