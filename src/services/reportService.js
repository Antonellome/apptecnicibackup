
// src/services/reportService.js

// Assumiamo che './firebase' sia il percorso corretto per importare le configurazioni di Firebase
// import { db } from './firebase'; // <-- Questa è la linea errata
import { firestore } from './firebase'; // <-- Questa è la linea corretta per Firestore

export const addReport = async (reportData) => {
  try {
    // Usa firestore invece di db
    await firestore.collection('reports').add(reportData);
    console.log('Report aggiunto con successo!');
  } catch (error) {
    console.error('Errore nell\'aggiunta del report:', error);
    throw error; // Rilancia l'errore per gestirlo altrove
  }
};

// Altre funzioni per la gestione dei report...
