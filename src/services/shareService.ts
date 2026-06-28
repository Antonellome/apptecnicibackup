
// Funzione per convertire una stringa data URL (base64) in un oggetto File
const dataURLtoFile = (dataurl: string, filename: string): File | null => {
    const arr = dataurl.split(',');
    if (arr.length < 2) {
        return null; 
    }
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) {
        return null;
    }
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

// Funzione per condividere un file o avviarne il download da una stringa data URL
export const shareOrDownload = async (dataUrl: string, fileName: string): Promise<void> => {
    const file = dataURLtoFile(dataUrl, fileName);

    if (!file) {
        console.error('Creazione del file da data URL fallita.');
        throw new Error('Formato dati invalido per la condivisione.');
    }

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
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
