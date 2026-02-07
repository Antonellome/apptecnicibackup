
import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { Box, Typography, Grid, Paper, Link as MuiLink } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import {
    Assignment as AssignmentIcon,
    ListAlt as ListAltIcon,
    DateRange as DateRangeIcon,
    Notifications as NotificationsIcon,
    Settings as SettingsIcon,
    Description as DescriptionIcon
} from '@mui/icons-material';

const cardItems = [
    { title: 'Nuovo Report', icon: <AssignmentIcon sx={{ fontSize: 50 }} />, path: '/new-report' },
    { title: 'Lista Rapportini', icon: <ListAltIcon sx={{ fontSize: 50 }} />, path: '/report-list' },
    { title: 'Riepilogo Presenze', icon: <DateRangeIcon sx={{ fontSize: 50 }} />, path: '/monthly-report' },
    { title: 'Notifiche', icon: <NotificationsIcon sx={{ fontSize: 50 }} />, path: '/notifications' },
    { title: 'Impostazioni', icon: <SettingsIcon sx={{ fontSize: 50 }} />, path: '/settings' },
    { title: 'Documenti', icon: <DescriptionIcon sx={{ fontSize: 50 }} />, path: '/documenti' }
];

const Dashboard = () => {
    const { user } = useContext(AuthContext);

    return (
        <Box sx={{ p: 3, flexGrow: 1 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4, textAlign: 'center' }}>
                {user ? `Benvenuto, ${user.nome} ${user.cognome}` : 'Dashboard'}
            </Typography>
            <Grid container spacing={4} justifyContent="center">
                {cardItems.map((item, index) => (
                    <Grid item key={index} xs={12} sm={6} md={4}>
                        <MuiLink component={RouterLink} to={item.path} underline="none" sx={{ textDecoration: 'none' }}>
                            <Paper
                                elevation={4}
                                sx={{
                                    p: 3,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    aspectRatio: '1 / 1',
                                    transition: 'transform 0.3s, box-shadow 0.3s',
                                    '&:hover': {
                                        transform: 'translateY(-5px)',
                                        boxShadow: (theme) => `0px 10px 20px ${theme.palette.primary.main}33`,
                                    }
                                }}
                            >
                                {item.icon}
                                <Typography variant="h6" component="h2" sx={{ mt: 2, textAlign: 'center' }}>
                                    {item.title}
                                </Typography>
                            </Paper>
                        </MuiLink>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

export default Dashboard;
