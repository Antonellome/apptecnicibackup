
// src/hooks/useAuth.tsx
import { useState, useEffect, createContext, useContext } from 'react';
import { auth, firestore } from '../firebase';
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
                    // THIS IS THE FIX: Changed 'users' to the correct collection name 'utenti'
                    const userDocRef = doc(firestore, 'utenti', user.uid);
                    const userDocSnap = await getDoc(userDocRef);

                    if (userDocSnap.exists()) {
                        const profile = userDocSnap.data();
                        setUserProfile(profile);
                        setIsAdmin(profile?.role === 'admin');
                        console.log("User profile loaded:", profile);
                    } else {
                        console.warn(`No profile document found for user ${user.uid} in 'utenti' collection.`);
                        setUserProfile(null); 
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
