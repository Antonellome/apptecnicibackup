import React, { ReactNode, useState, useEffect, useMemo, useCallback, createContext } from 'react';
import { collection, onSnapshot, Timestamp, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/hooks/useAuth'; // CORRETTO: Import aggiornato
import type { DocumentData } from 'firebase/firestore';
import type { Tecnico, Veicolo, Nave, Luogo, Ditta, Categoria, TipoGiornata, Rapportino, Cliente, Documento, WebAppUser, Qualifica, CollectionName, BaseEntity } from '@/models/definitions';

// 1. DEFINIZIONE DELL'INTERFACCIA DEL CONTESTO (esportata)
export interface IDataContext {
    tecnici: Tecnico[];
    veicoli: Veicolo[];
    navi: Nave[];
    luoghi: Luogo[];
    ditte: Ditta[];
    categorie: Categoria[];
    tipiGiornata: TipoGiornata[];
    rapportini: Rapportino[];
    clienti: Cliente[];
    documenti: Documento[];
    qualifiche: Qualifica[];
    webAppUsers: WebAppUser[];
    tecniciMap: Map<string, Tecnico>;
    veicoliMap: Map<string, Veicolo>;
    naviMap: Map<string, Nave>;
    luoghiMap: Map<string, Luogo>;
    ditteMap: Map<string, Ditta>;
    categorieMap: Map<string, Categoria>;
    tipiGiornataMap: Map<string, TipoGiornata>;
    qualificheMap: Map<string, Qualifica>;
    webAppUsersMap: Map<string, WebAppUser>;
    loading: boolean;
    error: string | null;
    addData: (collectionName: CollectionName, data: DocumentData) => Promise<string | void>;
    updateData: (collectionName: CollectionName, id: string, data: DocumentData) => Promise<void>;
    deleteData: (collectionName: CollectionName, id: string) => Promise<void>;
}

// 2. CREAZIONE DEL CONTESTO (esportato)
export const DataContext = createContext<IDataContext | undefined>(undefined);

// L'hook `useData` è stato spostato in `src/hooks/useData.ts`

// --- COLLEZIONI SPECIALI ---
const SORTABLE_COLLECTIONS: Set<CollectionName> = new Set([
    'clienti', 'navi', 'luoghi', 'ditte', 'categorie', 'tipiGiornata', 'tecnici_data', 'users', 'qualifiche'
]);

const ALL_COLLECTIONS: CollectionName[] = [
    'tecnici_data', 'veicoli', 'navi', 'luoghi', 'ditte', 'categorie',
    'tipiGiornata', 'rapportini', 'clienti', 'documenti', 'users', 'qualifiche'
];

// --- FUNZIONI DI UTILITÀ ---
const parseDates = (data: any): any => {
    if (!data) return data;
    if (Array.isArray(data)) {
        return data.map(item => parseDates(item));
    }
    if (typeof data === 'object' && data !== null) {
        const newObj: { [key: string]: any } = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                const value = data[key];
                if (value instanceof Timestamp) {
                    newObj[key] = value.toDate();
                } else {
                    newObj[key] = parseDates(value);
                }
            }
        }
        return newObj;
    }
    return data;
};

const sortData = <T extends { nome?: string }>(data: T[], collectionName: CollectionName): T[] => {
    if (SORTABLE_COLLECTIONS.has(collectionName)) {
        return [...data].sort((a, b) => a.nome?.localeCompare(b.nome || '') || 0);
    }
    return data;
};

const createMap = <T extends BaseEntity>(data: T[]): Map<string, T> => {
    return new Map(data.map(item => [item.id, item]));
};

// --- PROVIDER COMPONENT ---
interface DataProviderProps {
    children: ReactNode;
}

export const DataProvider = ({ children }: DataProviderProps) => {
    const { currentUser, loading: authLoading } = useAuth(); // usiamo currentUser per chiarezza
    const [error, setError] = useState<string | null>(null);

    const [tecnici, setTecnici] = useState<Tecnico[]>([]);
    const [veicoli, setVeicoli] = useState<Veicolo[]>([]);
    const [navi, setNavi] = useState<Nave[]>([]);
    const [luoghi, setLuoghi] = useState<Luogo[]>([]);
    const [ditte, setDitte] = useState<Ditta[]>([]);
    const [categorie, setCategorie] = useState<Categoria[]>([]);
    const [tipiGiornata, setTipiGiornata] = useState<TipoGiornata[]>([]);
    const [rapportini, setRapportini] = useState<Rapportino[]>([]);
    const [clienti, setClienti] = useState<Cliente[]>([]);
    const [documenti, setDocumenti] = useState<Documento[]>([]);
    const [webAppUsers, setWebAppUsers] = useState<WebAppUser[]>([]);
    const [qualifiche, setQualifiche] = useState<Qualifica[]>([]);

    const stateSetters = useMemo(() => ({
        tecnici_data: setTecnici, veicoli: setVeicoli, navi: setNavi, luoghi: setLuoghi, ditte: setDitte,
        categorie: setCategorie, tipiGiornata: setTipiGiornata, rapportini: setRapportini,
        clienti: setClienti, documenti: setDocumenti, users: setWebAppUsers, qualifiche: setQualifiche
    }), []);

    useEffect(() => {
        if (!currentUser) { // La sottoscrizione dipende da un utente valido
            Object.values(stateSetters).forEach(setter => setter([]));
            return;
        }

        const unsubscribes = ALL_COLLECTIONS.map(collectionName => {
            const collRef = collection(db, collectionName);
            return onSnapshot(collRef, 
                (snapshot) => {
                    const rawData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BaseEntity[];
                    const parsedData = parseDates(rawData);
                    const sortedData = sortData(parsedData, collectionName);
                    const setter = stateSetters[collectionName as keyof typeof stateSetters];
                    
                    if (setter) {
                        setter(sortedData as any);
                    }
                    setError(null);
                },
                (err) => {
                    console.error(`[DataProvider] Errore nello snapshot per ${collectionName}:`, err);
                    setError(`Impossibile caricare ${collectionName}.`);
                }
            );
        });

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };

    }, [currentUser, stateSetters]);

    const addData = useCallback(async (collectionName: CollectionName, data: any) => {
        if (!currentUser) throw new Error("Utente non autenticato per l'operazione di aggiunta.");
        const docRef = await addDoc(collection(db, collectionName), {
            ...data,
            createdAt: serverTimestamp(),
            lastModified: serverTimestamp(),
            createdBy: currentUser.id, // Usiamo l'ID del profilo tecnico
        });
        return docRef.id;
    }, [currentUser]);

    const updateData = useCallback(async (collectionName: CollectionName, id: string, data: any) => {
        if (!currentUser) throw new Error("Utente non autenticato per l'operazione di aggiornamento.");
        await updateDoc(doc(db, collectionName, id), {
            ...data,
            lastModified: serverTimestamp(),
            updatedBy: currentUser.id, // Usiamo l'ID del profilo tecnico
        });
    }, [currentUser]);

    const deleteData = useCallback(async (collectionName: CollectionName, id: string) => {
        await deleteDoc(doc(db, collectionName, id));
    }, []);

    const tecniciMap = useMemo(() => createMap(tecnici), [tecnici]);
    const veicoliMap = useMemo(() => createMap(veicoli), [veicoli]);
    const naviMap = useMemo(() => createMap(navi), [navi]);
    const luoghiMap = useMemo(() => createMap(luoghi), [luoghi]);
    const ditteMap = useMemo(() => createMap(ditte), [ditte]);
    const categorieMap = useMemo(() => createMap(categorie), [categorie]);
    const tipiGiornataMap = useMemo(() => createMap(tipiGiornata), [tipiGiornata]);
    const webAppUsersMap = useMemo(() => createMap(webAppUsers), [webAppUsers]);
    const qualificheMap = useMemo(() => createMap(qualifiche), [qualifiche]);

    const value: IDataContext = useMemo(() => ({
        loading: authLoading, // Il caricamento dei dati dipende dal caricamento dell'autenticazione
        error,
        tecnici, veicoli, navi, luoghi, ditte, categorie, tipiGiornata, rapportini, clienti, documenti, webAppUsers, qualifiche,
        tecniciMap, veicoliMap, naviMap, luoghiMap, ditteMap, categorieMap, tipiGiornataMap, webAppUsersMap, qualificheMap,
        addData, updateData, deleteData
    }), [
        authLoading, error,
        tecnici, veicoli, navi, luoghi, ditte, categorie, tipiGiornata, rapportini, clienti, documenti, webAppUsers, qualifiche,
        tecniciMap, veicoliMap, naviMap, luoghiMap, ditteMap, categorieMap, tipiGiornataMap, webAppUsersMap, qualificheMap,
        addData, updateData, deleteData
    ]);

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};
