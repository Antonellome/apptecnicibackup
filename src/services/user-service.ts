import { auth } from '@/firebase';
import { db } from '@/db/local-db';
import { UserProfile } from '@/models/definitions';

/**
 * Recupera il profilo del tecnico attualmente loggato dal database locale (Dexie).
 * Questa funzione è progettata per essere usata dai servizi e da codice non-React.
 * 
 * @returns {Promise<UserProfile | undefined>} Il profilo dell'utente o undefined se non trovato o non loggato.
 */
export const getTecnico = async (): Promise<UserProfile | undefined> => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
        console.log("getTecnico (service): Nessun utente Firebase autenticato.");
        return undefined;
    }

    try {
        // *** CORREZIONE DEFINITIVA E FINALE ***
        // Allineato il nome della tabella a quello usato in AuthProvider.tsx
        const userProfile = await db.webAppUsers.get(firebaseUser.uid);
        if (userProfile) {
            console.log(`getTecnico (service): Profilo trovato in locale per l'UID: ${firebaseUser.uid}`);
            return userProfile;
        } else {
            console.warn(`getTecnico (service): Nessun profilo trovato in locale per l'UID: ${firebaseUser.uid}. L'utente potrebbe dover completare il login.`);
            return undefined;
        }
    } catch (error) {
        console.error("getTecnico (service): Errore durante il recupero del profilo dal database locale.", error);
        return undefined;
    }
};
