import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Box, Tooltip, TableFooter } from '@mui/material';
import { HelpOutline } from '@mui/icons-material';
import { DettaglioVoce } from '@/pages/MonthlyReportPage';

interface Props {
    dettaglio: Map<string, DettaglioVoce>;
    giorniTotali: number;
}

const DettaglioOreTipoGiornata = ({ dettaglio, giorniTotali }: Props) => {
    
    const getSortOrder = (nome: string) => {
        const lowerNome = nome.toLowerCase();
        if (lowerNome === 'ordinaria') return 0;
        if (lowerNome === 'straordinario (>8h)') return 1;
        if (lowerNome === 'straordinario') return 2;
        return 3;
    };

    const sortedDettaglio = Array.from(dettaglio.values()).sort((a, b) => {
        const orderA = getSortOrder(a.nome);
        const orderB = getSortOrder(b.nome);
        if (orderA !== orderB) {
            return orderA - orderB;
        }
        return a.nome.localeCompare(b.nome);
    });

    const totalOre = sortedDettaglio.reduce((acc, item) => acc + item.oreTotali, 0);

    if (sortedDettaglio.length === 0) {
        return (
            <Paper elevation={3} sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                <Typography variant="h6">Dettaglio Attività</Typography>
                <Typography color="text.secondary" sx={{ mt: 2 }}>Nessun dettaglio disponibile</Typography>
            </Paper>
        );
    }

    return (
        <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="h5" gutterBottom component="div" sx={{ flexGrow: 1 }}>
                    Dettaglio Attività
                </Typography>
                <Tooltip title="Le ore sono calcolate in base alla tipologia di giornata. La colonna 'Presenze' indica il numero di giornate uniche in cui compare quel tipo di attività.">
                    <HelpOutline color="action" />
                </Tooltip>
            </Box>
            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead sx={{ backgroundColor: 'background.default' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Tipo Attività</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Presenze</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Tot. Ore</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sortedDettaglio.map((voce) => {
                            if (voce.oreTotali <= 0 && voce.giorni <= 0) return null; 
                            return (
                            <TableRow key={voce.id}>
                                <TableCell component="th" scope="row">
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                     <Box sx={{ 
                                        width: 12, 
                                        height: 12, 
                                        borderRadius: '50%', 
                                        backgroundColor: voce.nome.toLowerCase().includes('trasferta') ? voce.colore : 'white',
                                        border: `1px solid ${voce.colore || '#e0e0e0'}`,
                                        mr: 1, 
                                        flexShrink: 0 
                                    }} />
                                    <Typography variant="body2">{voce.nome}</Typography>
                                </Box>
                                </TableCell>
                                <TableCell align="center">{voce.giorni > 0 ? voce.giorni : '-'}</TableCell>
                                 <TableCell align="right">{voce.oreTotali > 0 ? voce.oreTotali.toFixed(2) : '-'}</TableCell>
                            </TableRow>
                        )})}
                    </TableBody>
                     <TableFooter sx={{ backgroundColor: 'background.default' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Totale</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>{giorniTotali}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>{totalOre.toFixed(2)}</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </TableContainer>
        </Paper>
    );
};

export default DettaglioOreTipoGiornata;
