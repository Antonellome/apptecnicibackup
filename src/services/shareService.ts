
// Funzione per condividere un file o avviarne il download
export const shareOrDownload = async (blob: Blob, fileName: string): Promise<void> => {
    const file = new File([blob], fileName, { type: blob.type });

    // Controlliamo se l'API di condivisione web è disponibile e può condividere file
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                files: [file],
                title: 'Rapportino di Intervento',
                text: `Ecco il rapportino: ${fileName}`,
            });
            console.log('File condiviso con successo!');
            return;
        } catch (error) {
            // L'errore AbortError viene lanciato se l'utente annulla la condivisione.
            // Non lo trattiamo come un errore critico.
            if ((error as Error).name !== 'AbortError') {
                 console.error('Errore durante la condivisione del file:', error);
                 throw new Error('Condivisione fallita.');
            }
        }
    }

    // Fallback: se l'API di condivisione non è disponibile o l'utente ha annullato,
    // si procede con il download del file.
    console.log('API di condivisione non disponibile o azione annullata. Avvio il download.');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(file);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
};
