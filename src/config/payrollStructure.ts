export interface VocePaga {
  id: string;
  label: string;
  abbreviation: string;
}

export interface SezionePaga {
  titolo: string;
  voci: VocePaga[];
}

export const strutturaPaga: SezionePaga[] = [
  {
    titolo: 'Lavoro Ordinario',
    voci: [
      { id: 'pagaBaseOre', label: 'Ordinarie Diurne', abbreviation: 'Ordinarie' },
      { id: 'trasfertaOre', label: 'Trasferta', abbreviation: 'Trasferta' },
      { id: 'oreNotturnoSeraleOrd', label: 'Lavoro Notturno Ordinario (20-22) (+15%)', abbreviation: 'Ord. Nott. 15%' },
      { id: 'oreNotturnoPienoOrd', label: 'Lavoro Notturno Ordinario (22-06) (+30%)', abbreviation: 'Ord. Nott. 30%' },
    ],
  },
  {
    titolo: 'Banca Ore (Solo Maggiorazione)',
    voci: [
      { id: 'bancaOreSolaMaggiorazione25', label: 'Magg. Banca Ore (+25%)', abbreviation: 'B.O. 25%' },
      { id: 'bancaOreSolaMaggiorazione30', label: 'Magg. Banca Ore (+30%)', abbreviation: 'B.O. 30%' },
      { id: 'bancaOreSolaMaggiorazione50', label: 'Magg. Banca Ore (+50%)', abbreviation: 'B.O. 50%' },
    ],
  },
  {
    titolo: 'Lavoro Straordinario',
    voci: [
      { id: 'strDiu12Intero', label: 'Straordinario Feriale (Prime 2h) (+25%)', abbreviation: 'Str. Fer. 25%' },
      { id: 'strDiuSuccessIntero', label: 'Straordinario Feriale (Oltre 2h) (+30%)', abbreviation: 'Str. Fer. 30%' },
      { id: 'straordinarioSabatoDiurno50', label: 'Straordinario Sabato Diurno (+50%)', abbreviation: 'Str. Sab. 50%' },
      { id: 'straordinarioNotturno50', label: 'Straordinario Notturno Feriale/Sabato (+50%)', abbreviation: 'Str. Nott. 50%' },
      { id: 'straordinarioFestivo55', label: 'Straordinario Festivo/Domenicale Diurno (+55%)', abbreviation: 'Str. Fest. 55%' },
      { id: 'straordinarioNotturnoFestivo75', label: 'Straordinario Notturno Festivo (+75%)', abbreviation: 'Str. Nott. Fest. 75%' },
    ],
  },
  {
    titolo: 'Assenze Retribuite',
    voci: [
      { id: 'ferieScalate', label: 'Ferie', abbreviation: 'Ferie' },
      { id: 'rolScalati', label: 'ROL', abbreviation: 'ROL' },
      { id: 'exFestivitaScalate', label: 'Ex Festività', abbreviation: 'Ex Festività' },
      { id: 'permessiScalati', label: 'Permessi Retribuiti', abbreviation: 'Permessi' },
      { id: 'legge104Scalate', label: 'Permessi L. 104', abbreviation: 'L. 104' },
    ],
  },
  {
    titolo: 'Malattia',
    voci: [
        { id: 'oreMalattiaCarenzaAzienda', label: 'Malattia (Carenza)', abbreviation: 'Mal. Carenza' },
        { id: 'oreMalattiaIntegrazione', label: 'Malattia (Integrazione INPS)', abbreviation: 'Mal. INPS' },
    ]
  },
  {
      titolo: 'Anomalie e Debiti',
      voci: [
        { id: 'anomaliaDebitoUncovered', label: 'Debito Orario Residuo', abbreviation: 'Debito Orario' },
      ]
  }
];