// CIAO. Questo file definisce il contesto e l'hook per l'autenticazione in modo robusto.
import { useState, useEffect, createContext, ReactNode, useMemo, useCallback, useContext } from 'react';
import { onAuthStateChanged, User, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '@/utils/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Rappresenta il profilo completo dell'utente
export interface UserProfile {
    uid: string;
    email: string;
    nome: string;
    cognome: string;
    attivo: boolean;
    id_categoria?: string;
    nomeCategoria?: string;
    ruolo?: string;
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
              // 1. Carica il documento da tecnici/{uid}
              const tecnicoDocRef = doc(db, 'tecnici', currentUser.uid);
              const tecnicoSnap = await getDoc(tecnicoDocRef);

              if (tecnicoSnap.exists()) {
                  const tecnicoData = tecnicoSnap.data();
                  const id_categoria = tecnicoData.id_categoria;
                  let nomeCategoriaStr = '';

                  // 2. Se id_categoria esiste, esegui subito la lettura del nome dalla collezione categorie
                  if (id_categoria && typeof id_categoria === 'string') {
                      try {
                          const catDocRef = doc(db, 'categorie', id_categoria);
                          const catDoc = await getDoc(catDocRef);

                          if (catDoc.exists()) {
                              nomeCategoriaStr = catDoc.data().nome || '';
                              console.log(`[Identita] Categoria pronta: [${nomeCategoriaStr}]`);
                          }
                      } catch (err) {
                          console.error("[Auth] Errore risoluzione categoria:", err);
                      }
                  }

                  // 3. Solo dopo aver ottenuto il nome (o averci provato), aggiorna userProfile
                  setUserProfile({
                      uid: currentUser.uid,
                      email: currentUser.email || '',
                      nome: tecnicoData.nome || '',
                      cognome: tecnicoData.cognome || '',
                      attivo: tecnicoData.attivo || false,
                      id_categoria: id_categoria || '',
                      nomeCategoria: nomeCategoriaStr,
                      ruolo: tecnicoData.ruolo
                  });
                  
                  console.log(`[Auth] Profilo completo pronto per: ${currentUser.email}`);
              } else {
                  setUserProfile(null);
              }
          } catch (error) {
              console.error("[Auth] Errore caricamento profilo:", error);
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

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth deve essere usato all\'interno di un AuthProvider');
    }
    return context;
};