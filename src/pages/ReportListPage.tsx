import React, { useState, useMemo, Fragment, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  Paper,
  Typography,
  Button,
  Alert,
  Chip,
  Divider,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { WifiOff, CloudQueue, Gesture, Edit, Share, Delete, AccountCircle } from '@mui/icons-material';
import { format, startOfMonth, addMonths, isAfter, isSameMonth, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { useLiveQuery } from 'dexie-react-hooks';
import { EnrichedRapportino } from '@/models/definitions';
import FullScreenLoader from '@/components/FullScreenLoader';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { AuthContext } from '@/contexts/AuthContextDefinition';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { db } from '@/db/local-db';
import { aggiungiAllaCoda } from '@/services/syncService';
import { generateRapportinoPDF } from '@/services/rapportinoPDFGenerator';
import { shareOrDownload } from '@/services/shareService';
import { useSyncManager } from '@/hooks/useSyncManager';
import { GlobalDataContext } from '@/contexts/GlobalDataContext'; 
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

const ReportListPage: React.FC = () => {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const authContext = useContext(AuthContext);
  const userProfile = authContext?.userProfile;
  const { requestManualSync } = useSyncManager();
  const isOnline = useOnlineStatus();
  
  const globalDataContext = useContext(GlobalDataContext);
  const masterData = globalDataContext?.masterData;
  const collectionsLoading = globalDataContext?.loading;

  const rapportiniGrezzi = useLiveQuery(() => 
    db.rapportini.orderBy('data').reverse().toArray()
  , []);

  const enrichedRapportini = useMemo(() => {
    if (!rapportiniGrezzi || !masterData || !userProfile) return [];

    return rapportiniGrezzi.reduce<EnrichedRapportino[]>((acc, report) => {
      const isNonWorkingDay = !report.dettaglioOreTecnici || report.dettaglioOreTecnici.length === 0;
      let isUserInvolved = false;

      if (isNonWorkingDay) {
        isUserInvolved = report.tecnicoId === userProfile.tecnicoId;
      } else {
        isUserInvolved = report.dettaglioOreTecnici.some(d => d.tecnicoId === userProfile.tecnicoId);
      }

      if (!isUserInvolved) {
        return acc;
      }

      const tipoGiornata = masterData.tipiGiornata.find(t => t.id === report.tipoGiornataId);
      const nave = masterData.navi.find(n => n.id === report.naveId);
      const luogo = masterData.luoghi.find(l => l.id === report.luogoId);
      const tecnicoScrivente = masterData.tecnici.find(t => t.id === report.tecnicoScriventeId);

      const dettagliTecnico = report.dettaglioOreTecnici?.filter(d => d.tecnicoId === userProfile.tecnicoId) || [];
      const oreLavorateTecnico = dettagliTecnico.reduce((acc, curr) => acc + (curr.ore || 0), 0);
      const orariTecnico = dettagliTecnico.map(d => {
        if (d.isManual) {
          return `Manuale: ${d.ore || 0}h`;
        }
        if (d.oraInizio && d.oraFine) {
          return `${d.oraInizio}-${d.oraFine} (${(d.ore || 0).toFixed(2)}h)`;
        }
        return '';
      }).filter(Boolean).join(', ');

      const enrichedReport = {
        ...report,
        tipoGiornata: tipoGiornata,
        naveNome: nave?.nome,
        luogoNome: luogo?.nome,
        creatore: tecnicoScrivente?.nome || 'N/D',
        isEditable: true,
        isClickable: true,
        oreDisplay: oreLavorateTecnico > 0 ? `${oreLavorateTecnico.toFixed(2)} ore` : '',
        orariDisplay: orariTecnico,
        hasFirma: !!report.firmaVettoriale,
      } as EnrichedRapportino;

      acc.push(enrichedReport);
      return acc;
    }, []);
  }, [rapportiniGrezzi, masterData, userProfile, masterData?.navi, masterData?.luoghi]);


  const [menuState, setMenuState] = useState<{ anchorEl: HTMLElement; report: EnrichedRapportino; } | null>(null);
  const [reportToDelete, setReportToDelete] = useState<EnrichedRapportino | null>(null);
  const [isConfirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date | null>(null);
  const offlineSyncEventsCount = useLiveQuery(() => db.syncQueue.where('type').equals('rapportino').count(), []);

  useEffect(() => {
    if (enrichedRapportini && !currentMonth) {
      setCurrentMonth(startOfMonth(enrichedRapportini.length > 0 ? enrichedRapportini[0].data : new Date()));
    }
  }, [enrichedRapportini, currentMonth]);

  const displayedRapportini = useMemo(() => {
    if (!enrichedRapportini || !currentMonth) return [];
    return enrichedRapportini.filter(r => isSameMonth(r.data, currentMonth));
  }, [enrichedRapportini, currentMonth]);

  if (collectionsLoading || !rapportiniGrezzi || !currentMonth || !masterData) return <FullScreenLoader />;

  const handleRowClick = (event: React.MouseEvent<HTMLElement>, report: EnrichedRapportino) => {
    event.preventDefault();
    setMenuState({ anchorEl: event.currentTarget, report });
  };

  const handleMenuClose = () => setMenuState(null);

  const handleEdit = () => {
    if (!menuState) return;
    navigate(menuState.report.id.startsWith('local-') ? `/report/edit-offline/${menuState.report.id}` : `/report/edit/${menuState.report.id}`);
    handleMenuClose();
  };

  const handleShare = async () => {
    if (!menuState || !masterData) {
      showSnackbar("Dati non pronti per la condivisione.", "error");
      return;
    }
    const { report } = menuState;
    setIsProcessing(true);
    handleMenuClose();
    try {
      const fullReport = await db.rapportini.get(report.id);
      if (!fullReport) throw new Error("Rapportino non trovato nel database locale.");
      const pdfBlob = await generateRapportinoPDF(fullReport, masterData);
      await shareOrDownload(pdfBlob, `Rapportino_${format(fullReport.data, 'dd-MM-yyyy')}.pdf`);
    } catch (error) {
      console.error("Errore durante la condivisione:", error);
      if ((error as DOMException).name !== 'AbortError') {
        showSnackbar(`Impossibile condividere: ${(error as Error).message}`, "error");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = () => {
    if (!menuState || !userProfile) return;
    const { report } = menuState;
    if (report.tecnicoId !== userProfile.tecnicoId) {
      showSnackbar("Non puoi cancellare un report creato da un altro tecnico.", "warning");
    } else if (!isSameMonth(new Date(report.data), new Date())) {
      showSnackbar("Puoi cancellare solo i report del mese corrente.", "warning");
    } else {
      setReportToDelete(report);
      setConfirmDeleteDialogOpen(true);
    }
    handleMenuClose();
  };

  const confirmDelete = async () => {
    if (!reportToDelete) return;
    setIsProcessing(true);
    setConfirmDeleteDialogOpen(false);
    try {
      const fullReport = await db.rapportini.get(reportToDelete.id);
      if (!fullReport) throw new Error("Rapportino non più esistente nel db locale.");

      const updatedReport = { ...fullReport, isDeleted: true };

      await db.rapportini.put(updatedReport);
      
      await aggiungiAllaCoda({
        type: 'rapportino',
        action: 'update',
        entityId: reportToDelete.id,
        payload: updatedReport
      });

      showSnackbar("Rapportino contrassegnato come eliminato.", "success");
      requestManualSync();

    } catch (error) {
      console.error("Errore durante la cancellazione (soft delete):", error);
      showSnackbar(`Errore: ${(error as Error).message}`, "error");
    } finally {
      setIsProcessing(false);
      setReportToDelete(null);
    }
  };

  const handleMonthChange = (increment: number) => setCurrentMonth(prev => prev ? addMonths(prev, increment) : new Date());
  const isNextMonthDisabled = () => !currentMonth || isAfter(startOfMonth(addMonths(currentMonth, 1)), new Date());

  const handleDialogClose = () => {
      setConfirmDeleteDialogOpen(false);
      setReportToDelete(null);
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>I Miei Report</Typography>
        <Button variant="contained" color="primary" size="large" onClick={() => navigate('/nuovo-report')} disabled={isProcessing}>Nuovo</Button>
      </Box>
      {!isOnline && <Alert severity="warning" icon={<WifiOff />} sx={{ mb: 2 }}>Sei offline...</Alert>}
      {(offlineSyncEventsCount ?? 0) > 0 && <Chip icon={<CloudQueue />} label={`${offlineSyncEventsCount} modifiche in attesa di invio`} color="warning" sx={{ mb: 2, width: '100%' }} />}
      <Paper sx={{ mb: 2, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button variant="outlined" onClick={() => handleMonthChange(-1)}>Mese Prec.</Button>
        <Typography variant="h6">{currentMonth ? format(currentMonth, 'MMMM yyyy', { locale: it }) : '...'}</Typography>
        <Button variant="outlined" onClick={() => handleMonthChange(1)} disabled={isNextMonthDisabled()}>Mese Succ.</Button>
      </Paper>
      <Paper elevation={3} sx={{ mt: 2 }}>
        <List disablePadding>
          {displayedRapportini.length === 0 ? (
            <Typography sx={{ textAlign: 'center', p: 4, fontStyle: 'italic', color: 'text.secondary' }}>Nessun report per questo mese.</Typography>
          ) : (
            displayedRapportini.map((report, index) => {
              if (report.isDeleted) return null;
              const prevReport = displayedRapportini.slice(0, index).reverse().find(r => !r.isDeleted);
              const isNewDay = !prevReport || !isSameDay(report.data, prevReport.data);
              const isSelected = menuState?.report.id === report.id || reportToDelete?.id === report.id;
              const nextReport = displayedRapportini[index + 1];
              const isLastOfGroup = !nextReport || !isSameDay(report.data, nextReport.data) || nextReport.isDeleted;
              
              const tipoGiornataNome = report.tipoGiornata?.nome || '[Tipo sconosciuto]';

              return (
                <Fragment key={report.id}>
                  {isNewDay && (
                      <Divider component="li" textAlign="left" sx={{ my: 2, mx: 2, textTransform: 'capitalize', '&::before, &::after': { borderColor: 'primary.main' } }}>
                          <Chip label={format(report.data, 'EEEE dd MMMM', { locale: it })} color="primary"/>
                      </Divider>
                  )}
                  <ListItem disablePadding divider={!isLastOfGroup}>
                    <ListItemButton onClick={(e) => handleRowClick(e, report)} disabled={!report.isClickable || isProcessing} selected={isSelected} sx={{ py: 1.5, px: 2, opacity: report.isClickable ? 1 : 0.6, ...(isSelected && { border: '2px solid', borderColor: 'primary.main', borderRadius: 1 }) }}>
                      <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: '500', color: 'primary.main' }}>{tipoGiornataNome}</Typography>
                          {report.oreDisplay && <Typography variant="body2" sx={{fontWeight: 'bold'}} >{report.oreDisplay}</Typography>}
                          {report.orariDisplay && <Typography variant="caption" color="text.secondary">{report.orariDisplay}</Typography>}
                          {report.isOffline && <Chip icon={<CloudQueue />} label="Locale" size="small" color="info" variant="outlined" sx={{mt: 0.5}} />}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
                           {report.tecnicoId !== userProfile?.tecnicoId && report.creatore && <Chip icon={<AccountCircle />} label={report.creatore} size="small" variant="outlined" color="info" sx={{ mb: 0.5 }} />}
                          <Typography variant="body2" color="text.secondary" noWrap>{report.descrizioneBreve || ''}</Typography>
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0, textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <Box sx={{ height: '24px' }}>
                                {report.hasFirma && <Gesture fontSize="small" color="action" titleAccess="Firmato" />}
                            </Box>
                            <Typography variant="caption" color="text.secondary" noWrap>{report.naveNome || ''}</Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>{report.luogoNome || ''}</Typography>
                        </Box>
                      </Box>
                    </ListItemButton>
                  </ListItem>
                </Fragment>
              );
            })
          )}
        </List>
      </Paper>
      <Menu open={menuState !== null} onClose={handleMenuClose} anchorEl={menuState?.anchorEl} anchorOrigin={{ vertical: 'center', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'left' }}>
          <MenuItem onClick={handleEdit}><ListItemIcon><Edit fontSize="small" /></ListItemIcon><ListItemText>Modifica</ListItemText></MenuItem>
          <MenuItem onClick={handleShare}><ListItemIcon><Share fontSize="small" /></ListItemIcon><ListItemText>Condividi</ListItemText></MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}><ListItemIcon><Delete fontSize="small" color="error" /></ListItemIcon><ListItemText>Cancella</ListItemText></MenuItem>
      </Menu>
      <ConfirmationDialog open={isConfirmDeleteDialogOpen} onClose={handleDialogClose} onConfirm={confirmDelete} title="Conferma Cancellazione" description={`Sei sicuro di voler cancellare questo rapportino? L'azione è irreversibile.`} />
      {isProcessing && <FullScreenLoader />}
    </Box>
  );
};

export default ReportListPage;
