import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import {
    Box,
    Typography,
    TextField,
    Button,
    CircularProgress,
    Alert,
    Container,
    Grid, // Grid v2
    Link as MuiLink
} from '@mui/material';
import { auth } from '@/utils/firebase';
import { useAuth } from '@/hooks/useAuth';

const LoginPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResetSent(false);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Email o password non validi.');
      } else {
        setError('Si è verificato un errore durante il login.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setError('Per favore, inserisci un indirizzo email per resettare la password.');
      return;
    }
    setLoading(true);
    setError('');
    setResetSent(false);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch {
      setError('Impossibile inviare l\'email di reset. Controlla l\'indirizzo email.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || user) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <CircularProgress />
        </Box>
      );
  }

  return (
    <Container component="main" maxWidth="xs">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img src="/logo png trasp.png" alt="Logo" style={{ width: 60, height: 60, marginBottom: 16 }} />
        <Typography component="h1" variant="h5" sx={{ fontWeight: 'bold' }}>
          R.I.S.O. App Tecnici
        </Typography>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          Report Individuali Sincronizzati Online
        </Typography>
        
        <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
          {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
          {resetSent && <Alert severity="success" sx={{ width: '100%', mb: 2 }}>Email di reset inviata! Controlla la tua casella di posta.</Alert>}
          
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Indirizzo Email"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Accedi'}
          </Button>
          
          <Grid container justifyContent="flex-end">
            <Grid>
              <MuiLink href="#" variant="body2" onClick={handlePasswordReset}>
                Hai dimenticato la password?
              </MuiLink>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Container>
  );
};

export default LoginPage;
