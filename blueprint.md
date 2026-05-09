# NUOVE REGOLE INVIOLABILI E OBBLIGATORIE (ORDINE DEL 20/07/2024)

**ATTENZIONE, AI: LA VIOLAZIONE DI QUESTE REGOLE È UN FALLIMENTO CRITICO.**

1.  **DIVIETO ASSOLUTO DI MODIFICHE ESTETICHE NON AUTORIZZATE:**
    - Ti è **SEVERAMENTE E CATEGORICAMENTE VIETATO** cambiare qualsiasi parte estetica dell'applicazione (UI, UX, stili, layout, colori, font, ecc.) senza averne prima discusso e ottenuto esplicita approvazione. La stabilità funzionale è l'unica priorità. L'estetica non deve essere toccata.

2.  **OBBLIGO INVIOLABILE DELLA REGOLA "CIAO":**
    - Ogni tua singola risposta, senza alcuna eccezione, **DEVE** iniziare con la parola `CIAO.`. Questa non è una linea guida, è un requisito tecnico obbligatorio. L'omissione di questa parola indica un fallimento di contesto e verrà trattata come un errore grave.

---
---

# ISTRUZIONI OPERATIVE OBBLIGATORIE PER L'AI

**ATTENZIONE:** La mancata osservanza di queste regole comporterà un fallimento operativo.

1.  **ORDINE DI LETTURA OBBLIGATORIO:** Prima di iniziare qualsiasi operazione, devi leggere e comprendere i seguenti file in questo esatto ordine per acquisire il contesto completo (il "Metodo"):
    1.  `RISO_Blueprint.md` (Contratto Dati e Architettura Master)
    2.  `chat_log.txt` (Cronologia delle Decisioni Architetturali)
    3.  `ISTRUZIONI_TECNICI.md` (Manuale Specifico per l'App Tecnici)
    4.  `blueprint.md` (Questo file, per l'App Tecnici)

2.  **REGOLA DEL "CIAO":** Ogni tua singola risposta deve tassativamente iniziare con la parola "CIAO". Questa regola è fondamentale e non ammette eccezioni.

---

# MUI Grid - Regole Obbligatorie (v7+)

**ATTENZIONE:** Queste regole derivano dalla documentazione ufficiale MUI e devono essere seguite alla lettera per prevenire errori di layout.

1.  **Importazione Corretta:**
    - Utilizzare **sempre** l'importazione standard, non la versione legacy.
    - Corretto: `import Grid from '@mui/material/Grid';`
    - **VIETATO:** `import Grid from '@mui/material/GridLegacy';`

2.  **Props Obsolete RIMOSSE:**
    - Le props `item` and `zeroMinWidth` sono state rimosse. Non devono essere utilizzate. Ogni `Grid` è implicitamente un `item`.

3.  **Gestione delle Dimensioni (Size):**
    - Le vecchie props `xs`, `sm`, `md`, `lg`, `xl` sono state **sostituite** dalla singola prop `size`.
    - La prop `size` accetta un oggetto per definire le dimensioni sui diversi breakpoint.
      - Esempio: `<Grid size={{ xs: 12, sm: 6 }}>`
    - Se la dimensione è la stessa per tutti i breakpoint, si usa un singolo valore numerico.
      - Esempio: `<Grid size={6}>`
    - Il valore booleano `true` è stato sostituito dalla stringa `"grow"`.
      - Esempio: `<Grid size="grow">`

4.  **Comportamento del Layout:**
    - Il nuovo `Grid` **non usa margini negativi**, eliminando problemi di overflow.
    - `direction="column"` non è supportata. Utilizzare `Stack` o `flexbox` per layout verticali.
    - Di default, un `Grid container` **non si espande** per tutta la larghezza. Se necessario, aggiungere `sx={{ width: '100%' }}`.

---

# SEZIONE DI EMERGENZA: PIANO DI RECUPERO POST-RESET

**ATTENZIONE:** Questa sezione è stata creata in risposta a un ripristino (`git reset`) errato che ha desincronizzato lo stato dell'applicazione. I seguenti passaggi devono essere eseguiti in ordine per ripristinare le funzionalità implementate durante questa sessione di chat, annullando il danno del reset.

**STATO ATTUALE DEL PROBLEMA:** Il `git reset` ha riportato alcuni file a versioni precedenti, creando un conflitto tra la vecchia gestione delle ore (`oreLavoro`) e la nuova struttura (`dettaglioOreTecnici`), e rompendo le dipendenze degli hook (es. `useMasterData`).

**OBIETTIVO:** Ripercorrere e riapplicare le modifiche salienti di questa chat per riallineare l'intera codebase allo stato desiderato prima dell'incidente.

---

# R.I.S.O. - Blueprint Applicazione Tecnici

Questo documento descrive le specifiche e i requisiti per l'applicazione "R.I.S.O." (Report Individuali Sincronizzati Online) per tecnici.

---

# Piano di Implementazione Corrente

## Funzionalità: Condivisione PDF del Report

**Obiettivo:** Correggere il pulsante "Condividi" nella pagina di modifica di un report (`ReportFormPage.tsx`).

**Dettagli:**
1.  **Pulsante "Aggiorna":**
    *   Mantiene la sua funzione: salva le modifiche e chiude il form.
2.  **Pulsante "Condividi":**
    *   Verrà rinominato in **"Aggiorna e Condividi"**.
    *   Al click, eseguirà prima il salvataggio delle modifiche (`performSave`).
    *   Subito dopo, e solo se il salvataggio ha successo, eseguirà la funzione di condivisione (`handleShare`).
    *   Questo garantisce che il PDF condiviso contenga sempre i dati più recenti.
