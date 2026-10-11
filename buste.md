/**
 * ============================================================================
 * MOTORE DI CALCOLO ORARIO E MAGGIORAZIONI - CCNL METALMECCANICA INDUSTRIA
 * AGGIORNAMENTO LOGICA v2.0
 * ============================================================================
 *
 * --- NOVITÀ E REGOLE CHIAVE ---
 *
 * 1.  **CALCOLO STRAORDINARI AUTONOMO E SU BASE SETTIMANALE (REGOLA SOVRANA):**
 *     - Il sistema **NON SI BASA PIÙ** sul "tipo di giornata" inserito nel rapportino (es. "Straordinario").
 *     - Il calcolo è basato sulle ore **effettivamente lavorate** e raggruppate per settimana (Lunedì-Domenica).
 *     - Tutte le ore lavorate OLTRE la 40ª ora settimanale sono considerate **STRAORDINARIO** e maggiorate secondo le regole del CCNL.
 *     - Le ore di assenza retribuita (Ferie, ROL, etc.) contribuiscono al monte ore settimanale per il raggiungimento della soglia delle 40 ore, ma non possono essere considerate straordinario.
 *
 * 2.  **GESTIONE ISTITUTI DI ASSENZA AMPLIATA:**
 *     - **Legge 104:** Gestita come istituto separato. Dà diritto a 3 giorni di permesso retribuito al mese (24 ore totali), non erodono altri saldi.
 *     - **Malattia:** Tracciata e conteggiata, ma non diminuisce i saldi di Ferie, ROL o Permessi.
 *     - **Assenze Giornaliere:** Ferie, ROL, Permessi, Malattia, L.104, se inserite come "giornaliere", vengono conteggiate come 8 ore fisse.
 *
 * 3.  **SALDI INIZIALI E MATURAZIONE:**
 *     - È previsto un meccanismo per l'inserimento **una tantum** dei saldi residui (Ferie, ROL, Permessi) che il tecnico possiede al primo utilizzo.
 *     - Il sistema gestirà la maturazione mensile dei ratei di ferie e permessi.
 *
 * 4.  **CALCOLO MONETARIO:**
 *     - La valorizzazione economica del lavoro mensile (sia ore ordinarie che straordinarie con maggiorazione) deve usare come base di calcolo la **tariffa oraria ORDINARIA** definita nelle impostazioni locali del tecnico.
 *
 * ============================================================================
 * (Segue la definizione originale del CCNL per le maggiorazioni)
 * ============================================================================
 * Campo di applicazione: Aziende con oltre 15 dipendenti.
 * Inquadramento: Classificazione a 5/6 livelli (D1, D2, C1, C2, C3, B1, B2, B3, A1).
 * Orario di lavoro standard: 40 ore settimanali (8 ore/giorno su 5 giorni, Lun-Ven).
 * 
 * Regole integrate:
 * 1. Straordinario diurno infrasettimanale (+25% prime 2 ore, +30% successive).
 * 2. Straordinario di Sabato (+25% se <= 2 ore; se > 2 ore, TUTTE le ore vanno al +50%).
 * 3. Lavoro Festivo / Domenicale (+50% ordinario / +55% straordinario).
 * 4. Turni a cavallo della mezzanotte con scissione notturna:
 *    - Serale (20:00 - 22:00): +20% standard / +15% turnisti.
 *    - Pieno (22:00 - 06:00): +30% standard / +20% turnisti.
 *    - Sconfinamento Festivo: +60% notturno festivo.
 * 5. Compensazione Flessibile / Banca Ore:
 *    - Se ci sono 6 ore ordinarie e 3 di straordinario, 2 ore vanno a pareggio 1:1 
 *      sulle 8 ore base, MA la sola maggiorazione (+25%) viene liquidata in busta paga.
 * 6. Gestione Istituti di Assenza (Ferie: 160h/anno, ROL: 72h/anno, Ex-Festività: 16h/anno).
 * 7. Gestione Malattia CCNL Metalmeccanici:
 *    - Primi 3 giorni (Carenza): 100% a carico Azienda (senza toccare ROL/Ferie).
 *    - Dal 4° giorno in poi: Indennizzata INPS + Integrazione Azienda a copertura 100%.
 */

// ==========================================
// 1. TIPI E INTERFACCE DATI
// ==========================================

export type LivelloInquadramento = 
  | 'D1' | 'D2' 
  | 'C1' | 'C2' | 'C3' 
  | 'B1' | 'B2' | 'B3' 
  | 'A1';

export type TipoAssenza = 'FERIE' | 'ROL' | 'EX_FESTIVITA' | 'MALATTIA' | 'LEGGE_104' | 'BANCA_ORE';

export interface Dipendente {
  id: number;
  nome: string;
  cognome: string;
  livello: LivelloInquadramento;
  isTurnista: boolean;
  orarioSettimanaleContrattuale: number; // Default: 40
  anzianitaAnni: number;                 // Utile per comporto e scaglioni
}

export interface TimbratureGiornaliere {
  dipendenteId: number;
  data: string;                       // Formato: YYYY-MM-DD
  oraIngresso?: string;               // Formato: HH:mm
  oraUscita?: string;                 // Formato: HH:mm
  oreLavorateEffettive?: number;      // Opzionale se già calcolato
  oreTeorichePreviste: number;        // Default: 8.0
  isFestivo: boolean;
  isDomenica: boolean;
  isSabato: boolean;
  isFestivoGiornoSuccessivo?: boolean; // Per turni a cavallo che sconfinano in un festivo
}

export interface GiustificativoAssenza {
  dipendenteId: number;
  data: string;
  tipo: TipoAssenza;
  ore: number;
  giornoInizioMalattia?: boolean;     // True se 1° giorno dell'evento di malattia
  giornoMalattiaProgressivo?: number; // Es: 1, 2, 3 (Carenza), 4+ (INPS)
}

export interface SaldiContatori {
  dipendenteId: number;
  anno: number;
  saldoFerieOre: number;               // Residuo anno precedente + maturato
  saldoRolOre: number;                 // Residuo anno precedente + maturato
  saldoExFestivitaOre: number;         // Residuo anno precedente + maturato
  saldoBancaOre: number;
  giorniMalattiaAccumulatiAnno: number; // Accumulo per periodo di comporto
  giorniLegge104UsatiMese: number;      // Max 3 al mese
}

// ... (il resto del file rimane invariato)



ATTENZIONE sezione con maggiori spiegazioni:

Ecco la **Matrice Logica di Calcolo** e lo **Schema delle Dipendenze**, ripuliti da qualsiasi riferimento ai turni notturni o variabili.

Il modello si basa esclusivamente sull'**orario fisso aziendale**:

* **Orario Ordinario Teorico:** Lunedì – Venerdì, dalle **07:30 alle 16:30** (9 ore di presenza con **60 minuti di pausa** = **8 ore ordinarie nette/giorno**, pari a **40 ore settimanali**).
* **Finestra di lavoro ordinaria:** 07:30 – 16:30.
* **Soglia Straordinario Diurno:** Tutto ciò che viene svolto oltre le 8 ore nette giornaliere o fuori dalla finestra 07:30–16:30.

---

### 1. Albero di Precedenza e Flusso di Esecuzione dell'Algoritmo

L'app deve processare ogni giornata seguendo rigorosamente questa **gerarchia di priorità a 5 livelli (da P1 a P5)** per evitare sovrapposizioni o calcoli errati.

```
                  [ INPUT GIORNATA (Ingresso, Uscita, Assenze) ]
                                        │
                                        ▼
                         < P1: Tipo Giorno Solare? >
                          /          │          \
                 Lunedì–Venerdì    Sabato     Domenica / Festivo
                      │              │                   │
                      │              │                   ▼
                      │              │        [ P1.1: Straordinario Festivo ]
                      │              │        - 0-8h: Festivo Ord. (+50%)
                      │              │        - >8h: Straord. Festivo (+55%)
                      │              │                   │
                      │              ▼                   │
                      │   [ P1.2: Straordinario Sabato ] │
                      │   - <= 2h: Straord. (+25%)       │
                      │   - > 2h: TUTTE le ore al +50%   │
                      │              │                   │
                      ▼              └─────────┬─────────┘
         < P2: C'è Malattia Intera? >          │
           /                      \            │
         SÌ                        NO          │
         /                          \          │
[ P2.1: Malattia ]             [ P3: Calcolo Lavoro Effettivo ]
- 0h Lavorate / 8h Figurate    - Ore Presenza minus 60 min pausa
- gg 1-3: Carenza Ditta 100%   - Confronto vs 8.0 ore teoriche
- gg 4+: INPS + Integraz. Ditta        │
         │                             ▼
         │             < P4: C'è Debito (<8h) AND Straordinario (>16:30)? >
         │               /                                   \
         │             SÌ                                     NO
         │             /                                       \
         │  [ P4.1: Compensazione Banca Ore ]           [ P4.2: Imputazione Netta ]
         │  1. Ore Straord. coprono Debito 1:1          1. Ore <= 8h -> Paga Base 100%
         │  2. Liquidazione SOLO Maggiorazione +25%     2. Prime 2h oltre 16:30 -> +25%
         │  3. Rilascio ROL (non vengono scalati)       3. Oltre le 2h di straord -> +30%
         │             │                                       │
         └─────────────┼───────────────────────────────────────┘
                       │
                       ▼
         [ P5: Copertura Debito Residuo ]
         - Se rimane debito ordinario: scala dai ROL
         - Se ROL esauriti: Genera 'AnomaliaDebitoUncovered'

```

---

### 2. Tabella di Connessione e Risoluzione Conflitti tra le Regole

Questa tabella definisce le **regole di interazione** tra gli eventi della giornata per guidare lo sviluppo delle funzioni e dei test unitari nell'app.

| Regola A (Condizione di Ingresso) | Regola B (Evento Concorrente) | Connessione e Risoluzione Algoritmica | Risultato per la Busta Paga | Scalo Contatori ROL / Ferie |
| --- | --- | --- | --- | --- |
| **Pausa Pranzo 60 min** | Timbratura a cavallo delle 12:00 - 13:00 | L'app detrae sempre 60 minuti dal totale timbrato se la presenza copre la finestra di pausa. | Ore Nette = (Ora Uscita - Ora Ingresso) - 1.00h. | Nessun impatto. |
| **Carenza Orario Ordinario** <br>

<br>*(es. Lavorate 6 ore invece di 8)* | **Straordinario nello stesso giorno** <br>

<br>*(es. Lavorato dalle 16:30 alle 19:30 = 3h extra)* | **Intersezione Banca Ore (Regola 6h + 3h):** <br>

<br>Le prime 2 ore straordinarie compensano il debito di 2 ore sull'orario base (portando le ore ordinarie a 8.0). La 3ª ora resta straordinario puro. | • **8.0 ore** Paga Base 100% <br>

<br>• **2.0 ore** Solo Maggiorazione +25% <br>

<br>• **1.0 ora** Straordinario Intero (+30%) | **0 ore scalate dai ROL** *(il debito è stato assorbito dallo straordinario)*. |
| **Carenza Orario Ordinario** <br>

<br>*(es. Lavorate 6 ore)* | **Nessuno Straordinario svolto** | L'app rileva un `DebitoOrdinario` di 2.0 ore. Cerca capienza nel saldo ROL. | • **8.0 ore** Paga Base 100% (6h lavorate + 2h coperta da ROL). | **- 2.0 ore** dal saldo ROL del dipendente. |
| **Carenza Orario Ordinario** <br>

<br>*(es. Lavorate 6 ore)* | **Saldo ROL Insufficiente o Esaurito** | L'app copre le ore fino a capienza ROL, il residuo genera un'anomalia. | • Ore lavorate + ROL disponibili a Paga Base. | Saldo ROL azzerato (0.0). <br>

<br>Flag `AnomaliaDebitoUncovered` valorizzato con il residuo. |
| **Lavoro di Sabato** | **Durata $\le$ 2 ore** <br>

<br>*(es. dalle 07:30 alle 09:30)* | Il sabato non prevede orario ordinario teorico (0 ore teoriche). Le ore lavorate sono straordinario del sabato entro le 2 ore. | • **2.0 ore** Straordinario Diurno (+25%). | Nessun impatto sui ROL. |
| **Lavoro di Sabato** | **Durata $>$ 2 ore** <br>

<br>*(es. dalle 07:30 alle 11:30 = 4h)* | **Regola della Soglia Sabato CCNL:** Se lo straordinario di sabato supera le 2 ore, scatta il +50% su **TUTTE** le ore lavorate. | • **4.0 ore** Straordinario Sabato Esteso (+50%). *(Annulla il +25% sulle prime 2 ore)*. | Nessun impatto sui ROL. |
| **Malattia** | **Presenza di orario di lavoro** | La malattia prevale sulla timbratura. Copre l'intera giornata a 8.0 ore figurate. | • **8.0 ore** Malattia (100% Ditta se gg 1-3, INPS+Ditta se gg 4+). | **0 ore ROL/Ferie**. La malattia non intacca mai i contatori di ROL e Ferie. |

---

### 3. Matrice Input / Output per lo Sviluppatore (Test Case di Validazione)

Definizione dei casi di test da implementare per verificare la correttezza del motore di calcolo:

```json
[
  {
    "descrizione": "Caso Standard Infrasettimanale Invariato",
    "input": { "ingresso": "07:30", "uscita": "16:30", "pausaMinuti": 60, "giorno": "LUNEDI" },
    "outputAtteso": { "pagaBase": 8.0, "straordinario25": 0.0, "straordinario30": 0.0, "rolScalati": 0.0 }
  },
  {
    "descrizione": "Caso 6 Ore Ordinarie + 3 Ore Straordinario (Flessibilità / Banca Ore)",
    "input": { "ingresso": "07:30", "uscita": "19:30", "pausaMinuti": 60, "assenzaVolontaria": "2h_uscita_anticipata_dalle_14:30", "giorno": "MARTEDI" },
    "outputAtteso": { "pagaBase": 8.0, "bancaOreSolaMaggiorazione25": 2.0, "straordinario30": 1.0, "rolScalati": 0.0 }
  },
  {
    "descrizione": "Caso Straordinario Continuo Infrasettimanale (10 Ore Lavorate Nette)",
    "input": { "ingresso": "07:30", "uscita": "18:30", "pausaMinuti": 60, "giorno": "MERCOLEDI" },
    "outputAtteso": { "pagaBase": 8.0, "straordinario25": 2.0, "straordinario30": 0.0, "rolScalati": 0.0 }
  },
  {
    "descrizione": "Caso Sabato Oltre 2 Ore (Scatto Soglia 50%)",
    "input": { "ingresso": "07:30", "uscita": "11:30", "pausaMinuti": 0, "giorno": "SABATO" },
    "outputAtteso": { "pagaBase": 0.0, "straordinario25": 0.0, "straordinarioSabato50": 4.0, "rolScalati": 0.0 }
  }
]

```


ULTERIORE CHIARIMENTO E TATTICA: 

Capisco perfettamente la frustrazione: **il problema dell'app non è il codice, ma l'assenza di un "Modello Matematico Unificato"**.

Quando si sviluppa un software di gestione presenze, provare a gestire con dei semplici `if` il mix di **settimana spezzata a cavallo del mese**, **straordinari notturni**, **recupero del debito giornaliero** e **lavoro nel weekend** porta inevitabilmente a far fallire un calcolo per aggiustarne un altro.

Per risolvere definitivamente tutti e 5 i problemi, l'applicazione deve smettere di calcolare le ore "giorno per giorno in modo isolato" e deve adottare un **Algoritmo a 3 Layer Sequenziali**.

---

### IL MODELLO A 3 LAYER (Come deve ragionare l'App)

```
[ LAYER 1: Timbratura Grezza e Vettorizzazione ]
   └─ Converti ogni minuto lavorato in un "Vettore di Minuti" con attributi (Giorno, Ora, Notturno)

[ LAYER 2: Bilanciamento e Distribuzione (Debito vs Eccedenza) ]
   └─ Copri le 8h giornaliere -> Poi verifica le 40h settimanali -> Risolvi la Banca Ore (1:1)

[ LAYER 3: Valorizzazione delle Maggiorazioni (Spettanze Busta Paga) ]
   └─ Applica la % di maggiorazione corretta (Notturno, Straordinario, Festivo) sulle ore risultanti

```

---

### SOLUZIONE AI 5 PROBLEMI CRITICI

#### PROBLEMA 1: Le 8 ore giornaliere vs le 40 ore settimanali

* **Il dilemma:** Come si comportano le 8 ore del giorno con il totale delle 40 ore della settimana?
* **La regola di calcolo per l'App:**
1. Il debito/credito si calcola **PRIMA su base giornaliera** (soglia 8.00 ore nette).
2. Lo straordinario giornaliero (ore svolte oltre le 8.00 nella singola giornata) **non deve essere ricalcolato a fine settimana** se è già stato qualificato come straordinario giornaliero.
3. Il controllo delle 40 ore settimanali serve solo se un dipendente lavora, ad esempio, 4 giorni da 7 ore (28h) e il 5° giorno fa 12 ore: le ore oltre le 8 del 5° giorno sono straordinario giornaliero, ma il totale settimanale resta 40h.



---

#### PROBLEMA 2: Suddivisione dello straordinario (Ordinario vs Sabato/Domenica)

* **La regola di calcolo per l'App:** Il tipo di giorno (**Infrasettimanale, Sabato, Domenica/Festivo**) determina la "Tabella delle Maggiorazioni" da applicare allo straordinario:
* **Lunedì – Venerdì:** Prime 2 ore oltre le 8h $\rightarrow$ **+25%** | Dalla 3ª ora in poi $\rightarrow$ **+30%**.
* **Sabato:** Se il totale ore del sabato è $\le 2.00\text{h}$ $\rightarrow$ **+25%** | Se il totale ore supera le 2.00h $\rightarrow$ **+50% su TUTTE le ore del sabato**.
* **Domenica / Festivo:** Entro le 8h $\rightarrow$ **+50%** | Oltre le 8h $\rightarrow$ **+55%**.



---

#### PROBLEMA 3: Straordinari a cavallo della mezzanotte

* **La regola di calcolo per l'App (Principio dell'Ora di Inizio):**
1. Un turno o uno straordinario che inizia un giorno (es. Lunedì alle 22:00) e finisce il giorno dopo (es. Martedì alle 02:00) **appartiene interamente alla scheda presenze del giorno di INIZIO (Lunedì)**.
2. Ai fini del conteggio delle 8 ore giornaliere e delle 40 settimanali, le 4 ore lavorate contano per il Lunedì.
3. Ai fini della paga, la fascia **22:00 – 06:00** attiva il flag "Notturno" (+30%).



---

#### PROBLEMA 4: Straordinario notturno in una giornata con debito diurno (Il caso 7:30–16:30)

* **Il dilemma:** Il dipendente fa solo 6 ore diurne (dalle 07:30 alle 13:30, mancando 2 ore), ma poi torna la notte e fa 3 ore di straordinario notturno (22:00–01:00). Se uso 2 ore notturne per "coprire" le 2 ore diurne mancanti, perde la maggiorazione notturna?
* **LA SOLUZIONE MATEMATICA CORRETTA (Scomposizione del valore orario):**
Ogni ora di straordinario ha due componenti economiche: **[Paga Base (100%)]** + **[Maggiorazione %]**.
1. **Copertura del debito (1:1):** 2 delle 3 ore notturne vengono trasferite a copertura del debito ordinario diurno. Questo porta le ore ordinarie del giorno a **8.00 ore (Paga Base 100%)**.
2. **Conservazione della Maggiorazione Notturna:** L'applicazione **NON DEVE cancellare le caratteristiche dell'ora**. Anche se l'ora è usata per coprire l'ordinario, **la maggiorazione notturna (+30%) VA LIQUIDATA IN BUSTA PAGA**.
3. **Residuo:** La 3ª ora notturna viene liquidata per intero come **Straordinario Notturno (Paga Base + 50% di maggiorazione)**.



---

#### PROBLEMA 5: Settimane a cavallo tra due mesi (es. da Mercoledì 29 Aprile a Martedì 5 Maggio)

* **Il dilemma:** Come si calcolano le 40 ore settimanali se il mese finisce a metà settimana?
* **La regola di calcolo per l'App (Separazione tra Contabilità e Busta Paga):**
* **La Settimana Lavorativa è UNICA ed INSEPARABILE (Lunedì – Domenica)**.
* Il calcolo delle 40 ore settimanali e dei superamenti **si fa SEMPRE sull'intera settimana di 7 giorni**, a cavallo dei due mesi.
* Ai fini del cedolino paga del mese (es. Aprile), l'app estrae semplicemente i **risultati giornalieri valorizzati** che cadono nei giorni dal 1 al 30 di Aprile. I giorni di Maggio della stessa settimana andranno nel cedolino di Maggio, ma il totale settimanale (40h) considererà la somma di tutti i 7 giorni.



---

### TABELLA DI VERIFICA PER GLI SVILUPPATORI (MATRICE DEI CASI)

Usa questa tabella come "pietra di paragone" per testare la tua app:

| Scenario / Timbrature | Ore Lavorate Reali | Gestione Debito Ordinario | Assegnazione Straordinari | Maggiorazioni da Liquidare in Busta Paga |
| --- | --- | --- | --- | --- |
| **07:30 - 18:30** (1h pausa) <br>

<br>*(Infrasettimanale)* | 10.00 ore | 8.00h Ordinarie | 2.00h Straordinario Diurno | • 8.00h Paga Base 100% <br>

<br>• **2.00h Straordinario +25%** |
| **07:30 - 13:30** (6h) <br>

<br>+ **22:00 - 01:00** (3h notturne) | 9.00 ore | 6h lavorate + 2h recuperate da notte = **8.00h** | 1.00h Straordinario Notturno residuo | • 8.00h Paga Base 100% <br>

<br>• **2.00h Sola Maggiorazione Notturna (+30%)** <br>

<br>• **1.00h Straordinario Notturno (+50%)** |
| **Sabato: 07:30 - 11:30** (4h) | 4.00 ore | 0.00h Ordinarie | 4.00h Straordinario Sabato | • **4.00h Straordinario Sabato (+50%)** *(Supera le 2 ore)* |
| **Lunedì 29 - Mercoledì 31** (24h) <br>

<br>+ **Giovedì 1 - Venerdì 2** (16h) | 40.00 ore nella settimana | 24h nel mese corrente <br>

<br>16h nel mese successivo | 0.00h Straordinario | • Mese A: 24.00h Paga Base <br>

<br>• Mese B: 16.00h Paga Base |

---

### STRUTTURA DEL DATABASE PER RISOLVERE IL PROBLEMA

Per far funzionare questo modello, la tabella del database dove salvi il calcolo giornaliero deve avere questa struttura a campi separati:

```sql
CREATE TABLE calcolo_giornaliero (
    id INT PRIMARY KEY AUTO_INCREMENT,
    dipendente_id INT,
    data DATE,
    
    -- ORE BASE
    ore_paga_base DECIMAL(4,2),              -- Es. 8.00
    ore_debito_rol_scalati DECIMAL(4,2),     -- Es. 2.00 se usati i ROL
    
    -- STRAORDINARI INTERI (Paga Base + Maggiorazione)
    straordinario_diurno_25 DECIMAL(4,2),    -- Prime 2h infrasettimanali
    straordinario_diurno_30 DECIMAL(4,2),    -- Oltre 2h infrasettimanali
    straordinario_sabato_50 DECIMAL(4,2),    -- Sabato > 2h
    straordinario_notturno_50 DECIMAL(4,2),  -- Notturno oltre 8h
    
    -- MAGGIORAZIONI PURE (Solo quota % per ore usate a compensazione)
    maggiorazione_pura_notturna_30 DECIMAL(4,2), -- Ore notturne usate per coprire l'ordinario
    
    -- CONTROLLI E ANOMALIE
    anomalia_debito_scoperto DECIMAL(4,2)
);

```

Separando la **Paga Base** dalle **Maggiorazioni Pure**, l'app non sballerà mai più i calcoli, indipendentemente da quante ore notturne o straordinarie vengano usate per pareggiare la giornata.

Ecco esattamente lo stesso calcolo applicato al caso di **7 ore diurne lavorate** (dalle 07:30 alle 14:30) e **5 ore di straordinario notturno** (es. dalle 21:00 alle 02:00), per un totale di **12 ore lavorate nella giornata**.

---

### 1. Scomposizione Logica della Giornata (7h Diurne + 5h Notturne)

1. **Totale Ore Lavorate nella Giornata:** $7.00 \text{ (diurne)} + 5.00 \text{ (notturne)} = \mathbf{12.00 \text{ ore totali}}$.
2. **Debito Orario Ordinario Iniziale:** $8.00 \text{ (teoriche)} - 7.00 \text{ (lavorate)} = \mathbf{1.00 \text{ ora di debito}}$.
3. **Assorbimento del Debito (Banca Ore 1:1):**
* Basta prendere **soltanto la 1ª ora delle 5 notturne** per coprire l'unica ora ordinaria mancante.
* L'orario ordinario della giornata si chiude a **8.00 ore ordinarie (Paga Base 100%)**.
* I contatori ROL/Ferie **non vengono scalati** (0 ore usate).


4. **Scissione e Trattamento delle 5 Ore Notturne:**
* **La 1ª ora notturna (usata a copertura):** Completa la 8ª ora dell'orario base. Non è straordinario, ma è lavoro notturno ordinario $\rightarrow$ **Riceve la sola Maggiorazione Notturna (+30%)**.
* **Le 4 ore notturne rimanenti (Straordinario Netto):** Si trovano **oltre la soglia delle 8 ore giornaliere** (dalla 9ª alla 12ª ora della giornata) e diventano straordinario puro:
* **2ª e 3ª ora notturna** (9ª e 10ª ora della giornata = prime 2 ore di straordinario): scatta lo **Straordinario Notturno (+50%)**.
* **4ª e 5ª ora notturna** (11ª e 12ª ora della giornata = oltre la 2ª ora di straordinario): scatta lo **Straordinario Notturno Successivo (+50% o +55%)**.





---

### 2. Tabella di Output generata dall'App per Busta Paga e Database

| Campo Database / Voce Busta Paga | Ore | Motivazione e Trattamento Retributivo |
| --- | --- | --- |
| **`ore_paga_base`** | **8.00 h** | 7.00h diurne + 1.00h notturna spostata a completamento della 8ª ora base. |
| **`maggiorazione_pura_notturna_30`** | **1.00 h** | **Solo +30% Maggiorazione** per la 1ª ora notturna usata a coprire l'ordinario. |
| **`straordinario_notturno_12`** | **2.00 h** | **Paga Base + 50%** per le prime 2 ore di straordinario notturno netto (9ª e 10ª ora del giorno). |
| **`straordinario_notturno_success`** | **2.00 h** | **Paga Base + 50% (o 55%)** per la 3ª e 4ª ora di straordinario notturno netto (11ª e 12ª ora del giorno). |
| **`rol_scalati`** | **0.00 h** | Il saldo ROL rimane intatto. |

---

### 3. Confronto Diretto dei due Casi (6h vs 7h Diurne)

Mettendo a confronto i due scenari con 5 ore notturne svolte:

```
CASO A: 6h Diurne + 5h Notturne (11h Totali)
├─ 8.00h Paga Base          (6h diurne + 2h notturne)
├─ 2.00h Maggiorazione +30% (2h notturne per completare le 8h)
├─ 2.00h Straord. Notturno  (9ª e 10ª ora del giorno) -> +50%
└─ 1.00h Straord. Notturno  (11ª ora del giorno)        -> +50%/+55%

CASO B: 7h Diurne + 5h Notturne (12h Totali)
├─ 8.00h Paga Base          (7h diurne + 1h notturna)
├─ 1.00h Maggiorazione +30% (1h notturna per completare le 8h)
├─ 2.00h Straord. Notturno  (9ª e 10ª ora del giorno) -> +50%
└─ 2.00h Straord. Notturno  (11ª e 12ª ora del giorno)  -> +50%/+55%

```

---

### 4. La Regola d'Oro per la Logica dell'Algoritmo

L'algoritmo dell'applicazione deve seguire sempre questa equazione:

1. **`ore_notturne_a_30_percento`** = $\text{Minimo}(\text{Debito Ordinario}, \text{Ore Notturne Lavorate})$
2. **`ore_straordinario_notturno_netto`** = $\text{Ore Notturne Lavorate} - \text{ore\_notturne\_a\_30\_percento}$

altro esempio: 
Nel CCNL Metalmeccanica Industria e nella gestione della rilevazione presenze in Italia, quando una prestazione lavorativa (es. di **18 ore**) inizia di **Sabato** e prosegue a cavallo fino alla **Domenica**, l'applicazione deve applicare le seguenti regole contabili e retributive:

---

### 1. Come si visualizzano e registrano le ore? (Principio dell'Ora di Inizio)

Ai fini della **contabilità delle presenze e del cartellino orario**, l'intero blocco di 18 ore viene registrato e imputato alla **scheda presenze del Sabato** (il giorno solare in cui ha avuto inizio il turno).

* **Nel cartellino orario del dipendente:** Vedrai la timbratura d'ingresso del Sabato con totale **18.00 ore**.
* **Nel cartellino orario della Domenica:** Risulteranno **0.00 ore** (a meno che non inizi un secondo turno distinto nella giornata di domenica).

---

### 2. Come si dividono le Maggiorazioni tra Sabato e Domenica?

Anche se la presenza è imputata al Sabato, l'algoritmo di calcolo **DEVE scindere le ore dopo la mezzanotte (00:00)** per applicare le diverse maggiorazioni percentuali previste dal contratto.

Ipotizzando un turno di 18 ore che inizia il **Sabato alle 14:00** e termina la **Domenica alle 08:00**:

```
Sabato 14:00 ───► Sabato 22:00 (8h Diurne Sabato)
Sabato 22:00 ───► Sabato 24:00 (2h Notturne Sabato)
Domenica 00:00 ──► Domenica 06:00 (6h Notturne Festive)
Domenica 06:00 ──► Domenica 08:00 (2h Diurne Festive)

```

#### Scomposizione e Maggiorazioni Spettanti in Busta Paga

| Intervallo Orario | Ore | Qualificazione del Lavoro | Maggiorazione Spettante |
| --- | --- | --- | --- |
| **Sabato 14:00 - 22:00** | **8.00 h** | Straordinario Sabato Diurno (Supera le 2h) | **+50%** *(Scatto soglia sabato > 2 ore)* |
| **Sabato 22:00 - 24:00** | **2.00 h** | Straordinario Sabato Notturno | **+50%** *(Straordinario notturno)* |
| **Domenica 00:00 - 06:00** | **6.00 h** | Straordinario Notturno Festivo (a cavallo) | **+75%** *(Sconfinamento notturno in festivo)* |
| **Domenica 06:00 - 08:00** | **2.00 h** | Straordinario Festivo Diurno | **+55%** *(Straordinario festivo oltre le 8h totali)* |

---

### 3. Regola per il Motore di Calcolo dell'App

L'applicazione deve gestire questa situazione in tre passaggi:

1. **Innestare il turno sul Sabato:** Imputare tutte le 18 ore di presenza sul contatore del giorno di partenza (Sabato).
2. **Dividere i minuti di lavoro prima e dopo la mezzanotte (00:00):**
* Minuti lavorati entro le 23:59 del Sabato $\rightarrow$ Tabella maggiorazioni Sabato (+50%).
* Minuti lavorati dalle 00:00 di Domenica $\rightarrow$ Tabella maggiorazioni Festivo (+55% / +75%).


3. **Generare i campi nel Database:**

```typescript
// Esempio Dati Generati per il Database Paga dell'App
const risultatoGiornoSabato = {
  dataIngresso: "SABATO",
  oreTotaliImputate: 18.00,
  
  // Dettaglio Maggiorazioni
  straordinarioSabatoDiurno50: 8.00,      // Ore 14:00 - 22:00
  straordinarioSabatoNotturno50: 2.00,    // Ore 22:00 - 24:00
  straordinarioNotturnoFestivo75: 6.00,   // Ore 00:00 - 06:00 (Domenica)
  straordinarioFestivo55: 2.00            // Ore 06:00 - 08:00 (Domenica)
};

```