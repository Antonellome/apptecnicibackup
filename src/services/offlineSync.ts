import { db } from '@/db/local-db';
import { collection, doc, writeBatch, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db as firestoreDb } from '@/firebase';
import { Rapportino, SyncEvent } from '@/models/definitions';

let isSyncing = false;

// --- FUNZIONE DI DOWNLOAD: DA FIRESTORE A DEXIE ---

const safeConvertToDate = (timestamp: any): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp && typeof timestamp.seconds === 'number') {
    return new Date(timestamp.seconds * 1000);
  }
  // Prova a parsare la data se è già una stringa o un numero
  const d = new Date(timestamp);
  if (!isNaN(d.getTime())) {
    return d;
  }
  // Fallback alla data corrente se tutto il resto fallisce
  return new Date();
};

/**
 * Scarica i rapportini da Firestore e li salva nel database locale (Dexie).
 * @param tecnicoId L'ID del tecnico per cui scaricare i dati.
 */
export const syncRapportiniFromFirebase = async (tecnicoId: string) => {
  if (!navigator.onLine) {
    console.log("DOWNLOAD_SYNC: Offline, download dei rapportini saltato.");
    return;
  }

  console.log(`DOWNLOAD_SYNC: Avvio scaricamento rapportini per tecnico ${tecnicoId}`);

  try {
    // Query 1: Rapportini dove l'utente è il tecnico principale
    const q1 = query(collection(firestoreDb, 'rapportini'), where('tecnicoId', '==', tecnicoId));
    
    // Query 2: Rapportini dove l'utente è presente
    const q2 = query(collection(firestoreDb, 'rapportini'), where('presenze', 'array-contains', tecnicoId));

    const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);

    const rapportiniMap = new Map<string, Rapportino>();

    // Funzione helper per processare gli snapshot ed evitare duplicati
    const processSnapshot = (snapshot: any) => {
      snapshot.docs.forEach((doc: any) => {
        const data = doc.data();
        // Converte i Timestamp di Firestore in oggetti Date per Dexie
        const rapportinoProcessato: Rapportino = {
          ...data,
          id: doc.id,
          data: safeConvertToDate(data.data),
          oraInizio: data.oraInizio ? safeConvertToDate(data.oraInizio) : undefined,
          oraFine: data.oraFine ? safeConvertToDate(data.oraFine) : undefined,
          updatedAt: data.updatedAt ? safeConvertToDate(data.updatedAt) : new Date(),
          createdAt: data.createdAt ? safeConvertToDate(data.createdAt) : new Date(),
          isOffline: false, // I dati da Firebase sono per definizione sincronizzati
        };
        rapportiniMap.set(doc.id, rapportinoProcessato);
      });
    };

    processSnapshot(snapshot1);
    processSnapshot(snapshot2);

    const allRapportini = Array.from(rapportiniMap.values());

    if (allRapportini.length > 0) {
      await db.rapportini.bulkPut(allRapportini);
      console.log(`DOWNLOAD_SYNC: ${allRapportini.length} rapportini scaricati e salvati localmente.`);
    } else {
      console.log("DOWNLOAD_SYNC: Nessun rapportino trovato su Firestore per questo utente.");
    }

  } catch (error) {
    console.error("DOWNLOAD_SYNC: Errore durante il download dei rapportini da Firestore:", error);
    // Non rilanciare l'errore per non bloccare la sincronizzazione in upload
  }
};


// --- FUNZIONE DI UPLOAD: DA DEXIE A FIRESTORE ---

export const aggiungiAllaCoda = async (rapportino: Omit<Rapportino, 'id'>, reportId?: string): Promise<string> => {
    const idEntita = reportId || `local-${Date.now()}`;
    const rapportinoCompleto: Rapportino = {
        ...(rapportino as Rapportino),
        id: idEntita,
        isOffline: true,
        updatedAt: new Date(),
    };
    const evento: Omit<SyncEvent, 'id'> = {
        entityId: idEntita,
        type: 'rapportino',
        payload: rapportino,
        timestamp: new Date(),
        syncStatus: 'pending',
    };
    try {
        await db.transaction('rw', db.rapportini, db.syncQueue, async () => {
            await db.rapportini.put(rapportinoCompleto);
            await db.syncQueue.put(evento);
        });
        console.log(`Rapportino ${idEntita} salvato localmente e accodato per la sincronizzazione.`);
        return idEntita;
    } catch (error) {
        console.error(`Errore durante il salvataggio atomico del rapportino ${idEntita}:`, error);
        throw error;
    }
};

const syncUploadsToFirebase = async () => {
    const rapportiniDaSincronizzare = await db.syncQueue.where('type').equals('rapportino').and(item => item.syncStatus === 'pending').toArray();

    if (rapportiniDaSincronizzare.length === 0) {
        console.log("UPLOAD_SYNC: Coda di upload vuota.");
        return;
    }

    console.log(`UPLOAD_SYNC: Trovati ${rapportiniDaSincronizzare.length} rapportini da caricare.`);

    const batch = writeBatch(firestoreDb);
    const syncEventIdsToDelete: number[] = [];

    for (const syncEvent of rapportiniDaSincronizzare) {
        if (!syncEvent.id) continue;

        const payload = syncEvent.payload as Rapportino;
        const { entityId } = syncEvent;

        const rapportinoDaInviare = {
            ...payload,
            trasfertaId: payload.trasfertaId || null,
            veicoloId: payload.veicoloId || 'Nessuno',
            naveId: payload.naveId || 'Nessuna',
            luogoId: payload.luogoId || 'Nessuno',      
            updatedAt: new Date(),
        };

        // Rimuovi i campi che non devono andare su Firestore
        delete (rapportinoDaInviare as any).id;
        delete (rapportinoDaInviare as any).isOffline;

        if (entityId.startsWith('local-')) {
            const newDocRef = doc(collection(firestoreDb, 'rapportini'));
            batch.set(newDocRef, { ...rapportinoDaInviare, id: newDocRef.id, createdAt: payload.createdAt || new Date() });
        } else {
            const reportRef = doc(firestoreDb, 'rapportini', entityId);
            batch.update(reportRef, rapportinoDaInviare as any);
        }
        
        syncEventIdsToDelete.push(syncEvent.id);
    }

    try {
        await batch.commit();
        console.log("UPLOAD_SYNC: Firestore batch commit completato con successo.");
        await db.syncQueue.bulkDelete(syncEventIdsToDelete);
        console.log(`UPLOAD_SYNC: ${syncEventIdsToDelete.length} eventi rimossi dalla coda.`);

        const idsAggiornati = rapportiniDaSincronizzare.map(e => e.entityId);
        const rapportiniLocaliDaAggiornare = await db.rapportini.where('id').anyOf(idsAggiornati).toArray();
        const updates = rapportiniLocaliDaAggiornare.map(r => ({ ...r, isOffline: false }));
        if (updates.length > 0) {
            await db.rapportini.bulkPut(updates);
            console.log(`UPLOAD_SYNC: ${updates.length} rapportini locali aggiornati con flag isOffline=false.`);
        }
    } catch (error) {
        console.error("UPLOAD_SYNC: Errore durante il commit batch:", error);
    }
};


// --- FUNZIONE ORCHESTRATORE --- 

/**
 * Esegue la sincronizzazione bidirezionale: prima scarica i dati da Firebase, 
 * poi carica le modifiche locali.
 * @param tecnicoId L'ID del tecnico per cui eseguire la sincronizzazione.
 */
export const sincronizzaTutto = async (tecnicoId: string) => {
    if (isSyncing) {
        console.log("SYNC_LOCK: Sincronizzazione già in corso.");
        return;
    }
    if (!navigator.onLine) {
        console.log("SYNC: Offline, sincronizzazione saltata.");
        return;
    }

    isSyncing = true;
    console.log("SYNC_LOCK: Inizio sincronizzazione BIDIREZIONALE.");

    try {
        // 1. Fase di Download
        await syncRapportiniFromFirebase(tecnicoId);

        // 2. Fase di Upload
        await syncUploadsToFirebase();

    } catch (error) {
        console.error("SYNC: Errore critico durante il ciclo di sincronizzazione.", error);
    } finally {
        isSyncing = false;
        console.log("SYNC_LOCK: Sincronizzazione BIDIREZIONALE completata.");
    }
};
