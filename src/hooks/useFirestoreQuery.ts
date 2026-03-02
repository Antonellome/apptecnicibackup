import { useState, useEffect, useMemo } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { createRapportinoSchema, RapportinoSchema } from '@/models/rapportino.schema';

function useFirestoreQuery() {
    const [data, setData] = useState<RapportinoSchema[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    const rapportinoCollectionRef = useMemo(() => collection(db, 'rapportini'), []);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const q = query(rapportinoCollectionRef); // Query di base, può essere estesa
                const querySnapshot = await getDocs(q);
                const rapportini: RapportinoSchema[] = [];
                const rapportinoValidationSchema = createRapportinoSchema();

                querySnapshot.forEach((doc) => {
                    const docData = doc.data();
                    const rapportinoDataWithDate = {
                        ...docData,
                        id: doc.id,
                        data: docData.data.toDate(), // Converte il Timestamp in Date
                    };

                    // Eseguo la validazione con lo schema Zod
                    const validationResult = rapportinoValidationSchema.safeParse(rapportinoDataWithDate);

                    if (validationResult.success) {
                        rapportini.push(validationResult.data as RapportinoSchema);
                    } else {
                        // Potresti voler gestire l'errore di validazione in modo più specifico
                        console.warn('Dati non validi per il documento:', doc.id, validationResult.error.issues);
                    }
                });
                setData(rapportini);
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [rapportinoCollectionRef]);

    return { data, loading, error };
}

export default useFirestoreQuery;
