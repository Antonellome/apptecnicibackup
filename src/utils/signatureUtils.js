
// src/utils/signatureUtils.js

// Assumiamo che per le firme, potremmo aver bisogno di firestore o storage.
// Se l'errore 'db' è presente, verrà corretto qui.
import { firestore } from './firebase'; // Correzione: assicurati di usare l'esportazione corretta da firebase.js

// Esempio di funzione per salvare una firma (potrebbe usare firestore o storage)
export const saveSignature = async (signatureDataUrl, userId, reportId) => {
  try {
    // Esempio: Salvare la firma come stringa Base64 in Firestore
    const signatureRef = firestore.collection('signatures').doc(userId); // O un sub-collection per report
    await signatureRef.set({
      signatureDataUrl,
      reportId: reportId || null,
      userId: userId,
      signedAt: new Date(),
    });
    console.log(`Firma salvata per utente ${userId}`);
    return true;
  } catch (error) {
    console.error("Errore nel salvare la firma:", error);
    // Qui potremmo voler aggiungere la firma alla coda offline se non siamo online
    throw error;
  }
};

// Potresti voler aggiungere funzioni per recuperare o validare firme qui.
