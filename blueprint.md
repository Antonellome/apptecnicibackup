# REGOLA FONDAMENTALE: NON MODIFICARE MAI SENZA PRIMA CONTROLLARE.

---

# R.I.S.O. - Blueprint Applicazione Tecnici

Questo documento descrive le specifiche e i requisiti per l'applicazione "R.I.S.O." (Report Individuali Sincronizzati Online) per tecnici.

---

## Specifiche Funzionali

### 1. Dashboard/Home
- **Layout:** Griglia 2x2 con 4 tab di uguali dimensioni.
- **Tab:**
    - Nuovo report
    - Report
    - Report mensili
    - Note
- **Header:** Cornice blu con messaggio di benvenuto e email del tecnico.
- **Footer:** Cornice blu con la firma "by AS".

### 2. App Bar (Globale)
- **Titolo:** "R.I.S.O. App Tecnici"
- **Sottotitolo:** "Report Individuali Sincronizzati Online"
- **Icone (destra):**
    - Switch Tema (chiaro/scuro)
    - Notifiche (icona a campanella con badge contatore)
    - Impostazioni
    - Logout

### 3. Pagina Login
- Titolo e sottotitolo dell'applicazione.

### 4. Form "Nuovo Report"
- **Dati Principali:**
    - Data (selezionabile)
    - Tecnico loggato (non modificabile)
- **Calcolo Ore (Switch):**
    - Opzione 1: Ore inizio-fine-pausa (con default 7:30-16:30-60 min). Selettori per orari, non testo libero.
    - Opzione 2: Ore lavorate totali (con default 8).
- **Riferimenti (da database):**
    - Tipo giornata
    - Veicolo
    - Nave
    - Luogo
- **Dettagli Intervento:**
    - Breve descrizione
    - Lavoro eseguito
    - Materiali impiegati
- **Collaboratori:**
    - Sezione per aggiungere altri tecnici.

### 5. Pagina Report
- Lista di tutti i report inviati.
- Funzionalità di ricerca intelligente per data, nave, luogo, etc.

### 6. Pagina Report Mensili
- **Logica Dati Locale:** La pagina opererà esclusivamente con i dati dei rapportini già presenti nell'app, senza interrogare il database, per garantire massima reattività.
- **Filtro Globale:** In cima alla pagina, selettori per Mese e Anno permetteranno di filtrare i dati visualizzati in entrambe le sezioni sottostanti.
- **Sezione 1: Resoconto Analitico**
    - **Descrizione:** Una tabella dettagliata per l'analisi delle attività mensili.
    - **Tabella:** Colonne: `Data`, `Tipo Giornata`, `Ore Lavorate`.
    - **Interattività:** Ogni riga sarà cliccabile per aprire una vista di sola lettura del rapportino di riferimento, con un pulsante per tornare alla tabella.
    - **Riepilogo e Calcoli:** In fondo alla tabella verranno mostrati i totali:
        - **Totale Ore** per tipo di giornata (es. "Lavoro Ordinario: 40 ore").
        - **Totale Guadagni** per tipo di giornata (calcolati in base alle tariffe in Impostazioni).
        - **Gran Totale Ore** e **Gran Totale Guadagni** del mese.
- **Sezione 2: Calendario Mensile Interattivo**
    - **Descrizione:** Una vista calendario per una comprensione visiva e immediata del mese.
    - **Visualizzazione:** Ogni giorno del mese sarà una cella. I giorni con un rapportino associato saranno evidenziati con un colore specifico per il `Tipo Giornata` (es. verde per lavoro, giallo per ferie).
    - **Interattività:** Cliccando su un giorno evidenziato si aprirà la stessa vista di dettaglio del rapportino della sezione tabella, con un pulsante per tornare al calendario.

### 7. Pagina Note
- Visualizzazione note in entrata e in uscita.
- Funzionalità per creare una nuova nota con titolo e corpo.
- Integrazione con app "master" per invio e ricezione.

### 8. Pagina Impostazioni
- **Gestione Tariffe Orarie:**
    - Una lista dei `Tipi Giornata` presenti nei rapportini.
    - Accanto a ogni voce, un campo per inserire la tariffa oraria.
    - **Default:** Valore preimpostato a **10€/ora** per ogni tipo. Le tariffe saranno salvate localmente.
- **Guida all'Uso dell'App:**
    - Una sezione testuale, magari espandibile, che spiega le funzionalità principali dell'applicazione al tecnico.
- **Recupero Password:**
    - Un campo per inserire l'email e un pulsante "Invia Link di Reset" per avviare la procedura di cambio password di Firebase Authentication.
- **Backup Report Mensili:**
    - Un selettore per il mese/anno.
    - Un pulsante "Esporta in PDF" per generare e scaricare un PDF del resoconto analitico di quel mese.

### 9. Pagina Notifiche
- Elenco di tutte le notifiche in ordine cronologico inverso (dalla più recente).
- Le notifiche non lette devono avere uno stile differente (es. sfondo evidenziato).
- All'apertura della pagina, le notifiche visualizzate vengono marcate come "lette" e il contatore nel badge dell'AppBar si azzera.

---

## Specifiche Tecniche e di Stile

- **Color Palette:**
    - Sfondo: Nero o blu notte.
    - Testi: Blu e bianco.
    - Icone: Bianche.
    - Colore supplementare: Grigio.
