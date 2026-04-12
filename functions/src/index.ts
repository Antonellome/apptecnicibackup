
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { eachDayOfInterval, isWithinInterval, endOfMonth } from "date-fns";

// Inizializza l'SDK Admin di Firebase.
admin.initializeApp();
const db = admin.firestore();

// --- TIPI E INTERFACCE ---
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

// =================================================================================================
// FUNZIONE DI AGGREGAZIONE DATI MASTER
// =================================================================================================
export const getMasterData = functions.region("europe-west1").https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "L'utente deve essere autenticato.");
  }
  functions.logger.info(`Inizio recupero dati master per l'utente: ${context.auth.uid}`);
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
    functions.logger.info("Recupero dati master completato.");
    return masterData;
  } catch (error) {
    functions.logger.error("Errore recupero dati master:", error);
    throw new functions.https.HttpsError("internal", "Impossibile recuperare i dati master.");
  }
});

// =================================================================================================
// FUNZIONE PER GENERARE IL RIEPILOGO MENSILE (SU RICHIESTA)
// =================================================================================================
export const generateMonthlySummary = functions.region("europe-west1").https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "L'utente deve essere autenticato per generare un riepilogo.");
  }

  const { year, month } = data;
  if (typeof year !== 'number' || typeof month !== 'number') {
    throw new functions.https.HttpsError("invalid-argument", "I parametri 'year' e 'month' devono essere numeri.");
  }

  const tecnicoId = context.auth.uid; // Assumiamo che l'UID dell'utente sia l'ID del tecnico
  functions.logger.info(`Richiesta di generazione riepilogo per tecnico: ${tecnicoId}, Mese: ${month + 1}/${year}`);

  try {
    await recalculateAndSaveSummary(tecnicoId, year, month);
    functions.logger.info(`Riepilogo generato con successo per tecnico: ${tecnicoId}`);
    return { success: true, message: "Riepilogo generato e salvato correttamente." };
  } catch (error) {
    functions.logger.error(`Errore durante la generazione del riepilogo per ${tecnicoId}:`, error);
    throw new functions.https.HttpsError("internal", "Si è verificato un errore interno durante la generazione del riepilogo.");
  }
});


// =================================================================================================
// TRIGGER PER AGGREGAZIONE RAPPORTINI
// =================================================================================================
export const rapportiniTrigger = functions.region("europe-west1").firestore.document("rapportini/{rapportinoId}").onWrite(async (change, context) => {
  functions.logger.info(`Trigger attivato per rapportino: ${context.params.rapportinoId}`);
  const monthsToRecalculate = new Set<string>();
  const beforeData = change.before.exists ? change.before.data() as Rapportino : null;
  const afterData = change.after.exists ? change.after.data() as Rapportino : null;

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
  functions.logger.info("Ricalcoli completati.");
});

async function recalculateAndSaveSummary(tecnicoId: string, year: number, month: number) {
  const summaryId = `${year}-${String(month + 1).padStart(2, "0")}_${tecnicoId}`;
  functions.logger.info(`Inizio ricalcolo per: ${summaryId}`);

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

  await db.collection("riepiloghiMensili").doc(summaryId).set(summaryData, { merge: true });
  functions.logger.info(`Riepilogo salvato per ${summaryId}:`, summaryData);
}

// =================================================================================================
// NUOVO TRIGGER PER IMPOSTARE LA SCADENZA DEI CHECK-IN
// =================================================================================================
/**
 * Si attiva alla creazione di un nuovo check-in.
 * Aggiunge automaticamente un campo `expireAt` al documento, impostato a 24 ore dopo
 * la data del check-in, per abilitare la policy di cancellazione automatica (TTL).
 */
export const checkInTrigger = functions.region("europe-west1").firestore
  .document("checkin_giornalieri/{checkinId}")
  .onCreate(async (snap, context) => {
      const checkinData = snap.data();
      const checkinDate = (checkinData.data as admin.firestore.Timestamp).toDate();

      // Imposta la scadenza a 24 ore dopo la data del check-in
      const expireAt = new Date(checkinDate.getTime());
      expireAt.setHours(expireAt.getHours() + 24);

      functions.logger.info(`Impostazione scadenza per check-in ${context.params.checkinId} a ${expireAt.toISOString()}`);

      // Aggiorna il documento con il campo di scadenza
      return snap.ref.update({ 
          expireAt: admin.firestore.Timestamp.fromDate(expireAt) 
      });
  });
