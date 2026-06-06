
import { useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { onAuthStateChanged, User, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { getToken } from 'firebase/messaging';
import { auth, db, messaging } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { UserProfile } from '@/models/definitions';
import { AuthContext, AuthContextType } from './AuthContextDefinition';
import FullScreenLoader from '../components/FullScreenLoader';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to get FCM token and update Firestore
  const getFcmToken = async (uid: string) => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.log("FCM not supported in this environment.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        await navigator.serviceWorker.ready;

        console.log("Service worker is active, getting token...");

        const currentToken = await getToken(messaging, {
          vapidKey: 'BIvIQohxlYqW7gficYtCso06NArpaqE0va_j1PRJ63W159OTpQk-Be_nW9PLd-_46l4YqKC4W2iOVoORNocHbyk',
          serviceWorkerRegistration: swRegistration,
        });

        if (currentToken) {
          console.log('FCM Token retrieved successfully:', currentToken);
          const userDocRef = doc(db, 'tecnici', uid);
          await updateDoc(userDocRef, { fcmToken: currentToken });
        } else {
          console.log('No registration token available.');
        }
      }
    } catch (error) {
      console.error('An error occurred while retrieving FCM token.', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
          try {
              const tecnicoDocRef = doc(db, 'tecnici', currentUser.uid);
              const tecnicoDocSnap = await getDoc(tecnicoDocRef);

              if (tecnicoDocSnap.exists()) {
                  const tecnicoData = tecnicoDocSnap.data();
                  // ... (existing profile logic)
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
                      theme: 'light',
                  };
                  setUserProfile(profile);

                  // *** GET FCM TOKEN HERE ***
                  await getFcmToken(currentUser.uid);

              } else {
                  console.warn(`[Auth] Profilo tecnico non trovato per UID: ${currentUser.uid}.`);
                  setUserProfile(null);
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
