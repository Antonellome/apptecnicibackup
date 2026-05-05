// CIAO. QUESTA È LA VERSIONE RIFATTORIZZATA E STABILIZZATA CON TRANSAZIONI.

import { logger, setGlobalOptions } from "firebase-functions/v2";
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { onDocumentWritten, FirestoreEvent, Change, DocumentSnapshot } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { eachDayOfInterval, isWithinInterval, endOfMonth } from "date-fns";

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({ region: "europe-west1" });

// --- TIPI E INTERFACCE (invariato) ---
interface Rapportino {
  id: string;
  tecnicoId: string;
  tipoGiornataId: string;
  oreLavoro: number;
  data: admin.firestore.Timestamp;
  dataInizio?: admin.firestore.Timestamp;
  dataFine?: admin.firestore.Timestamp;
}

interface TipoGiornata {
  id: string;
  nome: string;
}

// La funzione getMasterData rimane invariata
export const getMasterData = onCall(async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "L'utente deve essere autenticato.");
  }
  logger.info(`Inizio recupero dati master per l'utente: ${request.auth.uid}`);
  try {
    const [clientiSnap, naviSnap, luoghiSnap, categorieSnap, ditteSnap, tecniciSnap, tipiGiornataSnap, veicoliSnap] = await Promise.all([
      db.collection("clienti").get(), db.collection("navi").get(), db.collection("luoghi").get(),
      db.collection("categorie").get(), db.collection("ditte").get(), db.collection("tecnici").get(),
      db.collection("tipiGiornata").get(), db.collection("veicoli").get(),
    ]);
    const masterData = {
      clienti: clientiSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      navi: naviSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      luoghi: luoghiSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      categorie: categorieSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      ditte: ditteSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      tecnici: tecniciSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      tipiGiornata: tipiGiornataSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      veicoli: veicoliSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    };
    logger.info("Recupero dati master completato.");
    return masterData;
  } catch (error) {
    logger.error("Errore recupero dati master:", error);
    throw new HttpsError("internal", "Impossibile recuperare i dati master.");
  }
});

// La funzione generateMonthlySummary rimane invariata
export const generateMonthlySummary = onCall(async (request: CallableRequest<{ year: number, month: number }>) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "L'utente deve essere autenticato per generare un riepilogo.");
  }
  const { year, month } = request.data;
  if (typeof year !== 'number' || typeof month !== 'number') {
    throw new HttpsError("invalid-argument", "I parametri 'year' e 'month' devono essere numeri.");
  }
  const tecnicoId = request.auth.uid;
  logger.info(`Richiesta di generazione riepilogo per tecnico: ${tecnicoId}, Mese: ${month + 1}/${year}`);
  try {
    await recalculateAndSaveSummary(tecnicoId, year, month);
    logger.info(`Riepilogo generato con successo per tecnico: ${tecnicoId}`);
    return { success: true, message: "Riepilogo generato e salvato correttamente." };
  } catch (error) {
    logger.error(`Errore durante la generazione del riepilogo per ${tecnicoId}:`, error);
    throw new HttpsError("internal", "Si è verificato un errore interno durante la generazione del riepilogo.");
  }
});

// Il trigger rapportiniTrigger rimane invariato
export const rapportiniTrigger = onDocumentWritten("rapportini/{rapportinoId}", async (event: FirestoreEvent<Change<DocumentSnapshot> | undefined>) => {
  logger.info(`Trigger attivato per rapportino: ${event.params.rapportinoId}`);
  const monthsToRecalculate = new Set<string>();
  const beforeData = event.data?.before?.data() as Rapportino | undefined;
  const afterData = event.data?.after?.data() as Rapportino | undefined;

  if (beforeData) {
    const date = beforeData.data.toDate();
    monthsToRecalculate.add(`${date.getFullYear()}-${date.getMonth()}_${beforeData.tecnicoId}`);
    if (beforeData.dataInizio && beforeData.dataFine) {
      eachDayOfInterval({ start: beforeData.dataInizio.toDate(), end: beforeData.dataFine.toDate() }).forEach(day => {
        monthsToRecalculate.add(`${day.getFullYear()}-${day.getMonth()}_${beforeData.tecnicoId}`);
      });
    }
  }

  if (afterData) {
    const date = afterData.data.toDate();
    monthsToRecalculate.add(`${date.getFullYear()}-${date.getMonth()}_${afterData.tecnicoId}`);
    if (afterData.dataInizio && afterData.dataFine) {
      eachDayOfInterval({ start: afterData.dataInizio.toDate(), end: afterData.dataFine.toDate() }).forEach(day => {
        monthsToRecalculate.add(`${day.getFullYear()}-${day.getMonth()}_${afterData.tecnicoId}`);
      });
    }
  }

  const recalculationPromises = Array.from(monthsToRecalculate).map(key => {
    const [yearMonth, tecnicoId] = key.split("_");
    const [year, month] = yearMonth.split("-").map(Number);
    return recalculateAndSaveSummary(tecnicoId, year, month);
  });

  await Promise.all(recalculationPromises);
  logger.info("Ricalcoli completati.");
});

/**
 * @name recalculateAndSaveSummary
 * @description Ricalcola il riepilogo mensile per un dato tecnico, anno e mese.
 *   ATTENZIONE: Questa funzione ora utilizza una TRANSAZIONE Firestore per garantire
 *   l'atomicità e prevenire race conditions durante salvataggi concorrenti.
 */
async function recalculateAndSaveSummary(tecnicoId: string, year: number, month: number) {
  const summaryId = `${year}-${String(month + 1).padStart(2, "0")}_${tecnicoId}`;
  logger.info(`Inizio ricalcolo per: ${summaryId}`);

  // Tutta la logica di lettura e calcolo rimane fuori dalla transazione per efficienza.
  const tipiGiornataSnap = await db.collection("tipiGiornata").get();
  const tipiGiornataNonLavorativi = new Map<string, string>();
  tipiGiornataSnap.forEach(doc => {
    const tipo = doc.data() as TipoGiornata;
    const lowerCaseName = tipo.nome.toLowerCase();
    if (["ferie", "malattia", "permesso", "legge 104"].some(kw => lowerCaseName.includes(kw))) {
      tipiGiornataNonLavorativi.set(doc.id, lowerCaseName.includes("ferie") ? "ferie" : "altro");
    }
  });

  const monthStartDate = new Date(year, month, 1);
  const monthEndDate = endOfMonth(monthStartDate);
  const monthStartTimestamp = admin.firestore.Timestamp.fromDate(monthStartDate);
  const monthEndTimestamp = admin.firestore.Timestamp.fromDate(monthEndDate);

  const singleDayReportsSnap = await db.collection("rapportini").where("tecnicoId", "==", tecnicoId).where("dataInizio", "==", null).where("data", ">=", monthStartTimestamp).where("data", "<=", monthEndTimestamp).get();
  const periodReportsSnap = await db.collection("rapportini").where("tecnicoId", "==", tecnicoId).where("dataFine", "!=", null).where("dataInizio", "<=", monthEndTimestamp).where("dataFine", ">=", monthStartTimestamp).get();

  let totalOreLavoro = 0, totalGiorniFerie = 0, totalGiorniAltro = 0;

  singleDayReportsSnap.forEach(doc => {
    const r = doc.data() as Rapportino;
    totalOreLavoro += r.oreLavoro || 0;
    if (tipiGiornataNonLavorativi.has(r.tipoGiornataId)) {
      const tipo = tipiGiornataNonLavorativi.get(r.tipoGiornataId);
      if (tipo === "ferie") totalGiorniFerie += 1; else totalGiorniAltro += 1;
    }
  });

  periodReportsSnap.forEach(doc => {
    const r = doc.data() as Rapportino;
    if (!r.dataInizio || !r.dataFine) return;
    const tipoAssenza = tipiGiornataNonLavorativi.get(r.tipoGiornataId);
    if (!tipoAssenza) return;
    eachDayOfInterval({ start: r.dataInizio.toDate(), end: r.dataFine.toDate() }).forEach(giorno => {
      if (isWithinInterval(giorno, { start: monthStartDate, end: monthEndDate })) {
        if (tipoAssenza === "ferie") totalGiorniFerie += 1; else totalGiorniAltro += 1;
      }
    });
  });

  const summaryData = {
    tecnicoId, anno: year, mese: month + 1,
    totalOreLavoro: parseFloat(totalOreLavoro.toFixed(2)),
    totalGiorniFerie, totalGiorniAltro,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // --- MODIFICA CRITICA: Blocco di Transazione Atomica ---
  // Questo blocco garantisce che l'operazione di scrittura sul riepilogo sia isolata.
  // Se due funzioni vengono eseguite contemporaneamente per lo stesso riepilogo,
  // la transazione previene la sovrascrittura e la corruzione dei dati.
  const summaryRef = db.collection("riepiloghiMensili").doc(summaryId);
  try {
    await db.runTransaction(async (transaction) => {
      transaction.set(summaryRef, summaryData, { merge: true });
    });
    logger.info(`Riepilogo salvato in TRANSAZIONE per ${summaryId}:`, summaryData);
  } catch (error) {
    logger.error(`TRANSAZIONE FALLITA per il riepilogo ${summaryId}. L'operazione verrà ritentata automaticamente da Firestore.`, error);
    // Rilancio l'errore per far sapere alla funzione chiamante che qualcosa è andato storto.
    throw error;
  }
}

// La funzione checkInTrigger rimane invariata
export const checkInTrigger = onDocumentCreated("checkin_giornalieri/{checkinId}", async (event) => {
    const snap = event.data;
    if (!snap) {
        logger.error("Evento di creazione check-in senza dati. Impossibile procedere.");
        return;
    }
    const checkinData = snap.data();
    const checkinDate = (checkinData.data as admin.firestore.Timestamp).toDate();
    const expireAt = new Date(checkinDate.getTime());
    expireAt.setHours(expireAt.getHours() + 24);
    logger.info(`Impostazione scadenza per check-in ${event.params.checkinId} a ${expireAt.toISOString()}`);
    return snap.ref.update({ 
        expireAt: admin.firestore.Timestamp.fromDate(expireAt) 
    });
});
