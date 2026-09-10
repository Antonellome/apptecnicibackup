
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/hooks/useAuth';
import { useMasterData } from '@/hooks/useMasterData';
import { EnrichedRapportino, Rapportino, TipoGiornata, Nave, Luogo, Tecnico } from '@/models/definitions';
import { db as localDb } from '@/db/local-db';
import { toDateSafe as toDate } from '@/lib/date-utils';
import { Timestamp } from 'firebase/firestore';

export const useEnrichedRapportini = () => {
    const { userProfile } = useAuth();
    const { masterData, loading: masterDataLoading, error: masterDataError } = useMasterData();

    const allUserRapportini = useLiveQuery(() => {
        if (!userProfile?.tecnicoId) return [];
        return localDb.rapportini
            .filter(r => 
                !r.isDeleted &&
                (r.tecnicoId === userProfile.tecnicoId || 
                (r.presenze || []).includes(userProfile.tecnicoId!))
            )
            .toArray();
    }, [userProfile?.tecnicoId]);

    const cleanedAndSortedRapportini = (() => {
        if (!masterData || !allUserRapportini || !userProfile?.tecnicoId) return [];

        const tipiGiornataMap = new Map((masterData.tipiGiornata || []).map((t: TipoGiornata) => [t.id, t]));
        const naviMap = new Map((masterData.navi || []).map((n: Nave) => [n.id, n.nome]));
        const luoghiMap = new Map((masterData.luoghi || []).map((l: Luogo) => [l.id, l.nome]));
        const tecniciMap = new Map((masterData.tecnici || []).filter(t => t.id).map((t: Tecnico) => [t.id!, `${t.cognome} ${t.nome}`.trim()]));

        return allUserRapportini
            .map((rapportino: Rapportino): EnrichedRapportino | null => {
                const dettaglioTecnico = (rapportino.dettaglioOreTecnici || []).find(d => d.tecnicoId === userProfile.tecnicoId);

                const enriched: EnrichedRapportino = {
                    ...rapportino,
                    id: rapportino.id!,
                    data: toDate(rapportino.data),
                    tipoGiornata: tipiGiornataMap.get(rapportino.tipoGiornataId),
                    naveNome: rapportino.naveId ? (naviMap.get(rapportino.naveId) ?? '[Nave sconosciuta]') : undefined,
                    luogoNome: rapportino.luogoId ? (luoghiMap.get(rapportino.luogoId) ?? '[Luogo sconosciuto]') : undefined,
                    oreGiorno: dettaglioTecnico?.ore || 0,
                    isEditable: true,
                    isOwner: rapportino.tecnicoId === userProfile.tecnicoId,
                    hasFirma: !!rapportino.firmaVettoriale,
                    creatore: rapportino.tecnicoScriventeId !== userProfile.tecnicoId ? (tecniciMap.get(rapportino.tecnicoScriventeId) ?? '[Tecnico sconosciuto]') : undefined,
                    orariDisplay: (dettaglioTecnico?.oraInizio && dettaglioTecnico?.oraFine) ? `${dettaglioTecnico.oraInizio}/${dettaglioTecnico.oraFine}/${dettaglioTecnico.pausa || 0}` : ''
                };
                
                return enriched;
            })
            .filter((r): r is EnrichedRapportino => r !== null)
            .sort((a, b) => {
                const dateA = toDate(a.data);
                const dateB = toDate(b.data);
                if (!dateA || !dateB) return 0;
                return dateB.getTime() - dateA.getTime();
            });

    })();

    const isLoading = masterDataLoading || allUserRapportini === undefined;

    return { 
        rapportini: cleanedAndSortedRapportini, 
        isLoading, 
        error: masterDataError 
    };
};
