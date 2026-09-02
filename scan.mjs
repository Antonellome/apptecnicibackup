// Importazione modulare corretta per ES Modules
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Inizializza l'app utilizzando le funzioni importate
initializeApp({
  credential: applicationDefault(),
  projectId: 'riso-project-app',
});

// Ottieni l'istanza di Firestore usando la funzione importata
const db = getFirestore();

async function analizzaRapportini() {
  console.log('--- INIZIO NUOVA SCANSIONE RAPPORTINI --- ');
  const rapportiniRef = db.collection('rapportini');
  
  try {
    const snapshot = await rapportiniRef.get();
    let problemi = 0;
    const idProblemi = [];

    if (snapshot.empty) {
        console.log('Nessun rapportino trovato nella collezione.');
        return;
    }

    console.log(`Trovati ${snapshot.size} documenti. Analisi in corso...`);

    snapshot.forEach(doc => {
      const data = doc.data();
      const docId = doc.id;

      // Controllo se il campo 'data' non esiste o non è un Timestamp
      if (!data.data || !(data.data instanceof Timestamp)) {
        problemi++;
        idProblemi.push(docId);
        const tipo = data.data ? data.data.constructor.name : 'mancante';
        console.log(`  - ID Rapportino: ${docId} -> PROBLEMA: Campo 'data' non valido (tipo: ${tipo}).`);
      }
    });

    if (problemi === 0) {
      console.log("\nSCANSIONE COMPLETATA: Nessun problema trovato. Tutti i rapportini hanno un campo 'data' valido.");
    } else {
      console.log(`\nSCANSIONE COMPLETATA: Trovati ${problemi} rapportini con problemi.`);
      console.log("ID dei documenti problematici:", idProblemi);
    }

  } catch (error) {
      console.error('ERRORE DURANTE LA SCANSIONE:', error);
  } finally {
      console.log('--- FINE SCANSIONE ---');
      process.exit(0); // Termina lo script
  }
}

analizzaRapportini();
