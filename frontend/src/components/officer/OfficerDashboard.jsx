import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, storage } from '../../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, getDocs, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Map, UploadCloud, LogOut, AlertTriangle, CheckCircle, XCircle, Loader } from 'lucide-react';
import exifr from 'exifr';

// --- Haversine distance in metres ---
function haversineMetres(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const BLOCKED_SOFTWARE = ['Photoshop', 'Lightroom', 'GIMP', 'Snapseed', 'PicsArt'];

// ─── Severity badge ───────────────────────────────────────────────────────────
function SeverityBadge({ severity }) {
    const s = (severity || 'Normal').toUpperCase();
    const cls =
        s === 'EMERGENCY' ? 'bg-red-100 text-red-800 border-red-200' :
        s === 'HIGH'      ? 'bg-orange-100 text-orange-800 border-orange-200' :
        s === 'MEDIUM'    ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                            'bg-green-100 text-green-800 border-green-200';
    return (
        <span className={`badge border ${cls}`}>{severity || 'Normal'}</span>
    );
}

// ─── Resolution upload modal ──────────────────────────────────────────────────
function UploadModal({ ticket, onClose, onSuccess }) {
    const [file, setFile]         = useState(null);
    const [preview, setPreview]   = useState(null);
    const [error, setError]       = useState('');
    const [uploading, setUploading] = useState(false);
    const inputRef = useRef();

    const handleFile = async (e) => {
        setError('');
        const f = e.target.files[0];
        if (!f) return;

        // 1. Parse EXIF
        let tags = {};
        try { tags = await exifr.parse(f, ['Software', 'GPSLatitude', 'GPSLongitude']) || {}; }
        catch { /* exifr may return null for images with no EXIF */ }

        // 2. Deepfake / editing-software block
        const software = tags.Software || '';
        const isEdited = BLOCKED_SOFTWARE.some(app =>
            software.toLowerCase().includes(app.toLowerCase())
        );
        if (isEdited) {
            setError(`Edited images not accepted. Detected: ${software}`);
            inputRef.current.value = '';
            return;
        }

        // 3. GPS proximity check
        const photoLat = tags.GPSLatitude;
        const photoLon = tags.GPSLongitude;
        const coords = ticket.coordinates || ticket.location;

        if (photoLat && photoLon && coords) {
            const siteLat = coords.lat ?? coords.latitude;
            const siteLon = coords.lng ?? coords.longitude;
            if (siteLat && siteLon) {
                const dist = haversineMetres(photoLat, photoLon, siteLat, siteLon);
                if (dist > 100) {
                    setError(`Photo taken too far from site (${Math.round(dist)}m away, max 100m).`);
                    inputRef.current.value = '';
                    return;
                }
            }
        }

        setFile(f);
        setPreview(URL.createObjectURL(f));
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        try {
            const storageRef = ref(storage, `resolutions/${ticket.id}_${Date.now()}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);

            await updateDoc(doc(db, 'complaints', ticket.id), {
                status: 'Resolved',
                resolutionPhotoUrl: url,
                resolvedAt: serverTimestamp(),
                resolvedBy: auth.currentUser?.uid,
            });

            onSuccess();
        } catch (err) {
            console.error(err);
            setError('Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <XCircle size={22} />
                </button>

                <h2 className="text-xl font-extrabold mb-1">Upload Resolution Photo</h2>
                <p className="text-sm text-gray-500 mb-5">
                    Ticket&nbsp;
                    <span className="font-mono font-bold text-[#1E3A8A]">
                        {ticket.trackingId || ticket.id}
                    </span>
                </p>

                {error && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold p-3 rounded mb-4">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                        {error}
                    </div>
                )}

                <div
                    className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center bg-gray-50 hover:bg-gray-100 transition cursor-pointer mb-4 relative"
                    onClick={() => inputRef.current?.click()}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFile}
                    />
                    {preview ? (
                        <img src={preview} alt="Preview" className="mx-auto max-h-40 rounded object-cover" />
                    ) : (
                        <>
                            <UploadCloud size={32} className="mx-auto mb-2 text-gray-400" />
                            <p className="font-semibold text-sm text-gray-900">
                                Click to select geotagged photo
                            </p>
                            <p className="text-xs text-gray-400 mt-1">Original JPEG/PNG with GPS EXIF</p>
                        </>
                    )}
                </div>

                <button
                    disabled={!file || uploading}
                    onClick={handleUpload}
                    className="btn-primary w-full py-3 disabled:opacity-50"
                >
                    {uploading
                        ? <><Loader size={16} className="animate-spin mr-2" /> Uploading…</>
                        : <><CheckCircle size={16} className="mr-2" /> Submit Resolution</>
                    }
                </button>
            </div>
        </div>
    );
}

// ─── Officer Ticket Card ──────────────────────────────────────────────────────
function TicketCard({ ticket, onUpload }) {
    const address = ticket.address || ticket.location?.address ||
        (ticket.location?.lat
            ? `${ticket.location.lat.toFixed(4)}, ${ticket.location.lng?.toFixed(4)}`
            : 'Location not specified');

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="font-bold text-lg text-gray-900">{ticket.category || 'General'}</h3>
                    <span className="font-mono text-xs bg-blue-50 text-[#1E3A8A] px-2 py-0.5 rounded font-bold">
                        {ticket.trackingId || ticket.id}
                    </span>
                </div>
                <SeverityBadge severity={ticket.severity} />
            </div>

            <p className="text-sm text-gray-500 mb-4 flex items-start gap-1.5">
                <Map size={14} className="shrink-0 mt-0.5" />
                {address}
            </p>

            <button
                onClick={() => onUpload(ticket)}
                className="btn-primary w-full py-2 text-sm"
            >
                <UploadCloud size={16} className="mr-2" /> Upload Resolution
            </button>
        </div>
    );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function OfficerDashboard() {
    const navigate = useNavigate();
    const user = auth.currentUser;
    const [view, setView]               = useState('assignments'); // assignments | upload
    const [tickets, setTickets]         = useState([]);
    const [uploadTarget, setUploadTarget] = useState(null);
    const [successMsg, setSuccessMsg]   = useState('');

    // Real-time listener: tickets assigned to this officer
    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, 'complaints'),
            where('assignedOfficer', '==', user.uid)
        );
        const unsub = onSnapshot(q, (snap) => {
            const res = [];
            snap.forEach(d => res.push({ id: d.id, ...d.data() }));
            // Show active (not yet closed) tickets first
            res.sort((a, b) => {
                const order = { 'Assigned': 0, 'In Progress': 1, 'Resolved': 2, 'Closed': 3 };
                return (order[a.status] ?? 9) - (order[b.status] ?? 9);
            });
            setTickets(res);
        });
        return () => unsub();
    }, [user]);

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/login');
    };

    const openUpload = (ticket) => {
        setUploadTarget(ticket);
        setView('upload');
    };

    const handleUploadSuccess = () => {
        setUploadTarget(null);
        setView('assignments');
        setSuccessMsg('Resolution submitted successfully!');
        setTimeout(() => setSuccessMsg(''), 4000);
    };

    const handleGetTestAssignment = async () => {
        try {
            // Find an unassigned ticket to use for testing
            const q = query(collection(db, 'complaints'), where('status', 'in', ['New', 'Pending']), limit(1));
            const snap = await getDocs(q);
            if (snap.empty) {
                alert("No new or pending complaints found in the database. Please create a new grievance from the Citizen portal first.");
                return;
            }
            const ticketDoc = snap.docs[0];
            await updateDoc(doc(db, 'complaints', ticketDoc.id), {
                assignedOfficer: user.uid,
                status: 'Assigned',
                updatedAt: serverTimestamp()
            });
            setSuccessMsg("Test assignment retrieved successfully!");
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err) {
            console.error("Failed to assign test ticket:", err);
            alert("Failed to fetch test assignment. Check console.");
        }
    };

    const active   = tickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed');
    const resolved = tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed');

    const navBtn = (id, icon, label) => (
        <button
            key={id}
            onClick={() => setView(id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-full font-semibold transition-colors mb-2
                ${view === id ? 'bg-[#1D4ED8] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
        >
            {icon} <span>{label}</span>
        </button>
    );

    return (
        <>
            {/* Upload modal */}
            {uploadTarget && (
                <UploadModal
                    ticket={uploadTarget}
                    onClose={() => { setUploadTarget(null); setView('assignments'); }}
                    onSuccess={handleUploadSuccess}
                />
            )}

            <div className="min-h-screen flex bg-gray-50 font-sans text-gray-900">

                {/* ── Sidebar ─────────────────────────────────────────────── */}
                <aside className="w-[220px] bg-white border-r border-gray-200 fixed inset-y-0 left-0 flex flex-col z-20">
                    <div className="p-6 flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-orange-500 rounded flex justify-center items-center text-white font-bold text-lg">
                            O
                        </div>
                        <div>
                            <h2 className="font-extrabold text-[#111827] leading-tight">CGTA</h2>
                            <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Field Officer</p>
                        </div>
                    </div>

                    <nav className="flex-1 px-4">
                        {navBtn('assignments', <Map size={20} />, 'My Assignments')}
                        {navBtn('upload',      <UploadCloud size={20} />, 'Upload Resolution')}
                    </nav>

                    <div className="p-4 border-t border-gray-200">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 font-semibold hover:bg-red-50 rounded-full transition"
                        >
                            <LogOut size={20} /> Log Out
                        </button>
                    </div>
                </aside>

                {/* ── Main area ───────────────────────────────────────────── */}
                <main className="flex-1 ml-[220px] flex flex-col min-h-screen">
                    {/* Topbar */}
                    <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between sticky top-0 z-10">
                        <h1 className="text-xl font-bold">
                            {view === 'assignments' && 'My Assignments'}
                            {view === 'upload'      && 'Upload Resolution'}
                        </h1>
                        <span className="text-sm text-gray-500 font-medium">
                            {user?.email}
                        </span>
                    </header>

                    <div className="p-8 flex-1 overflow-auto">

                        {/* Success toast */}
                        {successMsg && (
                            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 font-semibold px-4 py-3 rounded-lg mb-6 shadow-sm">
                                <CheckCircle size={18} />
                                {successMsg}
                            </div>
                        )}

                        {/* ── Assignments view ── */}
                        {view === 'assignments' && (
                            <div className="max-w-4xl mx-auto">
                                {/* Active tickets */}
                                <h2 className="text-lg font-bold mb-4">
                                    Active ({active.length})
                                </h2>

                                {active.length === 0 ? (
                                    <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200" style={{ display: 'block', visibility: 'visible', opacity: 1 }}>
                                        <p className="text-xl font-bold text-gray-800 mb-6" style={{ color: '#1f2937' }}>
                                            You currently have no assigned tickets.
                                        </p>
                                        <button 
                                            onClick={handleGetTestAssignment}
                                            className="px-8 py-3 bg-blue-600 text-white text-lg font-bold rounded-lg hover:bg-blue-700 shadow-md transition-all cursor-pointer"
                                            style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
                                        >
                                            Fetch a Test Ticket to Resolve
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid sm:grid-cols-2 gap-5 mb-10">
                                        {active.map(t => (
                                            <TicketCard key={t.id} ticket={t} onUpload={openUpload} />
                                        ))}
                                    </div>
                                )}

                                {/* Resolved tickets */}
                                {resolved.length > 0 && (
                                    <>
                                        <h2 className="text-lg font-bold mb-4 text-gray-500">
                                            Completed ({resolved.length})
                                        </h2>
                                        <div className="grid sm:grid-cols-2 gap-5 opacity-60">
                                            {resolved.map(t => (
                                                <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h3 className="font-bold text-gray-900">{t.category}</h3>
                                                        <span className="badge bg-green-100 text-green-800 border border-green-200">
                                                            {t.status}
                                                        </span>
                                                    </div>
                                                    <p className="font-mono text-xs text-[#1E3A8A]">{t.trackingId || t.id}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* ── Upload view (prompt to pick ticket) ── */}
                        {view === 'upload' && !uploadTarget && (
                            <div className="max-w-4xl mx-auto">
                                <p className="text-[var(--text-secondary)] font-semibold mb-6">
                                    Select a ticket from your assignments to upload a resolution photo.
                                </p>
                                {active.length === 0 ? (
                                    <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-dashed border-[var(--border)]">
                                        <UploadCloud size={48} className="mx-auto mb-3 opacity-30" />
                                        <p className="font-semibold">No active assignments to resolve.</p>
                                    </div>
                                ) : (
                                    <div className="grid sm:grid-cols-2 gap-5">
                                        {active.map(t => (
                                            <TicketCard key={t.id} ticket={t} onUpload={openUpload} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </main>
            </div>
        </>
    );
}
