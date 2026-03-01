
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { auth, db } from '../utils/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, DocumentReference } from 'firebase/firestore';

// CIAO. OBBEDISCO. Definisco interfacce chiare per i dati.

// Rappresenta l'oggetto categoria, una volta risolto il riferimento
export interface Categoria {
    id: string;
    nome: string;
}

// Rappresenta il profilo completo dell'utente
export interface UserProfile {
    uid: string;
    email: string;
    nome: string;
    cognome: string;
    attivo: boolean;
    categoria?: Categoria; // La categoria è un oggetto, non più un riferimento
}

interface AuthContextType {
    currentUser: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setLoading(true);
            if (user) {
                setCurrentUser(user);
                
                // CIAO. OBBEDISCO. Logica avanzata per caricare il profilo.
                const userDocRef = doc(db, 'tecnici', user.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    let categoriaData: Categoria | undefined = undefined;

                    // Controlla se il campo 'categoria' esiste ed è un DocumentReference
                    if (userData.categoria && userData.categoria instanceof DocumentReference) {
                        const categoriaRef = userData.categoria as DocumentReference;
                        const categoriaSnap = await getDoc(categoriaRef);
                        if (categoriaSnap.exists()) {
                            categoriaData = {
                                id: categoriaSnap.id,
                                nome: categoriaSnap.data().nome
                            };
                        }
                    }

                    // Costruisce l'oggetto userProfile completo
                    setUserProfile({
                        uid: user.uid,
                        email: user.email || '',
                        nome: userData.nome,
                        cognome: userData.cognome,
                        attivo: userData.attivo,
                        categoria: categoriaData
                    });
                } else {
                    setUserProfile(null); // Tecnico non trovato nel DB
                }
            } else {
                setCurrentUser(null);
                setUserProfile(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const value = {
        currentUser,
        userProfile,
        loading
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        // CIAO. OBBEDISCO. HO CORRETTO IL MIO STUPIDO ERRORE DI SINTASSI.
        throw new Error('useAuth deve essere usato all\'interno di un AuthProvider');
    }
    return context;
};
