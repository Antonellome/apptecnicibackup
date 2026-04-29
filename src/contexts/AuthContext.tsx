import { useState, useEffect, createContext, ReactNode, useMemo, useCallback, useContext } from 'react';
import { onAuthStateChanged, User, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '@/utils/firebase';
import { doc, getDoc } from 'firebase/firestore';

// --- INTERFACCIA CORRETTA CON OGGETTO CATEGORIA ANNIDATO ---
export interface UserProfile {
    uid: string;
    email: string;
    tecnicoId: string;
    nome: string;
    cognome: string;
    attivo: boolean;
    categoria?: {
        id: string;
        nome: string;
    };
}

export interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
              const tecnicoDocRef = doc(db, 'tecnici', currentUser.uid);
              const tecnicoDocSnap = await getDoc(tecnicoDocRef);

              if (tecnicoDocSnap.exists()) {
                  const tecnicoData = tecnicoDocSnap.data();
                  const id_categoria = tecnicoData.categoriaId || tecnicoData.id_categoria || '';

                  // --- COSTRUZIONE DELL'OGGETTO CATEGORIA CORRETTO ---
                  let categoriaObj: { id: string; nome: string; } | undefined = undefined;

                  if (id_categoria) {
                      let nomeCategoriaStr = '';
                      try {
                          const catDocRef = doc(db, 'categorie', id_categoria);
                          const catDoc = await getDoc(catDocRef);
                          if (catDoc.exists()) {
                              nomeCategoriaStr = catDoc.data().nome || '';
                          }
                      } catch (err) {
                          console.error("[Auth] Errore nel risolvere la categoria:", err);
                      }
                      categoriaObj = { id: id_categoria, nome: nomeCategoriaStr };
                  }

                  const profile: UserProfile = {
                      uid: currentUser.uid,
                      email: currentUser.email || '',
                      tecnicoId: tecnicoDocSnap.id,
                      nome: tecnicoData.nome || '',
                      cognome: tecnicoData.cognome || '',
                      attivo: tecnicoData.attivo || false,
                      categoria: categoriaObj, // Assegno l'oggetto annidato
                  };
                  setUserProfile(profile);

              } else {
                  console.error(`[Auth] Documento non trovato per UID: ${currentUser.uid}.`);
                  setUserProfile(null);
              }
          } catch (error) {
              console.error("[Auth] Errore critico caricamento profilo:", error);
              setUserProfile(null);
          }
      } else {
          setUserProfile(null);
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
