import { doc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/utils/firebase';

/**
 * Updates the sync manifest document in Firestore with a new server timestamp
 * for a given collection. This signals to client applications (like the Technicians App)
 * that they need to re-fetch the data for that collection.
 *
 * It first tries to update the document. If the document doesn't exist, it creates it.
 *
 * @param {string} collectionName - The name of the collection that has been modified.
 */
export const updateSyncManifest = async (collectionName: string): Promise<void> => {
    // Collections that are typically real-time or user-specific are excluded.
    if (['rapportini', 'notifications', 'presenze'].includes(collectionName)) {
        console.log(`Sync manifest update skipped for collection: ${collectionName}`);
        return;
    }

    console.log(`Updating sync manifest for collection: ${collectionName}...`);
    try {
        const manifestRef = doc(db, 'versioning', 'sync_manifest');
        
        // The updateDoc function is used to update the timestamp for the specific collection.
        // The field name is dynamically set using the collection name.
        await updateDoc(manifestRef, {
            [collectionName]: serverTimestamp(),
        });

        console.log(`Sync manifest updated successfully for ${collectionName}.`);
    } catch (error: any) {
        // If the document doesn't exist, Firestore throws a "No document to update" error.
        // In this case, we create it for the first time.
        if (error.code === 'not-found') {
            console.log('Sync manifest not found, creating it for the first time.');
            try {
                const manifestRef = doc(db, 'versioning', 'sync_manifest');
                await setDoc(manifestRef, {
                    [collectionName]: serverTimestamp(),
                });
                console.log(`Sync manifest created and updated for ${collectionName}.`);
            } catch (creationError) {
                console.error(`!!! CRITICAL: Failed to create sync manifest for ${collectionName}.`, creationError);
            }
        } else {
            // For any other errors, we log them as critical.
            console.error(`!!! CRITICAL: Failed to update sync manifest for ${collectionName}.`, error);
        }
    }
};
