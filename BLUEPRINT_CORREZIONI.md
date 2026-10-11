
# Blueprint Correzioni Stabilità App Offline

Questo documento descrive i due problemi strutturali identificati che causano instabilità e perdita di dati percepita, e delinea le soluzioni tecniche da implementare.

---

## Problema #1: Doppione di Autenticazione e Fallimento Lettura Offline

### Problema Riscontrato (Sintomi)
All'avvio dell'applicazione in modalità offline, la lista dei report personali risulta sempre vuota. Questo accade anche se il database locale contiene i dati dei report scaricati in una sessione precedente. La funzione di creazione di un nuovo report, invece, funziona correttamente, dimostrando che l'app è in grado di identificare l'utente in altri contesti.

### Causa Radice
Esistono due metodi distinti per recuperare il profilo dell'utente:
1.  **Metodo Funzionante (`GlobalDataContext`):** Usato dalla funzione di creazione report. Recupera il profilo dal database locale (Dexie) ed è affidabile offline.
2.  **Metodo Difettoso (`useAuth` hook):** Usato dalla funzione di visualizzazione della lista report (`useRapportini`). Questo hook non è in grado di recuperare il profilo utente in modalità offline, restituendo `undefined`.

L'hook `useRapportini`, ricevendo un profilo `undefined`, si blocca preventivamente e restituisce una lista vuota senza mai interrogare il database locale.

### Soluzione Proposta
Unificare la gestione del profilo utente. Modificare l'hook `useRapportini` affinché utilizzi il `GlobalDataContext` (la fonte affidabile) per recuperare il profilo utente, invece di affidarsi all'hook `useAuth`.

**File da Modificare:** `src/hooks/useRapportini.ts`

**Codice Attuale (Problematico):**
```typescript
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/local-db';
import { useAuth } from '@/hooks/useAuth'; // Usa il metodo difettoso

export const useRapportini = () => {
  const { user, userProfile } = useAuth(); // Il userProfile qui è undefined offline

  const rapportini = useLiveQuery(() => {
    if (!user || !userProfile) return []; // Si blocca qui

    return db.rapportini
      .where('tecnicoId').equals(userProfile.tecnicoId)
      .or('presenze').equals(userProfile.tecnicoId)
      .sortBy('data');
  }, [user, userProfile]);

  // ...
};
```

**Codice Modificato (Corretto):**
```typescript
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/local-db';
import { useContext } from 'react'; // Import necessario
import { GlobalDataContext } from '@/contexts/GlobalDataContext'; // Import necessario

export const useRapportini = () => {
  const { userProfile } = useContext(GlobalDataContext); // Usa il metodo affidabile

  const rapportini = useLiveQuery(() => {
    if (!userProfile) return []; // Ora userProfile è corretto anche offline

    return db.rapportini
      .where('tecnicoId').equals(userProfile.tecnicoId)
      .or('presenze').equals(userProfile.tecnicoId)
      .sortBy('data');
  }, [userProfile]); // La dipendenza è solo sul profilo corretto

  // ...
};
```

---

## Problema #2: Sincronizzazione Distruttiva e Perdita Dati

### Problema Riscontrato (Sintomi)
In condizioni di rete instabile, si può verificare una perdita totale dei dati dei report dal database locale. L'utente avvia l'app offline e la trova vuota, non perché la lettura fallisce (Problema #1), ma perché il database è stato effettivamente svuotato durante una precedente sessione online fallita.

### Causa Radice
Le funzioni responsabili della sincronizzazione dei report (`syncUserRapportini` e `listenForRapportiniUpdates`) sono "cieche". Usano il comando `bulkPut` per sovrascrivere la tabella locale con qualsiasi dato arrivi dal server. Se, a causa di un errore di rete, il server risponde con un array vuoto (`[]`), questo viene interpretato come "la nuova verità", portando alla cancellazione di tutti i record presenti nel database locale.

### Soluzione Proposta
Introdurre una "guardia di sicurezza" in entrambe le funzioni di sincronizzazione. Prima di eseguire il `bulkPut`, controllare se i dati ricevuti dal server sono un array valido e non vuoto. Se i dati sono vuoti o non validi, interrompere la procedura per prevenire la cancellazione accidentale dei dati locali.

**File da Modificare:** `src/services/offlineSync.ts`

**Codice Attuale (Problematico) in `syncUserRapportini`:**
```typescript
export const syncUserRapportini = async (tecnicoId: string) => {
  // ...
  try {
    const result = await getAllRapportiniForSyncCallable({ tecnicoId });
    const rapportini = result.data as Rapportino[];

    if (!rapportini) { // Controllo insufficiente
      //...
      return;
    }

    await db.rapportini.bulkPut(rapportini); // Pericoloso!
  } // ...
}
```

**Codice Modificato (Corretto):**
```typescript
export const syncUserRapportini = async (tecnicoId: string) => {
  // ...
  try {
    const result = await getAllRapportiniForSyncCallable({ tecnicoId });
    const rapportini = result.data as Rapportino[];

    // --- GUARDIA DI SICUREZZA ---
    if (!rapportini || !Array.isArray(rapportini) || rapportini.length === 0) {
      console.warn("Sincronizzazione interrotta: il server ha restituito dati vuoti o non validi. I dati locali sono stati preservati.");
      return;
    }
    // --- FINE GUARDIA ---

    await db.rapportini.bulkPut(rapportini);
  } // ...
}

// La stessa logica di guardia va applicata anche alla funzione 'listenForRapportiniUpdates'.
```
