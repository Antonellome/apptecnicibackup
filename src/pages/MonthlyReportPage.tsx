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
import { Rapportino, EnrichedRapportino, Tecnico, Impostazioni, TipoGiornata } from '@/models/definitions';
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
        unita: 'ora' | 'giorno';
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

    // ... (fetchRapportini rimane invariato)
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
                const tipoGiornata = tipiGiornataMap.get(data.tipoGiornataId) || { id: '', nome: 'Sconosciuto', colore: '#808080' };
                const presenzeArricchite = (data.presenze || []).map(id => tecniciMap.get(id)).filter((t): t is Tecnico => !!t);
                return {
                    ...data,
                    id: doc.id,
                    data: (data.data as Timestamp).toDate(),
                    tipoGiornata,
                    presenze: presenzeArricchite,
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

        const impostazioni = impostazioniLocali.data;
        const tariffeMap = new Map(impostazioni.tariffe.map(t => [t.tipoGiornataId, t]));
        
        const riepilogo: RiepilogoMese = {
            oreTotali: 0,
            costoTotale: 0,
            dettaglio: new Map(),
        };

        for (const report of rapportini) {
            const dettaglioUtente = (report.dettaglioOreTecnici || []).find(d => d.tecnicoId === user.uid);
            const oreGiorno = dettaglioUtente?.ore ?? 0;

            // Se l'utente ha 0 ore registrate per quel giorno, non contribuisce al suo report personale.
            if (oreGiorno === 0 && (report.dettaglioOreTecnici || []).length > 0) {
                continue;
            }

            riepilogo.oreTotali += oreGiorno;

            const tariffa = tariffeMap.get(report.tipoGiornata.id);
            let costoGiorno = 0;

            if (tariffa) {
                // NUOVA LOGICA DI CALCOLO UNIFICATA E CORRETTA
                const tipoGiornataNome = report.tipoGiornata.nome.toLowerCase();

                if (tariffa.unita === 'g') {
                    // TARIFFE GIORNALIERE (Ferie, Festivo, Trasferte)
                    costoGiorno = tariffa.costo;

                    // Se è una trasferta, aggiungiamo il costo delle ore lavorate
                    if (tipoGiornataNome.includes('trasferta')) {
                        const tariffaOrdinaria = impostazioni.tariffe.find(t => t.nome.toLowerCase() === 'ordinaria');
                        const tariffaStraordinaria = impostazioni.tariffe.find(t => t.nome.toLowerCase() === 'straordinario');
                        if(tariffaOrdinaria && tariffaStraordinaria) {
                            const oreOrdinarie = Math.min(oreGiorno, 8);
                            const oreStraordinarie = Math.max(0, oreGiorno - 8);
                            costoGiorno += (oreOrdinarie * tariffaOrdinaria.costo) + (oreStraordinarie * tariffaStraordinaria.costo);
                        }
                    }
                } else if (tariffa.unita === 'h') {
                    // TARIFFE ORARIE (Ordinaria, Straordinario, Permesso, Malattia, etc.)
                    if (tipoGiornataNome === 'ordinaria') {
                         const tariffaStraordinaria = impostazioni.tariffe.find(t => t.nome.toLowerCase() === 'straordinario');
                         if(tariffaStraordinaria) {
                            const oreOrdinarie = Math.min(oreGiorno, 8);
                            const oreStraordinarie = Math.max(0, oreGiorno - 8);
                            costoGiorno = (oreOrdinarie * tariffa.costo) + (oreStraordinarie * tariffaStraordinaria.costo);
                         }
                    } else {
                        // Per tutte le altre tariffe orarie (Straordinario puro, Permesso, etc.)
                        costoGiorno = oreGiorno * tariffa.costo;
                    }
                }
            }

            riepilogo.costoTotale += costoGiorno;

            // Aggiornamento del dettaglio per tipo giornata
            const dettaglioGiorno = riepilogo.dettaglio.get(report.tipoGiornata.id) || {
                nome: report.tipoGiornata.nome,
                colore: report.tipoGiornata.colore,
                ore: 0,
                costo: 0,
                unita: tariffa?.unita || 'h',
                giorni: 0,
            };

            dettaglioGiorno.ore += oreGiorno;
            dettaglioGiorno.costo += costoGiorno;
            // Conta come "giorno" solo se ci sono ore o se la tariffa è giornaliera
            if (oreGiorno > 0 || tariffa?.unita === 'g') {
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
