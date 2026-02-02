
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

const AccessoApp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess('');
    try {
      // Livello 1: Autenticazione
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      setSuccess('Autenticazione riuscita! Ora verifico i permessi...');

      // Livello 2: Autorizzazione
      const userDocRef = doc(db, 'tecnici', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists() && userDoc.data().accessoApp === true) {
        setSuccess('Accesso completato con successo! Utente autorizzato.');
        alert('Accesso completato con successo!');
      } else {
        setError('Accesso Fallito: Utente non autorizzato. Contattare l\'amministratore.');
        alert('Accesso Fallito: Utente non autorizzato. Contattare l\'amministratore.');
      }

    } catch (error) {
      setError('Credenziali non corrette.');
      console.error(error);
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
      {success && <p style={{ color: 'green' }}>{success}</p>}
    </div>
  );
};

export default AccessoApp;
