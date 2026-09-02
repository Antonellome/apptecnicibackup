import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null); // Specifico il tipo per TypeScript
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => { // Aggiungo il tipo per l'evento
    e.preventDefault();
    setError(null);
    try {
      await signIn(email, password);
      navigate('/'); // Reindirizzamento dopo il login riuscito
    } catch (err: any) { // Aggiungo il tipo per l'errore
      setError(err.message || 'Credenziali non corrette.');
      console.error(err);
    }
  };

  return (
    <div>
      <h2>Accesso Tecnici</h2>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        <button type="submit">Accedi</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default LoginPage;
