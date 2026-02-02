export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: 'admin' | 'user';
  enabled: boolean;
  // Dati specifici del tecnico
  technicianDetails?: {
    qualifica?: string;
    livello?: string;
    veicoloAssegnatoId?: string;
  };
}

export interface Veicolo {
  id: string;
  targa: string;
  marca: string;
  modello: string;
  scadenze: Scadenza[];
}

export interface Scadenza {
  id: string;
  tipo: 'assicurazione' | 'bollo' | 'tagliando' | 'revisione';
  data: string; // Formato ISO 8601 YYYY-MM-DD
  status: 'attiva' | 'in_scadenza' | 'scaduta';
}

export interface Rapportino {
  id: string;
  data: string; // Formato ISO 8601
  tecnicoId: string;
  cliente: string;
  oreLavorate: number;
  attivitaSvolta: string;
  stato: 'aperto' | 'chiuso' | 'in_revisione';
}

export interface AttivitaRecente {
    id: string;
    descrizione: string;
    data: string;
    icona: string; // es. 'rapportino', 'veicolo' per decidere che icona mostrare
}
