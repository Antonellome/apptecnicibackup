import { Paper, Typography, Box, Divider, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { AccessTime, MoreTime, Functions, FlightTakeoff } from '@mui/icons-material';
import { RiepilogoMese } from '@/pages/MonthlyReportPage';

interface Props {
    riepilogo: RiepilogoMese;
}

const RiepilogoOre = ({ riepilogo }: Props) => {

    const summaryItems = [
        { 
            icon: <AccessTime color="primary" />, 
            label: 'Ore Ordinarie', 
            value: `${riepilogo.oreOrdinarie.toFixed(2)}h` 
        },
        { 
            icon: <MoreTime color="secondary" />, 
            label: 'Ore Straordinarie', 
            value: `${riepilogo.oreStraordinarie.toFixed(2)}h`
        },
        { 
            icon: <Functions sx={{ color: 'success.main' }}/>, 
            label: 'Ore Totali Lavorate', 
            value: `${riepilogo.oreTotali.toFixed(2)}h`, 
            isTotal: true 
        },
        { 
            icon: <FlightTakeoff sx={{ color: 'info.main' }}/>, 
            label: 'Giorni di Trasferta', 
            value: `${riepilogo.giorniTrasferta} gg` 
        },
    ];

    return (
        <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h5" gutterBottom>Riepilogo Ore</Typography>
            <List dense>
                {summaryItems.map((item, index) => (
                    <Box key={index}>
                        <ListItem disableGutters>
                            <ListItemIcon sx={{ minWidth: 40 }}>
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText 
                                primary={item.label} 
                                primaryTypographyProps={{ variant: item.isTotal ? 'subtitle1' : 'body1', fontWeight: item.isTotal ? 'bold' : 'normal'}}
                            />
                            <Typography variant={item.isTotal ? 'h6' : 'body1'} fontWeight={item.isTotal ? 'bold' : 'normal'}>
                                {item.value}
                            </Typography>
                        </ListItem>
                        {item.isTotal && <Divider sx={{ my: 1 }} />}
                    </Box>
                ))}
            </List>
        </Paper>
    );
};

export default RiepilogoOre;
