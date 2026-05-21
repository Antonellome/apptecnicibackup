# Build & Modifiche Log

Questo documento traccia tutti gli errori rilevati durante la fase di build e tutte le modifiche apportate al codice. Serve come registro per poter tornare a una versione precedente in caso di problemi.

---

## REGOLE OPERATIVE FONDAMENTALI (DA NON MODIFICARE)

### 1. Regola del "CIAO"
Ogni mia singola risposta **DEVE** iniziare con la parola `CIAO.`. Non ci sono eccezioni.

### 2. Regola della Stabilità Visiva (Divieto Assoluto di Modifiche Estetiche)
- Mi è **SEVERAMENTE E CATEGORICAMENTE VIETATO** cambiare, alterare o modificare qualsiasi parte visiva o strutturale dell'applicazione (pagine, form, testi, UI, UX, stili, layout, colori, font, ecc.).
- Posso modificare **SOLO** le logiche interne (funzioni, gestione dati, algoritmi).
- Se una modifica alla logica rischia di avere un impatto, anche accidentale, sulla struttura, **DEVO** seguire questa procedura:
    1.  **Analisi Preliminare:** Studiare il codice esistente nell'area di intervento.
    2.  **Esecuzione:** Applicare la modifica.
    3.  **Verifica Postuma:** Ricontrollare l'area modificata per assicurarsi che la struttura sia rimasta intatta.

---

## Log Errori di Build

**Errori Rilevati: 7** (Build fallita in data 01/08/2024)

1.  **`src/pages/admin/TecniciPage.tsx`**: (`TS6133`) Variabile `tecniciMap` dichiarata ma non utilizzata.
2.  **`src/routes/ProtectedLayout.tsx`**: (`TS6133`) Componente `Outlet` importato ma non utilizzato.
3.  **`src/services/dataSync.ts`**: (`TS2344`) Il tipo `Impostazioni` non soddisfa il vincolo `{ id: string; }` perché manca la proprietà `id`.
4.  **`src/services/dataSync.ts`**: (`TS2503`) Namespace `NodeJS` non trovato.
5.  **`src/utils/converters.ts`**: (`TS2305`) Il modulo `@/models/definitions` non esporta il membro `Report`.
6.  **`src/utils/fcm.ts`**: (`TS6133`) `useNotifications` importato ma non utilizzato.
7.  **`src/utils/fcm.ts`**: (`TS7006`) Il parametro `addNotification` ha implicitamente un tipo `any`.

---

## Log Modifiche

- **2024-08-01 (Correzione Build):** Corretto l'errore di build in `src/pages/ReportFormPage.tsx` sostituendo le prop `xs` e `md` con la nuova sintassi `size` per il componente `Grid` di Material-UI.

- **2024-07-31 (Sessione di Debug Build - Fase Finale):** Risolti tutti i 44 errori di build rimanenti. Il progetto compilava con successo.
    - **`src/components/notifiche/NotificationItem.tsx`:** Risolti 4 errori.
    - **`src/contexts/NotificationContext.tsx`:** Rimosso import non utilizzato.
    - **`src/components/Rapportini/OreLavoroSingoloTecnico.tsx`:** Corretto errore di tipo.
    - **`src/pages/SettingsPage.tsx`:** Rimosso import non utilizzato.
    - **`src/pages/ReportFormPage.test.tsx`:** Risolti 4 errori di variabili non utilizzate.
    - **`src/pages/ReportFormPage.tsx`:** Risolti 3 errori di tipo.
    - **`src/pages/ReportListPage.tsx`:** Risolti 2 errori di tipo.

- **2024-07-31 (Pulizia Codice):** Rimossa logica di sincronizzazione periodica obsoleta.
- **2024-07-30 (Sessione di Debug Build - Fase 4):** Risolti 3 errori in `src/pages/PresenzePage.tsx`.
- **2024-07-29 (Sessione di Debug Build - Fase 2):** Rimossi import non utilizzati.
- **2024-07-29 (Sessione di Debug Build - Fase 1):** Iniziata la risoluzione di 82 errori di tipo.
- **2024-07-29 (Sessione di Debug Test):** Risoluzione ambiente `vitest`.
- **2024-07-29:** Correzioni varie in `OreLavoroSingoloTecnico.test.tsx`, `GeneratedReportView.tsx`, `PrintableTechnicianList.tsx`, `main.tsx`.
