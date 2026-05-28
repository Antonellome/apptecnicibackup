# Protocollo di Risoluzione Finale: Analisi e Piano d'Attacco

Questo documento è la nostra unica fonte di verità per raggiungere l'obiettivo: **0 errori di build e deploy dell'applicazione.**

Ogni mia azione sarà documentata qui.

---

## LA REGOLA SOVRANA: IL BUILD SINGOLO (IMPOSTA DAL COMANDO)

**DA QUESTO MOMENTO, IL PROTOCOLLO È IL SEGUENTE:**

1.  **IDENTIFICA UN SINGOLO ERRORE:** Prendo il primo errore dalla lista.
2.  **CORREGGI:** Applica la modifica **solo per quell'errore**.
3.  **BUILD:** Eseguo `npm run build`.
4.  **VERIFICA:** 
    - Se il numero totale di errori è diminuito, la modifica è approvata. Aggiorno il blueprint e passo all'errore successivo.
    - Se il numero di errori rimane uguale o aumenta, la modifica è un fallimento. Eseguo `git reset --hard` per annullarla immediatamente, documento il fallimento e ri-analizzo il problema da capo.

**Non sono ammesse deviazioni da questa regola.**

---

## FASE 2: ESECUZIONE POST-CORREZIONE `AnagraficaForm.tsx`

**Azione:** Corretti 8 errori `TS2339` in `AnagraficaForm.tsx` sostituendo `field.id` con `field.name`.
**Risultato:** Successo. Il numero di errori è sceso da 136 a 117.

### Lista Nemici Aggiornata: Errori di Build (117 Errori)

```
src/components/ProvidersWrapper.tsx(7,28): error TS2307: Cannot find module './AppInitializer' or its corresponding type declarations.
src/components/Rapportini/MonthlyReportGrid.tsx(23,54): error TS2339: Property 'getDate' does not exist on type 'Date | Timestamp'.
  Property 'getDate' does not exist on type 'Timestamp'.
src/components/Rapportini/MonthlyReportGrid.tsx(26,40): error TS18048: 'reportForDay.tipoGiornata' is possibly 'undefined'.
src/components/Rapportini/OreLavoroSingoloTecnico.tsx(4,91): error TS6133: 'TextField' is declared but its value is never read.
src/components/Rapportini/OreLavoroSingoloTecnico.tsx(67,86): error TS2352: Conversion of type 'number' to type 'string' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
src/components/Rapportini/PdfPreviewDialog.tsx(72,65): error TS2339: Property 'toDate' does not exist on type 'Date | Timestamp'.
  Property 'toDate' does not exist on type 'Date'.
src/components/Rapportini/ReportMensileDialog.tsx(26,31): error TS2345: Argument of type 'Date | Timestamp' is not assignable to parameter of type 'string | number | Date'.
  Type 'Timestamp' is not assignable to type 'string | number | Date'.
    Type 'Timestamp' is missing the following properties from type 'Date': toDateString, toTimeString, toLocaleDateString, toLocaleTimeString, and 36 more.
src/components/Rapportini/ReportMensileDialog.tsx(31,26): error TS18048: 'report.tipoGiornata' is possibly 'undefined'.
src/components/Rapportini/ReportMensileDialog.tsx(31,67): error TS18048: 'report.tipoGiornata' is possibly 'undefined'.
src/components/Rapportini/ReportMensileDialog.tsx(34,83): error TS2339: Property 'destinazione' does not exist on type 'EnrichedRapportino'.
src/components/Rapportini/ReportMensileDialog.tsx(41,31): error TS2339: Property 'id' does not exist on type 'string'.
src/components/Rapportini/ReportMensileDialog.tsx(42,56): error TS2339: Property 'cognome' does not exist on type 'string'.
src/components/Rapportini/ReportMensileDialog.tsx(42,74): error TS2339: Property 'nome' does not exist on type 'string'.
src/components/ReportMensileDialog.tsx(53,57): error TS18048: 'impostazioni' is possibly 'undefined'.
src/components/ReportMensileDialog.tsx(57,42): error TS18048: 'report.tipoGiornata' is possibly 'undefined'.
src/components/ReportMensileDialog.tsx(81,27): error TS2339: Property 'unita' does not exist on type 'TariffaLocale'.
src/components/ReportMensileDialog.tsx(83,38): error TS2339: Property 'costo' does not exist on type 'TariffaLocale'.
src/components/ReportMensileDialog.tsx(88,33): error TS2339: Property 'costo' does not exist on type 'TariffaLocale'.
src/components/ReportMensileDialog.tsx(94,128): error TS2339: Property 'unita' does not exist on type 'TariffaLocale'.
src/components/ReportMensileDialog.tsx(96,52): error TS2339: Property 'costo' does not exist on type 'TariffaLocale'.
src/components/layout/MainLayout.tsx(25,11): error TS6133: 'rapportiniInSospeso' is declared but its value is never read.
src/components/notifiche/NotificationItem.tsx(77,25): error TS2339: Property 'message' does not exist on type 'Notifica'.
src/contexts/AuthContext.tsx(52,23): error TS2322: Type '{ id: string; nome: string; } | undefined' is not assignable to type 'string | undefined'.
  Type '{ id: string; nome: string; }' is not assignable to type 'string'.
src/contexts/MasterDataProvider.tsx(52,11): error TS2322: Type '(Tariffa | { id: string; tipoGiornataId: string; nome: string; costo: number; unita: "g" | "h"; })[]' is not assignable to type 'TariffaLocale[]'.
  Type 'Tariffa | { id: string; tipoGiornataId: string; nome: string; costo: number; unita: "g" | "h"; }' is not assignable to type 'TariffaLocale'.
    Property 'tariffa' is missing in type '{ id: string; tipoGiornataId: string; nome: string; costo: number; unita: "g" | "h"; }' but required in type 'TariffaLocale'.
src/contexts/MasterDataProvider.tsx(59,66): error TS2339: Property 'costo' does not exist on type 'Tariffa'.
src/contexts/MasterDataProvider.tsx(59,91): error TS2339: Property 'unita' does not exist on type 'Tariffa'.
src/contexts/MasterDataProvider.tsx(85,11): error TS2741: Property 'id' is missing in type '{ tariffe: TariffaLocale[]; }' but required in type 'Impostazioni'.
src/contexts/MasterDataProvider.tsx(111,41): error TS6133: 'isForcedRefresh' is declared but its value is never read.
src/contexts/MasterDataProvider.tsx(164,58): error TS2322: Type '{ message: string; }' is not assignable to type 'IntrinsicAttributes'.
  Property 'message' does not exist on type 'IntrinsicAttributes'.
src/contexts/MasterDataProvider.tsx(187,47): error TS2322: Type '{ message: string; }' is not assignable to type 'IntrinsicAttributes'.
  Property 'message' does not exist on type 'IntrinsicAttributes'.
src/contexts/NotificationContext.tsx(84,50): error TS2339: Property 'id' does not exist on type 'string'.
src/hooks/useCollectionData.tsx(55,37): error TS2322: Type 'T[]' is not assignable to type 'never[]'.
  Type 'T' is not assignable to type 'never'.
    Type 'DocumentData' is not assignable to type 'never'.
src/hooks/useFcmToken.ts(3,10): error TS6133: 'getMessaging' is declared but its value is never read.
src/hooks/useGlobalData.tsx(2,48): error TS2305: Module '"firebase/firestore"' has no exported member 'QueryConverter'.
src/hooks/useGlobalData.tsx(83,19): error TS2322: Type '{ nome?: string | undefined; }[]' is not assignable to type 'T[]'.
  Type '{ nome?: string | undefined; }' is not assignable to type 'T'.
    'T' could be instantiated with an arbitrary type which could be unrelated to '{ nome?: string | undefined; }'.
src/hooks/useGlobalData.tsx(102,19): error TS2322: Type '{ nome?: string | undefined; }[]' is not assignable to type 'T[]'.
  Type '{ nome?: string | undefined; }' is not assignable to type 'T'.
    'T' could be instantiated with an arbitrary type which could be unrelated to '{ nome?: string | undefined; }'.
src/pages/MonthlyReportPage.tsx(6,3): error TS6133: 'CircularProgress' is declared but its value is never read.
src/pages/MonthlyReportPage.tsx(7,3): error TS6133: 'Alert' is declared but its value is never read.
src/pages/MonthlyReportPage.tsx(82,20): error TS2352: Conversion of type '{ data: Date; tipoGiornata: TipoGiornata | { id: string; nome: string; colore: string; sigla: string; }; presenze: Tecnico[]; oreGiorno: number; nome: string; tecnicoId: string; ... 19 more ...; id: string; }' to type 'EnrichedRapportino' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Types of property 'presenze' are incompatible.
    Type 'Tecnico[]' is not comparable to type 'string[]'.
      Type 'Tecnico' is not comparable to type 'string'.
src/pages/MonthlyReportPage.tsx(84,32): error TS2769: No overload matches this call.
  Overload 1 of 4, '(value: string | number | Date): Date', gave the following error.
    Argument of type 'Date | Timestamp' is not assignable to parameter of type 'string | number | Date'.
      Type 'Timestamp' is not assignable to type 'string | number | Date'.
        Type 'Timestamp' is missing the following properties from type 'Date': toDateString, toTimeString, toLocaleDateString, toLocaleTimeString, and 36 more.
  Overload 2 of 4, '(value: string | number): Date', gave the following error.
    Argument of type 'Date | Timestamp' is not assignable to parameter of type 'string | number'.
      Type 'Date' is not assignable to type 'string | number'.
src/pages/MonthlyReportPage.tsx(95,25): error TS18048: 'masterData.impostazioni' is possibly 'undefined'.
src/pages/MonthlyReportPage.tsx(104,52): error TS18048: 'report.tipoGiornata' is possibly 'undefined'.
src/pages/MonthlyReportPage.tsx(105,73): error TS2339: Property 'unita' does not exist on type 'TariffaLocale'.
src/pages/MonthlyReportPage.tsx(113,33): error TS2339: Property 'unita' does not exist on type 'TariffaLocale'.
src/pages/MonthlyReportPage.tsx(114,47): error TS2339: Property 'costo' does not exist on type 'TariffaLocale'.
src/pages/MonthlyReportPage.tsx(117,42): error TS18048: 'report.tipoGiornata' is possibly 'undefined'.
src/pages/MonthlyReportPage.tsx(123,70): error TS2339: Property 'costo' does not exist on type 'TariffaLocale'.
src/pages/MonthlyReportPage.tsx(123,97): error TS2339: Property 'costo' does not exist on type 'TariffaLocale'.
src/pages/MonthlyReportPage.tsx(124,77): error TS2339: Property 'costo' does not exist on type 'TariffaLocale'.
src/pages/MonthlyReportPage.tsx(125,105): error TS2339: Property 'costo' does not exist on type 'TariffaLocale'.
src/pages/MonthlyReportPage.tsx(129,70): error TS2339: Property 'costo' does not exist on type 'TariffaLocale'.
src/pages/MonthlyReportPage.tsx(132,63): error TS2339: Property 'costo' does not exist on type 'TariffaLocale'.
src/pages/MonthlyReportPage.tsx(137,61): error TS18048: 'report.tipoGiornata' is possibly 'undefined'.
src/pages/MonthlyReportPage.tsx(137,96): error TS18048: 'report.tipoGiornata' is possibly 'undefined'.
src/pages/MonthlyReportPage.tsx(137,130): error TS18048: 'report.tipoGiornata' is possibly 'undefined'.
src/pages/MonthlyReportPage.tsx(137,229): error TS2339: Property 'unita' does not exist on type 'TariffaLocale'.
src/pages/MonthlyReportPage.tsx(141,50): error TS2339: Property 'unita' does not exist on type 'TariffaLocale'.
src/pages/MonthlyReportPage.tsx(142,37): error TS18048: 'report.tipoGiornata' is possibly 'undefined'.
src/pages/MonthlyReportPage.tsx(142,61): error TS2345: Argument of type '{ nome: string; colore: string | undefined; oreOrdinarie: number; oreStraordinario: number; costo: number; unita: any; giorni: number; }' is not assignable to parameter of type '{ nome: string; colore: string; oreOrdinarie: number; oreStraordinario: number; costo: number; unita: "g" | "h"; giorni: number; }'.
  Types of property 'colore' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.
src/pages/MonthlyReportPage.tsx(155,34): error TS2322: Type '{ message: string; }' is not assignable to type 'IntrinsicAttributes'.
  Property 'message' does not exist on type 'IntrinsicAttributes'.
src/pages/PresenzePage.tsx(98,34): error TS2339: Property 'tipo' does not exist on type 'DayInfo'.
src/pages/PresenzePage.tsx(101,25): error TS2339: Property 'tipo' does not exist on type 'DayInfo'.
src/pages/PresenzePage.tsx(103,40): error TS2339: Property 'ore' does not exist on type 'DayInfo'.
src/pages/PresenzePage.tsx(103,115): error TS2339: Property 'ore' does not exist on type 'DayInfo'.
src/pages/PresenzePage.tsx(111,81): error TS2339: Property 'tooltip' does not exist on type 'DayInfo'.
src/pages/PresenzePage.tsx(239,61): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type 'DayInfo'.
  No index signature with a parameter of type 'string' was found on type 'DayInfo'.
src/pages/ReportFormPage.test.tsx(90,32): error TS6133: 'db' is declared but its value is never read.
src/pages/ReportFormPage.tsx(23,84): error TS6133: 'SyncEvent' is declared but its value is never read.
src/pages/ReportFormPage.tsx(184,43): error TS2353: Object literal may only specify known properties, and 'autoHideDuration' does not exist in type 'ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<...>'.
src/pages/ReportFormPage.tsx(377,13): error TS2322: Type '{ tecnicoId: string; isManual: boolean; oraInizio: string; oraFine: string; pausa: number; ore: number; }[]' is not assignable to type 'DettaglioOreData[]'.
  Property 'nome' is missing in type '{ tecnicoId: string; isManual: boolean; oraInizio: string; oraFine: string; pausa: number; ore: number; }' but required in type 'DettaglioOreData'.
src/pages/ReportFormPage.tsx(491,39): error TS2739: Type '{ tecnicoId: string; ore: number; isManual: true; nome: string; }' is missing the following properties from type 'DettaglioOreData': oraInizio, oraFine, pausa
src/pages/ReportFormPage.tsx(598,26): error TS2339: Property 'condivisioniInSospeso' does not exist on type 'AppLocalDB'.
src/pages/ReportFormPage.tsx(876,17): error TS2322: Type '{ open: boolean; onClose: () => void; onConfirm: () => Promise<void>; title: string; message: string; }' is not assignable to type 'IntrinsicAttributes & ConfirmationDialogProps'.
  Property 'message' does not exist on type 'IntrinsicAttributes & ConfirmationDialogProps'.
src/pages/ReportListPage.tsx(16,3): error TS6133: 'IconButton' is declared but its value is never read.
src/pages/ReportListPage.tsx(163,31): error TS2339: Property 'getTime' does not exist on type 'Date | Timestamp'.
  Property 'getTime' does not exist on type 'Timestamp'.
src/pages/ReportListPage.tsx(163,50): error TS2339: Property 'getTime' does not exist on type 'Date | Timestamp'.
  Property 'getTime' does not exist on type 'Timestamp'.
src/pages/ReportListPage.tsx(172,17): error TS2339: Property 'isClickable' does not exist on type 'EnrichedRapportino'.
src/pages/ReportListPage.tsx(178,32): error TS2322: Type '{ message: string; }' is not assignable to type 'IntrinsicAttributes'.
  Property 'message' does not exist on type 'IntrinsicAttributes'.
src/pages/ReportListPage.tsx(230,41): error TS2339: Property 'isClickable' does not exist on type 'EnrichedRapportino'.
src/pages/ReportListPage.tsx(231,45): error TS2339: Property 'isClickable' does not exist on type 'EnrichedRapportino'.
src/pages/ReportListPage.tsx(235,44): error TS18048: 'report.tipoGiornata' is possibly 'undefined'.
src/pages/ReportListPage.tsx(236,40): error TS2339: Property 'isClickable' does not exist on type 'EnrichedRapportino'.
src/pages/ReportListPage.tsx(245,39): error TS2339: Property 'destinazione' does not exist on type 'EnrichedRapportino'.
src/pages/ReportListPage.tsx(246,50): error TS2345: Argument of type 'Date | Timestamp' is not assignable to parameter of type 'string | number | Date'.
  Type 'Timestamp' is not assignable to type 'string | number | Date'.
    Type 'Timestamp' is missing the following properties from type 'Date': toDateString, toTimeString, toLocaleDateString, toLocaleTimeString, and 36 more.
src/pages/SettingsPage.tsx(90,55): error TS2339: Property 'unita' does not exist on type 'Tariffa'.
src/pages/SettingsPage.tsx(90,87): error TS2339: Property 'costo' does not exist on type 'Tariffa'.
src/pages/SettingsPage.tsx(194,56): error TS2339: Property 'costo' does not exist on type 'TariffaLocale'.
src/pages/SettingsPage.tsx(202,53): error TS2339: Property 'unita' does not exist on type 'TariffaLocale'.
src/pages/admin/TecniciPage.tsx(68,28): error TS2352: Conversion of type '{ data: Date; tipoGiornata: TipoGiornata | { id: string; nome: string; colore: string; lavorativo: boolean; icona: string; sigla: string; }; presenze: Tecnico[]; tecnicoScrivente: Tecnico | undefined; ... 22 more ...; oreLavoro?: number; }' to type 'EnrichedRapportino' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Types of property 'presenze' are incompatible.
    Type 'Tecnico[]' is not comparable to type 'string[]'.
      Type 'Tecnico' is not comparable to type 'string'.
src/pages/admin/TecniciPage.tsx(106,28): error TS2339: Property 'tecnicoScrivente' does not exist on type 'EnrichedRapportino'.
src/pages/admin/TecniciPage.tsx(106,52): error TS2339: Property 'tecnicoScrivente' does not exist on type 'EnrichedRapportino'.
src/pages/admin/TecniciPage.tsx(106,82): error TS2339: Property 'tecnicoScrivente' does not exist on type 'EnrichedRapportino'.
src/pages/admin/TecniciPage.tsx(107,31): error TS18048: 'r.tipoGiornata' is possibly 'undefined'.
src/pages/admin/TecniciPage.tsx(108,35): error TS2345: Argument of type 'Date | Timestamp' is not assignable to parameter of type 'string | number | Date'.
  Type 'Timestamp' is not assignable to type 'string | number | Date'.
    Type 'Timestamp' is missing the following properties from type 'Date': toDateString, toTimeString, toLocaleDateString, toLocaleTimeString, and 36 more.
src/pages/admin/TecniciPage.tsx(163,80): error TS2339: Property 'id' does not exist on type 'string'.
src/pages/report/ReportListPage.tsx(2,52): error TS6133: 'useCallback' is declared but its value is never read.
src/pages/report/ReportListPage.tsx(28,42): error TS6133: 'Tecnico' is declared but its value is never read.
src/pages/report/ReportListPage.tsx(87,12): error TS2352: Conversion of type '{ id: string; data: Date; isEditable: boolean; tipoGiornata: {}; destinazione: {}; isOffline: any; nome: string; tecnicoId: string; tipoGiornataId: string; isTrasferta: boolean; oraInizio: string; ... 16 more ...; oreLavoro?: number; }' to type 'EnrichedRapportino' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Types of property 'tipoGiornata' are incompatible.
    Type '{}' is missing the following properties from type 'TipoGiornata': nome, tipo, id
src/pages/report/ReportListPage.tsx(100,9): error TS2339: Property 'isEditable' does not exist on type 'EnrichedRapportino'.
src/pages/report/ReportListPage.tsx(102,9): error TS2339: Property 'destinazione' does not exist on type 'EnrichedRapportino'.
src/pages/report/ReportListPage.tsx(116,11): error TS2339: Property 'data' does not exist on type 'MasterDataContextType'.
src/pages/report/ReportListPage.tsx(143,64): error TS2353: Object literal may only specify known properties, and 'isOffline' does not exist in type 'Rapportino'.
src/pages/report/ReportListPage.tsx(269,43): error TS2339: Property 'isEditable' does not exist on type 'EnrichedRapportino'.
src/pages/report/ReportListPage.tsx(270,47): error TS2339: Property 'isEditable' does not exist on type 'EnrichedRapportino'.
src/pages/report/ReportListPage.tsx(271,47): error TS2339: Property 'isEditable' does not exist on type 'EnrichedRapportino'.
src/pages/report/ReportListPage.tsx(275,41): error TS2339: Property 'isEditable' does not exist on type 'EnrichedRapportino'.
src/pages/report/ReportListPage.tsx(277,42): error TS18048: 'report.tipoGiornata' is possibly 'undefined'.
src/pages/report/ReportListPage.tsx(292,68): error TS2339: Property 'destinazione' does not exist on type 'EnrichedRapportino'.
src/pages/report/ReportListPage.tsx(295,52): error TS2345: Argument of type 'Date | Timestamp' is not assignable to parameter of type 'string | number | Date'.
  Type 'Timestamp' is not assignable to type 'string | number | Date'.
    Type 'Timestamp' is missing the following properties from type 'Date': toDateString, toTimeString, toLocaleDateString, toLocaleTimeString, and 36 more.
src/routes/ProtectedLayout.tsx(3,20): error TS6133: 'Outlet' is declared but its value is never read.
src/services/rapportinoPDFGenerator.ts(111,69): error TS2339: Property 'toDate' does not exist on type 'Date | Timestamp'.
  Property 'toDate' does not exist on type 'Date'.
src/utils/converters.ts(48,49): error TS2344: Type 'Veicolo' does not satisfy the constraint 'GenericItem'.
  Type 'Veicolo' is not assignable to type '{ [key: string]: any; nome: string; }'.
    Types of property 'nome' are incompatible.
      Type 'string | undefined' is not assignable to type 'string'.
        Type 'undefined' is not assignable to type 'string'.
src/utils/converters.ts(62,5): error TS2353: Object literal may only specify known properties, and 'veicoliUtilizzati' does not exist in type 'Omit<Rapportino, "id">'.
src/utils/converters.ts(75,51): error TS2344: Type 'Documento' does not satisfy the constraint 'GenericItem'.
  Property 'nome' is missing in type 'Documento' but required in type '{ [key: string]: any; nome: string; }'.
src/utils/fcm.ts(3,10): error TS2459: Module '"@/firebase"' declares 'app' locally, but it is not exported.
src/utils/fcm.ts(55,13): error TS2739: Type 'Date' is missing the following properties from type 'Timestamp': seconds, nanoseconds, toDate, toMillis, isEqual
src/utils/firebaseMessaging.ts(3,14): error TS2459: Module '"@/firebase"' declares 'app' locally, but it is not exported.
```
