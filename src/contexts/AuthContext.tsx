import { useState, useEffect, createContext, ReactNode, useMemo, useCallback } from 'react';
import { onAuthStateChanged, User, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { UserProfile } from '@/models/definitions';

export interface AuthContextType {
  user: User | null; // Firebase Auth User
  userProfile: UserProfile | null; // Firestore User Profile
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
                  
                  // ++ FIX: Legge correttamente isAdmin dal documento
                  const isAdmin = tecnicoData.isAdmin || false;

                  const id_categoria = tecnicoData.categoriaId || tecnicoData.id_categoria || '';
                  let categoriaObj: { id: string; nome: string; } | undefined = undefined;

                  if (id_categoria) {
                      try {
                          const catDocRef = doc(db, 'categorie', id_categoria);
                          const catDoc = await getDoc(catDocRef);
                          if (catDoc.exists()) {
                              categoriaObj = { id: id_categoria, nome: catDoc.data().nome || '' };
                          }
                      } catch (err) {
                          console.error("[Auth] Errore nel risolvere la categoria:", err);
                      }
                  }

                  const profile: UserProfile = {
                      id: currentUser.uid,
                      uid: currentUser.uid,
                      email: currentUser.email || '',
                      tecnicoId: tecnicoDocSnap.id,
                      nome: tecnicoData.nome || '',
                      cognome: tecnicoData.cognome || '',
                      attivo: tecnicoData.attivo || false,
                      isAdmin: isAdmin, // ++ FIX: Imposta isAdmin nel profilo
                      categoria: categoriaObj,
                  };
                  setUserProfile(profile);

              } else {
                  console.warn(`[Auth] Profilo tecnico non trovato per UID: ${currentUser.uid}. L'utente non avrà autorizzazioni complete.`);
                  setUserProfile(null); // No profile found
              }
          } catch (error) {
              console.error("[Auth] Errore critico nel caricamento del profilo utente:", error);
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
    user, // Raw firebase user
    userProfile, // Enriched firestore profile
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
