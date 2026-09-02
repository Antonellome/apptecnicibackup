# Struttura Dati: Collezione `eventi_giornalieri`

Questo documento descrive la struttura dei dati salvati nella collezione `eventi_giornalieri` di Firestore. L'app master deve usare queste informazioni per interpretare correttamente gli eventi inviati dall'app dei tecnici.

Ogni documento in questa collezione rappresenta un singolo evento.

---

## Campi del Documento

| Campo | Tipo | Descrizione |
| :--- | :--- | :--- |
| `tecnicoId` | `string` | L'ID univoco (UID) dell'utente che ha generato l'evento, proveniente da Firebase Authentication. |
| `tecnicoName` | `string` | Il nome e cognome del tecnico. |
| `tipo` | `string` | **Campo fondamentale.** Identifica il tipo di evento. Può avere uno dei seguenti valori: `inizio_giornata`, `fine_giornata`, `check_in_luogo`, `check_out_luogo`. |
| `timestampImpostato` | `Timestamp` | **Valore per l'utente.** Data e ora scelte dal tecnico. **Questo è il timestamp da visualizzare nell'app master.** |
| `timestampReale` | `Timestamp` | **Valore di controllo.** Data e ora esatte della registrazione dell'evento nel database. Da non mostrare all'utente, serve per verifiche interne. |
| `naveId` | `string` | (Opzionale) L'ID della nave, presente solo per eventi di tipo `check_in_luogo` e `check_out_luogo` se l'evento è relativo a una nave. |
| `luogoId` | `string` | (Opzionale) L'ID del luogo, presente solo per eventi di tipo `check_in_luogo` e `check_out_luogo` se l'evento è relativo a un luogo. |

---

## Esempi di Documenti

**1. Esempio di `inizio_giornata`**

```json
{
  "tecnicoId": "someUserUID",
  "tecnicoName": "Mario Rossi",
  "tipo": "inizio_giornata",
  "timestampImpostato": {
    "seconds": 1672563600, // 1 Gennaio 2023 09:00:00
    "nanoseconds": 0
  },
  "timestampReale": {
    "seconds": 1672563635, // 1 Gennaio 2023 09:00:35
    "nanoseconds": 0
  }
}
```

**2. Esempio di `check_in_luogo`**

```json
{
  "tecnicoId": "someUserUID",
  "tecnicoName": "Mario Rossi",
  "tipo": "check_in_luogo",
  "timestampImpostato": {
    "seconds": 1672567200, // 1 Gennaio 2023 10:00:00
    "nanoseconds": 0
  },
  "timestampReale": {
    "seconds": 1672567221, // 1 Gennaio 2023 10:00:21
    "nanoseconds": 0
  },
  "luogoId": "idDelLuogoSpecifico"
}
```
