import { useParams } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useData } from '@/hooks/useData';
import { Cliente, Nave, Luogo, Veicolo, Tecnico, TipoGiornata } from '@/models/definitions';

// Definiamo le colonne per ogni tipo di anagrafica
const columnsConfig: Record<string, GridColDef[]> = {
  clienti: [
    { field: 'id', headerName: 'ID', width: 250 },
    { field: 'nome', headerName: 'Nome Cliente', width: 250 },
  ],
  navi: [
    { field: 'id', headerName: 'ID', width: 250 },
    { field: 'nome', headerName: 'Nome Nave', width: 250 },
  ],
  luoghi: [
    { field: 'id', headerName: 'ID', width: 250 },
    { field: 'nome', headerName: 'Nome Luogo', width: 250 },
  ],
  veicoli: [
    { field: 'id', headerName: 'ID', width: 200 },
    { field: 'targa', headerName: 'Targa', width: 150 },
    { field: 'marca', headerName: 'Marca', width: 150 },
    { field: 'modello', headerName: 'Modello', width: 150 },
  ],
  tecnici: [
    { field: 'id', headerName: 'ID', width: 250 },
    { field: 'nome', headerName: 'Nome', width: 150 },
    { field: 'cognome', headerName: 'Cognome', width: 150 },
    { field: 'email', headerName: 'Email', width: 250 },
  ],
  tipiGiornata: [
    { field: 'id', headerName: 'ID', width: 250 },
    { field: 'nome', headerName: 'Nome Tipo', width: 250 },
  ],
};

// Un tipo per mappare le chiavi alle nostre anagrafiche
type DataKey = keyof Omit<ReturnType<typeof useData>, 'loading'>;

const AnagrafichePage = () => {
  const { tipo } = useParams<{ tipo: string }>();
  const { loading, ...data } = useData();

  // Se il tipo non è valido o non è una chiave dei nostri dati, mostra un errore.
  if (!tipo || !(tipo in columnsConfig)) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Tipo di anagrafica non valido o non trovato.</Alert>
      </Box>
    );
  }

  const dataKey = tipo as DataKey;
  const rows = data[dataKey];
  const columns = columnsConfig[dataKey];

  const title = tipo.charAt(0).toUpperCase() + tipo.slice(1);

  return (
    <Box sx={{ p: 3, height: 'calc(100vh - 120px)', width: '100%' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Gestione Anagrafica: {title}
      </Typography>

      {loading ? (
        <CircularProgress />
      ) : (
        <Box sx={{ height: '90%', width: '100%' }}>
          <DataGrid
            rows={rows}
            columns={columns}
            initialState={{
                pagination: {
                    paginationModel: { pageSize: 10, page: 0 },
                },
            }}
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
          />
        </Box>
      )}
    </Box>
  );
};

export default AnagrafichePage;
