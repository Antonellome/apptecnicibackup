
# Analisi e Blueprint del Progetto Tecnico

## 0. Stato Attuale del Progetto (25/07/2024)

**OBIETTIVO**: Raggiungere zero errori di compilazione per preparare l'applicazione per il deploy in hosting.

**STATO**: **IN CORSO**. Il numero di errori è stato ridotto da **120+** a **66**.

### Correzioni Recenti

*   **Stabilizzazione del Modello Dati**: Riscritto il file `src/models/definitions.ts` per allineare le interfacce TypeScript all'uso reale dei dati nei componenti, risolvendo la maggior parte degli errori di tipo.

---

## 1. Architettura e Flusso Dati (Analisi Completata)

L'architettura è una PWA Offline-First con una chiara separazione tra la cache dei dati master e la coda di sincronizzazione. La logica di business è suddivisa tra la raccolta dati (`ReportFormPage`) e il calcolo economico (`MonthlyReportPage`).

---

## 2. Protocollo di Risoluzione Finale

1.  **Analisi dell'Errore**: Affrontare il primo errore nella lista di build.
2.  **Correzione Chirurgica**: Applicare una modifica mirata per risolvere quell'errore specifico.
3.  **Build di Verifica**: Eseguire `npm run build` dopo **ogni singola modifica**.
4.  **Validazione**: Se il numero totale di errori diminuisce, la modifica è **APPROVATA**.
5.  **Rollback**: Se il numero di errori non diminuisce, eseguire `git reset --hard` per annullare la modifica e rianalizzare il problema.
6.  **Aggiornamento**: Aggiornare questo blueprint con il nuovo stato dopo ogni modifica approvata.

---

## 3. Lista Nemici Attuale: Errori di Build (66 Errori)

```
src/components/ReportMensileDialog.tsx(53,57): error TS2769: No overload matches this call. ... (Type 'Tariffa' is missing the following properties from type 'TariffaLocale': costo, unita)
src/components/ReportMensileDialog.tsx(57,42): error TS18048: 'report.tipoGiornata' is possibly 'undefined'.
src/contexts/AuthContext.tsx(44,23): error TS2353: Object literal may only specify known properties, and 'id' does not exist in type 'UserProfile'.
src/contexts/MasterDataProvider.tsx(52,11): error TS2322: Type '(Tariffa | { ... })[]' is not assignable to type 'TariffaLocale[]'.
src/contexts/MasterDataProvider.tsx(57,66): error TS2339: Property 'costo' does not exist on type 'Tariffa'.
src/contexts/MasterDataProvider.tsx(57,91): error TS2339: Property 'unita' does not exist on type 'Tariffa'.
src/contexts/MasterDataProvider.tsx(81,11): error TS2741: Property 'id' is missing in type '{ tariffe: TariffaLocale[]; }' but required in type 'Impostazioni'.
...
(lista completa degli errori)
```
