import localforage from 'localforage';
import { db, storage } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { logAuditAction } from './slaEngine';

// Config localforage for offline caching
localforage.config({
    name: 'CivicTrust',
    storeName: 'offlinePhotoQueue'
});

export async function queueOfflineResolution(ticketId, photoBlob, gpsLoc, softwareValid) {
    const queueItem = {
        id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ticketId,
        blob: photoBlob,
        gps: gpsLoc,
        isValidExif: softwareValid,
        timestamp: Date.now(),
        cryptoPrint: btoa(Date.now().toString() + ticketId) // simulated crypto print
    };

    try {
        const queue = await localforage.getItem('syncQueue') || [];
        queue.push(queueItem);
        await localforage.setItem('syncQueue', queue);
        console.log(`Queued resolution for ticket ${ticketId} offline.`);

        // Register Sync event with ServiceWorker
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            const registration = await navigator.serviceWorker.ready;
            await registration.sync.register('sync-resolution-photos');
        }

    } catch (e) {
        console.error("Failed to queue offline photo.", e);
    }
}

// Function to pull from IndexedDB and push to Firebase, called by React on network recovery
export async function flushOfflineQueue(userId) {
    if (!navigator.onLine) return; // Prevent double trigger if disconnected

    try {
        let queue = await localforage.getItem('syncQueue');
        if (!queue || queue.length === 0) return;

        console.log(`Flushing ${queue.length} items from offline queue...`);

        for (const item of queue) {
            // Upload photo to Storage
            const storageRef = ref(storage, `resolutions-offline/${item.ticketId}_${item.id}.jpg`);
            await uploadBytes(storageRef, item.blob);
            const downloadUrl = await getDownloadURL(storageRef);

            // Update Firestore Document
            const ticketRef = doc(db, 'tickets', item.ticketId);
            await updateDoc(ticketRef, {
                status: 'Resolved',
                resolutionPhotoUrl: downloadUrl,
                resolutionGps: item.gps,
                resolvedAt: item.timestamp, // use offline timestamp
                offlineSyncPrint: item.cryptoPrint
            });

            // Log Audit
            await logAuditAction(item.ticketId, userId || 'Offline Officer', 'Resolved ticket while offline (Synced)', item.gps);
        }

        // Clear queue after successful flush
        await localforage.setItem('syncQueue', []);
        console.log("Offline sync complete!");

    } catch (err) {
        console.error("Flush queue failed: ", err);
        // Queue remains for next attempt
    }
}

export function syncOfflineQueue() { return Promise.resolve(); }
