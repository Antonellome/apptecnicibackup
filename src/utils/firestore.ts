// Import necessari all'inizio del tuo file (es. HomePage.tsx)
import { collection, query, where, getDocs, doc, getDoc, DocumentData } from "firebase/firestore";
import { db, auth } from "./firebase"; // Adatta al path corretto

// --- FUNZIONE PER RECUPERARE I RAPPORTINI ---

export async function fetchRapportiniForCurrentUser(): Promise<DocumentData[]> {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    return [];
  }

  const scriventeQuery = query(
    collection(db, "rapportini"),
    where("tecnicoScriventeId", "==", uid)
  );

  const aggiuntiQuery = query(
    collection(db, "rapportini"),
    where("tecniciAggiuntiIds", "array-contains", uid)
  );

  const [scriventeSnapshot, aggiuntiSnapshot] = await Promise.all([
    getDocs(scriventeQuery),
    getDocs(aggiuntiQuery)
  ]);

  const rapportiniMap = new Map<string, DocumentData>();
  
  scriventeSnapshot.docs.forEach(doc => {
    rapportiniMap.set(doc.id, { id: doc.id, ...doc.data() });
  });

  aggiuntiSnapshot.docs.forEach(doc => {
    if (!rapportiniMap.has(doc.id)) {
      rapportiniMap.set(doc.id, { id: doc.id, ...doc.data() });
    }
  });

  return Array.from(rapportiniMap.values());
}


// --- FUNZIONE PER RECUPERARE LE NOTIFICHE ---

export async function fetchNotificationsForCurrentUser(): Promise<DocumentData[]> {
  const uid = auth.currentUser?.uid;
  if (!uid) {
      return [];
  }

  const userDocRef = doc(db, "tecnici", uid);
  const userDocSnap = await getDoc(userDocRef);
  
  if (!userDocSnap.exists()) {
    console.error("ERRORE: Documento del tecnico non trovato!");
    return [];
  }
  const userCategoria = userDocSnap.data().categoria;

  const toIdQuery = query(
    collection(db, "notifiche"), 
    where("to_ids", "array-contains", uid)
  );

  const toCategoryQuery = userCategoria 
    ? query(
        collection(db, "notifiche"), 
        where("to_categories", "array-contains", userCategoria)
      )
    : null;
  
  const queriesToRun = [getDocs(toIdQuery)];
  if(toCategoryQuery) {
    queriesToRun.push(getDocs(toCategoryQuery));
  }

  const snapshots = await Promise.all(queriesToRun);

  const notificationsMap = new Map<string, DocumentData>();
  snapshots.forEach(snapshot => {
    snapshot.docs.forEach(doc => {
        notificationsMap.set(doc.id, {id: doc.id, ...doc.data()});
    });
  });

  return Array.from(notificationsMap.values());
}
