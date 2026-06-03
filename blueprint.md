# Blueprint Applicazione Tecnici & Contratto Dati Rapportini

**Versione:** 1.0
**Data:** 24 Maggio 2024

---

## 1. Scopo dell'Applicazione

Questo documento serve come fonte unica di verità per l'architettura, le funzionalità e, soprattutto, il contratto dati dell'applicazione per i tecnici. L'obiettivo principale dell'app è permettere ai tecnici la creazione, gestione e consultazione dei loro rapportini di lavoro, con un'enfasi fondamentale sul supporto completo anche in modalità offline.

## 2. Contratto Dati Finale (Versione Accettata)

Questa sezione definisce la struttura dati **ufficiale e non negoziabile** per i documenti `rapportini` scambiati tra l'App Tecnici e l'App Master.

### Struttura JSON

```json
{
  "id": "string",
  "idTecnico": "string",
  "nomeTecnico": "string",
  "data": "Timestamp",
  "idTipoGiornata": "string",
  "descrizioneTipoGiornata": "string",
  "oreLavorate": "number",
  "sede": {
    "idLuogo": "string | null",
    "descrizioneLuogo": "string | null",
    "idNave": "string | null",
    "nomeNave": "string | null"
  },
  "attivitaSvolte": "string",
  "stato": "string",
  "metadata": {
    "createdAt": "Timestamp",
    "updatedAt": "Timestamp",
    "createdBy": "string"
  }
}
```

### Suddivisione delle Responsabilità

*   **RESPONSABILITÀ APP TECNICI:**
    *   Garantire che ogni rapportino inviato a Firestore segua scrupolosamente la struttura JSON definita sopra.
    *   **NON includere** l'oggetto `cliente`.
    *   **NON includere** l'oggetto `trasferta`.
    *   Mantenere la nostra logica interna più ricca (es. `dettaglioOreTecnici`, `firma`, etc.) che non viene inviata se non mappata esplicitamente.

*   **RESPONSABILITÀ APP MASTER:**
    *   Ricevere il dato pulito dall'App Tecnici.
    *   Arricchire il documento con le informazioni sul **cliente**, seguendo le proprie logiche di attribuzione basate su `idNave` o `idLuogo`.

## 3. Piano di Implementazione

Per allineare l'applicazione al contratto dati finale, verranno eseguiti i seguenti passaggi:

1.  **Modifica Schema Dati (`src/models/rapportino.schema.ts`):** Aggiornare lo schema Zod per riflettere la struttura concordata. Questo include:
    *   Riorganizzare i campi `luogoId` e `naveId` all'interno di un oggetto `sede`.
    *   Assicurare la presenza di tutti i campi obbligatori (`id`, `idTecnico`, `nomeTecnico`, `stato`, `metadata`, etc.).
    *   Rimuovere esplicitamente ogni riferimento a `cliente` e `trasferta` dallo schema di base da sincronizzare.

2.  **Modifica Logica di Creazione Report:** Adattare la funzione di submit del form (presumibilmente in `src/pages/ReportFormPage.tsx` o file collegati) per costruire l'oggetto `rapportino` secondo il nuovo schema prima del salvataggio/invio.

3.  **Verifica Funzionalità:** Testare che la creazione, il salvataggio (online e in coda offline) e la visualizzazione dei report continuino a funzionare senza regressioni e che i dati generati siano conformi al 100%.
