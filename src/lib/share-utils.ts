// Funzione per condividere un file o avviarne il download
export const shareOrDownload = async (blob: Blob, fileName: string): Promise<void> => {
    const file = new File([blob], fileName, { type: blob.type });

    // Semplice e robusta verifica della disponibilità dell'API di condivisione
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                files: [file],
                title: 'Riepilogo Mensile', // Titolo più generico
                text: `Ecco il riepilogo: ${fileName}`,
            });
            console.log('File condiviso con successo!');
            return; // Interrompe l'esecuzione se la condivisione riesce
        } catch (error) {
            // Se l'utente annulla la condivisione, non trattarlo come un errore
            if ((error as Error).name !== 'AbortError') {
                console.warn('Condivisione fallita, si tenta il download come fallback.', error);
            }
        }
    }

    // Fallback per il download se la condivisione non è disponibile o fallisce
    console.log('API di condivisione non supportata o fallita, avvio del download.');
    try {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(file);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href); // Pulisce l'URL dell'oggetto
    } catch (downloadError) {
        console.error('Impossibile avviare il download del file.', downloadError);
        // Qui potresti voler mostrare una notifica all'utente
    }
};