import { collection } from "firebase/firestore";
import { db as firestoreDb } from "@/utils/firebase";
import { MySubClassedDexie } from '@/db/local-db'; // Importa la classe del database locale

export const collections = {
    rapportini: collection(firestoreDb, 'rapportini'),
    // ... altre collections
};

// Array usato per la sincronizzazione iniziale e la gestione dei dati locali
// CORREZIONE: Usiamo `keyof MySubClassedDexie` per fare riferimento alle tabelle locali
export const ANAGRAFICHE_COLLECTIONS: Array<keyof MySubClassedDexie> = [
    'clienti',
    'navi',
    'tipiGiornata',
    'veicoli',
    'tecnici',
    'luoghi',
    'categorie',
    'ditte'
];
