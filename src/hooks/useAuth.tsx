
// src/hooks/useAuth.tsx
import { useState, useEffect, createContext, useContext } from 'react';
// Tentativo di correzione: se questo hook usa 'db' direttamente da firebase.js,
// dovrebbe essere corretto qui. Usiamo 'auth' e 'firestore' che sono esportati.
import { auth, firestore } from '../firebase'; // Assumendo che './firebase' sia il percorso corretto
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

interface AuthContextProps {
    currentUser: User | null;
    userProfile: any | null;
    loading: boolean;
    isAdmin: boolean;
}

const AuthContext = createContext<AuthContextProps>({
    currentUser: null,
    userProfile: null,
    loading: true,
    isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                try {
                    const userDocRef = doc(firestore, 'users', user.uid);
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists()) {
                        const profile = userDocSnap.data();
                        setUserProfile(profile);
                        setIsAdmin(profile?.role === 'admin');
                    } else {
                        setUserProfile(null); // Utente esiste in auth ma non ha un profilo in firestore
                        setIsAdmin(false);
                    }
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                    setUserProfile(null);
                    setIsAdmin(false);
                }
            } else {
                setUserProfile(null);
                setIsAdmin(false);
            }
            setLoading(false);
        });

        return unsubscribe; // Cleanup subscription on unmount
    }, []);

    return (
        <AuthContext.Provider value={{ currentUser, userProfile, loading, isAdmin }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
