import { getFirestore, collection, getDocs, writeBatch } from 'firebase/firestore';

// Questo script è progettato per essere eseguito una sola volta per migrare i dati.

const migrateData = async () => {
  const db = getFirestore();
  const rapportiniRef = collection(db, 'rapportini');
  const batch = writeBatch(db);
  
  console.log("Inizio la migrazione dei rapportini...");

  try {
    const snapshot = await getDocs(rapportiniRef);
    let migratedCount = 0;

    snapshot.docs.forEach(doc => {
      const data = doc.data();

      // Controlla se il documento è nel vecchio formato (manca 'presenze' ma ha 'tecnicoScriventeId')
      if (!data.presenze && data.tecnicoScriventeId) {
        console.log(`Trovato documento da migrare: ${doc.id}`);

        const updates: { [key: string]: any } = {
          // 1. Aggiungi il campo 'presenze' con l'ID del tecnico scrivente
          presenze: [data.tecnicoScriventeId],
          
          // 2. Rinomina 'tecnicoScriventeId' in 'tecnicoId' per coerenza
          tecnicoId: data.tecnicoScriventeId,
          
          // 3. Rinomina 'oreLavorate' in 'oreLavoro'
          oreLavoro: data.oreLavorate || 0,

          // 4. Converte i Timestamp di oraInizio/oraFine in stringhe HH:mm
          oraInizio: data.oraInizio?.toDate ? data.oraInizio.toDate().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : null,
          oraFine: data.oraFine?.toDate ? data.oraFine.toDate().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : null,

          // 5. Inizializza campi nuovi se mancanti
          dettaglioOreTecnici: [{ tecnicoId: data.tecnicoScriventeId, ore: data.oreLavorate || 0 }],
          altriTecniciIds: [],
          isTrasferta: data.isTrasferta || false,
          createdAt: data.data, // Usa la data del rapportino come data di creazione
        };
        
        // Campi da rimuovere perché obsoleti
        updates.tecnicoScriventeId = undefined; // In Firestore, 'undefined' rimuove il campo
        updates.oreLavorate = undefined;

        batch.update(doc.ref, updates);
        migratedCount++;
      }
    });

    if (migratedCount > 0) {
      await batch.commit();
      console.log(`Migrazione completata con successo! ${migratedCount} documenti aggiornati.`);
      return `Migrazione completata con successo! ${migratedCount} documenti aggiornati.`;
    } else {
      console.log("Nessun documento da migrare trovato.");
      return "Nessun documento da migrare trovato.";
    }

  } catch (error) {
    console.error("Errore durante la migrazione: ", error);
    if (error instanceof Error) {
        return `Errore durante la migrazione: ${error.message}`;
    }
    return "Errore durante la migrazione: si è verificato un errore sconosciuto.";
  }
};

migrateData();
