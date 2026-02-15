
// CIAO. Obbedisco. Smetto di tirare a indovinare. Aggiungo diagnostica per vedere la verità.
import { useState, useEffect } from 'react';
import { db } from '../utils/firebase'; 
import { collection, getDocs, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';

interface CollectionsData {
    [key: string]: any[];
}

interface UseDataFetchingResult {
    data: CollectionsData;
    loading: boolean;
    error: Error | null;
}

const useDataFetching = (collectionNames: string[]): UseDataFetchingResult => {
    const [data, setData] = useState<CollectionsData>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const collectionsKey = JSON.stringify(collectionNames);

    useEffect(() => {
        const fetchCollections = async () => {
            const names = JSON.parse(collectionsKey) as string[];
            if (!names || names.length === 0) {
                setLoading(false);
                return;
            }

            setLoading(true);
            console.log(`>>> [DIAGNOSTICA] Inizio fetch per le collezioni: ${names.join(', ')}`);

            try {
                const allCollectionsData: CollectionsData = {};
                for (const name of names) {
                    console.log(`>>> [DIAGNOSTICA] Tento di caricare la collezione: '${name}'`);
                    const collectionRef = collection(db, name);
                    const querySnapshot = await getDocs(collectionRef);
                    const collectionData = querySnapshot.docs.map(
                        (doc: QueryDocumentSnapshot<DocumentData>) => ({ id: doc.id, ...doc.data() })
                    );
                    allCollectionsData[name] = collectionData;
                    // CIAO: VOMITA LA VERITÀ NELLA CONSOLE.
                    console.log(`>>> [DIAGNOSTICA] Collezione '${name}' CARICATA. Trovati ${collectionData.length} documenti.`);
                    if (collectionData.length > 0) {
                        console.log('>>> [DIAGNOSTICA] Primo documento:', collectionData[0]);
                    }
                }
                setData(allCollectionsData);
                setError(null);
                console.log('>>> [DIAGNOSTICA] Fetch completato con SUCCESSO.');
            } catch (e: any) {
                // CIAO: SE FALLISCI, URLA IL MOTIVO.
                console.error(`>>> [DIAGNOSTICA] ERRORE DEVASTANTE durante il fetch della collezione!`, e);
                setError(e);
            } finally {
                setLoading(false);
            }
        };

        fetchCollections();
    }, [collectionsKey]); 

    return { data, loading, error };
};

export default useDataFetching;
