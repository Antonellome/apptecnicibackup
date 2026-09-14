import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/hooks/useAuth';
import { useMasterData } from '@/hooks/useMasterData';
import { EnrichedRapportino, Rapportino, TipoGiornata, Nave, Luogo, Tecnico } from '@/models/definitions';
import { db as localDb } from '@/db/local-db';
import { toDateSafe } from '@/utils/dateUtils';

export const useEnrichedRapportini = () => {
    const { userProfile } = useAuth();
    const { masterData, loading: masterDataLoading, error: masterDataError } = useMasterData();

    const allUserRapportini = useLiveQuery(() => {
        if (!userProfile?.tecnicoId) return [];
        return localDb.rapportini
            .filter(r => 
                !r.isDeleted &&
                (r.tecnicoId === userProfile.tecnicoId || 
                (r.presenze || []).includes(userProfile.tecnicoId))
            )
            .toArray();
    }, [userProfile?.tecnicoId]);

    const cleanedAndSortedRapportini = (() => {
        if (!masterData || !allUserRapportini || !userProfile?.tecnicoId) return [];

        const tipiGiornataMap = new Map((masterData.tipiGiornata || []).map((t: TipoGiornata) => [t.id, t]));
        const naviMap = new Map((masterData.navi || []).map((n: Nave) => [n.id!, n.nome]));
        const luoghiMap = new Map((masterData.luoghi || []).map((l: Luogo) => [l.id!, l.nome]));
        
        const tecniciMap = new Map<string, Tecnico>();
        (masterData.tecnici || []).forEach((t: Tecnico) => {
            if (t.id) tecniciMap.set(t.id, t);
            if (t.uid) tecniciMap.set(t.uid, t);
        });

        return allUserRapportini
            .map((rapportino: Rapportino): EnrichedRapportino | null => {
                const correctedDate = toDateSafe(rapportino.data);
                
                if (!correctedDate) {
                    console.warn(`Rapportino ${rapportino.id} scartato a causa di una data non valida.`, { data: rapportino.data });
                    return null;
                }

                const dettaglioOreTecnici = rapportino.dettaglioOreTecnici || [];
                if (!rapportino.dettaglioOreTecnici) {
                    console.warn(`Rapportino ${rapportino.id} non ha il campo 'dettaglioOreTecnici'.`, rapportino);
                }

                const dettaglioTecnico = dettaglioOreTecnici.find(d => d.tecnicoId === userProfile.tecnicoId);
                const orariDisplay = (dettaglioTecnico?.oraInizio && dettaglioTecnico?.oraFine) ? `${dettaglioTecnico.oraInizio}/${dettaglioTecnico.oraFine}/${dettaglioTecnico.pausa || 0}` : '';

                const fallbackTipoGiornata: TipoGiornata = { id: 'unknown', nome: '[Tipo sconosciuto]', tipo: 'giornaliera', colore: '#808080', sigla: '?' };

                return {
                    ...rapportino,
                    id: rapportino.id!,
                    data: correctedDate,
                    tipoGiornata: tipiGiornataMap.get(rapportino.tipoGiornataId) ?? fallbackTipoGiornata,
                    naveNome: rapportino.naveId ? (naviMap.get(rapportino.naveId) ?? '[Nave sconosciuta]') : undefined,
                    luogoNome: rapportino.luogoId ? (luoghiMap.get(rapportino.luogoId) ?? '[Luogo sconosciuto]') : undefined,
                    isOffline: rapportino.isOffline || false,
                    isEditable: true,
                    orariDisplay,
                    hasFirma: !!rapportino.firmaVettoriale,
                    creatore: rapportino.tecnicoId !== userProfile.tecnicoId ? (tecniciMap.get(rapportino.tecnicoId)) : undefined,
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