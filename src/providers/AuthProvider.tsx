
import { useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { onAuthStateChanged, User, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db as firestoreDb } from '@/utils/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { UserProfile } from '@/models/definitions';
import { AuthContext, AuthContextType } from '../contexts/AuthContextDefinition';
import FullScreenLoader from '../components/FullScreenLoader';
import { db as localDb } from '@/db/local-db';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // --- Gestisce il cambiamento di stato dell'autenticazione ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        // Se l'utente si disconnette, puliamo il profilo e smettiamo di caricare
        setUserProfile(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- Reagisce al cambiamento dell'utente per recuperare/aggiornare il profilo ---
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        setLoading(true);
        try {
          const tecnicoDocRef = doc(firestoreDb, 'tecnici', user.uid);
          const tecnicoDocSnap = await getDoc(tecnicoDocRef);

          if (tecnicoDocSnap.exists()) {
            const tecnicoData = tecnicoDocSnap.data();
            const nome = tecnicoData.nome || '';
            const cognome = tecnicoData.cognome || '';

            const profile: UserProfile & { id: string } = {
              id: user.uid,
              uid: user.uid,
              userId: user.uid,
              dittaId: tecnicoData.dittaId || '',
              email: user.email || '',
              tecnicoId: tecnicoDocSnap.id,
              nome: nome,
              cognome: cognome,
              isAdmin: tecnicoData.isAdmin || false,
              categoriaId: tecnicoData.categoriaId || tecnicoData.id_categoria || '',
              displayName: `${nome} ${cognome}`.trim(),
              theme: 'light',
            };
            
            // Aggiorna lo stato e il DB locale
            setUserProfile(profile);
            // USA PUT invece di ADD per fare un "upsert": crea o aggiorna
            await localDb.tecnici.put(profile); 
            console.log(`[Auth] Profilo per ${profile.displayName} salvato/aggiornato in localDb.`);

          } else {
            // Se il profilo non esiste in Firestore, l'utente non può usare l'app
            console.error(`[Auth] ERRORE CRITICO: Profilo tecnico non trovato in Firestore per UID: ${user.uid}. L'utente non può essere autorizzato.`);
            setUserProfile(null);
            // Non pulire la tabella, l'utente potrebbe semplicemente non avere un profilo valido
          }
        } catch (error) {
          console.error("[Auth] Errore nel caricamento del profilo utente:", error);
          setUserProfile(null);
        } finally {
          setLoading(false);
        }
      }
      // Se user è null, non facciamo nulla qui, la gestione è nell'altro useEffect
    };

    fetchUserProfile();
  }, [user]);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      // Non è necessario pulire manualmente i dati locali qui,
      // la logica di sincronizzazione dovrebbe gestire la coerenza.
      console.log("[Auth] Utente disconnesso.");
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

  // Mostra il loader solo durante il caricamento iniziale dell'autenticazione/profilo
  if (loading) {
    return <FullScreenLoader />;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
