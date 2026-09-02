
import { useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { onAuthStateChanged, User, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db as firestoreDb } from '@/utils/firebase'; // <-- CORREZIONE: puntare al file di utils
import { doc, getDoc } from 'firebase/firestore';
import { UserProfile } from '@/models/definitions';
import { AuthContext, AuthContextType } from '../contexts/AuthContextDefinition';
import FullScreenLoader from '../components/FullScreenLoader';
import { db as localDb } from '@/db/local-db';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // --- PRIMO useEffect: Gestisce solo il cambiamento di stato dell'autenticazione ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    // Cleanup: rimuove il listener quando il componente viene smontato
    return () => unsubscribe();
  }, []);

  // --- SECONDO useEffect: Reagisce al cambiamento dell'utente per recuperare il profilo ---
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        setLoading(true);
        try {
          const tecnicoDocRef = doc(firestoreDb, 'tecnici', user.uid);
          const tecnicoDocSnap = await getDoc(tecnicoDocRef);

          if (tecnicoDocSnap.exists()) {
            const tecnicoData = tecnicoDocSnap.data();
            const isAdmin = tecnicoData.isAdmin || false;
            const id_categoria = tecnicoData.categoriaId || tecnicoData.id_categoria || '';
            let categoriaObj: { id: string; nome: string; } | undefined = undefined;

            if (id_categoria) {
              try {
                const catDocRef = doc(firestoreDb, 'categorie', id_categoria);
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

            const profile: UserProfile & { id: string } = {
              id: user.uid,
              uid: user.uid,
              email: user.email || '',
              tecnicoId: tecnicoDocSnap.id,
              nome: nome,
              cognome: cognome,
              isAdmin: isAdmin,
              categoria: categoriaObj,
              displayName: `${nome} ${cognome}`.trim(),
              theme: 'light',
            };
            
            setUserProfile(profile);
            await localDb.webAppUsers.put(profile);
            console.log(`[Auth] Profilo per ${profile.displayName} salvato in localDb.webAppUsers.`);

          } else {
            console.warn(`[Auth] Profilo tecnico non trovato per UID: ${user.uid}.`);
            setUserProfile(null);
            await localDb.webAppUsers.clear();
          }
        } catch (error) {
          console.error("[Auth] Errore critico nel caricamento del profilo utente:", error);
          setUserProfile(null);
          await localDb.webAppUsers.clear();
        } finally {
          setLoading(false);
        }
      } else {
        // Utente non loggato
        setUserProfile(null);
        await localDb.webAppUsers.clear();
        console.log("[Auth] Utente non loggato, localDb.webAppUsers pulito.");
      }
    };

    fetchUserProfile();
  }, [user]); // <-- La dipendenza ora è [user]

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Errore durante il logout:", error);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  const value: AuthContextType = useMemo(() => ({
    user,
    userProfile,
    loading,
    logout,
    resetPassword,
  }), [user, userProfile, loading, logout, resetPassword]);

  if (loading && !userProfile) { // Mostra il loader solo al primo caricamento
    return <FullScreenLoader />;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
