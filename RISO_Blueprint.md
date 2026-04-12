# R.I.S.O. - Contratto Dati e Architettura

**Versione:** 3.3
**Ultimo Aggiornamento:** 24 Maggio 2024
**Scopo:** Questo documento è la **Fonte di Verità Assoluta** e il **contratto dati** ufficiale tra l'App Tecnici e l'App Master Office.

---

### **REGOLE DI INGAGGIO PER L'INTELLIGENZA ARTIFICIALE (AI)**

**(Contenuto invariato)**

---

## Capitolo 1: Schemi Dati Ufficiali (Fonte di Verità Assoluta)

**(Contenuto invariato)**

---

## Capitolo 2: App Tecnici - Interazioni con gli Schemi Dati

**(Contenuto invariato, come da tua ultima modifica)**

---

## Capitolo 3: App Master Office - Interazioni con gli Schemi Dati

*Questa sezione descrive come l'App Master Office **legge, scrive e gestisce** i dati definiti nel Capitolo 1, rispecchiando la precisione del Capitolo 2.*

### 3.1. Gestione Anagrafiche (`/anagrafiche`)
- **Componenti:** `GestioneAnagrafica.tsx`, `GestioneTipiGiornata.tsx`.
- **Rotta:** `/anagrafiche`
- **LETTURA:** Utilizza `onSnapshot` per leggere e mantenere aggiornate in tempo reale le liste di `navi`, `luoghi`, `veicoli`, `tipiGiornata`, mostrandole in tabelle separate.
- **SCRITTURA/MODIFICA/CANCELLAZIONE:** Utilizza `addDoc`, `updateDoc`, `deleteDoc` per la gestione CRUD completa di ogni anagrafica.
- **Implicazione per App Tecnici:** Fondamentale. L'uso di `onSnapshot` da parte dell'App Tecnici per le stesse collezioni garantisce che qualsiasi modifica qui (es. cancellazione di una nave) si rifletta istantaneamente sui loro dispositivi.

### 3.2. Gestione Rapportini (`/rapportini`, `/rapportino/edit/:id`)
- **Componenti:** `RicercaAvanzata.tsx`, `RapportinoEdit.tsx`.
- **Rotte:**
    - `/rapportini`: Pagina principale con la tabella di ricerca.
    - `/rapportino/edit/new`: Form per la creazione di un nuovo rapportino.
    - `/rapportino/edit/:id`: Form per la modifica di un rapportino esistente.
- **LETTURA:**
    - `RicercaAvanzata.tsx`: Esegue query complesse e filtrabili sulla collezione `rapportini`. Arricchisce i dati mostrando i nomi leggibili (`tecnico.nome`, `nave.nome`, etc.) presi dall'hook globale `useData`.
    - `RapportinoEdit.tsx`: Legge un singolo documento `rapportino` se l'URL contiene un `:id`.
- **SCRITTURA (Create):** `RapportinoEdit.tsx`, quando si trova sulla rotta `/.../new`, esegue un `addDoc` per creare un nuovo `rapportino`.
- **MODIFICA (Update):** `RapportinoEdit.tsx`, quando si trova sulla rotta `/.../:id`, esegue un `updateDoc` sul documento esistente.
- **CANCELLAZIONE (Delete):** `RicercaAvanzata.tsx` contiene la logica per eseguire `deleteDoc` su un rapportino, previa conferma.

### 3.3. Monitoraggio Presenze (`/presenze`)
- **Componente Principale:** `PresenzePage.tsx` (funge da contenitore per i tab).
- **Rotta:** `/presenze`.

#### 3.3.1. Tab: "Check-in di Oggi" & "Riepilogo Visivo"
- **Componenti:** `CheckinSection.tsx`, `CheckinVisivo.tsx`.
- **LETTURA (Tempo Reale):** Usano `onSnapshot` sulla collezione `checkin_giornalieri` per la data odierna. I dati sono arricchiti con le anagrafiche (`tecnici`, `navi`, `luoghi`) fornite dall'hook `useData` per mostrare nomi e non solo ID.

#### 3.3.2. Tab: "Storico Presenze"
- **Componente:** `Presenze.tsx`.
- **LETTURA (Storico):**
    - Esegue una query `onSnapshot` sulla collezione `rapportini` che carica solo i documenti per la data selezionata nel `DatePicker`.
    - Usa `useData` solo per le anagrafiche (`tecnici` e `tipiGiornata`).
    - Incrocia i dati per categorizzare ogni tecnico (Operativo, Assente, Mancante) in base ai rapportini del giorno.

### 3.4. Invio Notifiche (`/notifiche`)
- **Componente:** `NotificationsPage.tsx` (da implementare).
- **Rotta:** `/notifiche`.
- **LETTURA:** Legge la collezione `tecnici` per popolare la lista dei destinatari.
- **SCRITTURA (Indiretta):** Chiama una Cloud Function (`sendPushNotification`) con un payload JSON ben definito, come specificato nel Capitolo 4.

---

## Capitolo 4: Domande e Risposte (FAQ)

*(Contenuto invariato)*
