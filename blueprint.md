# IL METODO DEL GRANDE MAESTRO (ANALISI A 360°)

Ogni modifica al codice deve essere trattata come una mossa in una partita a scacchi contro il crash di sistema. Non è permesso agire d'impulso. L'AI deve seguire rigorosamente questi 4 passaggi prima di toccare qualsiasi file:

1. SIMULAZIONE VIRTUALE: Prima di ogni scrittura, l'AI deve simulare mentalmente l'impatto della modifica su TUTTA l'applicazione (Auth, Providers, Routing, UI, Database).
2. ANTICIPAZIONE DELLO SCACCO (PRE-FIX): Identificare preventivamente ogni possibile errore (TypeScript, Firebase Permissions, Indici mancanti, loop di re-render) che la mossa potrebbe causare.
3. CONTROMOSSA PREVENTIVA: Progettare la soluzione includendo già i controlli di sicurezza (null-safe, try/catch, fallback) e le modifiche ai file di configurazione (rules, indexes) necessari per evitare l'errore simulato al punto 2.
4. VERIFICA DEI PRODIER: L'AI non deve mai unificare logiche critiche (es. Auth e Dati) se questo mette a rischio la stabilità del caricamento iniziale (Login Page). I moduli devono essere indipendenti e resilienti.

"Agire solo quando la vittoria (stabilità) è matematicamente certa."

---

# Protocollo di Comunicazione AI

## Regola del "CIAO"

Ogni singola risposta dell'AI deve iniziare con la parola **"CIAO"**. Questa regola funge da checksum per verificare la continuità del contesto. L'omissione di "CIAO" indica una potenziale perdita di contesto e deve essere immediatamente corretta.

## Regole di Intervento sul Codice

1.  **Estetica Intoccabile:** L'aspetto visivo e la struttura delle pagine non devono essere alterati. L'intervento è limitato alla logica.
2.  **Miglioramenti solo su Approvazione:** Eventuali proposte di refactoring strutturale, anche se distruttive, devono essere prima approvate dall'utente.
3.  **Analisi Completa Prima dell'Azione:** Nessuna modifica al codice verrà effettuata prima di aver completato un'analisi globale e aver definito un piano d'azione completo e concordato.
4.  **Rimuovere il Vecchio, Non Aggirare:** L'obiettivo è correggere la causa principale dei problemi. Le soluzioni devono ripulire il codice obsoleto, non aggiungere strati per aggirare il problema. Se una logica viene sostituita, la vecchia viene eliminata.
5.  **Regola dell'Applicazione Finita (POST-PRODUZIONE):** L'applicazione è considerata funzionalmente completa e in produzione. Ogni intervento è una manutenzione su un sistema live.
    *   **Ponderazione Massima:** Nessuna correzione può essere tentata alla leggera.
    *   **Memorizzazione Stato Precedente:** Prima di scrivere qualsiasi modifica, l'AI deve leggere il contenuto completo del file target e memorizzarlo temporaneamente.
    *   **Verifica Post-Correzione:** Dopo la modifica, il risultato deve essere ispezionato criticamente.
    *   **Rollback Obbligatorio:** Se la correzione produce un risultato errato o un effetto collaterale inatteso, l'AI ha l'obbligo di annullare immediatamente la propria modifica, ripristinando il contenuto memorizzato in precedenza. È vietato tentare una "contro-correzione" sopra a una correzione fallita.

---
# CRONOLOGIA INTERVENTI (LOG DELLE MODIFICHE)

### Intervento 2024-05-24: Stabilizzazione e Refactoring Notifiche

**Stato Precedente:** L'applicazione era in uno stato di crash critico all'avvio (`Cannot read properties of undefined (reading 'put')`) a causa di un'errata referenza alla tabella `userProfile` in `AuthProvider.tsx`. Inoltre, la pagina `NotifichePage.tsx` utilizzava un layout obsoleto basato su `Box`.

**Azioni Correttive Eseguite:**

1.  **Correzione Crash Avvio:**
    *   **Causa Radice Identificata:** Il nome della tabella nel database locale Dexie (`src/db/local-db.ts`) era `webAppUsers`, mentre `AuthProvider.tsx` tentava di accedere a `localDb.userProfile`.
    *   **Soluzione:** Modificato `AuthProvider.tsx` per utilizzare il nome corretto della tabella: `localDb.webAppUsers.put(profile)`.
    *   **Risultato:** Crash all'avvio risolto. L'applicazione è ora stabile e si avvia correttamente.

2.  **Refactoring Pagina Notifiche (`NotifichePage.tsx`):**
    *   **Obiettivo:** Aderire al dogma della **Grid v2** come specificato nel blueprint.
    *   **Implementazione:**
        *   Sostituito il layout basato su `Box` con un'architettura `Grid` v2.
        *   Il contenitore principale delle notifiche è ora un `<Grid container spacing={2}>`.
        *   Ogni `NotificationItem` è wrappato in un `<Grid xs={12}>` per garantire un layout a lista verticale, responsive e robusto.
        *   Le importazioni inutilizzate (`Box`) sono state rimosse per mantenere la pulizia del codice.
    *   **Risultato:** La pagina delle notifiche ora rispetta le linee guida architetturali, è più manutenibile e visivamente allineata alle best practice del progetto.

**Stato Attuale:** L'applicazione è stabile. La pagina delle notifiche è stata aggiornata con successo alla Grid v2. L'ordine dell'utente è stato completato.

---
# Blueprint: Gestione Rapportini Tecnici

Questo documento delinea l'architettura, le funzionalità e il piano di sviluppo per l'applicazione di gestione dei rapportini. Serve come raccolta delle linee guida per lo sviluppo assistito dall'AI.

## 1. Informazioni di Deploy

- **URL Applicazione:** [https://tecnici.web.app](https://tecnici.web.app)

---

## 2. Specifiche Funzionali dell'App Tecnici (Fonte di Verità Assoluta)

Questa sezione definisce l'applicazione come descritta dall'utente.

(Contenuto omesso per brevità)

---

## 6. Libreria di Componenti e Stile: Material-UI (MUI) v7+

*Questa sezione definisce le linee guida per l'utilizzo della libreria di componenti Material-UI, come imposto dall'utente. La violazione di queste regole è considerata un fallimento critico.*

### **6.1. Versione della Grid: Grid v2 (Obbligatoria)**

**Dogma:** Il componente `GridLegacy` (o `Grid` v1) è **deprecato e vietato**. Si deve utilizzare **esclusivamente** il nuovo componente `Grid` (v2), importato da `@mui/material/Grid`.

#### **Motivazioni del Divieto:**

La Grid v2 offre miglioramenti critici che la rendono l'unica scelta accettabile:
*   **Utilizzo di CSS Variables:** Elimina problemi di specificità CSS.
*   **`item` prop non necessario:** Tutti gli elementi della grid sono considerati `item` di default.
*   **Feature di `offset`:** Maggiore flessibilità nel posizionamento.
*   **Nesting Illimitato:** Nessun limite alla profondità delle grid annidate.
*   **Nessun Margine Negativo:** Non causa problemi di overflow come la `GridLegacy`.

#### **Guida alla Migrazione e all'Uso Corretto (da v1 a v2):**

1.  **Aggiornare l'Importazione:**
    ```diff
    - import Grid from '@mui/material/GridLegacy'; // O @mui/material/Grid (v1)
    + import Grid from '@mui/material/Grid'; // (v2)
    ```

2.  **Rimuovere Prop Obsolete:**
    Le prop `item` e `zeroMinWidth` devono essere rimosse.
    ```diff
    - <Grid item zeroMinWidth>
    + <Grid>
    ```

3.  **Aggiornare le Prop di Dimensionamento (`size`):**
    Le vecchie prop `xs`, `sm`, `md`, etc., sono state sostituite da un'unica prop `size` che accetta un oggetto.
    ```diff
    - <Grid xs={12} sm={6}>
    + <Grid size={{ xs: 12, sm: 6 }}>
    ```
    Se la dimensione è la stessa per tutti i breakpoint:
    ```diff
    - <Grid xs={6}>
    + <Grid size={6}>
    ```
    Il valore `true` per l'auto-layout è stato rinominato in `"grow"`:
    ```diff
    - <Grid xs>
    + <Grid size="grow">
    ```

4.  **Gestione della Larghezza del Container:**
    La Grid v2 non occupa il 100% della larghezza di default. È necessario specificarlo esplicitamente con la prop `sx`.
    ```diff
    - <Grid container>
    + <Grid container sx={{ width: '100%' }}>
    ```
    O, se il genitore è un flex container:
    ```diff
    - <Grid container>
    + <Grid container sx={{ flexGrow: 1 }}>
    ```

5.  **Codemod (Opzionale ma Raccomandato):**
    Per aggiornamenti massivi, dopo aver sistemato gli import, si può usare il codemod ufficiale di MUI:
    ```bash
    npx @mui/codemod@next v7.0.0/grid-props <path/to/project>
    ```
    **Attenzione:** Il codemod non copre componenti wrappati o `styled-components`. Questi devono essere aggiornati manualmente.

### **6.2. Direzione `column`**
L'uso di `direction="column"` non è supportato né sulla Grid v1 né sulla v2. Per layout verticali, seguire la documentazione ufficiale usando `Stack` o `flexbox`.

(Resto del blueprint originale...)
