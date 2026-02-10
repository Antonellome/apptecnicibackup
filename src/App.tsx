
import { Routes, Route } from 'react-router-dom';
import { Container, Box } from '@mui/material';

import PrivateRoute from './components/PrivateRoute';
import CustomAppBar from './components/AppBar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RapportinoNew from './pages/RapportinoNew';

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
              {/* --- MODIFICA PER SCORRIMENTO --- */}
              <Container 
                component="main" 
                maxWidth="lg" 
                sx={{
                  flexGrow: 1, 
                  py: 3, 
                  display: 'flex', 
                  flexDirection: 'column',
                  overflowY: 'auto' // Abilita lo scorrimento verticale se necessario
                }}
              >
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/rapportini/nuovo" element={<RapportinoNew />} />
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
