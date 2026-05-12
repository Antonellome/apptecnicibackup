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

# Architettura "Local-First" e Specifiche Funzionali (Revisione del 24/07/2024)

## 1. Architettura di Base e Database Locale

L'app adotta un'architettura **"Local-First"**.

*   **Database Locale (IndexedDB):** L'app opera primariamente su un database locale che contiene **tutte** le collezioni necessarie: anagrafiche (navi, luoghi, veicoli, etc.), tecnici, rapportini e una collezione per le **tariffe**.
*   **Autonomia Operativa:** L'app è progettata per la massima utilizzabilità offline. La creazione, modifica e consultazione dei rapportini deve essere istantanea e avvenire sempre e solo tramite il database locale. La connessione a internet non deve mai essere un fattore bloccante per l'operatività quotidiana.
*   **Sincronizzazione con Firestore:** Esiste un sistema di sincronizzazione (`sync`) che opera in background e ha due compiti:
    1.  **Download Reattivo:** La sincronizzazione delle anagrafiche (clienti, navi, ecc.) **non è basata su un timer** (es. 24 ore). Al contrario, il sistema è **reattivo**: quando un dato su una collezione in Firestore viene modificato (es. un cliente viene aggiornato dall'app Master Office), il sistema forza l'aggiornamento di quella specifica collezione nel database locale dei dispositivi dei tecnici, garantendo dati sempre freschi senza attese.
    2.  **Upload:** Invia i rapportini creati o modificati in locale a Firestore, per renderli disponibili all'app Master Office.

## 2. Gestione Tariffe Personalizzate

*   **Tariffe Locali e Personalizzabili:** La tabella dei `tipiGiornata` e le relative tariffe sono a **uso esclusivo dell'app Tecnici**.
*   **Dati Iniziali:** L'app parte con una tabella di tariffe standard (definite nel codice come fallback).
*   **Modifica Locale:** Il tecnico può **modificare** queste tariffe in qualsiasi momento. Le modifiche vengono salvate **solo nel database locale** del suo dispositivo e non vengono sincronizzate con Firestore.
*   **Calcoli Locali:** La pagina "I Miei Report" utilizzerà i rapportini e questa tabella di tariffe (potenzialmente personalizzata) per eseguire tutti i calcoli dei costi direttamente sul dispositivo.

## 3. Policy di Conservazione Dati Locali

*   **Pulizia Automatica dei Rapportini:** Per ottimizzare lo spazio di archiviazione e mantenere le prestazioni del dispositivo, i rapportini salvati nel database locale che hanno una data **superiore a 3 mesi** devono essere automaticamente eliminati dall'app.

## 4. Specifiche Funzionali del Form Rapportino

1.  **Inserimento Ore Tecnico Responsabile:**
    *   Deve supportare una doppia modalità:
        *   **Orario:** Campi `inizio`, `fine`, `pausa`. I valori di default sono 07:30, 16:30 e 60 minuti.
        *   **Manuale:** Un singolo campo per inserire le ore totali.
2.  **Ereditarietà Ore per Altri Tecnici:**
    *   Quando si aggiungono altri tecnici, questi devono ereditare la **modalità** (orario o manuale) e i **valori** del tecnico responsabile.
    *   Deve essere possibile modificare gli orari/ore di ogni tecnico aggiunto in modo indipendente.
3.  **Logica di Calcolo Costi (da implementare localmente):**
    *   **Tariffe Standard di Partenza:**
        *   `Festivo`: Tariffa giornaliera 80€
        *   `Ferie`: Tariffa giornaliera 80€
        *   `Permesso`: Tariffa oraria 10€
        *   `Legge 104`: Tariffa oraria 10€
        *   `Ordinaria`: Tariffa oraria 10€
        *   `Straordinario`: Tariffa oraria 15€
        *   `Malattia`: Tariffa oraria 10€
        *   `Trasferta Italia`: Tariffa giornaliera 20€
        *   `Trasferta Europa`: Tariffa giornaliera 40€
        *   `Trasferta Extraeuropea`: Tariffa giornaliera 80€
    *   **Regole di Calcolo:**
        *   **Calcolo a Giornata:** `Ferie`, `Festivo`.
        *   **Calcolo a Ore:** `Permesso`, `Legge 104`, `Malattia`.
        *   **Calcolo Complesso (Ordinario/Straordinario):** Per `Ordinaria` e le `Trasferte`, il calcolo deve funzionare così:
            1.  Le prime 8 ore sono considerate `Ordinarie` (tariffa oraria di 10€).
            2.  Le ore che eccedono le 8 sono considerate `Straordinario` (tariffa oraria di 15€).
            3.  Se il `tipoGiornata` è `Straordinario` puro, tutte le ore vengono calcolate con la tariffa oraria di 15€.
            4.  Per le `Trasferte`, si somma la tariffa giornaliera della trasferta specifica al calcolo delle ore (ordinarie + straordinarie).
4.  **Campo Veicolo:**
    *   Il dropdown dei veicoli deve essere corretto per evitare di mostrare "undefined". Deve visualizzare le informazioni in formato **"Marca Modello - Targa"** (es. "Fiat Doblò - AB123CD").
5.  **Compatibilità Dati con App Master:**
    *   Nonostante i calcoli e le tariffe locali, l'oggetto `rapportino` che viene sincronizzato con Firestore **deve** rimanere compatibile con la struttura dati che l'app Master Office si aspetta di leggere (come da riferimento nel blueprint).
6.  **Integrità della Firma:**
    *   La funzionalità di firma digitale nel form non deve essere rimossa o alterata.

---

# Riferimento Estetico Form App Tecnici (da NON MODIFICARE)
```tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Paper, Typography, TextField, FormControl, InputLabel, Select, MenuItem,
    Switch, FormControlLabel, Autocomplete, Button, CircularProgress, Alert, Divider, Box,
    Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Chip
} from '@mui/material';
import Grid from '@mui/material/Grid';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ShareIcon from '@mui/icons-material/Share';
import BorderColorIcon from '@mui/icons-material/BorderColor';
import SignatureCanvas from 'react-signature-canvas';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { it } from 'date-fns/locale';
import { isSameMonth, subMonths, format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useMasterData } from '@/hooks/useMasterData';
import { db as firestoreDb } from '@/firebase';
import { doc, getDoc, addDoc, updateDoc, collection, Timestamp } from 'firebase/firestore';
import { Rapportino, TipoGiornata, Tecnico, DettaglioOreTecnico } from '@/models/definitions';
import { aggiungiAllaCoda } from '@/services/offlineSync';
import { useSnackbar } from '@/contexts/SnackbarContext';
import OreLavoroSingoloTecnico from '@/components/Rapportini/OreLavoroSingoloTecnico';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ... (codice del form come da snapshot precedente)
```
    
---
    
# Riferimento Funzionale Form App Master Office (per coerenza dati)

```tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Paper, Typography, TextField, FormControl, InputLabel, Select, MenuItem,
    Switch, FormControlLabel, Autocomplete, Button, CircularProgress, Grid, Divider, Box,
    Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Chip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/it';
import { useAuth } from '@/contexts/AuthProvider';
import { useData } from '@/hooks/useData';
import { db } from '@/firebase';
import { doc, getDoc, addDoc, updateDoc, collection, Timestamp, serverTimestamp } from 'firebase/firestore';
import type { Rapportino, TipoGiornata, Tecnico } from '@/models/definitions';
import { useAlert } from '@/contexts/AlertContext';

// ... (codice del form come da snapshot precedente)
```

---

# Strategia di Test e Garanzia di Qualità (QA) - In Vigore dal 25/07/2024

Per garantire la stabilità dell'applicazione e prevenire regressioni (rotture di funzionalità esistenti) durante le fasi di correzione degli errori e di sviluppo futuro, viene adottata una strategia di test automatizzati a due livelli. L'obiettivo è sostituire il controllo manuale e la discussione reattiva con un processo di verifica automatico, rapido e affidabile.

## Livello 1: Test di Logica con Vitest (Lo Scudo della Logica)

*   **Scopo:** Proteggere il "cervello" dell'applicazione, ovvero le logiche di business critiche.
*   **Tecnologia:** `Vitest` + `React Testing Library`.
*   **Area di Copertura Primaria:** La funzione di calcolo dei costi nella pagina `MonthlyReportPage.tsx`.
*   **Modalità Operativa:** Verrà scritto un test unitario che fornisce al componente un set di dati di input predefinito (rapportini e tariffe fittizi) e verifica che l'output (il costo totale e i dettagli) corrisponda esattamente al risultato atteso, calcolato secondo le regole definite in questo blueprint. Questo test garantisce che la logica di calcolo non venga mai alterata accidentalmente.

## Livello 2: Test End-to-End con Playwright (Lo Scudo Visivo)

*   **Scopo:** Proteggere la "faccia" e le "mani" dell'applicazione, ovvero l'integrità visiva e l'interattività dei componenti fondamentali, con un focus maniacale sul form di inserimento dei rapportini.
*   **Tecnologia:** `Playwright`.
*   **Area di Copertura Primaria:** Il form di creazione/modifica dei rapportini (`ReportFormPage.tsx` e componenti figli).
*   **Modalità Operativa (Visual Regression Testing):**
    1.  **Screenshot d'Oro:** Verrà creato uno screenshot di riferimento (`form-rapportino-GOLD.png`) del form nello stato attuale e funzionante. Questo screenshot rappresenta il "modello di perfezione" visiva.
    2.  **Confronto Automatico:** Ad ogni esecuzione dei test, Playwright aprirà un browser, navigherà al form, scatterà un nuovo screenshot e lo confronterà, pixel per pixel, con lo screenshot d'oro.
    3.  **Fallimento Immediato:** Se anche un solo pixel è diverso, il test fallirà, segnalando immediatamente e in modo inequivocabile una regressione visiva. Questo impedisce qualsiasi modifica accidentale al layout, ai componenti o alla presentazione del form.

Questo approccio a doppio scudo ci permetterà di affrontare la correzione degli errori di build e lo sviluppo futuro con la massima sicurezza, eliminando il ciclo di "riparazione-rottura" e garantendo che le funzionalità chiave rimangano sempre stabili e funzionanti come previsto.

---

# DOCUMENTAZIONE UFFICIALE MIGRAZIONE MUI GRID V2 (NON MODIFICARE)

## Upgrade to Grid v2
This guide explains how and why to migrate from the GridLegacy component to the Grid component.

### Grid component versions

In Material UI v7, the GridLegacy component has been deprecated and replaced by Grid, which offers several new features as well as significant improvements to the developer experience. This guide explains how to upgrade from GridLegacy to Grid, and includes details for Material UI v5, v6, and v7.

### Why you should upgrade

Grid provides the following improvements over GridLegacy:

- It uses CSS variables, removing CSS specificity from class selectors. You can use sx prop to control any style you'd like.
- All grids are considered items without specifying the item prop.
- The offset feature gives you more flexibility for positioning.
- Nested grids now have no depth limitation.
- Its implementation doesn't use negative margins so it doesn't overflow like GridLegacy.

### How to upgrade

#### Prerequisites

Before proceeding with this upgrade:

- You must be on Material UI v5+.
- If you're in the process of upgrading your Material UI version, you should complete that upgrade first.

#### 1. Update the import

Depending on the Material UI version you are using, you must update the import as follows:

**v7 / v6**
```
// The legacy Grid component is named GridLegacy
-import Grid from '@mui/material/GridLegacy';

// The updated Grid component is named Grid
+import Grid from '@mui/material/Grid';
```
**v5**
```
// The legacy Grid component is named Grid
-import Grid from '@mui/material/Grid';

// The updated Grid component is named Grid
+import Grid from '@mui/material/Unstable_Grid2';
```

#### 2. Remove legacy props

The `item` and `zeroMinWidth` props have been removed in the updated Grid. You can safely remove them:

```diff
-<Grid item zeroMinWidth>
+<Grid>
```

#### 3. Update the size props

**Skip this step if you're using Material UI v5.**

In the `GridLegacy` component, the size props were named to correspond with the theme's breakpoints. For the default theme, these were `xs`, `sm`, `md`, `lg`, and `xl`.

Starting from Material UI v6, these props are renamed to `size` on the updated Grid:

```diff
 <Grid
-  xs={12}
-  sm={6}
+  size={{ xs: 12, sm: 6 }}
 >
```

If the size is the same for all breakpoints, then you can use a single value:

```diff
-<Grid xs={6}>
+<Grid size={6}>
```

Additionally, the `true` value for the size props was renamed to `"grow"`:

```diff
-<Grid xs>
+<Grid size="grow">
```

You can use the following codemod to update the size props:
`npx @mui/codemod@next v7.0.0/grid-props <path/to/folder>`
The codemod requires updating the imports beforehand.

#### 4. Opt in to legacy negative margins

**Skip this step if you're using Material UI v6 or v7.**

If you're using Material UI v5 and want to apply the negative margins similar to `GridLegacy`, specify `disableEqualOverflow={true}` on the grid container. To apply to all grids, add the default props to the theme:
```javascript
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Grid from '@mui/material/Unstable_Grid2';

const theme = createTheme({
  components: {
    MuiGrid2: {
      defaultProps: {
        // all grids under this theme will apply
        // negative margin on the top and left sides.
        disableEqualOverflow: true,
      },
    },
  },
});

function Demo() {
  return (
    <ThemeProvider theme={theme}>
      <Grid container>...grids</Grid>
    </ThemeProvider>
  );
}
```

### Common issues

#### Column direction
Using `direction="column"` or `direction="column-reverse"` is not supported on `GridLegacy` nor on the updated Grid. If your layout used `GridLegacy` with these values, it might break when you switch to the updated Grid. If you need a vertical layout, follow the instructions in the Grid documentation.

#### Container width
The updated Grid component doesn't grow to the full width of the container by default. If you need the grid to grow to the full width, you can use the `sx` prop:
```diff
-<GridLegacy container>
+<Grid container sx={{ width: '100%' }}>

 // alternatively, if the Grid's parent is a flex container:
-<GridLegacy container>
+<Grid container sx={{ flexGrow: 1 }}>
```

#### Codemod not covering wrapped Grid components
The provided codemods won't cover Grid components which are wrapped in other components or styled:
```javascript
// The codemod won't cover StyledGrid
const StyledGrid = styled(Grid)({
  // styles
});

// The codemod won't cover WrappedGrid
const WrappedGrid = (props) => <Grid {...props} />;
```
You'll need to manually update these components.
