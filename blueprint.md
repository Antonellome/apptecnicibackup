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

# Architettura "Local-First" e Specifiche Funzionali (dal 24/07/2024)

## 1. Architettura di Base e Database Locale

L'app adotta un'architettura **"Local-First"**.

*   **Database Locale (IndexedDB):** L'app opera primariamente su un database locale che contiene **tutte** le collezioni necessarie: anagrafiche (navi, luoghi, veicoli, etc.), tecnici, rapportini e una nuova collezione per le **tariffe**.
*   **Autonomia Operativa:** Grazie a questo database, l'app è in grado di funzionare in modo quasi completamente autonomo, anche per funzionalità complesse come il calcolo dei costi nei report.
*   **Sincronizzazione con Firestore:** Esiste un sistema di sincronizzazione (`sync`) che ha due compiti:
    1.  **Download:** Aggiornare le collezioni del database locale (le anagrafiche) con i dati più recenti provenienti da Firestore.
    2.  **Upload:** Inviare i rapportini creati o modificati in locale a Firestore, per renderli disponibili all'app Master Office.

## 2. Gestione Tariffe Personalizzate

*   **Tariffe Locali e Personalizzabili:** La tabella dei `tipiGiornata` e le relative tariffe sono a **uso esclusivo dell'app Tecnici**.
*   **Dati Iniziali:** L'app parte con una tabella di tariffe standard.
*   **Modifica Locale:** Il tecnico può **modificare** queste tariffe in qualsiasi momento. Le modifiche vengono salvate **solo nel database locale** del suo dispositivo e non vengono sincronizzate con Firestore.
*   **Calcoli Locali:** La pagina "I Miei Report" utilizzerà i rapportini e questa tabella di tariffe (potenzialmente personalizzata) per eseguire tutti i calcoli dei costi direttamente sul dispositivo.

## 3. Specifiche Funzionali del Form Rapportino

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
