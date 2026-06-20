import React from 'react';
import { type RiepilogoMese } from '@/models/definitions';
import {
  Paper, 
  Typography, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Divider, 
} from '@mui/material';
import {
  FaBriefcase, 
  FaBed, 
  FaCoffee, 
  FaPlaneDeparture, 
  FaRegCalendarCheck, 
  FaProcedures,
  FaStarOfLife,
} from 'react-icons/fa';

interface RiepilogoNumericoProps {
  riepilogo: RiepilogoMese;
}

const RiepilogoNumerico: React.FC<RiepilogoNumericoProps> = ({ riepilogo }) => {

  const getGiorniByNome = (nome: string): number => {
    for (const voce of riepilogo.dettaglio.values()) {
      if (voce.nome.toLowerCase() === nome.toLowerCase()) {
        return voce.giorni;
      }
    }
    return 0;
  }

  const items = [
    { label: 'Giorni Lavorati', value: getGiorniByNome('ordinaria'), icon: <FaBriefcase color="#1976d2" /> },
    { label: 'Giorni Straordinario', value: getGiorniByNome('straordinario'), icon: <FaPlaneDeparture color="#f57c00" /> },
    { label: 'Giorni di Ferie', value: getGiorniByNome('ferie'), icon: <FaBed color="#4caf50" /> },
    { label: 'Giorni di Malattia', value: getGiorniByNome('malattia'), icon: <FaProcedures color="#d32f2f" /> },
    { label: 'Giorni di Permesso', value: getGiorniByNome('permesso'), icon: <FaCoffee color="#795548" /> },
    { label: 'Festivi Goduti', value: getGiorniByNome('festivo'), icon: <FaStarOfLife color="#ffeb3b" /> },
  ];

  return (
    <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
      <Typography variant="h5" gutterBottom>Riepilogo Giorni</Typography>
      <List dense>
        {items.map((item, index) => (
          <ListItem key={index} disablePadding>
            <ListItemIcon sx={{ minWidth: 32 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.label} />
            <Typography variant="body1" fontWeight="bold">{item.value}</Typography>
          </ListItem>
        ))}
        <Divider sx={{ my: 1.5 }} />
        <ListItem disablePadding>
          <ListItemIcon sx={{ minWidth: 32 }}>
            <FaRegCalendarCheck color="#000" />
          </ListItemIcon>
          <ListItemText primary="Totale Giorni di Presenza" primaryTypographyProps={{ fontWeight: 'bold'}} />
          <Typography variant="h6" fontWeight="bold">{riepilogo.giorniTotaliLavorati}</Typography>
        </ListItem>
      </List>
    </Paper>
  );
};

export default RiepilogoNumerico;
