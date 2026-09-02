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
import { useEnrichedRapportini } from '@/hooks/useEnrichedRapportini';
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
import { MasterDataContext } from '@/contexts/MasterDataContext'; 

const ReportListPage: React.FC = () => {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const authContext = useContext(AuthContext);
  const userProfile = authContext?.userProfile;
  const { requestManualSync } = useSyncManager();
  const { rapportini, isLoading: rapportiniLoading, error: rapportiniError } = useEnrichedRapportini();
  
  const masterDataContext = useContext(MasterDataContext);
  const masterData = masterDataContext?.masterData;
  const collectionsLoading = masterDataContext?.loading;

  const [menuState, setMenuState] = useState<{ anchorEl: HTMLElement; report: EnrichedRapportino; } | null>(null);
  const [reportToDelete, setReportToDelete] = useState<EnrichedRapportino | null>(null);
  const [isConfirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date | null>(null);
  const offlineSyncEventsCount = useLiveQuery(() => db.syncQueue.where('type').equals('rapportino').count(), []);
  const isOnline = useLiveQuery(() => db.syncState.get('isOnline').then(s => s?.value === 1), [], true);

  useEffect(() => {
    if (!rapportiniLoading && rapportini && !currentMonth) {
      setCurrentMonth(startOfMonth(rapportini.length > 0 ? rapportini[0].data : new Date()));
    }
  }, [rapportini, rapportiniLoading, currentMonth]);

  const displayedRapportini = useMemo(() => {
    if (!rapportini || !currentMonth) return [];
    return rapportini.filter(r => isSameMonth(r.data, currentMonth));
  }, [rapportini, currentMonth]);

  const isLoading = rapportiniLoading || collectionsLoading || !currentMonth;

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

  if (isLoading) return <FullScreenLoader />;
  if (rapportiniError) return <Box sx={{ p: 4, textAlign: 'center' }}><Alert severity="error">{rapportiniError.message}</Alert></Box>;

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
                          {report.tipoGiornata?.nome && <Typography variant="body2" sx={{ fontWeight: '500', color: 'primary.main' }}>{report.tipoGiornata.nome}</Typography>}
                          {report.oreDisplay && <Typography variant="body2" sx={{fontWeight: 'bold'}} >{report.oreDisplay}</Typography>}
                          {report.orariDisplay && <Typography variant="caption" color="text.secondary">{report.orariDisplay}</Typography>}
                          {report.isOffline && <Chip icon={<CloudQueue />} label="Locale" size="small" color="info" variant="outlined" sx={{mt: 0.5}} />}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
                          {report.creatore && <Chip icon={<AccountCircle />} label={report.creatore} size="small" variant="outlined" color="info" sx={{ mb: 0.5 }} />}
                          <Typography variant="body2" color="text.secondary" noWrap>{report.descrizioneBreve || ''}</Typography>
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                          {report.hasFirma && <Gesture fontSize="small" color="action" titleAccess="Firmato" />}
                          <Typography variant="caption" color="text.secondary">{report.naveNome || report.luogoNome || ''}</Typography>
                          {report.naveNome && report.luogoNome && <Typography variant="caption" color="text.secondary">{report.luogoNome}</Typography>}
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
      <ConfirmationDialog open={isConfirmDeleteDialogOpen} onClose={handleDialogClose} onConfirm={confirmDelete} title="Conferma Cancellazione" description={`Sei sicuro di voler cancellare questo rapportino? L\'azione è irreversibile.`} />
      {isProcessing && <FullScreenLoader />}
    </Box>
  );
};

export default ReportListPage;
