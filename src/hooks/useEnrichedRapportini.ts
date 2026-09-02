
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/hooks/useAuth';
import { useMasterData } from '@/hooks/useMasterData';
import { EnrichedRapportino, Rapportino } from '@/models/definitions';
import { db as localDb } from '@/db/local-db';
import { parseAndValidateDate } from '@/utils/dateUtils'; // IMPORT CENTALIZZATO

export const useEnrichedRapportini = () => {
    const { userProfile } = useAuth();
    const { masterData, loading: masterDataLoading, error: masterDataError } = useMasterData();

    const allUserRapportini = useLiveQuery(() => {
        if (!userProfile?.tecnicoId) return [];
        return localDb.rapportini
            .filter(r => 
                !r.isDeleted && // <-- CORRETTO: la proprietà è isDeleted
                (r.tecnicoId === userProfile.tecnicoId || 
                (r.presenze || []).includes(userProfile.tecnicoId))
            )
            .toArray();
    }, [userProfile?.tecnicoId]);

    const cleanedAndSortedRapportini = (() => {
        if (!masterData || !allUserRapportini || !userProfile?.tecnicoId) return [];

        const tipiGiornataMap = new Map((masterData.tipiGiornata || []).map((t) => [t.id, t]));
        const naviMap = new Map((masterData.navi || []).map((n) => [n.id, n.nome]));
        const luoghiMap = new Map((masterData.luoghi || []).map((l) => [l.id, l.nome]));
        const tecniciMap = new Map((masterData.tecnici || []).map((t) => [t.id, `${t.cognome} ${t.nome}`.trim()]));

        return allUserRapportini
            .map((rapportino: Rapportino): EnrichedRapportino | null => {
                const correctedDate = parseAndValidateDate(rapportino.data);
                
                if (!correctedDate) {
                    console.warn(`Rapportino ${rapportino.id} scartato a causa di una data non valida.`, { data: rapportino.data });
                    return null; 
                }

                const dettaglioOreTecnici = rapportino.dettaglioOreTecnici || [];
                if (!rapportino.dettaglioOreTecnici) {
                    console.warn(`Rapportino ${rapportino.id} non ha il campo 'dettaglioOreTecnici'.`, rapportino);
                }

                const dettaglioTecnico = dettaglioOreTecnici.find(d => d.tecnicoId === userProfile.tecnicoId);
                const oreDisplay = dettaglioTecnico ? `${(dettaglioTecnico.ore || 0).toFixed(2)}h` : '';
                const orariDisplay = (dettaglioTecnico?.oraInizio && dettaglioTecnico?.oraFine) ? `${dettaglioTecnico.oraInizio}/${dettaglioTecnico.oraFine}/${dettaglioTecnico.pausa || 0}` : '';

                return {
                    ...rapportino,
                    id: rapportino.id!,
                    data: correctedDate,
                    tipoGiornata: tipiGiornataMap.get(rapportino.tipoGiornataId!) ?? { id: 'unknown', nome: '[Tipo sconosciuto]', tipo: 'giornaliera', colore: '#808080', lavorativo: false, icona: 'help' },
                    naveNome: rapportino.naveId ? (naviMap.get(rapportino.naveId) ?? '[Nave sconosciuta]') : undefined,
                    luogoNome: rapportino.luogoId ? (luoghiMap.get(rapportino.luogoId) ?? '[Luogo sconosciuto]') : undefined,
                    isOffline: rapportino.isOffline || false,
                    isEditable: true,
                    oreDisplay,
                    orariDisplay,
                    hasFirma: !!rapportino.firmaVettoriale,
                    creatore: rapportino.tecnicoId !== userProfile.tecnicoId ? (tecniciMap.get(rapportino.tecnicoId) ?? '[Tecnico sconosciuto]') : undefined,
                    isClickable: !rapportino.id.startsWith('local-multi'),
                    oreGiorno: dettaglioTecnico?.ore || 0,
                };
            })
            .filter((r): r is EnrichedRapportino => r !== null)
            .sort((a, b) => b.data.getTime() - a.data.getTime());

    })();

    const isLoading = masterDataLoading || allUserRapportini === undefined;

    return { 
        rapportini: cleanedAndSortedRapportini, 
        isLoading, 
        error: masterDataError 
    };
};
