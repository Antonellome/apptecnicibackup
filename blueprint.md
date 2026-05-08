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

# SEZIONE DI EMERGENZA: PIANO DI RECUPERO POST-RESET

**ATTENZIONE:** Questa sezione è stata creata in risposta a un ripristino (`git reset`) errato che ha desincronizzato lo stato dell'applicazione. I seguenti passaggi devono essere eseguiti in ordine per ripristinare le funzionalità implementate durante questa sessione di chat, annullando il danno del reset.

**STATO ATTUALE DEL PROBLEMA:** Il `git reset` ha riportato alcuni file a versioni precedenti, creando un conflitto tra la vecchia gestione delle ore (`oreLavoro`) e la nuova struttura (`dettaglioOreTecnici`), e rompendo le dipendenze degli hook (es. `useMasterData`).

**OBIETTIVO:** Ripercorrere e riapplicare le modifiche salienti di questa chat per riallineare l'intera codebase allo stato desiderato prima dell'incidente.

---

# REGOLA FONDAMENTALE: IL METODO DEL GRANDE MAESTRO (ANALISI A 360°)

Ogni modifica al codice deve essere trattata come una mossa in una partita a scacchi contro il crash di sistema. La regola primaria è **"correggere gli errori"**, come stabilito nella cronologia delle decisioni (`chat_log.txt`).

---

# R.I.S.O. - Blueprint Applicazione Tecnici

Questo documento descrive le specifiche e i requisiti per l'applicazione "R.I.S.O." (Report Individuali Sincronizzati Online) per tecnici.

---

# Piano di Implementazione Corrente

## Funzionalità: Condivisione PDF del Report

**Obiettivo:** Aggiungere un pulsante "Condividi" nella pagina di creazione di un nuovo report (`NuovoReportPage`).

**Dettagli:**
1.  **Pulsante:**
    *   Posizionato accanto ai pulsanti "Annulla" e "Salva".
    *   Visualizzerà un'icona di condivisione.
    *   Sarà visibile solo se il browser supporta la Web Share API.
2.  **Funzionalità al Click:**
    *   Il form del report verrà convertito in un'immagine utilizzando `html2canvas`.
    *   L'immagine verrà inserita in un documento PDF utilizzando `jspdf`.
    *   Il PDF generato verrà condiviso tramite la Web Share API (`navigator.share`), consentendo l'invio ad app come WhatsApp, Email, etc.
    *   Un indicatore di caricamento informerà l'utente durante la generazione del file.
3.  **Dipendenze da Installare:**
    *   `jspdf`
    *   `html2canvas`
