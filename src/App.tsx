import { Routes, Route } from 'react-router-dom';
import { Container, Box } from '@mui/material';

import PrivateRoute from './components/PrivateRoute';
import CustomAppBar from './components/AppBar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
// Rimosso il vecchio import
// import RapportinoNew from './pages/RapportinoNew'; 
import RapportinoEdit from './pages/RapportinoEdit'; // Import del nuovo componente corretto

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      <Route 
        path="/*" 
        element={
          <PrivateRoute>
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
              <CustomAppBar />
              <Container 
                component="main" 
                maxWidth="xl" // Aumentato a xl per dare più spazio al form complesso
                sx={{
                  flexGrow: 1, 
                  py: 3, 
                  display: 'flex', 
                  flexDirection: 'column',
                  overflowY: 'auto'
                }}
              >
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  {/* Nuove rotte per la pagina di creazione e modifica */}
                  <Route path="/rapportino/nuovo" element={<RapportinoEdit />} />
                  <Route path="/rapportino/modifica/:id" element={<RapportinoEdit />} />
                </Routes>
              </Container>
            </Box>
          </PrivateRoute>
        }
      />
    </Routes>
  );
};

export default App;
