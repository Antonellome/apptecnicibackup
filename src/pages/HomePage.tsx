// CIAO. OBBEDISCO. SOLUZIONE FINALE. CONTENITORE CENTRATO E COLORE FORZATO.
import React from 'react';
import { Box, Paper, Typography, ButtonBase } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import PostAddIcon from '@mui/icons-material/PostAdd';
import ArticleIcon from '@mui/icons-material/Article';
import CalendarViewMonthIcon from '@mui/icons-material/CalendarViewMonth';
import EditNoteIcon from '@mui/icons-material/EditNote';

const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const dashboardItems = [
        { title: 'Nuovo report', path: '/rapportino/nuovo', icon: <PostAddIcon sx={{ fontSize: 'clamp(40px, 10vw, 70px)' }} /> },
        { title: 'Report', path: '/reports', icon: <ArticleIcon sx={{ fontSize: 'clamp(40px, 10vw, 70px)' }} /> },
        { title: 'Report mensili', path: '/report-mensile', icon: <CalendarViewMonthIcon sx={{ fontSize: 'clamp(40px, 10vw, 70px)' }} /> },
        { title: 'Note', path: '/note', icon: <EditNoteIcon sx={{ fontSize: 'clamp(40px, 10vw, 70px)' }} /> },
    ];

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)', p: { xs: 2, sm: 3 } }}>
            {/* CIAO: OBBEDISCO. Contenitore a prova di bomba per centrare e ingrandire. */}
            <Box sx={{ width: '100%', maxWidth: '800px', mx: 'auto' }}>
                <Box 
                    sx={{
                      border: '2px solid',
                      borderColor: 'primary.main',
                      borderRadius: '16px',
                      p: 2,
                      mb: 4,
                      textAlign: 'center',
                      width: '100%', // Occupa tutto il nuovo contenitore
                      bgcolor: 'rgba(13, 71, 161, 0.1)',
                    }}
                >
                    <Typography variant="h5" component="h1" sx={{ fontWeight: '500' }}>
                      Benvenuto
                    </Typography>
                    {/* CIAO: OBBEDISCO. Colore bianco forzato con !important. */}
                    <Typography variant="body1" sx={{ color: '#FFFFFF !important' }}>
                      {user?.email}
                    </Typography>
                </Box>
                
                <Box
                    sx={{
                        width: '100%', // Occupa tutto il nuovo contenitore
                        aspectRatio: '1 / 1',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: { xs: 2, sm: 3 },
                    }}
                >
                    {dashboardItems.map((item) => (
                        <ButtonBase
                            key={item.title}
                            onClick={() => navigate(item.path)}
                            sx={{
                                width: '100%',
                                height: '100%',
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
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '16px',
                                }}
                            >
                                {item.icon}
                                <Typography variant="h6" component="h2" sx={{ mt: 1.5, textAlign: 'center', fontWeight: '500', fontSize: { xs: '0.9rem', sm: '1.1rem', md: '1.25rem' } }}>
                                    {item.title}
                                </Typography>
                            </Paper>
                        </ButtonBase>
                    ))}
                </Box>
                
                <Box 
                    sx={{
                      border: '2px solid',
                      borderColor: 'primary.main',
                      borderRadius: '16px',
                      p: 1,
                      mt: 4,
                      textAlign: 'center',
                      width: '100%', // Occupa tutto il nuovo contenitore
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
