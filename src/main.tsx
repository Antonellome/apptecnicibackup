import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css'; // Importa gli stili globali corretti
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "./theme";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      {/* CssBaseline normalizza gli stili ma i nostri stili in styles.css sono più specifici */}
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
