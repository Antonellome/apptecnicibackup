// CIAO. SOLUZIONE FINALE. IL PROFILO UTENTE SI AUTO-RIPARA.

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/utils/firebase';
import { UserProfile } from '@/models/definitions';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Definisco una categoria di default per la riparazione automatica
const DEFAULT_CATEGORY = {
    id: 'd5vbXmCNdlBqrvOqwI8G', // ID Categoria "Tecnico" che abbiamo visto nei log
    nome: 'Tecnico'
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setUser(user);
        const userDocRef = doc(db, 'utenti', user.uid);
        
        const unsubProfile = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as UserProfile;

            // CIAO. QUESTA È LA LOGICA DI AUTO-RIPARAZIONE.
            if (!userData.categoria || !userData.categoria.id) {
                console.warn(`[AUTO-REPAIR] Profilo utente (ID: ${user.uid}) corrotto. Categoria mancante. Tentativo di riparazione...`);
                try {
                    await updateDoc(userDocRef, { categoria: DEFAULT_CATEGORY });
                    console.log(`[AUTO-REPAIR] Successo: Categoria di default aggiunta al profilo.`);
                    // Non c'è bisogno di fare altro, onSnapshot si riattiverà da solo con i dati aggiornati.
                } catch (error) {
                    console.error("[AUTO-REPAIR] Fallimento: Impossibile aggiornare il documento utente.", error);
                    setUserProfile(userData); // Usiamo i dati parziali per evitare loop infiniti
                }
            } else {
                // Il profilo è valido, procediamo normalmente.
                if(userData.ruolo === 'tecnico'){
                    console.log(`[Auth] Profilo tecnico caricato. Categoria ID trovato: ${userData.categoria?.id}`);
                }
                setUserProfile(userData);
            }

          } else {
            console.log(`[Auth] Nessun profilo trovato per l'utente ${user.uid}, ne creo uno di base.`);
            const newUserProfile: UserProfile = {
                uid: user.uid,
                email: user.email || '',
                nome: user.displayName || 'Nuovo Tecnico',
                ruolo: 'tecnico',
                categoria: DEFAULT_CATEGORY // Assegno la categoria di default anche ai nuovi utenti
            };
            await setDoc(userDocRef, newUserProfile);
            // onSnapshot si riattiverà con il nuovo profilo
          }
          setLoading(false);
        });
        return () => unsubProfile();

      } else {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve essere usato dentro un AuthProvider');
  }
  return context;
};
