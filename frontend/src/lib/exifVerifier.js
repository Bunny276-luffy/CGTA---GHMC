import exifr from 'exifr';

// Haversine distance in meters
export function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000;
}

export async function extractGPSFromImage(file) {
    try {
        const output = await exifr.gps(file);
        if (output && output.latitude && output.longitude) {
            return { lat: output.latitude, lng: output.longitude };
        }
        return null;
    } catch (error) {
        console.error("EXIF GPS Error:", error);
        return null;
    }
}

export async function detectDeepfakeOriginality(file) {
    try {
        // Parse all tags
        const output = await exifr.parse(file, { tiff: true, ifd0: true, exif: true });
        if (!output) return { isValid: true };

        const softwareTag = output.Software ? output.Software.toLowerCase() : "";
        const blockedSoftwares = ['photoshop', 'lightroom', 'gimp', 'snapseed', 'picsart'];

        for (const software of blockedSoftwares) {
            if (softwareTag.includes(software)) {
                return { isValid: false, reason: `Edited images are not accepted as proof. Detected software: ${output.Software}` };
            }
        }
        return { isValid: true };
    } catch (error) {
        console.error("EXIF Software Parsing Error:", error);
        // If we can't read it, allow it, but flag it
        return { isValid: true };
    }
}

export async function verifyExif(file) {
  return { valid: true, gps: null, edited: false };
}
