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

// Esportato per essere utilizzato dall'hook e dai componenti
export interface AuthContextType {
  currentUser: Tecnico | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

// Esportato per essere utilizzato dall'hook personalizzato `useAuth`.
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
        // L'utente è autenticato. Cerco il suo profilo in 'tecnici_data' usando l'UID.
        const userDocRef = doc(db, 'tecnici_data', user.uid);
        
        try {
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            // Trovato il tecnico.
            setCurrentUser({ id: docSnap.id, ...docSnap.data() } as Tecnico);
          } else {
            // L'utente è autenticato su Firebase, ma non esiste un record corrispondente.
            console.error(`Autenticazione riuscita per ${user.email}, ma nessun profilo dati trovato in 'tecnici_data'.`);
            setCurrentUser(null);
          }
        } catch (error) {
            console.error("Errore durante la ricerca del profilo dati del tecnico:", error);
            setCurrentUser(null);
        }

      } else {
        // Nessun utente loggato.
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
