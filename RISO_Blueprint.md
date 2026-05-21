# R.I.S.O. - Contratto Dati e Architettura

**Versione:** 4.1
**Ultimo Aggiornamento:** 25 Maggio 2024
**Scopo:** Questo documento è la **Fonte di Verità Assoluta** e il **contratto dati** ufficiale tra l'App Tecnici e l'App Master Office.

---

### **REGOLE DI INGAGGIO PER L'INTELLIGENZA ARTIFICIALE (AI)**

**(Contenuto invariato)**

---

## Capitolo 0: Piano di Lavoro Corrente e Stato Sistema

**Stato Attuale: STABILE**
Tutte le funzionalità sono operative. L'architettura dati è stata consolidata.

### **INTERVENTO COMPLETATO: Refactoring Architettura Dati e Bugfix Critico**

*   **Problema:** È stato identificato un grave problema architetturale in cui più componenti ricaricavano autonomamente le anagrafiche da Firestore, creando ridondanza, inefficienza e un bug di build persistente (`SyntaxError: The requested module ... does not provide an export named 'MasterDataContext'`).
*   **Obiettivo:** Centralizzare il caricamento dei dati, eliminare le fonti multiple di verità, risolvere il bug di build e migliorare la stabilità e la manutenibilità dell'applicazione.
*   **Azioni Eseguite:**
    1.  **Centralizzazione:** È stato creato e consolidato un `MasterDataProvider` come unico responsabile del fetching di tutte le anagrafiche (tecnici, navi, clienti, tipi giornata, etc.).
    2.  **Separazione del Contesto:** La definizione del contesto è stata spostata nel file dedicato `src/contexts/MasterDataContext.ts` per chiarezza strutturale.
    3.  **Hook Standardizzato:** È stato introdotto l'hook custom `useMasterData.ts` come unico punto di accesso autorizzato e standard per consumare i dati master in tutta l'applicazione.
    4.  **Refactoring dei Componenti:** Tutti i componenti e gli hook che accedevano ai dati master (`useNewReportData`, `SettingsPage`, `GeneratedReportView`, `ReportMensileDialog`) sono stati refattorizzati per utilizzare esclusivamente `useMasterData`, eliminando le chiamate dirette a Firestore e l'uso scorretto di `useContext`.
    5.  **Risoluzione Bug:** Il `SyntaxError` persistente, causato da un'importazione errata nascosta in `SettingsPage.tsx`, è stato definitivamente risolto.
*   **Stato:** **COMPLETATO**. L'architettura dati è ora robusta, efficiente e coerente. L'applicazione è stabile.

### **PROCEDIMENTO ATTUALE: Implementazione Sistema di Notifiche basato su Firestore**

**(Contenuto invariato)**

---

## Capitolo 1: Schemi Dati Ufficiali (Fonte di Verità Assoluta)

**(Contenuto invariato)**

---

## Capitolo 2: App Tecnici - Interazioni con gli Schemi Dati

**(Contenuto invariato)**

---

## Capitolo 3: App Master Office - Interazioni con gli Schemi Dati

**(Contenuto invariato)**

---

## Capitolo 4: Domande e Risposte (FAQ)

**(Contenuto invariato)**
