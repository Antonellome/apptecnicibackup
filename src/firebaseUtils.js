
// src/firebaseUtils.js

// Importa l'istanza di Firestore da firebase.js (assumendo che il percorso sia corretto)
import { firestore } from './firebase'; // Correzione: usa 'firestore' invece di 'db'

// Esempio di una funzione che usa firestore
export const fetchReports = async () => {
  try {
    const reportsCollection = firestore.collection('reports');
    const snapshot = await reportsCollection.get();
    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return reports;
  } catch (error) {
    console.error("Errore nel recuperare i report:", error);
    throw error;
  }
};

// Puoi aggiungere qui altre funzioni utility per Firebase
