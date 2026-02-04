
import { 
    createContext, 
    useContext, 
    ReactNode, 
    useState, 
    useEffect, 
    useMemo 
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

// Definisce la struttura dei dati esposti dal contesto
interface AuthContextType {
  currentUser: Tecnico | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

// Crea il contesto con un valore di default undefined
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<Tecnico | null>(null);
  const [loading, setLoading] = useState(true); // Inizia come true per gestire il check iniziale

  const auth = getAuth();

  useEffect(() => {
    // Listener per i cambiamenti dello stato di autenticazione di Firebase
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        // Se l'utente è loggato, recupera i dati dal documento Firestore corrispondente
        const userDocRef = doc(db, 'tecnici', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          // Combina l'ID con i dati del documento per creare l'oggetto Tecnico completo
          setCurrentUser({ id: userDoc.id, ...userDoc.data() } as Tecnico);
        } else {
          // L'utente esiste in Auth ma non c'è un record corrispondente in Firestore
          console.error(`Nessun documento trovato per l'utente con ID: ${user.uid}`);
          setCurrentUser(null);
        }
      } else {
        // Nessun utente loggato
        setCurrentUser(null);
      }
      setLoading(false); // Fine del caricamento dopo aver controllato lo stato
    });

    // Cleanup: rimuove il listener quando il componente viene smontato
    return () => unsubscribe();
  }, [auth]);

  // Funzione di LOGIN
  const login = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
    // Il listener onAuthStateChanged si occuperà di aggiornare lo stato
  };

  // Funzione di LOGOUT
  const logout = async () => {
    await signOut(auth);
    // Il listener onAuthStateChanged si occuperà di aggiornare lo stato a null
  };

  // Memoizza il valore del contesto per evitare rerender non necessari
  const value = useMemo(() => ({
    currentUser,
    firebaseUser,
    loading,
    login,
    logout,
  }), [currentUser, firebaseUser, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizzato per un accesso più semplice e sicuro al contesto
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Corretto l'errore di sintassi usando le virgolette doppie
    throw new Error("useAuth deve essere utilizzato all'interno di un AuthProvider");
  }
  return context;
};
