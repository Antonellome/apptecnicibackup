
import { useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { onAuthStateChanged, User, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db as firestoreDb } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore'; // Rimossa importazione `updateDoc` inutile
import { UserProfile } from '@/models/definitions';
import { AuthContext, AuthContextType } from '../contexts/AuthContextDefinition';
import FullScreenLoader from '../components/FullScreenLoader';
import { db as localDb } from '@/db/local-db';

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
              const tecnicoDocRef = doc(firestoreDb, 'tecnici', currentUser.uid);
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
                  
                  // *** LA VERA CORREZIONE DEFINITIVA ***
                  // L'oggetto deve avere una proprietà `id` per corrispondere allo schema di Dexie `webAppUsers: 'id'`
                  const profile: UserProfile & { id: string } = {
                      id: currentUser.uid, // <--- CHIAVE PRIMARIA PER DEXIE
                      uid: currentUser.uid,
                      email: currentUser.email || '',
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
                  console.warn(`[Auth] Profilo tecnico non trovato per UID: ${currentUser.uid}.`);
                  setUserProfile(null);
                  await localDb.webAppUsers.clear();
              }
          } catch (error) {
              console.error("[Auth] Errore critico nel caricamento del profilo utente:", error);
              setUserProfile(null);
              await localDb.webAppUsers.clear();
          }
      } else {
          setUserProfile(null);
          await localDb.webAppUsers.clear(); 
          console.log("[Auth] Utente non loggato, localDb.webAppUsers pulito.");
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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

  if (loading) {
    return <FullScreenLoader />;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
