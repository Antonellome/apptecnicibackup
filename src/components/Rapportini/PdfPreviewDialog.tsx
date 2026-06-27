
import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, CircularProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ShareIcon from '@mui/icons-material/Share';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import { useMasterData } from '@/hooks/useMasterData';
import { Rapportino } from '@/models/definitions';

interface PdfPreviewDialogProps {
    reportData: Rapportino | null;
    onClose: () => void;
}

const PdfPreviewDialog: React.FC<PdfPreviewDialogProps> = ({ reportData, onClose }) => {
    const { masterData } = useMasterData();
    const { tecnici = [], tipiGiornata = [], navi = [], luoghi = [], veicoli = [] } = masterData || {};
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const isGiornataLavorativa = useCallback((tipoId: string): boolean => {
        const tipo = tipiGiornata.find(t => t.id === tipoId);
        if (!tipo || !tipo.nome) return true;
        return !['ferie', 'malattia', 'permesso', 'legge 104'].some(keyword => tipo.nome.toLowerCase().includes(keyword));
    }, [tipiGiornata]);

    const generatePdf = useCallback(async (data: Rapportino) => {
        if (!masterData) return;
        setIsGenerating(true);
        // Reset state on new generation
        setPdfUrl(null);
        setPdfFile(null);

        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const margin = 15;
            let y = 20;

            const titleColor = '#0d47a1';
            const textColor = '#000000';

            const drawField = (label: string, value: string, yPos: number, isLongText = false) => {
                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(titleColor);
                pdf.text(label, margin, yPos);
                
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(textColor);
                if (isLongText) {
                    const splitText = pdf.splitTextToSize(value || 'N/D', pageWidth - margin * 2 - 50);
                    pdf.text(splitText, margin + 50, yPos);
                    return yPos + (splitText.length * 5) + 5; 
                } else {
                    pdf.text(value || 'N/D', margin + 50, yPos);
                    return yPos + 10;
                }
            };

            const drawDivider = (yPos: number) => {
                pdf.setDrawColor(titleColor);
                pdf.line(margin, yPos, pageWidth - margin, yPos);
                return yPos + 5;
            };

            pdf.setFontSize(18);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(titleColor);
            pdf.text('T.I.N. srl - Report di Lavoro', pageWidth / 2, y, { align: 'center' });
            y += 15;

            const reportDate = data.data ? ((data.data as any).toDate ? (data.data as any).toDate() : data.data) : null;
            y = drawField('Data:', reportDate ? format(reportDate, 'dd/MM/yyyy') : 'N/D', y);
            const mainTecnico = tecnici.find(t => t.id === data.tecnicoId);
            const mainTecnicoName = mainTecnico ? `${mainTecnico.cognome} ${mainTecnico.nome}` : 'N/D';
            y = drawField('Tecnico Resp.:', mainTecnicoName, y);
            const tipoGiornataNome = tipiGiornata.find(t => t.id === data.tipoGiornataId)?.nome || 'N/D';
            y = drawField('Tipo Giornata:', tipoGiornataNome, y);
            y += 5;

            if (isGiornataLavorativa(data.tipoGiornataId)) {
                y = drawDivider(y);
                pdf.setFontSize(12);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(titleColor);
                pdf.text('Dettaglio Ore e Presenze', margin, y); 
                y += 8;

                const dettagliDaRenderizzare = (data as any).dettaglioOreTecnici || [];
                dettagliDaRenderizzare.forEach((dettagli: any) => {
                    const tecnico = tecnici.find(t => t.id === dettagli.tecnicoId);
                    const nomeTecnico = tecnico ? `${tecnico.cognome} ${tecnico.nome}` : `ID: ${dettagli.tecnicoId}`;
                    const orarioText = `Orario: ${dettagli?.oraInizio || '-'} - ${dettagli?.oraFine || '-'} | Pausa: ${dettagli?.pausa || '0'} min | Totale: ${dettagli?.ore || '0'} ore`;
                    y = drawField(nomeTecnico, orarioText, y, true);
                });

                y += 5;
                y = drawDivider(y);
                pdf.setFontSize(12);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(titleColor);
                pdf.text('Dettagli Intervento', margin, y);
                y += 8;

                const naveNome = navi.find(n => n.id === data.naveId)?.nome || 'Nessuna';
                y = drawField('Nave:', naveNome, y);
                const luogoNome = luoghi.find(l => l.id === data.luogoId)?.nome || 'Nessuno';
                y = drawField('Luogo:', luogoNome, y);
                const veicoloInfo = veicoli.find(v => v.id === data.veicoloId);
                const veicoloDisplay = veicoloInfo ? `${veicoloInfo.targa} - ${veicoloInfo.nome}` : 'Nessuno';
                y = drawField('Veicolo:', veicoloDisplay, y);

                y += 5;
                y = drawField('Descrizione Breve:', data.descrizioneBreve || '', y, true);
                y = drawField('Materiali Impiegati:', data.materialiImpiegati || '', y, true);
                y = drawField('Lavoro Eseguito:', data.lavoroEseguito || '', y, true);
            }

            if (y > 200) { pdf.addPage(); y = 20; }
            y = Math.max(y, 180);

            y = drawDivider(y);
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(titleColor);
            pdf.text('Firma del Cliente', margin, y);
            y += 8;

            if (data.firmaVettoriale) {
                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(textColor);
                pdf.text(`Firmato da: ${data.firmaFirmatarioNome || 'N/D'} (${data.firmaFirmatarioSocieta || 'N/D'})`, margin, y);
                y += 5;

                await new Promise<void>((resolve, reject) => {
                    const img = new Image();
                    img.src = data.firmaVettoriale!;
                    img.onload = () => {
                        try {
                            const canvas = document.createElement('canvas');
                            const canvasWidth = 400;
                            const canvasHeight = 200;
                            canvas.width = canvasWidth;
                            canvas.height = canvasHeight;
                            const ctx = canvas.getContext('2d');
                            if (!ctx) throw new Error('Canvas context not available');

                            ctx.fillStyle = 'white';
                            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
                            
                            const aspectRatio = img.width / img.height;
                            let drawWidth = canvasWidth;
                            let drawHeight = drawWidth / aspectRatio;

                            if (drawHeight > canvasHeight) {
                                drawHeight = canvasHeight;
                                drawWidth = drawHeight * aspectRatio;
                            }

                            const drawX = (canvasWidth - drawWidth) / 2;
                            const drawY = (canvasHeight - drawHeight) / 2;

                            ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
                            const pngDataUrl = canvas.toDataURL('image/png');
                            
                            const pdfImgWidth = 80;
                            const pdfImgHeight = pdfImgWidth / (canvasWidth / canvasHeight);
                            pdf.addImage(pngDataUrl, 'PNG', margin, y, pdfImgWidth, pdfImgHeight);
                            resolve();
                        } catch (e) {
                            reject(e);
                        }
                    };
                    img.onerror = () => reject(new Error('Image loading error for signature.'));
                });

            } else {
                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'italic');
                pdf.setTextColor(textColor);
                pdf.text('Nessuna firma apposta.', margin, y);
            }
            
            const fileName = `Rapportino-${data.id || 'preview'}.pdf`;
            const pdfBlob = pdf.output('blob');
            const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
            
            setPdfFile(file);
            setPdfUrl(URL.createObjectURL(pdfBlob));

        } catch (error) {
            console.error("Errore durante la creazione del PDF: ", error);
        } finally {
            setIsGenerating(false);
        }
    }, [masterData, tecnici, tipiGiornata, navi, luoghi, veicoli, isGiornataLavorativa]);

    useEffect(() => {
        if (reportData) {
            generatePdf(reportData);
        }

        return () => {
            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
            }
        };
    }, [reportData, generatePdf]); // Removed pdfUrl from dependency array to avoid re-triggering

    const handleClose = () => {
        if (pdfUrl) {
            URL.revokeObjectURL(pdfUrl);
        }
        setPdfUrl(null);
        setPdfFile(null);
        onClose();
    };

    const handleShare = async () => {
        if (!pdfFile) return;
        try {
            if (navigator.share && navigator.canShare({ files: [pdfFile] })) {
                await navigator.share({
                    files: [pdfFile],
                    title: `Rapportino di Lavoro`,
                });
            } else {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(pdfFile);
                link.download = pdfFile.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (error) {
            console.error('Error sharing', error);
        }
        handleClose(); // Close and cleanup after sharing
    };

    return (
        <Dialog open={!!reportData} onClose={handleClose} fullScreen>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Anteprima PDF
                <IconButton edge="end" color="inherit" onClick={handleClose} aria-label="close">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 0 }}>
                {isGenerating && <CircularProgress />}
                {!isGenerating && pdfUrl && <iframe src={pdfUrl} style={{ flexGrow: 1, width: '100%', height: '100%', border: 'none' }} title="Anteprima PDF" />}
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'space-between', p: 2 }}>
                <Button variant="outlined" onClick={handleClose}>Annulla</Button>
                <Button variant="contained" onClick={handleShare} startIcon={<ShareIcon />} disabled={!pdfFile || isGenerating}>
                    Condividi
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default PdfPreviewDialog;
