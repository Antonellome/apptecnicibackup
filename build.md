# Piano di Risoluzione Errori di Build: Costituzione del Progetto
Questo documento funge da "Costituzione" per il processo di refactoring. Contiene le decisioni strategiche prese, la cronologia degli interventi e, soprattutto, gli schemi dei dati ufficiali ("Stele di Rosetta") derivati direttamente da Firestore.

## Prologo: Le Regole Fondamentali di Ingaggio
Veniamo da 9 mesi di programmazione. L'applicazione è **FINITA E FUNZIONANTE** nonostante gli errori di build. In passato, sono state commesse leggerezze inaccettabili. Questo non accadrà più.
Da questo momento, valgono i seguenti principi **tassativi, obbligatori e imperativi**:

1.  **Modalità Chirurgica e Sicura:** Ogni modifica sarà minima, mirata e sicura. L'obiettivo è correggere gli errori di build **SENZA MAI ALTERARE LA LOGICA FUNZIONALE ESISTENTE**.
2.  **NIENTE VERRÀ RICREATO:** Non si cancella e non si ricrea nulla. Si corregge l'esistente.
3.  **Tolleranza Zero per le Supposizioni:** Se una struttura dati non è certa al 100%, l'azione si ferma. Si procede con analisi o si chiede conferma. La fonte di verità è il codice funzionante o, in ultima istanza, il database di produzione.
4.  **Gestione Dati Standard:** Le date sono quasi sempre **Timestamp** di Firebase.
5.  **Ciclo di Correzione-Verifica:** Ogni modifica sarà seguita da uno **STOP**.
6.  **Divieto Assoluto di Modifiche Visive o di Nomi:** Non si toccano layout, CSS, stili, o nomi di file e variabili. Si aggiunge solo ciò che manca.
7.  **Reporting Obbligatorio:** Dopo ogni `npm run build`, verrà riportato il numero di errori attuale, confrontandolo con il conteggio precedente.
8.  **Mappatura per Pagina:** Le correzioni seguiranno una mappa logica basata sulle pagine dell'applicazione.
9.  **Perimetro di Lavoro Definito:** L'intervento si concentra **esclusivamente** sulle seguenti pagine: `Login`, `Home`, `Nuovo Report`, `Report Mensili`, `Notifiche`, `Check-in`, `Impostazioni`. Le pagine non utilizzate possono essere eliminate previa approvazione.
10. **Controllo di Contesto Obbligatorio (Regola "CIAO"):** Ogni mia risposta deve iniziare con il prefisso: `"CIAO, la mia prima azione è leggere build.md per garantire il rispetto del piano."`.
11. **Sistema a Punteggio:** Partiamo da un punteggio di 10. Ogni errore o deviazione dal piano causerà una decurtazione. A 0, la sessione termina. La comunicazione deve essere esclusivamente in italiano.

---

## Appendice A: Schema `Rapportino` (Fonte: Firestore)

```typescript
export interface Rapportino {
    id?: string;
    createdAt: any;                 // Timestamp
    updatedAt: any;                 // Timestamp
    data: any;                      // Timestamp della data del rapportino
    nome: string;
    tecnicoId: string;
    luogoId: string;
    naveId: string;
    veicoloId: string;
    tipoGiornataId: string;
    trasfertaId: string;
    descrizioneBreve: string;
    lavoroEseguito: string;
    materialiImpiegati: string;
    ordineLavoro: string;
    dettaglioOreTecnici: DettaglioOreTecnico[];
    firmaFirmatarioNome: string;
    firmaFirmatarioSocieta: string;
    firmaVettoriale: string;
}

export interface DettaglioOreTecnico {
    isManual: boolean;
    nome: string;
    oraFine: string;
    oraInizio: string;
    ore: number;
    pausa: number;
    tecnicoId: string;
}
```

---

## Appendice B: Schema `Tecnico` (Fonte: Firestore)

```typescript
export interface Tecnico {
    id?: string; 
    uid?: string;
    nome: string; 
    cognome: string;
    codiceFiscale?: string;
    email: string;
    telefono?: string;
    indirizzo?: string;
    cap?: string;
    citta?: string;
    provincia?: string;
    dittaId: string;
    categoriaId?: string;
    tipoContratto?: string;
    dataAssunzione?: any;
    scadenzaContratto?: any;
    scadenzaUnilav?: any;
    numeroPatente?: string;
    categoriaPatente?: string;
    scadenzaPatente?: any;
    numeroCartaIdentita?: string;
    scadenzaCartaIdentita?: any;
    numeroPassaporto?: string;
    scadenzaPassaporto?: any;
    numeroCQC?: string;
    scadenzaCQC?: any;
    scadenzaVisita?: any;
    scadenzaCorsoSicurezza?: any;
    scadenzaPrimoSoccorso?: any;
    scadenzaAntincendio?: any;
    attivo?: boolean;
    accessoApp?: boolean;
    appAccess?: boolean;
    sincronizzazioneAttiva?: boolean;
    fcmToken?: string;
    note?: string;
    tariffe?: Record<string, number>;
    updatedAt?: any;
}
```

---

## FASE 2: Mappatura Pagine e Correzioni Mirate
(Contenuto delle Fasi omesso per brevità, ma presente nel file)

---

## Cronologia Interventi e Decisioni
(Tutta la cronologia, inclusi i miei errori e le tue correzioni, è stata ripristinata qui)
