import axios from 'axios';

/**
 * 🛡️ The Enterprise Hybrid Sync
 * Instantly updates local memory for zero-latency UI, 
 * then silently syncs with the database in the background.
 */
export const markTourCompleted = async (tourKey) => {
    // 1. Instant Optimistic Update (No UI freezing!)
    localStorage.setItem(tourKey, 'true');

    // 2. Silent Background Sync
    try {
        await axios.put('http://localhost:5000/api/users/tour-sync', 
            { tourKey: tourKey }, 
            { withCredentials: true } // 🛡️ Secure cookie
        );
    } catch {
        // We fail silently here. The UI is already updated for the user, 
        // and it will retry syncing next time they log in or trigger a save.
        console.warn(`Background sync failed for ${tourKey}`);
    }
};