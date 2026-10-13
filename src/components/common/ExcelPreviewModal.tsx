import React, { useEffect, useState } from 'react';
import {
    Modal,
    Box,
    Typography,
    Button,
    IconButton,
    Tabs,
    Tab,
    CircularProgress,
    Stack,
    TableContainer,
    Table,
    TableBody,
    TableRow,
    TableCell,
    Paper,
    Grid
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ShareIcon from '@mui/icons-material/Share';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import * as XLSX from 'xlsx';

interface ExcelPreviewModalProps {
    open: boolean;
    onClose: () => void;
    onShare: (blob: Blob, fileName: string) => void;
    excelBlob: Blob | null;
    fileName: string;
}

interface SheetPreview {
    name: string;
    data: any[][];
    styles: { [cellAddress: string]: any };
}

const modalStyle = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: { xs: '98%', md: '95%' },
    height: '95%',
    bgcolor: '#3c3c3c',
    border: '1px solid #555',
    borderRadius: '8px',
    boxShadow: 24,
    p: 1,
    display: 'flex',
    flexDirection: 'column'
};

const ExcelPreviewModal: React.FC<ExcelPreviewModalProps> = ({ open, onClose, onShare, excelBlob, fileName }) => {
    const [sheets, setSheets] = useState<SheetPreview[]>([]);
    const [loading, setLoading] = useState(false);
    const [tabValue, setTabValue] = useState(0);
    const [zoom, setZoom] = useState(1);

    const parseExcelBlob = (blob: Blob) => {
        setLoading(true);
        setZoom(1);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'array', cellStyles: true });
                const sheetPreviews: SheetPreview[] = workbook.SheetNames.map(sheetName => {
                    const ws = workbook.Sheets[sheetName];
                    const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
                    const jsonData: any[][] = Array.isArray(rawData) ? rawData.map(row => Array.isArray(row) ? row : [row]) : [];
                    const cellStyles: { [cellAddress: string]: any } = {};
                    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
                    for (let R = range.s.r; R <= range.e.r; ++R) {
                        for (let C = range.s.c; C <= range.e.c; ++C) {
                            const cell_ref = XLSX.utils.encode_cell({ c: C, r: R });
                            if (ws[cell_ref] && ws[cell_ref].s) cellStyles[cell_ref] = ws[cell_ref].s;
                        }
                    }
                    return { name: sheetName, data: jsonData, styles: cellStyles };
                });
                setSheets(sheetPreviews);
                setTabValue(0);
            } catch (error) {
                console.error("Error reading Excel file:", error);
                setSheets([]);
            } finally {
                setLoading(false);
            }
        };
        reader.readAsArrayBuffer(blob);
    };

    useEffect(() => {
        if (open && excelBlob) {
            parseExcelBlob(excelBlob);
        }
    }, [open, excelBlob]);

    const handleShare = () => {
        if (!excelBlob) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'array' });
            const newWorkbook = XLSX.utils.book_new();

            // Definizione delle colonne da includere nel totale "busta paga"
            const colonneLavoroEffettivo = [
                "Ordinarie Diurne", "Trasferta", 
                "Lavoro Notturno Ordinario (20-22) (+15%)", "Lavoro Notturno Ordinario (22-06) (+30%)",
                "Straordinario Feriale (Prime 2h) (+25%)", "Straordinario Feriale (Oltre 2h) (+30%)",
                "Straordinario Sabato Diurno (+50%)", "Straordinario Notturno Feriale/Sabato (+50%)",
                "Straordinario Festivo/Domenicale Diurno (+55%)", "Straordinario Notturno Festivo (+75%)"
            ];

            const colonneAssenzeRetribuite = [
                "Ferie", "ROL", "Ex Festività", "Permessi Retribuiti", "Permessi L. 104",
                "Malattia (Carenza)", "Malattia (Integrazione INPS)"
            ];
            
            const colonneBustaPaga = [...colonneLavoroEffettivo, ...colonneAssenzeRetribuite];

            workbook.SheetNames.forEach(sheetName => {
                const ws = workbook.Sheets[sheetName];
                const json: any[] = XLSX.utils.sheet_to_json(ws);
                
                if (json.length === 0) {
                    const newWs = XLSX.utils.json_to_sheet([]);
                    XLSX.utils.book_append_sheet(newWorkbook, newWs, sheetName);
                    return;
                }

                const headers = Object.keys(json[0]);
                const numericHeaders = headers.filter(h => h !== 'Giorno' && h !== 'Data');
                
                // Aggiungi totali di riga
                json.forEach(row => {
                    const rowTotal = numericHeaders.reduce((sum, header) => sum + (Number(row[header]) || 0), 0);
                    row['Totale Ore Riga'] = rowTotal;
                });

                // Aggiungi riga totali di colonna
                const columnTotals: any = { Giorno: 'TOTALI' };
                let totalGeneralBustaPaga = 0;

                headers.concat('Totale Ore Riga').forEach(header => {
                    if (header !== 'Giorno' && header !== 'Data') {
                        const total = json.reduce((sum, row) => sum + (Number(row[header]) || 0), 0);
                        columnTotals[header] = total;

                        if (colonneBustaPaga.includes(header)) {
                            totalGeneralBustaPaga += total;
                        }
                    }
                });
                
                // Inserisce il totale generale corretto
                columnTotals['Totale Ore Riga'] = totalGeneralBustaPaga;

                json.push({}, columnTotals); // Aggiunge una riga vuota per separazione

                const newWs = XLSX.utils.json_to_sheet(json);
                XLSX.utils.book_append_sheet(newWorkbook, newWs, sheetName);
            });

            const newExcelBlob = new Blob([XLSX.write(newWorkbook, { bookType: 'xlsx', type: 'array' })], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            onShare(newExcelBlob, `Riepilogo_Ore_${fileName}`);
        };
        reader.readAsArrayBuffer(excelBlob);
    };

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => setTabValue(newValue);
    const handleZoomIn = () => setZoom(prev => prev + 0.1);
    const handleZoomOut = () => setZoom(prev => Math.max(0.2, prev - 0.1));

    const currentSheet = sheets[tabValue];

    const renderTable = (isThumbnail: boolean) => {
        if (!currentSheet) return null;
        
        const getCellStyle = (rowIndex: number, colIndex: number) => {
            const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
            const style = currentSheet.styles[cellRef];
            const muiStyle: any = {
                border: isThumbnail ? '1px solid #eee' : '1px solid #ccc',
                padding: isThumbnail ? '0px 1px' : '4px 6px',
                textAlign: 'left',
                fontSize: isThumbnail ? '1px' : '12px',
                whiteSpace: 'nowrap',
                color: '#000000'
            };

            if (style?.font?.color?.rgb === "0000FF") muiStyle.color = '#0000FF';
            if (style?.font?.bold) muiStyle.fontWeight = 'bold';
            if (style?.right?.style === 'medium' && style?.right?.color?.rgb === "0000FF") {
                 muiStyle.borderRight = isThumbnail ? '1px solid #99f' : '2px solid #0000FF';
            }
            return muiStyle;
        };

        return (
             <TableContainer component={Paper} elevation={0} sx={{ backgroundColor: 'white' }}>
                <Table size="small">
                    <TableBody>
                        {currentSheet.data.map((row, rowIndex) => (
                            <TableRow key={rowIndex}>
                                {Array.isArray(row) && row.map((cellValue, colIndex) => (
                                    <TableCell key={colIndex} sx={getCellStyle(rowIndex, colIndex)}>
                                        {isThumbnail ? '' : cellValue}
                                    </TableCell>
                                ))
                                }
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        )
    }

    return (
        <Modal open={open} onClose={onClose}>
            <Box sx={modalStyle}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1, bgcolor: '#2d2d2d', color: 'white', flexShrink: 0 }}>
                    <Typography variant="h6">Anteprima Excel</Typography>
                    <IconButton onClick={onClose} sx={{color: 'white'}}><CloseIcon /></IconButton>
                </Stack>
                <Tabs value={tabValue} onChange={handleTabChange} sx={{ bgcolor: '#424242', borderBottom: 1, borderColor: 'divider', flexShrink: 0, '& .MuiTab-root': {color: 'white'} }}>
                    {sheets.map((sheet, index) => <Tab label={sheet.name} key={index} />)}
                </Tabs>

                <Box sx={{ flexGrow: 1, p: 1, overflow: 'hidden' }}>
                    {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box> : (
                        <Grid container spacing={1} sx={{ height: '100%' }}>
                            <Grid size={{ md: 2.5 }} sx={{ height: '100%', display: {xs: 'none', md: 'block'} }}>
                                <Paper variant="outlined" sx={{ height: '100%', p: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                   <Box sx={{ width: '100%', height: 'auto', overflow: 'hidden'}}>
                                        {renderTable(true)}
                                   </Box>
                                </Paper>
                            </Grid>

                            <Grid size={{ xs: 12, md: 8 }} sx={{ height: '100%' }}>
                                <Paper variant="outlined" sx={{ height: '100%', overflow: 'auto' }}>
                                    <Box sx={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: `calc(100% / ${zoom})`, height: `calc(100% / ${zoom})` }}>
                                        {renderTable(false)}
                                    </Box>
                                </Paper>
                            </Grid>

                            <Grid size={{ xs: 12, md: 1.5 }} sx={{ height: '100%', display: 'flex', flexDirection: {xs: 'row', md: 'column'}, alignItems: 'center', justifyContent: 'center' }}>
                                <Stack direction={{xs: 'row', md: 'column'}} spacing={1} alignItems="center">
                                    <IconButton onClick={handleZoomIn} sx={{color: 'white'}}><AddCircleOutlineIcon/></IconButton>
                                    <Typography sx={{color: 'white'}}>{Math.round(zoom * 100)}%</Typography>
                                    <IconButton onClick={handleZoomOut} sx={{color: 'white'}}><RemoveCircleOutlineIcon/></IconButton>
                                </Stack>
                            </Grid>
                        </Grid>
                    )}
                </Box>

                <Box sx={{ p: 1, textAlign: 'right', bgcolor: '#2d2d2d', flexShrink: 0 }}>
                    <Button variant="contained" startIcon={<ShareIcon />} onClick={handleShare} disabled={!excelBlob || loading}>Condividi</Button>
                </Box>
            </Box>
        </Modal>
    );
};

export default ExcelPreviewModal;
