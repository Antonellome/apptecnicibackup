// CIAO. Questo file definisce il contesto e l'hook per l'autenticazione in modo robusto.
import { useState, useEffect, createContext, ReactNode, useMemo, useCallback, useContext } from 'react';
import { onAuthStateChanged, User, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '@/utils/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Rappresenta il profilo completo del tecnico
export interface UserProfile {
    uid: string; // UID di autenticazione Firebase
    email: string;
    tecnicoId: string; // Coincide con l'UID
    nome: string;
    cognome: string;
    attivo: boolean;
    id_categoria?: string;
    nomeCategoria?: string;
}

// Definisce la forma del contesto di autenticazione
export interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

// Crea il contesto
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Il provider che avvolgerà l'applicazione
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      setUser(currentUser);
      
      if (currentUser) {
          try {
              // 1. Usa l'UID dell'utente per leggere direttamente il documento del suo profilo.
              // Questa è la best practice: l'ID del documento è l'UID dell'utente.
              const tecnicoDocRef = doc(db, 'tecnici', currentUser.uid);
              const tecnicoDocSnap = await getDoc(tecnicoDocRef);

              if (tecnicoDocSnap.exists()) {
                  const tecnicoData = tecnicoDocSnap.data();
                  
                  // 2. Se id_categoria esiste, risolvi il nome della categoria.
                  const id_categoria = tecnicoData.id_categoria;
                  let nomeCategoriaStr = '';
                  if (id_categoria && typeof id_categoria === 'string') {
                      try {
                          const catDocRef = doc(db, 'categorie', id_categoria);
                          const catDoc = await getDoc(catDocRef);
                          if (catDoc.exists()) {
                              nomeCategoriaStr = catDoc.data().nome || '';
                          }
                      } catch (err) {
                          console.error("[Auth] Errore nel risolvere la categoria:", err);
                      }
                  }

                  // 3. Costruisci il profilo utente completo.
                  setUserProfile({
                      uid: currentUser.uid,
                      email: currentUser.email || '',
                      tecnicoId: tecnicoDocSnap.id, // L'ID del documento è l'UID stesso
                      nome: tecnicoData.nome || '',
                      cognome: tecnicoData.cognome || '',
                      attivo: tecnicoData.attivo || false,
                      id_categoria: id_categoria || '',
                      nomeCategoria: nomeCategoriaStr,
                  });

                  console.log(`[Auth] Profilo tecnico caricato direttamente per UID: ${currentUser.uid}`);

              } else {
                  console.error(`[Auth] Documento non trovato in 'tecnici' per l'UID: ${currentUser.uid}. L'utente non è configurato come tecnico.`);
                  setUserProfile(null);
              }
          } catch (error) {
              console.error("[Auth] Errore critico durante il caricamento del profilo tecnico:", error);
              setUserProfile(null);
          }
      } else {
          setUserProfile(null); // Nessun utente loggato
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

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
