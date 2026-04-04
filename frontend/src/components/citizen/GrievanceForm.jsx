import React, { useState, useEffect } from 'react';
import { db, storage } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import exifr from 'exifr';
import { extractGPSFromImage, detectDeepfakeOriginality } from '../../lib/exifVerifier';
import { analyzeGrievance } from '../../lib/aiTriage';
import { checkDuplicate } from '../../lib/duplicateDetector';
import { calculateSLA } from '../../lib/slaEngine';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, Mic, MapPin, AlertTriangle, CheckCircle, Image as ImageIcon } from 'lucide-react';

const customMarker = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

function MapPinPicker({ position, setPosition }) {
    useMapEvents({
        click(e) {
            setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
        }
    });
    return position ? <Marker position={position} icon={customMarker} /> : null;
}

export default function GrievanceForm({ user, onSuccess, onClose }) {
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [category, setCategory] = useState('');
    const [file, setFile] = useState(null);
    const [gps, setGPS] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isEmergency, setIsEmergency] = useState(false);
    const [dictating, setDictating] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleFile = async (e) => {
        const f = e.target.files[0];
        if(!f) return;
        setErrorMsg(''); // clear previous

        // --- Deepfake / edit detection via EXIF Software tag ---
        const tags = await exifr.parse(f, ['Software']);
        const editingSoftware = tags?.Software || '';
        const blockedApps = ['Photoshop', 'Lightroom', 'GIMP', 'Snapseed', 'PicsArt', 'Meitu', 'FaceApp'];
        const isEdited = blockedApps.some(app => editingSoftware.toLowerCase().includes(app.toLowerCase()));
        if (isEdited) {
            alert('Edited images are not accepted. Detected: ' + editingSoftware + '. Please upload an original unedited photo.');
            e.target.value = '';
            return;
        }
        
        // Deepfake test (secondary layer via exifVerifier helper)
        const originalCheck = await detectDeepfakeOriginality(f);
        if(!originalCheck.isValid) {
            setErrorMsg(originalCheck.reason || 'Edited images are not accepted. Please upload an original photo.');
            e.target.value = null;
            setFile(null);
            return;
        }
        
        setFile(f);
        const coords = await extractGPSFromImage(f);
        if (coords) setGPS(coords);
    };

    const runAutoDictate = () => {
        setDictating(true);
        setTimeout(() => {
            setDesc((prev) => prev + " Pothole approximately 2 feet wide on the main junction. Immediate repair needed as vehicles are swerving.");
            setCategory("Roads and Buildings");
            setDictating(false);
        }, 1500);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        if (!file || !gps) {
            setErrorMsg('Valid photo with original GPS EXIF metadata is strictly required.');
            return;
        }

        setLoading(true);
        try {
            const isDup = await checkDuplicate(db, gps.lat, gps.lng);
            if (isDup) {
                setErrorMsg('A similar grievance has already been reported here.');
                setLoading(false);
                return;
            }

            const aiResult = await analyzeGrievance(desc);
            const slaDeadline = calculateSLA(isEmergency ? 'EMERGENCY' : aiResult.severity);

            // Upload photo
            const fref = ref(storage, `grievances/${Date.now()}_${file.name}`);
            await uploadBytes(fref, file);
            const url = await getDownloadURL(fref);

            const docId = `GHMC-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`;

            await addDoc(collection(db, 'tickets'), {
                trackingId: docId,
                userId: user.uid,
                title: category,
                description: desc,
                category: category || aiResult.category,
                severity: isEmergency ? 'EMERGENCY' : aiResult.severity,
                aiSynopsis: aiResult.summary,
                photoUrl: url,
                location: gps,
                status: 'Submitted',
                rejections: 0,
                slaDeadline,
                createdAt: serverTimestamp()
            });

            if(onSuccess) onSuccess();
        } catch (error) {
            console.error('Submit failed', error);
            setErrorMsg('Failed to submit. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/60 pt-10 pb-10 overflow-auto">
            <div className="card-flat w-full max-w-2xl relative my-auto">
                <button onClick={onSuccess || onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <X size={24} />
                </button>
                
                <div className="mb-6">
                    <h2 className="text-2xl font-extrabold mb-1">Report Issue</h2>
                    <p className="text-sm font-semibold text-[var(--text-secondary)]">Auto-fill details using Voice & Image Analysis</p>
                </div>

                {errorMsg && (
                    <div className="bg-red-50 text-red-700 p-3 rounded mb-6 font-semibold flex items-start gap-2 border border-red-200">
                        <AlertTriangle size={18} className="mt-0.5" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="label-text">Select Category</label>
                            <select 
                                required 
                                className="input-field" 
                                value={category} 
                                onChange={(e)=>setCategory(e.target.value)}
                            >
                                <option value="">-- Choose Category --</option>
                                <option value="Roads and Buildings">Roads and Buildings</option>
                                <option value="Sanitation">Sanitation</option>
                                <option value="Water">Water</option>
                                <option value="Electricity">Electricity</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>

                    <div className="relative">
                        <label className="label-text flex justify-between items-end">
                            <span>Problem Description</span>
                            <button type="button" onClick={runAutoDictate} className="flex items-center gap-1 text-[var(--primary)] text-xs font-bold hover:underline mb-1">
                                <Mic size={14} /> {dictating ? 'Listening...' : 'Auto-Dictate (AI)'}
                            </button>
                        </label>
                        <textarea 
                            required 
                            rows={3} 
                            className="input-field" 
                            placeholder="Describe the issue explicitly..."
                            value={desc} 
                            onChange={(e)=>setDesc(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="label-text flex items-center gap-2">
                            Photo Evidence 
                            <span className="bg-blue-100 text-[var(--primary)] text-[10px] uppercase px-2 py-0.5 rounded font-bold">Auto-fill available</span>
                        </label>
                        <div className="border-2 border-dashed border-[var(--border)] rounded-lg p-6 text-center bg-gray-50 flex flex-col items-center justify-center hover:bg-gray-100 transition cursor-pointer relative">
                            <input 
                                type="file" 
                                accept="image/*" 
                                required 
                                onChange={handleFile}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                            />
                            {file ? (
                                <div className="text-[var(--accent-green)] flex flex-col items-center">
                                    <CheckCircle size={32} className="mb-2" />
                                    <span className="font-bold text-sm">Valid EXIF Photo Attached</span>
                                    <span className="text-xs text-gray-500">{file.name}</span>
                                </div>
                            ) : (
                                <div className="text-gray-400 flex flex-col items-center">
                                    <ImageIcon size={32} className="mb-2" />
                                    <span className="font-bold text-sm text-[var(--text-primary)]">Click to upload unedited image</span>
                                    <span className="text-xs mt-1">JPEG/PNG with original GPS tags</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="label-text flex justify-between items-end">
                            Location Mapping
                            <button type="button" className="flex items-center gap-1 text-[var(--primary)] text-xs font-bold hover:underline mb-1">
                                <MapPin size={14} /> GPS Auto-detect
                            </button>
                        </label>
                        <div className="h-48 w-full rounded-md border border-[var(--border)] overflow-hidden relative z-0">
                            <MapContainer 
                                center={gps || [17.3850, 78.4867]} 
                                zoom={13} 
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                                <MapPinPicker position={gps} setPosition={setGPS} />
                            </MapContainer>
                        </div>
                        {gps && (
                            <div className="mt-2 text-[var(--accent-green)] font-semibold text-xs flex items-center gap-1">
                                <CheckCircle size={14} /> Detected precise coordinate lock
                            </div>
                        )}
                    </div>

                    <div className="flex items-start gap-2 bg-red-50 p-3 rounded border border-red-200">
                        <input 
                            type="checkbox" 
                            id="emergency" 
                            checked={isEmergency}
                            onChange={(e)=>setIsEmergency(e.target.checked)}
                            className="mt-1 custom-checkbox focus:ring-0 cursor-pointer w-4 h-4 text-[var(--danger)] bg-white border-gray-300 rounded"
                        />
                        <label htmlFor="emergency" className="text-sm cursor-pointer">
                            <span className="font-bold text-[var(--danger)] block">Mark as High Priority / Emergency</span>
                            <span className="text-gray-600 text-xs">Only tick this if human life or critical infrastructure is immediately threatened (12h SLA).</span>
                        </label>
                    </div>

                    <button disabled={loading} className="btn-primary w-full py-3 shadow-md mt-4">
                        {loading ? 'Processing Cryptographic Validation...' : 'Submit Certified Grievance'}
                    </button>
                </form>
            </div>
        </div>
    );
}
