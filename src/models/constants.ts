import { MasterData } from "./definitions";

export const ANAGRAFICA_COLLECTIONS: (keyof Omit<MasterData, 'impostazioni' | 'qualifiche' | 'documenti' | 'webAppUsers'>)[] = [
    'tecnici', 'tipiGiornata', 'veicoli', 'navi', 'luoghi', 'clienti', 'ditte', 'categorie', 'lavorazioni', 'sistemi'
];
