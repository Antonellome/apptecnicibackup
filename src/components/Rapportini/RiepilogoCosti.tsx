import { Paper, Typography, Box } from '@mui/material';
import Grid from '@mui/material/Grid'; // Using Grid v2
import { RiepilogoMese } from '@/models/definitions';
import { formatCurrency } from '@/lib/utils';

interface RiepilogoCostiProps {
    riepilogo: RiepilogoMese | null;
}

const RiepilogoCosti = ({ riepilogo }: RiepilogoCostiProps) => {
    if (!riepilogo) return null;

    const { oreTotali, costoTotale } = riepilogo;

    return (
        <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h5" gutterBottom>Riepilogo</Typography>
            <Grid container spacing={2} sx={{ alignItems: 'center', height: 'calc(100% - 40px)' }}>
                <Grid size={6} sx={{ textAlign: 'center' }}>
                    <Box>
                        <Typography variant="h4" component="p" sx={{ fontWeight: 'bold' }}>
                            {oreTotali.toFixed(2)}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Ore Totali
                        </Typography>
                    </Box>
                </Grid>
                <Grid size={6} sx={{ textAlign: 'center' }}>
                    <Box>
                        <Typography variant="h4" component="p" sx={{ fontWeight: 'bold' }}>
                            {formatCurrency(costoTotale)}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Costo Stimato
                        </Typography>
                    </Box>
                </Grid>
            </Grid>
        </Paper>
    );
};

export default RiepilogoCosti;
