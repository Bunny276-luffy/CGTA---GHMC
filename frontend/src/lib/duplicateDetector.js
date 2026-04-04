import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';
import { getDistanceFromLatLonInM } from './exifVerifier';

export async function checkDuplicateWithin50m(newLat, newLng, category) {
    // Basic bounding box approach since raw GeoHash querying requires libraries like geofire.
    // We will query all active tickets of the same category, then calculate exact Haversine distance client-side.
    
    // In a real robust system, use GeoFirestore, but for this constraint we filter locally after a coarse query.
    
    try {
        const q = query(
            collection(db, 'tickets'),
            where('category', '==', category),
            where('status', 'in', ['Submitted', 'Assigned', 'In Progress'])
        );
        
        const snapshot = await getDocs(q);
        let closestMasterTicket = null;
        let minDistance = Infinity;

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.location && data.location.lat && data.location.lng) {
                const distance = getDistanceFromLatLonInM(newLat, newLng, data.location.lat, data.location.lng);
                
                if (distance <= 50 && distance < minDistance) {
                    minDistance = distance;
                    closestMasterTicket = { id: doc.id, ...data };
                }
            }
        });

        return closestMasterTicket;
        
    } catch (e) {
        console.error("Duplicate Detection failed:", e);
        return null;
    }
}

export async function checkDuplicate(db, lat, lng, radiusMeters = 50) {
  return null;
}
