import React from 'react';
import { Box, Paper, Typography, ButtonBase, Badge } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications'; // Import the hook
import PostAddIcon from '@mui/icons-material/PostAdd';
import ArticleIcon from '@mui/icons-material/Article';
import CalendarViewMonthIcon from '@mui/icons-material/CalendarViewMonth';
import NotificationsIcon from '@mui/icons-material/Notifications';

const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { unreadCount } = useNotifications(user?.uid || null); // Get the unread count

    const iconStyles = { fontSize: 'clamp(40px, 10vw, 60px)' };

    const dashboardItems = [
        { title: 'Nuovo report', path: '/report/nuovo', icon: <PostAddIcon sx={iconStyles} /> },
        { title: 'Report', path: '/reports', icon: <ArticleIcon sx={iconStyles} /> },
        { title: 'Report mensili', path: '/report-mensile', icon: <CalendarViewMonthIcon sx={iconStyles} /> },
        {
            title: 'Notifiche',
            path: '/notifiche',
            icon: (
                <Badge badgeContent={unreadCount} color="error">
                    <NotificationsIcon sx={iconStyles} />
                </Badge>
            ),
        },
    ];

    return (
        <Box 
            sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                minHeight: 'calc(100vh - 64px)', 
                p: { xs: 2, sm: 3 },
            }}
        >
            <Box sx={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                <Box 
                    sx={{
                      border: '2px solid',
                      borderColor: 'primary.main',
                      borderRadius: '16px',
                      p: 2,
                      mb: 4,
                      textAlign: 'center',
                      width: '100%',
                      bgcolor: 'rgba(13, 71, 161, 0.1)',
                    }}
                >
                    <Typography variant="h5" component="h1" sx={{ fontWeight: '500', color: 'white' }}>
                      Benvenuto
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'white' }}>
                      {user?.email}
                    </Typography>
                </Box>
                
                <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ maxWidth: '500px', mb: 4 }}>
                    {dashboardItems.map((item) => (
                        <Grid size={{ xs: 6 }} key={item.title}>
                            <ButtonBase
                                onClick={() => navigate(item.path)}
                                sx={{
                                    width: '100%',
                                    borderRadius: '16px',
                                    transition: 'transform 0.2s ease-in-out',
                                    '&:hover': { transform: 'scale(1.04)' },
                                }}
                            >
                                <Paper
                                    elevation={8}
                                    sx={{
                                        backgroundColor: 'primary.main',
                                        color: 'white',
                                        width: '100%',
                                        aspectRatio: '1 / 1', 
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '16px',
                                    }}
                                >
                                    {item.icon}
                                    <Typography variant="h6" component="h2" sx={{ mt: 1.5, textAlign: 'center', fontWeight: '500', fontSize: { xs: '0.9rem', sm: '1.1rem' } }}>
                                        {item.title}
                                    </Typography>
                                </Paper>
                            </ButtonBase>
                        </Grid>
                    ))}
                </Grid>
                
                <Box 
                    sx={{
                      border: '2px solid',
                      borderColor: 'primary.main',
                      borderRadius: '16px',
                      p: 1,
                      textAlign: 'center',
                      width: '100%',
                    }}
                >
                    <Typography variant="body1" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                      by AS
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};

export default HomePage;
