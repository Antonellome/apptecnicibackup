import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Box, Tooltip, TableFooter } from '@mui/material';
import { HelpOutline } from '@mui/icons-material';
import { type DettaglioVoce } from '@/models/definitions';

interface Props {
    dettaglio: Map<string, DettaglioVoce>;
}

const DettaglioOreTipoGiornata = ({ dettaglio }: Props) => {
    
    const getSortOrder = (nome: string) => {
        const lowerNome = nome.toLowerCase();
        if (lowerNome === 'ordinaria') return 0;
        if (lowerNome === 'straordinario') return 1;
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

    const righeOre = sortedDettaglio.filter((voce) => !voce.nome.toLowerCase().includes('trasferta'));
    const righeTrasferta = sortedDettaglio.filter((voce) => voce.nome.toLowerCase().includes('trasferta'));

    const totalOre = righeOre.reduce((acc, item) => acc + item.oreTotali, 0);
    const totaleGiorniTrasferta = righeTrasferta.reduce((acc, item) => acc + item.giorni, 0);

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
                <Tooltip title="Le ore sono calcolate in base alla tipologia di giornata. Le trasferte sono riportate separatamente con il conteggio giorni.">
                    <HelpOutline color="action" />
                </Tooltip>
            </Box>
            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead sx={{ backgroundColor: 'background.default' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Tipo Attività</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Tot. Ore</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {righeOre.map((voce) => {
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
                                 <TableCell align="right">{voce.oreTotali > 0 ? voce.oreTotali.toFixed(2) : '-'}</TableCell>
                            </TableRow>
                        )})}
                    </TableBody>
                     <TableFooter sx={{ backgroundColor: 'background.default' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Totale</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>{totalOre.toFixed(2)}</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </TableContainer>

            <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Trasferte (giorni)</Typography>
                {righeTrasferta.filter(voce => voce.giorni > 0).length === 0 ? (
                    <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="body2" color="text.secondary">Nessuna trasferta nel periodo.</Typography>
                    </Paper>
                ) : (
                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                            <TableHead sx={{ backgroundColor: 'background.default' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Tipo Trasferta</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Giorni</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {righeTrasferta
                                    .filter(voce => voce.giorni > 0)
                                    .map((voce) => (
                                        <TableRow key={`trasferta-${voce.id}`}>
                                            <TableCell component="th" scope="row">
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <Box sx={{ 
                                                        width: 12,
                                                        height: 12,
                                                        borderRadius: '50%',
                                                        backgroundColor: voce.colore || '#90caf9',
                                                        border: `1px solid ${voce.colore || '#90caf9'}`,
                                                        mr: 1,
                                                        flexShrink: 0
                                                    }} />
                                                    <Typography variant="body2">{voce.nome}</Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell align="right">{voce.giorni}</TableCell>
                                        </TableRow>
                                    ))}
                            </TableBody>
                            <TableFooter sx={{ backgroundColor: 'background.default' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Totale trasferte</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>{totaleGiorniTrasferta}</TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </TableContainer>
                )}
            </Box>
        </Paper>
    );
};

export default DettaglioOreTipoGiornata;
