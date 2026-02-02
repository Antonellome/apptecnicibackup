import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, TextField, Button, CircularProgress, Alert } from '@mui/material';
import { useAuth } from '../hooks/useAuth';

const LoginPage = () => {
  const [email, setEmail] = useState('antonio.scuderi@gmail.com');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Se l'utente è già loggato, lo redireziona alla home
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/'); // Reindirizzamento al successo
    } catch (err: any) {
      // Semplice gestione dell'errore di Firebase Auth
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Credenziali non valide. Riprova.');
      } else {
        setError('Si è verificato un errore inatteso.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#000000',
        padding: 3,
      }}
    >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" component="div" sx={{ color: '#4F7DFF', fontWeight: 'bold', lineHeight: 1.1 }}>
                R.I.S.O.
            </Typography>
            <Typography variant="h6" component="div" sx={{ color: '#4F7DFF', opacity: 0.9 }}>
                App Tecnici
            </Typography>
        </Box>

        <Typography sx={{ fontSize: 18, color: '#4F7DFF', opacity: 0.8, textAlign: 'center', mb: 4 }}>
          Report Individuali Sincronizzati Online
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', maxWidth: 360 }}>
          <TextField
            label="Email"
            variant="filled"
            fullWidth
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete='email'
            sx={{ 
              '& .MuiFilledInput-root': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
              '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
              '& .MuiInputBase-input': { color: '#ffffff' },
            }}
          />
          <TextField
            label="Password"
            type="password"
            variant="filled"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete='current-password'
            sx={{ 
              '& .MuiFilledInput-root': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
              '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
              '& .MuiInputBase-input': { color: '#ffffff' },
              mb: 2 
            }}
          />
          
          {error && (
            <Alert severity="warning" sx={{ mt: 2, background: '#FFB74D', color: '#6A4F00' }}>
              {error}
            </Alert>
          )}
          
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            size="large"
            sx={{
                backgroundColor: '#4F7DFF',
                padding: '14px 0',
                borderRadius: 50,
                fontSize: '18px',
                fontWeight: '600',
                mt: 3,
                boxShadow: '0 4px 20px 0 rgba(79, 125, 255, 0.5)',
                '&:hover': { backgroundColor: '#406AD4' }
            }}
          >
            {loading ? <CircularProgress size={26} color="inherit" /> : 'Accedi'}
          </Button>
        </Box>

        <Typography sx={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.6)', fontStyle: 'italic', mt: 4 }}>
          by AS
        </Typography>
    </Box>
  );
};

export default LoginPage;
