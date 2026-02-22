import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import {
    Box,
    Typography,
    TextField,
    Button,
    CircularProgress,
    Alert,
    Container,
    Grid,
    Link as MuiLink
} from '@mui/material';
import { app } from '@/utils/firebase';
import { useAuth } from '@/hooks/useAuth';

const LoginPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('antonio.scuderi@gmail.com');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth(app);

  useEffect(() => {
    // Questo listener attende che l'AuthContext confermi l'autenticazione
    // e solo allora naviga alla pagina principale.
    if (!authLoading && user) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true); // Attiva lo spinner sul pulsante
    setError('');
    setResetSent(false);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Il login ha successo. Non navighiamo da qui,
      // lasciamo che sia l'useEffect a farlo.
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Email o password non validi.');
      } else {
        setError('Si è verificato un errore durante il login.');
      }
    } finally {
      // **LA CORREZIONE È QUI**
      // Indipendentemente dal successo o fallimento, disattiviamo lo spinner.
      // Questo sblocca l'interfaccia e risolve il problema.
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
    } catch (error: any) {
      setError('Impossibile inviare l\'email di reset. Controlla l\'indirizzo email.');
    } finally {
      setLoading(false);
    }
  };

  // Mostra uno spinner a tutta pagina mentre l'AuthContext si inizializza o se l'utente è già loggato
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
