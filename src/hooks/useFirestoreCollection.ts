
import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

interface Doc { 
    id: string;
    [key: string]: any; 
}

/**
 * Hook personalizzato per leggere i documenti da una collezione Firestore in tempo reale.
 * @param collectionName Il nome della collezione da cui leggere i dati.
 * @returns Un oggetto con i dati, lo stato di caricamento e un eventuale errore.
 */
const useFirestoreCollection = (collectionName: string) => {
  const [data, setData] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Creo un riferimento alla collezione
    const collectionRef = collection(db, collectionName);

    // onSnapshot imposta un listener in tempo reale.
    // Ogni volta che i dati sul server cambiano, il codice viene eseguito di nuovo.
    const unsubscribe = onSnapshot(collectionRef, 
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setData(docs);
        setLoading(false);
      },
      (err) => {
        console.error(`Errore durante l'ascolto della collezione ${collectionName}:`, err);
        setError(err);
        setLoading(false);
      }
    );

    // La funzione di pulizia viene eseguita quando il componente si smonta.
    // È fondamentale per rimuovere il listener e prevenire memory leak.
    return () => unsubscribe();

  }, [collectionName]); // L'effetto si attiva di nuovo se il nome della collezione cambia

  return { data, loading, error };
};

export default useFirestoreCollection;
