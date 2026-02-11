import {
    createContext, 
    ReactNode, 
    useState, 
    useEffect, 
    useMemo, 
    useCallback
} from 'react';
import { 
    getAuth, 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    signOut, 
    type User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Tecnico } from '../models/definitions';

export interface AuthContextType {
  currentUser: Tecnico | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<Tecnico | null>(null);
  const [loading, setLoading] = useState(true);

  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const userDocRef = doc(db, 'tecnici', user.uid);
        try {
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            setCurrentUser({ id: docSnap.id, ...docSnap.data() } as Tecnico);
          } else {
            // --- MODIFICA DI EMERGENZA --- //
            // Se l'utente è autenticato ma non ha un profilo nel DB, ne creo uno temporaneo
            // per consentire l'accesso immediato. Questo evita il loop di login.
            console.warn(`ATTENZIONE: Profilo non trovato per l'utente con UID ${user.uid}. Creazione di un profilo temporaneo.`);
            const temporaryUser: Tecnico = {
              id: user.uid,
              username: user.email || 'Utente Temporaneo',
              email: user.email || '',
              role: 'tecnico', // Assumo il ruolo di default
              // Altri campi potrebbero essere necessari e mancanti
            };
            setCurrentUser(temporaryUser);
          }
        } catch (error) {
            console.error("Errore critico durante la ricerca del profilo:", error);
            setCurrentUser(null); // In caso di errore vero, blocco l'accesso.
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  const login = useCallback(async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  }, [auth]);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, [auth]);

  const value = useMemo(() => ({
    currentUser,
    firebaseUser,
    loading,
    login,
    logout,
  }), [currentUser, firebaseUser, loading, login, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
