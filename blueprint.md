# Architettura Generale e Flusso Dati (Fonte: Architetto del Progetto)

**Questa sezione descrive l'architettura fondamentale dell'applicazione e deve essere considerata la fonte di verità per qualsiasi sviluppo o manutenzione.**

## 1. Ecosistemi Separati: App Tecnici vs. App Master

L'universo del progetto è diviso in due applicazioni distinte e separate, ciascuna con il proprio frontend e il proprio backend (Cloud Functions).

- **App Tecnici (Questo Progetto):**
    - **Scopo:** Strumento di lavoro per il tecnico sul campo. Creazione e gestione dei propri rapportini.
    - **Filosofia:** Local-First, massima velocità e operatività offline.
    - **Backend (`functions/src/index.ts` in questa codebase):** Ha un ruolo di supporto **limitato**. Il suo unico scopo è aggregare dati di **quantità** (ore, giorni) per le viste di riepilogo personali del tecnico (`I Miei Report`, `Report Mensili`). **Non gestisce notifiche né logica di business critica per l'azienda.**

- **App Master (Progetto Separato):**
    - **Scopo:** Strumento di supervisione e gestione per l'ufficio.
    - **Backend (codebase separata):** Gestisce la logica di business principale. Riceve i rapportini originali dall'app Tecnici e si occupa di:
        - **Ciclo di Notifiche:** Inviare notifiche push e processare le conferme di lettura.
        - **Logica di Business:** Eseguire i propri calcoli e analisi sui dati ricevuti.

## 2. Flusso Dati del Rapportino

1.  **Creazione (App Tecnici):** Il tecnico crea un singolo documento `rapportino` nel suo database locale. Questo documento include i suoi dati, i colleghi aggiunti e la firma.
2.  **Sincronizzazione:** Il servizio `sync` dell'app Tecnici carica questo singolo documento su Firestore.
3.  **Elaborazione (App Master):** Il backend dell'app Master rileva il nuovo documento e avvia le sue procedure interne (notifiche, ecc.).
4.  **Elaborazione (App Tecnici):** Il backend dell'app Tecnici rileva il nuovo documento e aggiorna le **sue** collezioni di riepilogo (`riepiloghiMensili`) per le viste personali del tecnico.

## 3. Gestione dei Calcoli

- **Calcoli di Costo (€):** Sono di **esclusiva competenza del client dell'App Tecnici** e si basano su tariffe salvate localmente, potenzialmente personalizzate. Il backend non ne è a conoscenza.
- **Calcoli di Quantità (Ore/Giorni):** Sono gestiti dal backend dell'app Tecnici per i suoi report di riepilogo interni.

---

## 4. Gestione Offline Avanzata (Implementazione del 22/07/2024)

Per garantire un'esperienza utente fluida e affidabile anche in assenza di connessione, l'applicazione implementa una strategia di accodamento per le operazioni di salvataggio e condivisione.

### 4.1 Coda di Sincronizzazione Dati

- **Funzionamento:** Quando un utente crea o modifica un rapportino in modalità offline, i dati non vengono inviati immediatamente a Firebase. Vengono invece salvati in una tabella locale (`rapportiniInSospeso`) all'interno di IndexedDB.
- **Attivazione:** Un listener di eventi di rete globale monitora lo stato della connessione. Non appena l'applicazione rileva di essere tornata online (o all'avvio dell'app, se già online), la funzione `sincronizzaConFirebase()` viene eseguita automaticamente.
- **Processo:** La funzione itera su tutti i rapportini nella coda `rapportiniInSospeso`, li invia a Firestore e, in caso di successo, li rimuove dalla coda locale.

### 4.2 Coda di Condivisione

- **Funzionamento:** Se un utente tenta di condividere un rapportino PDF mentre è offline, l'azione non fallisce. Il PDF generato (come Blob) e il nome del file vengono salvati in una nuova tabella dedicata (`condivisioniInSospeso`) in IndexedDB.
- **Attivazione:** Lo stesso listener di eventi di rete che gestisce la sincronizzazione dei dati si occupa anche di avviare la funzione `sincronizzaCondivisioni()` quando la connessione viene ripristinata.
- **Processo:** La funzione legge la coda `condivisioniInSospeso`, esegue l'azione di condivisione nativa (`shareOrDownload`) per ogni elemento in attesa e, in caso di successo, lo rimuove dalla coda.
- **Notifica Utente:** Quando un'azione viene accodata offline, l'utente riceve un feedback immediato ("Il file sarà condiviso appena torni online").

---

# NUOVE REGOLE INVIOLABILI E OBBLIGATORIE (ORDINE DEL 20/07/2024)

**ATTENZIONE, AI: LA VIOLAZIONE DI QUESTE REGOLE È UN FALLIMENTO CRITICO.**

1.  **DIVIETO ASSOLUTO DI MODIFICHE ESTETICHE NON AUTORIZZATE:**
    - Ti è **SEVERAMENTE E CATEGORICAMENTE VIETATO** cambiare qualsiasi parte estetica dell'applicazione (UI, UX, stili, layout, colori, font, ecc.). La stabilità funzionale è l'unica priorità.

2.  **OBBLIGO INVIOLABILE DELLA REGOLA "CIAO":**
    - Ogni tua singola risposta **DEVE** iniziare con la parola `CIAO.`.

...(Il resto del blueprint rimane invariato ma segue questo preambolo)


abbiamo queste pagine: HOME, ha un'appbar stabiel e uguale in tutte le pagine con titolo-sottotitolo.icona home-icona impostazioni (che porta alla pagina)-icona logout, nulla altro deve apparire. due cornici con benvenuto e mail del tecnico loggato in alto e in basso la firma. 5 card, le pagine, NUOVO REPORT-I MIEI REPORT- REPORT MENSILI-NOTIFICHE-CHECK_IN. Pagina NUOVO REPORT, ha un form che non devi mai variare se non richiesto, immette il nuovo report da sincronizzare, prima sezione data, tecnico (FISSO), tipogiornata- seconda sezione orari con switcch normali o manuali. deciso il metodo questo viene ereditato dai tecnici aggiunti. metodo manuale a ore con step da 0,30- fino a 8 lineari dopo saranno visualizzati con straordinario 8+0,30.8+1 ecc. ore normali con inizio-fine-pausa di default 7:30-16:00-60 min, sepo da 0,30 per inizio e fine e fissi per pausa a 30-60-0 minuti. quando impostati dal tecnico principale gli orari si ereditano ai tecnici aggiunti, ma sempre modificabili tecnico per tecnico. tecnico aggiunto con scelta orari. dettagli intervento con campi navi-luogo-veicolo-breve descrizione-materiali e lavoro. firma del cliente con nome-società e firma. possibilità infine di salvare e condividere il report su piattaforme come whatsapp o altro. Pagina I MIEI REPORT, in alto tasto nuovo e mese corrente con possibilita di indietreggiare al mese precedente e andare avanti al mese corrente. lista dei report cliccabili per consultarli/modificarli non cancellarli, modificabili solo dal tecnico che li ha scritti, non dai tecnici aggiunti a cui i report arrivano oltre che alla master. qui i report dovrebbero usare il database locale per tenerne una copia ma ne parliamo dopo. Pagina REPORT MENSILI, riepilogo, dettaglio costi per attivita e distribuzione attività mensile, in grafico. logica: la pagina lavora se riusciamo solo offline, prendendo i report dal locale e non da firebase per non gravare i costi, logica da modificare perchè nella recente programmazione è saltato tutto creando il database locale al caso, ne riparliamo. calcoli: giornata ordinaria : ore (le prime 8) per costo tariffa ordinaria+ore (oltre mle prime 8) per tariffa straordinaria. se srtaordinaria la tipo di giornata allora ore per tariffa straordinaria, cosi per tutte le varie tariffe ad ore. trasferta, calcolo come ore ordinarie piu la tariffa trasferta. per calcoli ore giornaliere come ferie festivo e malattia allora si segnano di default 8 ore al giorno e tariffa fissa giornaliera. le tariffe sono inj paqgina impostazioni, abbiamo una tabella nativa nell'app che puo essere modificata dal tecnico in modo autonomo. se cambiano i valori al salvataggio le tariffe vanno sul database locale. i calcoli quindi devono controllare se esistono le tariffe per tutti i tipi di giornata nel database locale altrimenti li prendono dalla tabella in impostazioni. quindi tutto off line, in quanto i report sono in copioa nel database. Pagina notifiche, ecco la logica: "Struttura Dati su Firestore:

Le notifiche inviate vengono salvate in una collezione chiamata notifications. Ogni documento in questa collezione rappresenta un messaggio inviato e contiene i seguenti campi principali: title: Il titolo della notifica. body: Il corpo del messaggio. target: Un oggetto che descrive il destinatario. Può essere: Per un singolo utente: { type: 'user', id: 'ID_TECNICO' } Per una categoria: { type: 'category', id: 'NOME_CATEGORIA' } Per tutti: { type: 'all', id: 'all' } senderId: L'UID dell'amministratore che ha inviato la notifica. createdAt: Un Timestamp che indica quando la notifica è stata creata. readBy: Questo campo è cruciale. È un oggetto (una mappa) dove verranno registrate le conferme di lettura. La chiave sarà l'ID del tecnico e il valore un Timestamp. Flusso di Invio:

L'admin seleziona un destinatario (un tecnico, una categoria o "tutti"). Scrive un titolo e un messaggio. Quando preme "Invia", una Cloud Function (che dobbiamo assumere esista e sia configurata nel backend) viene triggerata. Questa Cloud Function: Legge il nuovo documento salvato nella collezione notifications. In base al target, recupera i token FCM (Firebase Cloud Messaging) dei dispositivi dei tecnici corrispondenti. Invia un messaggio push FCM a ciascun token. Importante: Il messaggio push che l'app del tecnico riceverà conterrà, oltre a titolo e corpo, anche l'ID del documento della notifica (es. notificationId: 'ABC123XYZ'). Questo ID è fondamentale per la conferma di lettura. Ecco la guida passo-passo che puoi condividere con il team che sviluppa l'app per i tecnici.

Implementare la ricezione di notifiche push e la capacità di inviare una conferma di lettura all'app "Master" quando un tecnico visualizza un messaggio.

Firebase SDK configurato nel progetto (incluso Firebase Cloud Messaging). Permessi per le notifiche push richiesti e gestiti correttamente su Android e iOS. Ogni tecnico, al login, deve registrare il proprio token FCM e salvarlo in un'apposita collezione su Firestore (es. fcmTokens), associandolo al proprio ID utente (tecnicoId). L'app deve essere in grado di gestire i messaggi FCM sia quando è in primo piano (foreground) sia quando è in background o chiusa.

Gestore Messaggi in Background/Chiusa:

Configura un gestore di messaggi in background. Questo gestore riceverà il payload della notifica. È essenziale che il payload inviato dalla Cloud Function includa notificationId. // Esempio (firebase.js o un file simile) import messaging from '@react-native-firebase/messaging';

messaging().setBackgroundMessageHandler(async remoteMessage => { console.log('Messaggio ricevuto in background:', remoteMessage); // Qui puoi gestire la notifica (es. mostrare un badge sull'icona dell'app) // L'importante è che remoteMessage.data contenga l'ID della notifica });

Gestore Messaggi in Foreground:

Imposta un listener per quando l'app è aperta. Questo ti permette di mostrare un avviso personalizzato all'interno dell'app. // Esempio in un componente React (es. App.js) useEffect(() => { const unsubscribe = messaging().onMessage(async remoteMessage => { Alert.alert( remoteMessage.notification.title, remoteMessage.notification.body ); console.log('Dati del messaggio:', remoteMessage.data); // <-- Qui ci sarà { notificationId: '...' } });

return unsubscribe; }, []);

Quando l'utente tocca la notifica (sia dalla barra di sistema che da un avviso in-app), l'app deve:

Estrarre il notificationId dal payload del messaggio. Navigare verso una schermata di dettaglio della notifica, passando l'ID come parametro. // Esempio di gestione del tocco sulla notifica useEffect(() => { messaging().onNotificationOpenedApp(remoteMessage => { console.log('Notifica aperta dall'utente:', remoteMessage); const notificationId = remoteMessage.data.notificationId;

if (notificationId) {
  // Naviga alla schermata dei dettagli passando l'ID
  navigation.navigate('NotificationDetail', { id: notificationId });
}
}); }, [navigation]);

Questa è la parte più importante. La schermata NotificationDetail farà due cose: mostrare il messaggio e inviare la conferma.

Recuperare i Dati della Notifica:

Usando il notificationId ricevuto come parametro, recupera i dettagli completi del messaggio dalla collezione notifications di Firestore. Inviare la Conferma (il "Marchio di Lettura"):

Subito dopo aver caricato i dati della notifica, e solo la prima volta che viene visualizzata, l'app deve aggiornare il documento della notifica su Firestore per aggiungere la conferma di lettura. L'aggiornamento consiste nell'aggiungere un campo all'oggetto readBy. Ecco un esempio di codice per un componente NotificationDetail:

import React, { useEffect, useState } from 'react'; import { View, Text, ActivityIndicator } from 'react-native'; import firestore from '@react-native-firebase/firestore'; import auth from '@react-native-firebase/auth';

const NotificationDetail = ({ route }) => { const { id: notificationId } = route.params; const [notification, setNotification] = useState(null); const [loading, setLoading] = useState(true);

useEffect(() => { const notificationRef = firestore().collection('notifications').doc(notificationId);

const fetchNotification = async () => {
  try {
    const doc = await notificationRef.get();
    if (doc.exists) {
      const data = doc.data();
      setNotification(data);
      
      // --> PASSO CRUCIALE: INVIA CONFERMA DI LETTURA <--
      markAsRead(notificationRef, data.readBy);

    } else {
      console.log('Nessuna notifica trovata con questo ID.');
    }
  } catch (error) {
    console.error("Errore nel recuperare la notifica:", error);
  } finally {
    setLoading(false);
  }
};

const markAsRead = async (ref, readByObject) => {
  const currentUser = auth().currentUser;
  if (!currentUser) return; // Non dovrebbe succedere se l'utente è loggato

  const tecnicoId = currentUser.uid; // O l'ID del tecnico, se diverso dall'UID di auth
  
  // Controlla se il tecnico ha già letto questo messaggio per evitare scritture inutili
  if (readByObject && readByObject[tecnicoId]) {
    console.log('Notifica già segnata come letta.');
    return;
  }
  
  try {
    // Usa la "dot notation" per aggiornare un campo specifico nell'oggetto
    await ref.update({
      [`readBy.${tecnicoId}`]: {
         readAt: firestore.FieldValue.serverTimestamp(),
         // **AGGIUNTA RICHIESTA: Includi il nome del tecnico**
         tecnicoName: currentUser.displayName || 'Nome non disponibile'
      }
    });
    console.log('Conferma di lettura inviata con successo!');
  } catch (error) {
    console.error('Errore nell\'inviare la conferma di lettura:', error);
  }
};

fetchNotification();
}, [notificationId]);

if (loading) { return <ActivityIndicator size="large" />; }

if (!notification) { return <Text>Notifica non trovata.</Text>; }

return ( <View> <Text style={{ fontSize: 24, fontWeight: 'bold' }}>{notification.title}</Text> <Text style={{ fontSize: 16, marginTop: 10 }}>{notification.body}</Text> {/* Altri dettagli... */} </View> ); };

export default NotificationDetail;

Modifica per includere il nome:

Ho aggiornato l'esempio sopra. Invece di salvare solo il timestamp, ora salviamo un oggetto:

readAt: firestore.FieldValue.serverTimestamp(), tecnicoName: currentUser.displayName || 'Nome non disponibile' }

In questo modo, l'app "Master" potrà leggere il campo readBy, ciclare attraverso gli ID dei tecnici e mostrare "Letto da Mario Rossi in data...".

Questa guida fornisce un framework completo e robusto. Il team dell'app per tecnici dovrebbe essere in grado di implementare la funzionalità senza problemi."- Pagina CHECK-IN ci sono le collezioni luogo e navi per far in modo che il tecnico a inizio giornata faccia saper dove è, è fatta per inviare una volta al giorno ma vorrei che si possa inviare piu volte se si cambia posto di lavoro, in caso fai chiedere se si è sicuri di reinviare poiche è stato gia inviato. l'app master mi da questa guida dimmi se sei daccordo o vuoi modificare: "Il Problema Attuale: Attualmente, quando un tecnico fa un check-in, la sua app molto probabilmente usa la funzione addDoc di Firestore. Questa funzione crea un nuovo documento con un ID casuale ogni singola volta.

Check-in #1 -> presenze/<ID_CASUALE_1> Check-in #2 -> presenze/<ID_CASUALE_2> Ecco perché vedi più voci per lo stesso tecnico. La Nuova Logica (La Soluzione): L'obiettivo è avere un solo documento di presenza per ogni tecnico al giorno, che viene semplicemente aggiornato ad ogni nuovo check-in.

Per fare questo, dobbiamo usare un ID di documento prevedibile e univoco per ogni tecnico e per ogni giorno. La struttura ideale per questo ID è una combinazione dell'ID del tecnico e della data corrente.

Esempio di ID Univoco: ID_TECNICO + _ + DATA_YYYY-MM-DD Ad esempio, se il tecnico con ID abc123xyz fa un check-in il 27 Ottobre 2023, l'ID del documento sarà: abc123xyz_2023-10-27.

Quando il tecnico farà un nuovo check-in più tardi nello stesso giorno, la sua app non dovrà aggiungere un nuovo documento, ma dovrà scrivere (aggiornare) lo stesso documento con l'ID abc123xyz_2023-10-27.

Firestore, vedendo un'operazione di scrittura su un documento che esiste già, semplicemente lo aggiornerà con i nuovi dati (la nuova posizione, il nuovo orario, ecc.).

La tua PresenzePage interroga già la collezione presenze e filtra i documenti per la data odierna. Poiché il documento del tecnico (abc123xyz_2023-10-27) esisterà sempre (anche se aggiornato), la pagina continuerà a mostrarlo correttamente. Grazie all'ascoltatore in tempo reale di Firestore, non appena il documento viene aggiornato con una nuova posizione, la modifica si rifletterà automaticamente sulla mappa o nella tabella della PresenzePage senza dover cambiare una riga di codice qui.

Ecco le istruzioni precise da passare a chi sviluppa l'app per i tecnici.

Modificare la funzione di check-in per garantire che ogni tecnico abbia un solo record di presenza al giorno, che rifletta l'ultimo check-in effettuato.

Attualmente, la funzione di check-in probabilmente utilizza addDoc per creare un nuovo record, generando un ID casuale.

// ESEMPIO DI CODICE VECCHIO (NON USARE) import { collection, addDoc } from "firebase/firestore";

await addDoc(collection(db, "presenze"), { tecnicoId: 'abc123xyz', location: '...', timestamp: serverTimestamp(), // ...altri dati });

Bisogna sostituire addDoc con setDoc e usare un ID di documento personalizzato e deterministico.

Passaggi:

Ottenere l'ID del tecnico autenticato. Ottenere la data odierna in formato YYYY-MM-DD. Combinare i due valori per creare l'ID univoco del documento. Usare setDoc per scrivere i dati del check-in. È consigliabile usare { merge: true } per sicurezza, in modo da aggiornare i campi senza cancellare l'intero documento se per caso l'oggetto inviato fosse parziale. Esempio di Nuovo Codice:

import { doc, setDoc, serverTimestamp } from "firebase/firestore"; import { db } from './firebase-config'; // Assicurati di importare la tua istanza db

// Dentro la funzione di check-in...

const performCheckIn = async (locationData) => { // 1. Ottieni l'ID del tecnico corrente const tecnicoId = auth.currentUser.uid; // o il metodo che usate per l'ID

// 2. Ottieni la data in formato YYYY-MM-DD
const today = new Date();
const dateString = today.toISOString().split('T')[0]; // Es: "2023-10-27"

// 3. Crea l'ID univoco per il documento
const docId = `${tecnicoId}_${dateString}`;

// 4. Prepara i dati da salvare
const checkInData = {
    tecnicoId: tecnicoId,
    tecnicoName: auth.currentUser.displayName || 'Nome Tecnico', // Includi il nome
    location: locationData, // Es: { latitude: ..., longitude: ... }
    timestamp: serverTimestamp(), // Questo si aggiornerà ad ogni check-in
    data: dateString // Campo data per le query
};

// 5. Scrivi/Aggiorna il documento usando setDoc
try {
    const docRef = doc(db, "presenze", docId);
    await setDoc(docRef, checkInData, { merge: true });
    console.log("Check-in effettuato/aggiornato con successo!");
    // Mostra un feedback positivo all'utente
} catch (error) {
    console.error("Errore durante il check-in: ", error);
    // Mostra un errore all'utente
}
};

La modifica chiave è passare da addDoc(collection(...)) a setDoc(doc(..., "ID_UNIVOCO"), ..., { merge: true }). Questo piccolo ma fondamentale cambiamento allineerà l'app dei tecnici alla nuova logica richiesta.

Una volta che l'app dei tecnici sarà aggiornata con questa logica, la pagina Presenze qui nell'app Master inizierà a comportarsi esattamente come desideri, senza che tu debba fare altro da questo lato."- Pagina IMPOSTAZIONI, tiene la tabella dei costi orari o giornalieri delle tipo di giornata, una guida all'app per il tecnico e un tasto per forzare l'aggiornamento dell'app quando questa è nella home dei cellulari e deve ricevere una nuova versione. hai tutto, riepilogo il offline: volevo che i report aggiornati in I MIEI REPORT, fossero copiati in database locale per la pagina REPORT MENSILI e farla lavorare offline, ma ci sono problemi di salvataggio/letture tra i due differenti kmodi di gewstione dei database locale e firestorer, puoi risolvere? in piu la creazione di un nuovo rapportino dovrebbe andare in coda nel database se l'app è offline, in modo da salvare il report, condividerlo o controllarlo e modificarlo anche se si è offline.la gestione della coda dovrebbe avvisare il tecnico con due chip, uno in home dentro òa card i miei report sopra l'icona e uno in pagina i miei rport sopra il taqsto nuovo in alto, poi segnare nella lista dei report della pagina i miei report con un chip o altro il report stesso, finche non avvenga la sincronizzazione. quindi questo è tutto, salv tutto cosi comne è nel blueprint in mopdo indelebile e creati tiutto il lavoro da svolgere per le correzioni, lasciando per ultimo se poi fosse possibile il discorso offline del database locale, visto che ci ha creati non pochi problemi



  **ATTENZIONE MUI GRID CAMBIA VERSIONE ECCO LA GUIDA**
Skip to content
🚀 Influence MUI's 2026 roadmap! Take our latest Developer Survey

Search…
Ctrl+K
Getting started
Components
Component API
Customization
How-to guides
Integrations
Experimental APIs
Migration
Upgrade to Grid v2
Migration from @material-ui/pickers
Upgrade to v7
Upgrade to v7: getting started
Migrating from deprecated APIs
Native color
Upgrade to v6
Upgrade to v6: getting started
Migrating from deprecated APIs
Migrating to Pigment CSS
Upgrade to v5
Migrating to v5: getting started
Breaking changes: style and theme
Breaking changes: components
Migrating from JSS (optional)
Troubleshooting
Earlier versions
Migration from v3 to v4
Migration from v0.x to v1
Discover more
Design resources
Template store
Upgrade to Grid v2
This guide explains how and why to migrate from the GridLegacy component to the Grid component.
ads via Carbon
Secure software faster with GitLab. Start your free trial.
ads via Carbon

Grid component versions

In Material UI v7, the GridLegacy component has been deprecated and replaced by Grid, which offers several new features as well as significant improvements to the developer experience. This guide explains how to upgrade from GridLegacy to Grid, and includes details for Material UI v5, v6, and v7.

Why you should upgrade

Grid provides the following improvements over GridLegacy:

It uses CSS variables, removing CSS specificity from class selectors. You can use sx prop to control any style you'd like.
All grids are considered items without specifying the item prop.
The offset feature gives you more flexibility for positioning.
Nested grids now have no depth limitation.
Its implementation doesn't use negative margins so it doesn't overflow like GridLegacy.
How to upgrade

Prerequisites

Before proceeding with this upgrade:

You must be on Material UI v5+.
If you're in the process of upgrading your Material UI version, you should complete that upgrade first.
1. Update the import

Depending on the Material UI version you are using, you must update the import as follows:

v7
v6
v5
Copy
// The legacy Grid component is named GridLegacy
-import Grid from '@mui/material/GridLegacy';

// The updated Grid component is named Grid
+import Grid from '@mui/material/Grid';
2. Remove legacy props

The item and zeroMinWidth props have been removed in the updated Grid. You can safely remove them:

-<Grid item zeroMinWidth>
+<Grid>

Copy
3. Update the size props

Skip this step if you're using Material UI v5.

In the GridLegacy component, the size props were named to correspond with the theme's breakpoints. For the default theme, these were xs, sm, md, lg, and xl.

Starting from Material UI v6, these props are renamed to size on the updated Grid:

 <Grid
-  xs={12}
-  sm={6}
+  size={{ xs: 12, sm: 6 }}
 >

Copy
If the size is the same for all breakpoints, then you can use a single value:

-<Grid xs={6}>
+<Grid size={6}>

Copy
Additionally, the true value for the size props was renamed to "grow":

-<Grid xs>
+<Grid size="grow">

Copy
You can use the following codemod to update the size props:

v7
v6
v5
Copy
npx @mui/codemod@next v7.0.0/grid-props <path/to/folder>
The codemod requires updating the imports beforehand.

4. Opt in to legacy negative margins

Skip this step if you're using Material UI v6 or v7.

If you're using Material UI v5 and want to apply the negative margins similar to GridLegacy, specify disableEqualOverflow={true} on the grid container. To apply to all grids, add the default props to the theme:

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

Copy
Common issues

Column direction

Using direction="column" or direction="column-reverse" is not supported on GridLegacy nor on the updated Grid. If your layout used GridLegacy with these values, it might break when you switch to the updated Grid. If you need a vertical layout, follow the instructions in the Grid documentation.

Container width

The updated Grid component doesn't grow to the full width of the container by default. If you need the grid to grow to the full width, you can use the sx prop:

-<GridLegacy container>
+<Grid container sx={{ width: '100%' }}>

 // alternatively, if the Grid's parent is a flex container:
-<GridLegacy container>
+<Grid container sx={{ flexGrow: 1 }}>

Copy
Codemod not covering wrapped Grid components

The provided codemods won't cover Grid components which are wrapped in other components or styled:

// The codemod won't cover StyledGrid
const StyledGrid = styled(Grid)({
  // styles
});

// The codemod won't cover WrappedGrid
const WrappedGrid = (props) => <Grid {...props} />;

Copy
You'll need to manually update these components.

Documentation pages

Grid:
Documentation
API
GridLegacy:
Documentation
API
Was this page helpful?

•

Blog
•

Store
Contents

Grid component versions
Why you should upgrade
How to upgrade
Prerequisites
1. Update the import
2. Remove legacy props
3. Update the size props
4. Opt in to legacy negative margins
Common issues
Column direction
Container width
Codemod not covering wrapped Grid components
Documentation pages
doit
formengine
Become a Diamond sponsor
MUI stands in solidarity with Ukraine.

