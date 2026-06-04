import { useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { onAuthStateChanged, User, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { UserProfile } from '@/models/definitions';
import { AuthContext, AuthContextType } from './AuthContextDefinition';
import FullScreenLoader from '../components/FullScreenLoader';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // Rimuoviamo il setLoading(true) iniziale perché la logica è già complessa
      // e lo stato iniziale di loading è già true.

      setUser(currentUser);
      
      if (currentUser) {
          try {
              const tecnicoDocRef = doc(db, 'tecnici', currentUser.uid);
              const tecnicoDocSnap = await getDoc(tecnicoDocRef);

              if (tecnicoDocSnap.exists()) {
                  const tecnicoData = tecnicoDocSnap.data();
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

                  const nome = tecnicoData.nome || '';
                  const cognome = tecnicoData.cognome || '';
                  const profile: UserProfile = {
                      uid: currentUser.uid,
                      email: currentUser.email || '',
                      tecnicoId: tecnicoDocSnap.id,
                      nome: nome,
                      cognome: cognome,
                      isAdmin: isAdmin,
                      categoria: categoriaObj,
                      displayName: `${nome} ${cognome}`.trim(),
                      theme: 'light', // Default theme
                  };
                  setUserProfile(profile);

              } else {
                  console.warn(`[Auth] Profilo tecnico non trovato per UID: ${currentUser.uid}. L'utente non avrà autorizzazioni complete.`);
                  setUserProfile(null); // Assicurati di resettare il profilo se non trovato
              }
          } catch (error) {
              console.error("[Auth] Errore critico nel caricamento del profilo utente:", error);
              setUserProfile(null); // Resetta in caso di errore critico
          }
      } else {
          setUserProfile(null); // L'utente non è loggato, nessun profilo
      }
      
      setLoading(false); // Fine del processo di autenticazione/caricamento dati
    });

    // La funzione di cleanup che esegue l'unsubscribe
    return () => unsubscribe();
  }, []); // L'array vuoto assicura che l'effetto venga eseguito solo una volta (al mount)

  const logout = useCallback(async () => {
    try {
        await signOut(auth);
        // Lo stato verrà aggiornato automaticamente da onAuthStateChanged
    } catch (error) {
        console.error("Errore durante il logout:", error);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  // Memoizzazione del valore del contesto per evitare re-render non necessari
  const value: AuthContextType = useMemo(() => ({
    user,
    userProfile,
    loading,
    logout,
    resetPassword,
  }), [user, userProfile, loading, logout, resetPassword]);

  // **LA SOLUZIONE**
  // Se lo stato di autenticazione non è ancora stato verificato,
  // mostra un loader a schermo intero invece dell'applicazione.
  if (loading) {
    return <FullScreenLoader />;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
