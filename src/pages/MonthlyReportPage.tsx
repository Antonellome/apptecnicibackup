import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow
} from '@mui/material';
import Grid from "@mui/material/Grid";
import { format, startOfMonth, endOfMonth, subMonths, addMonths, isSameMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useMasterData } from '@/hooks/useMasterData';
import { Rapportino, EnrichedRapportino, Tecnico, TariffaLocale } from '@/models/definitions';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/db/local-db';
import ActivityBreakdown from '@/components/Rapportini/ActivityBreakdown';
import DettaglioCostiTipoGiornata from '@/components/Rapportini/DettaglioCostiTipoGiornata';

// Struttura dati per il riepilogo mensile
export interface RiepilogoMese {
    oreTotali: number;
    costoTotale: number;
    dettaglio: Map<string, { // la chiave è tipoGiornataId
        nome: string;
        colore: string;
        ore: number;
        costo: number;
        unita: 'g' | 'h';
        giorni: number;
    }>;
}

const ReportMensilePage = () => {
    const { user } = useAuth();
    const { masterData, loading: masterDataLoading } = useMasterData();
    const impostazioniLocali = useLiveQuery(() => localDB.tariffe_locali.get('main'), []);

    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [rapportini, setRapportini] = useState<EnrichedRapportino[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRapportini = useCallback(async () => {
        if (!user || !masterData) {
            if(!masterDataLoading) setLoading(false);
            return;
        }

        setLoading(true);
        
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        const q = query(
            collection(db, "rapportini"),
            where("presenze", "array-contains", user.uid),
            where("data", ">=", Timestamp.fromDate(start)),
            where("data", "<=", Timestamp.fromDate(end)),
            orderBy("data", "asc")
        );

        try {
            const querySnapshot = await getDocs(q);
            const tipiGiornataMap = new Map(masterData.tipiGiornata.map(t => [t.id, t]));
            const tecniciMap = new Map(masterData.tecnici.map(t => [t.id, t]));
            const enrichedData = querySnapshot.docs.map(doc => {
                const data = doc.data() as Rapportino;
                // Fallback per dati corrotti o vecchi
                const oreLavoro = data.dettaglioOreTecnici?.find(d => d.tecnicoId === user.uid)?.ore ?? data.oreLavoro ?? 0;
                const tipoGiornata = tipiGiornataMap.get(data.tipoGiornataId) || { id: '', nome: 'Sconosciuto', colore: '#808080', sigla: '' };
                const presenzeArricchite = (data.presenze || []).map(id => tecniciMap.get(id)).filter((t): t is Tecnico => !!t);
                return {
                    ...data,
                    id: doc.id,
                    data: (data.data as Timestamp).toDate(),
                    tipoGiornata,
                    presenze: presenzeArricchite,
                    // Campo normalizzato per le ore, per gestire vecchia e nuova struttura
                    oreGiorno: oreLavoro,
                } as EnrichedRapportino;
            });
            
            setRapportini(enrichedData);
            setError(null);
        } catch (err) {
            console.error("Errore nel caricamento da Firestore: ", err);
            setError("Impossibile caricare i report.");
        } finally {
            setLoading(false);
        }
    }, [user, masterData, currentMonth, masterDataLoading]);

    useEffect(() => {
        fetchRapportini();
    }, [fetchRapportini]);

    const riepilogoMese = useMemo<RiepilogoMese | null>(() => {
        if (!rapportini.length || !impostazioniLocali || !user) return null;

        const tariffe = impostazioniLocali.data.tariffe as TariffaLocale[];
        const tariffeMap = new Map(tariffe.map(t => [t.tipoGiornataId, t]));

        // RIPRISTINO LOGICA ORIGINALE: Ricerca per nome.
        const tariffaOrdinaria = tariffe.find(t => t.nome.toLowerCase() === 'ordinaria');
        const tariffaStraordinaria = tariffe.find(t => t.nome.toLowerCase() === 'straordinario');

        const riepilogo: RiepilogoMese = {
            oreTotali: 0,
            costoTotale: 0,
            dettaglio: new Map(),
        };

        for (const report of rapportini) {
            const oreGiorno = report.oreGiorno ?? 0;
            const tariffaCorrente = tariffeMap.get(report.tipoGiornata.id);

            if (!tariffaCorrente) continue;
            if (oreGiorno === 0 && tariffaCorrente.unita !== 'g') continue;

            riepilogo.oreTotali += oreGiorno;

            let costoGiorno = 0;
            // RIPRISTINO LOGICA ORIGINALE: Switch sul nome.
            const tipoGiornataNome = report.tipoGiornata.nome.toLowerCase();

            switch (tipoGiornataNome) {
                case 'ferie':
                case 'festivo':
                    costoGiorno = tariffaCorrente.costo;
                    break;

                case 'permesso':
                case 'legge 104':
                case '104': // Aggiungo fallback per dati sporchi
                case 'malattia':
                    costoGiorno = oreGiorno * tariffaCorrente.costo;
                    break;

                case 'straordinario':
                    costoGiorno = oreGiorno * (tariffaStraordinaria?.costo ?? 0);
                    break;

                case 'ordinaria':
                case 'trasferta italia':
                case 'trasferta europa':
                case 'trasferta extraeuropea':
                    if (tariffaOrdinaria) {
                        const oreOrdinarie = Math.min(oreGiorno, 8);
                        const oreStraordinarie = Math.max(0, oreGiorno - 8);
                        const costoStraordinario = tariffaStraordinaria?.costo ?? tariffaOrdinaria.costo; // Fallback a costo ordinario
                        let costoOre = (oreOrdinarie * tariffaOrdinaria.costo) + (oreStraordinarie * costoStraordinario);
                        
                        if (tipoGiornataNome !== 'ordinaria') { // È una trasferta
                            costoGiorno = costoOre + tariffaCorrente.costo;
                        } else {
                            costoGiorno = costoOre;
                        }
                    } else {
                        costoGiorno = 0; // Tariffa ordinaria non trovata, costo nullo
                    }
                    break;

                default:
                    costoGiorno = 0;
                    break;
            }

            riepilogo.costoTotale += costoGiorno;

            const dettaglioGiorno = riepilogo.dettaglio.get(report.tipoGiornata.id) || {
                nome: report.tipoGiornata.nome,
                colore: report.tipoGiornata.colore,
                ore: 0,
                costo: 0,
                unita: tariffaCorrente.unita,
                giorni: 0,
            };

            dettaglioGiorno.ore += oreGiorno;
            dettaglioGiorno.costo += costoGiorno;
            if (oreGiorno > 0 || tariffaCorrente.unita === 'g') {
                dettaglioGiorno.giorni += 1;
            }
            riepilogo.dettaglio.set(report.tipoGiornata.id, dettaglioGiorno);
        }

        return riepilogo.oreTotali > 0 || riepilogo.dettaglio.size > 0 ? riepilogo : null;
    }, [rapportini, impostazioniLocali, user]);


    const handleMonthChange = (increment: number) => {
        setCurrentMonth(prev => increment > 0 ? addMonths(prev, 1) : subMonths(prev, 1));
    };

    const today = new Date();
    const isNextButtonDisabled = isSameMonth(currentMonth, today);
    const isLoadingPage = loading || masterDataLoading || !impostazioniLocali;

    return (
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Report Mensile
            </Typography>
            <Paper sx={{ mb: 2, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button variant="outlined" onClick={() => handleMonthChange(-1)}>Mese Prec.</Button>
                <Typography variant="h6">{format(currentMonth, 'MMMM yyyy', { locale: it })}</Typography>
                <Button variant="outlined" onClick={() => handleMonthChange(1)} disabled={isNextButtonDisabled}>Mese Succ.</Button>
            </Paper>
            {isLoadingPage && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4}}>
                    <CircularProgress />
                </Box>
            )}
            {error && <Alert severity="error">{error}</Alert>}
            {!isLoadingPage && !error && riepilogoMese && (
                 <Grid container spacing={3}>
                    <Grid
                        size={{
                            xs: 12,
                            md: 5,
                            lg: 4
                        }}>
                        <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                            <Typography variant="h5" gutterBottom>Riepilogo</Typography>
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableBody>
                                        <TableRow>
                                            <TableCell><Typography fontWeight="bold">Ore Totali</Typography></TableCell>
                                            <TableCell align="right"><Typography variant="h6">{riepilogoMese.oreTotali.toFixed(2)}</Typography></TableCell>
                                        </TableRow>
                                        <TableRow sx={{ backgroundColor: 'primary.lighter' }}>
                                            <TableCell><Typography fontWeight="bold">Costo Stimato</Typography></TableCell>
                                            <TableCell align="right"><Typography variant="h5" color="primary.main" fontWeight="bold">€ {riepilogoMese.costoTotale.toFixed(2)}</Typography></TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </Grid>
                    <Grid
                        size={{
                            xs: 12,
                            md: 7,
                            lg: 8
                        }}>
                        <DettaglioCostiTipoGiornata dettaglio={riepilogoMese.dettaglio} />
                    </Grid>
                    <Grid sx={{ mt: 2 }} size={12}>
                        <ActivityBreakdown riepilogo={riepilogoMese} />
                    </Grid>
                </Grid>
            )}
            {!isLoadingPage && !error && !riepilogoMese && (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h6">Nessun dato per questo mese</Typography>
                    <Typography color="text.secondary">Non sono stati trovati rapportini per il periodo selezionato.</Typography>
                </Paper>
            )}
        </Box>
    );
};

export default ReportMensilePage;
