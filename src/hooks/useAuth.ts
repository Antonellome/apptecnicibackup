// CIAO. Questo hook fornisce un modo sicuro per accedere al contesto di autenticazione.
import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";

export const useAuth = () => {
  // Accede al valore del contesto.
  const context = useContext(AuthContext);

  // **LA CORREZIONE È QUI**
  // Se il contesto è 'undefined', significa che stiamo cercando di usare l'hook
  // al di fuori di un AuthProvider. Questo è un errore di programmazione.
  // Lanciando un errore chiaro, rendiamo il sistema più robusto e facile da debuggare.
  if (context === undefined) {
    throw new Error("useAuth deve essere utilizzato all'interno di un AuthProvider.");
  }

  // Se il contesto è disponibile, lo restituisce.
  return context;
};
