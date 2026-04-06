import React, { useState, useEffect } from 'react';
import { db, auth, storage } from '../firebase';
import { collection, query, getDocs, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signOut } from 'firebase/auth';
import { LogOut, RefreshCw, CheckCircle, Clock, AlertCircle, Sparkles, Map as MapIcon, BarChart3, List as ListIcon, ShieldAlert, Image as ImageIcon, X, Loader2, Upload, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { t } from '../utils/translations';
import { useLanguage } from '../contexts/LanguageContext';
import EXIF from 'exif-js';
import HeatmapLayer from './HeatmapLayer';

// Fix Leaflet icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const AdminDashboard = () => {
    const { lang, setLang } = useLanguage();
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('data'); // 'data', 'analytics', 'map'
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Resolution Modal State
    const [resolvingIssueId, setResolvingIssueId] = useState(null);
    const [resolutionImage, setResolutionImage] = useState(null);
    const [isUploadingResolution, setIsUploadingResolution] = useState(false);
    const [resolutionExifError, setResolutionExifError] = useState('');
    const [showHeatmap, setShowHeatmap] = useState(false);
    
    // Haversine formula for distance in meters
    const getDistanceFromLatLonInM = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Radius of the earth in km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c * 1000; // Distance in meters
    };

    const fetchAllComplaints = async () => {
        setIsRefreshing(true);
        setError('');
        try {
            const q = query(collection(db, 'complaints'));
            const querySnapshot = await getDocs(q);
            const fetched = [];
            querySnapshot.forEach((doc) => {
                fetched.push({ id: doc.id, ...doc.data() });
            });
            // Sort in memory
            fetched.sort((a, b) => {
                const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now();
                const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now();
                return timeB - timeA;
            });

            // Geocode fallback for items missing coordinates but having an address
            const geocodedComplaints = await Promise.all(fetched.map(async (c) => {
                if (!c.latitude && !c.longitude && c.address) {
                    try {
                        // Rate limit gracefully - Nominatim requires 1 req/sec
                        await new Promise(r => setTimeout(r, Math.random() * 500));
                        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(c.address)}&limit=1`);
                        const data = await response.json();
                        if (data && data.length > 0) {
                            return { ...c, latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
                        }
                    } catch (e) {
                        console.warn("Geocoding failed for address:", c.address);
                    }
                }
                return c;
            }));

            // Smart SLA Auto Escalation
            const finalComplaints = await Promise.all(geocodedComplaints.map(async (c) => {
                const isBreached = () => {
                    if (c.status !== 'New' && c.status !== 'Pending' && c.status !== 'Assigned') return false;
                    const createdTime = c.createdAt?.toMillis ? c.createdAt.toMillis() : Date.parse(c.createdAt);
                    if (!createdTime) return false;
            
                    const hoursSinceCreation = (Date.now() - createdTime) / (1000 * 60 * 60);
                    const slaLimit = (c.urgency === 'Emergency') ? 12 : 72;
                    return hoursSinceCreation > slaLimit;
                };

                if (isBreached() && c.assignedRole !== 'zonal_commissioner') {
                    const currentAudit = c.auditTrail || [];
                    const newAudit = [...currentAudit, { action: 'SLA Breached - Auto Escalated to Zonal Commissioner', actor: 'System', timestamp: new Date().toISOString() }];
                    const newEscalation = (c.escalationLevel || 0) + 1;
                    
                    try {
                        await updateDoc(doc(db, 'complaints', c.id), {
                            assignedRole: 'zonal_commissioner',
                            escalationLevel: newEscalation,
                            auditTrail: newAudit
                        });
                        return { ...c, assignedRole: 'zonal_commissioner', escalationLevel: newEscalation, auditTrail: newAudit };
                    } catch (e) {
                        console.error("Failed to escalate:", e);
                    }
                }
                return c;
            }));

            setComplaints(finalComplaints);
        } catch (err) {
            console.error(err);
            if (err.code === 'permission-denied') {
                setError("Permission denied: You do not have admin access. Update Firestore Rules.");
            } else {
                setError("Failed to load complaints: " + err.message);
            }
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAllComplaints();
    }, []);

    const handleUpdateStatus = async (complaintId, newStatus) => {
        if (newStatus === 'Awaiting Citizen Confirmation') {
            setResolvingIssueId(complaintId);
            return;
        }

        try {
            const complaintRef = doc(db, 'complaints', complaintId);
            await updateDoc(complaintRef, { status: newStatus });
            setComplaints(complaints.map(c => c.id === complaintId ? { ...c, status: newStatus } : c));
        } catch (err) {
            alert("Failed to update status: " + err.message);
        }
    };

    const handleResolveIssue = async () => {
        if (!resolvingIssueId || !resolutionImage) return;
        setIsUploadingResolution(true);
        setError('');
        setResolutionExifError('');

        try {
            const imageRef = ref(storage, `resolutions/${resolvingIssueId}_${Date.now()}`);
            const snapshot = await uploadBytes(imageRef, resolutionImage);
            const imageUrl = await getDownloadURL(snapshot.ref);

            const complaintRef = doc(db, 'complaints', resolvingIssueId);
            await updateDoc(complaintRef, {
                status: 'Awaiting Citizen Confirmation',
                resolutionEvidenceUrl: imageUrl
            });

            setComplaints(complaints.map(c =>
                c.id === resolvingIssueId
                    ? { ...c, status: 'Awaiting Citizen Confirmation', resolutionEvidenceUrl: imageUrl }
                    : c
            ));

            setResolvingIssueId(null);
            setResolutionImage(null);
        } catch (err) {
            console.error(err);
            setError("Failed to upload resolution evidence: " + err.message);
        } finally {
            setIsUploadingResolution(false);
        }
    };

    const handleResolutionImageSelect = (file) => {
        if (!file) return;
        setImageFileWithExifValidation(file);
    };

    const setImageFileWithExifValidation = (file) => {
        setResolutionExifError('');
        
        // Find the active complaint to get target coordinates
        const activeComplaint = complaints.find(c => c.id === resolvingIssueId);
        
        EXIF.getData(file, function() {
            const exifLat = EXIF.getTag(this, "GPSLatitude");
            const exifLng = EXIF.getTag(this, "GPSLongitude");
            const latRef = EXIF.getTag(this, "GPSLatitudeRef") || "N";
            const lngRef = EXIF.getTag(this, "GPSLongitudeRef") || "E";
            
            if (exifLat && exifLng && activeComplaint?.latitude && activeComplaint?.longitude) {
                const convertToDecimal = (gpsData, ref) => {
                     const degrees = gpsData[0].numerator / gpsData[0].denominator;
                     const minutes = gpsData[1].numerator / gpsData[1].denominator;
                     const seconds = gpsData[2].numerator / gpsData[2].denominator;
                     let decimal = degrees + (minutes / 60) + (seconds / 3600);
                     return (ref === "S" || ref === "W") ? -decimal : decimal;
                };
                const latDecimal = convertToDecimal(exifLat, latRef);
                const lngDecimal = convertToDecimal(exifLng, lngRef);
                
                const distance = getDistanceFromLatLonInM(latDecimal, lngDecimal, activeComplaint.latitude, activeComplaint.longitude);
                if (distance > 100) {
                    setResolutionExifError(`Validation Failed: Photo was taken ${Math.round(distance)}m away from the original grievance location. Max allowed is 100m.`);
                    setResolutionImage(null); // Reject the image
                    return;
                }
            } else {
                // Warning, but we'll accept it if GPS is stripped by some mobile devices
                console.warn("No EXIF GPS data found on resolution image.");
            }
            setResolutionImage(file);
        });
    };

    const isSlaBreached = (complaint) => {
        if (complaint.status !== 'New' && complaint.status !== 'Pending' && complaint.status !== 'Assigned') return false;
        if (!complaint.createdAt) return false;

        const createdTime = complaint.createdAt?.toMillis ? complaint.createdAt.toMillis() : Date.parse(complaint.createdAt);
        if (!createdTime) return false;

        const hoursSinceCreation = (Date.now() - createdTime) / (1000 * 60 * 60);
        const slaLimit = (complaint.urgency === 'Emergency') ? 12 : 72;
        return hoursSinceCreation > slaLimit;
    };

    const getUrgencyBadge = (urgency) => {
        const defaultClasses = "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ";
        if (!urgency) return <span className={defaultClasses + "bg-gray-100 text-gray-500 border-gray-200"}>Pending AI</span>;

        const u = urgency.toLowerCase();
        if (u === 'high' || u === 'critical')
            return <span className={defaultClasses + "bg-red-50 text-red-700 border-red-200"}>{urgency}</span>;
        if (u === 'medium')
            return <span className={defaultClasses + "bg-amber-50 text-amber-700 border-amber-200"}>{urgency}</span>;
        return <span className={defaultClasses + "bg-green-50 text-green-700 border-green-200"}>{urgency}</span>;
    };

    const getStatusBadge = (status) => {
        const defaultClasses = "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center inline-flex border ";
        if (status === 'Closed' || status === 'Resolved')
            return <span className={defaultClasses + "bg-green-50 text-green-700 border-green-200"}><CheckCircle className="w-3 h-3 mr-1.5" />{status}</span>;
        if (status === 'Awaiting Citizen Confirmation')
            return <span className={defaultClasses + "bg-purple-50 text-purple-700 border-purple-200"}><CheckCircle className="w-3 h-3 mr-1.5" />Awaiting Fix Confirm</span>;
        if (status === 'Pending' || status === 'In Progress')
            return <span className={defaultClasses + "bg-amber-50 text-amber-700 border-amber-200"}><Clock className="w-3 h-3 mr-1.5" />{status}</span>;
        return <span className={defaultClasses + "bg-blue-50 text-[#2563EB] border-blue-200"}><AlertCircle className="w-3 h-3 mr-1.5" />{status}</span>;
    };

    // Analytics Data Prep
    const prepareCategoryData = () => {
        const counts = {};
        complaints.forEach(c => {
            const cat = c.category || 'Unknown';
            counts[cat] = (counts[cat] || 0) + 1;
        });
        return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
    };

    const prepareStatusData = () => {
        const counts = { 'New': 0, 'Pending': 0, 'Closed': 0, 'Resolved': 0 };
        complaints.forEach(c => {
            const stat = c.status || 'Unknown';
            counts[stat] = (counts[stat] || 0) + 1;
        });
        return [
            { name: 'Active (New/Pending)', value: counts['New'] + counts['Pending'] },
            { name: 'Closed/Resolved', value: counts['Closed'] + counts['Resolved'] }
        ];
    };

    const CHART_COLORS = ['#22D3EE', '#818CF8', '#A855F7', '#F472B6', '#34D399', '#FBBF24'];
    const PIE_COLORS = ['#F43F5E', '#10B981']; // Active (Pink/Red), Closed (Emerald)

    // Predictive Decay: group by ward+category, flag 3+ tickets in 7 days
    const computeDecayAlerts = () => {
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const recentComplaints = complaints.filter(c => {
            const ts = c.createdAt?.toMillis ? c.createdAt.toMillis() : (c.createdAt ? Date.parse(c.createdAt) : null);
            return ts && ts >= sevenDaysAgo;
        });

        // Group by ward (use address as ward key) + category
        const groups = {};
        recentComplaints.forEach(c => {
            const ward = c.address || c.ward || 'Unknown Area';
            const category = c.category || c.aiCategory || 'General';
            const key = `${ward}||${category}`;
            if (!groups[key]) groups[key] = { ward, category, count: 0 };
            groups[key].count += 1;
        });

        return Object.values(groups)
            .filter(g => g.count >= 3)
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);
    };

    const decayAlerts = computeDecayAlerts();

    return (
        <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-screen relative z-10 text-gray-900">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 pb-6 border-b border-gray-200">
                <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                        <ShieldAlert className="w-6 h-6 text-[#1E3A8A]" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Admin Dashboard</h1>
                        <p className="text-gray-500 font-medium uppercase tracking-widest textxs mt-1">Grievance Management System</p>
                    </div>
                </div>
                <div className="flex space-x-3 w-full md:w-auto">
                    <select
                        value={lang}
                        onChange={(e) => setLang(e.target.value)}
                        className="bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-xl px-3 py-2 outline-none focus:ring-[#2563EB] focus:border-[#2563EB] cursor-pointer"
                    >
                        <option value="en">English (EN)</option>
                        <option value="hi">हिंदी (HI)</option>
                        <option value="bn">বাংলা (BN)</option>
                        <option value="te">తెలుగు (TE)</option>
                        <option value="mr">मराठी (MR)</option>
                        <option value="ta">தமிழ் (TA)</option>
                        <option value="ur">اردو (UR)</option>
                        <option value="gu">ગુજરાતી (GU)</option>
                        <option value="kn">ಕನ್ನಡ (KN)</option>
                        <option value="or">ଓଡ଼ିଆ (OR)</option>
                        <option value="ml">മലയാളം (ML)</option>
                        <option value="pa">ਪੰਜਾਬੀ (PA)</option>
                        <option value="as">অসমীয়া (AS)</option>
                        <option value="mai">मैथिली (MAI)</option>
                        <option value="sat">ᱥᱟᱱᱛᱟᱲᱤ (SAT)</option>
                        <option value="ks">کأشُر (KS)</option>
                        <option value="ne">नेपाली (NE)</option>
                        <option value="kok">कोंकणी (KOK)</option>
                        <option value="sd">سنڌي (SD)</option>
                        <option value="doi">डोगरी (DOI)</option>
                        <option value="brx">बर’ (BRX)</option>
                        <option value="mni">ꯃꯤꯇꯩꯂꯣꯟ (MNI)</option>
                    </select>
                    <button
                        onClick={fetchAllComplaints}
                        className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 flex-1 md:flex-none flex justify-center items-center font-bold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`} />
                        {t(lang, 'syncData', 'Sync Data')}
                    </button>
                    <button
                        onClick={() => signOut(auth)}
                        className="flex-1 md:flex-none flex justify-center items-center text-red-600 hover:bg-red-50 font-bold bg-white border border-gray-300 px-5 py-2.5 rounded-xl transition-colors shadow-sm"
                    >
                        <LogOut className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Sign Out</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 flex items-start border border-red-100 shadow-sm animate-in slide-in-from-top-2">
                    <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">{error}</span>
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex space-x-2 bg-white border border-gray-200 p-1.5 rounded-xl mb-8 w-full sm:max-w-md relative z-10 shadow-sm">
                {[
                    { id: 'data', icon: ListIcon, label: 'Data Board' },
                    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
                    { id: 'map', icon: MapIcon, label: 'Live Map' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex justify-center items-center py-2.5 rounded-lg text-sm font-bold transition-colors relative z-10 ${activeTab === tab.id ? 'text-[#1E3A8A]' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="activeTabBadge"
                                className="absolute inset-0 bg-blue-50 rounded-lg border border-blue-100 -z-10"
                                initial={false}
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <tab.icon className="w-4 h-4 mr-2" /> {tab.label}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {/* TAB: Data Table */}
                {activeTab === 'data' && (
                    <motion.div
                        key="data"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm"
                    >
                        {/* Predictive Decay Alerts */}
                        {decayAlerts.length > 0 && (
                            <div className="p-5 pb-2 space-y-2">
                                {decayAlerts.map((alert, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            background: '#FFFBEB',
                                            borderLeft: '4px solid #D97706',
                                            borderRadius: '8px',
                                            padding: '12px 16px',
                                            marginBottom: '8px',
                                        }}
                                    >
                                        <div style={{ fontWeight: 700, color: '#B45309', fontSize: '14px', marginBottom: '2px' }}>
                                            ⚠️ High Risk Zone Detected
                                        </div>
                                        <div style={{ color: '#6B7280', fontSize: '13px' }}>
                                            &ldquo;{alert.ward}&rdquo; — {alert.count}+ <strong>{alert.category}</strong> complaints in 7 days. Possible infrastructure failure predicted.
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Issue Description</th>
                                        <th className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Classification</th>
                                        <th className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Priority Level</th>
                                        <th className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">AI Synopsis</th>
                                        <th className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">State</th>
                                        <th className="px-6 py-5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {loading ? (
                                        <tr><td colSpan="6" className="px-6 py-16 text-center text-gray-500 font-medium">Loading Records...</td></tr>
                                    ) : complaints.length === 0 ? (
                                        <tr><td colSpan="6" className="px-6 py-16 text-center text-gray-500 font-medium">No complaints found.</td></tr>
                                    ) : (
                                        complaints.map((complaint) => (
                                            <tr key={complaint.id} className="hover:bg-gray-50 transition duration-200 group">
                                                <td className="px-6 py-5">
                                                    <div className="text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded border border-gray-200 inline-block mb-2">
                                                        {complaint.trackingId || complaint.id.slice(0, 8)}
                                                    </div>
                                                    <div className="text-sm font-bold text-gray-900 line-clamp-2 max-w-xs">{complaint.description}</div>
                                                    <div className="text-xs text-gray-500 mt-2 truncate w-64 flex items-center font-medium">
                                                        <MapIcon className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                                                        {complaint.address || "Coordinates null"}
                                                    </div>
                                                    {complaint.imageUrl && (
                                                        <a href={complaint.imageUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB] mt-2 inline-block hover:text-blue-800 transition-colors border border-blue-200 px-2 py-1 rounded bg-blue-50">
                                                            View Evidence
                                                        </a>
                                                    )}
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    <div className="text-sm text-gray-700 font-bold tracking-wide">{complaint.aiCategory || complaint.category}</div>
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    {getUrgencyBadge(complaint.aiUrgency || complaint.urgency)}
                                                </td>
                                                <td className="px-6 py-5 max-w-sm">
                                                    <div className="flex items-start bg-gray-50 p-3 rounded-xl border border-gray-100 group-hover:bg-white transition-colors">
                                                        <Sparkles className="w-4 h-4 text-[#2563EB] mr-2.5 mt-0.5 flex-shrink-0" />
                                                        <span className="text-sm text-gray-600 line-clamp-3 leading-relaxed font-medium">
                                                            {complaint.aiSummary || <span className="text-gray-400 italic">Awaiting AI processor...</span>}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    <div className="flex flex-col space-y-2 items-start">
                                                        {getStatusBadge(complaint.status)}
                                                        {isSlaBreached(complaint) && (
                                                            <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center bg-red-100 text-red-700 border border-red-200 shadow-sm animate-pulse">
                                                                <AlertTriangle className="w-3 h-3 mr-1" />
                                                                SLA Breached (&gt;48h)
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap text-right">
                                                    <select
                                                        value={complaint.status || 'New'}
                                                        onChange={(e) => handleUpdateStatus(complaint.id, e.target.value)}
                                                        className="bg-white border border-gray-300 text-gray-700 text-xs font-bold rounded-lg focus:ring-[#2563EB] focus:border-[#2563EB] block w-full p-2.5 outline-none hover:bg-gray-50 transition-colors"
                                                    >
                                                        <option value="New">New</option>
                                                        <option value="Pending">Under Review</option>
                                                        <option value="Assigned">Assigned</option>
                                                        <option value="In Progress">In Progress</option>
                                                        <option value="Awaiting Citizen Confirmation">Mark as Resolved (Requires Proof)</option>
                                                        <option value="Closed" disabled>Closed (Citizen Verified)</option>
                                                    </select>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}

                {/* TAB: Analytics */}
                {activeTab === 'analytics' && (
                    <motion.div
                        key="analytics"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.3 }}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                    >
                        <motion.div whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="bg-white border border-gray-200 shadow-sm p-6 md:p-8 rounded-3xl group">
                            <h3 className="text-xl font-bold text-gray-900 mb-8 flex items-center">
                                <BarChart3 className="w-5 h-5 mr-3 text-[#2563EB] transition-transform duration-300" />
                                Complaints by Category
                            </h3>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={prepareCategoryData()}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 600 }} interval={0} angle={-30} textAnchor="end" height={80} axisLine={false} tickLine={false} />
                                        <YAxis allowDecimals={false} tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E7EB', color: '#111827', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} itemStyle={{ color: '#1E3A8A' }} />
                                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                            {prepareCategoryData().map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </motion.div>

                        <motion.div whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="bg-white border border-gray-200 shadow-sm p-6 md:p-8 rounded-3xl group">
                            <h3 className="text-xl font-bold text-gray-900 mb-8 flex items-center">
                                <PieChart className="w-5 h-5 mr-3 text-[#2563EB] transition-transform duration-300" />
                                Resolution Status
                            </h3>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={prepareStatusData()}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={80}
                                            outerRadius={110}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {prepareStatusData().map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E7EB', color: '#111827', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} itemStyle={{ color: '#1E3A8A' }} />
                                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontWeight: 700, color: '#4B5563', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* TAB: Map */}
                {activeTab === 'map' && (
                    <motion.div
                        key="map"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white border border-gray-200 p-2 rounded-3xl shadow-sm"
                    >
                        <div className="h-[600px] rounded-2xl overflow-hidden z-0 relative">
                            {/* Heatmap Toggle */}
                            <div className="absolute top-4 right-4 z-[400] flex opacity-90 hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => setShowHeatmap(!showHeatmap)}
                                    className="bg-white px-4 py-2.5 rounded-xl shadow-lg font-bold text-sm text-gray-800 border border-gray-200 hover:bg-gray-50 transition-colors flex items-center"
                                >
                                    <MapIcon className={`w-4 h-4 mr-2 ${showHeatmap ? 'text-red-500' : 'text-[#2563EB]'}`} />
                                    {showHeatmap ? 'Show Individual Markers' : 'Show Predictive Heatmap'}
                                </button>
                            </div>

                            {loading && (
                                <div className="absolute inset-0 bg-white/80 z-20 flex items-center justify-center backdrop-blur-sm">
                                    <div className="flex flex-col items-center">
                                        <div className="w-12 h-12 border-4 border-gray-200 border-t-[#2563EB] rounded-full animate-spin mb-4"></div>
                                        <span className="font-bold text-[#2563EB] uppercase tracking-widest text-sm">Loading Map Data...</span>
                                    </div>
                                </div>
                            )}
                            {/* Light mode Leaflet tile layer */}
                            <MapContainer center={[17.3850, 78.4867]} zoom={12} style={{ height: '100%', width: '100%', zIndex: 10, background: '#F5F7FA' }}>
                                <TileLayer
                                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                                />
                                {showHeatmap ? (
                                    <HeatmapLayer points={complaints.filter(c => c.latitude && c.longitude).map(c => [c.latitude, c.longitude, 1])} />
                                ) : (
                                    complaints.filter(c => c.latitude && c.longitude).map(complaint => (
                                        <Marker
                                            key={complaint.id}
                                            position={[complaint.latitude, complaint.longitude]}
                                        >
                                            <Popup className="custom-popup">
                                                <div className="p-2 min-w-[200px]">
                                                    <div className="font-bold text-gray-900 mb-1">{complaint.category}</div>
                                                    <div className="text-sm text-gray-600 mb-3 font-medium leading-tight">{complaint.description}</div>
                                                    <div className={`px-2.5 py-1 inline-block rounded text-[10px] font-bold uppercase tracking-wider ${complaint.status === 'Closed' || complaint.status === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-[#2563EB]'}`}>
                                                        {complaint.status}
                                                    </div>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    ))
                                )}
                            </MapContainer>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Resolution Upload Modal */}
            <AnimatePresence>
                {resolvingIssueId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative border border-gray-200"
                        >
                            <button
                                onClick={() => { setResolvingIssueId(null); setResolutionImage(null); }}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Provide Proof of Resolution</h3>
                            <p className="text-gray-500 text-sm mb-6 font-medium">
                                To mark this issue as resolved, you must upload photographic evidence. This will be sent to the citizen for 2-way verification.
                            </p>

                            <div className="mb-6">
                                <label className="block text-gray-700 text-sm font-bold mb-2">Resolution Photo</label>
                                {resolutionExifError && (
                                    <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-3 text-sm font-medium border border-red-100 flex items-start">
                                        <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                                        {resolutionExifError}
                                    </div>
                                )}
                                {!resolutionImage ? (
                                    <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 hover:border-[#2563EB] cursor-pointer transition-colors" onClick={() => document.getElementById('resolutionFile').click()}>
                                        <Upload className="w-8 h-8 text-gray-400 mb-3" />
                                        <span className="text-sm font-semibold text-gray-700">Click to browse</span>
                                        <span className="text-xs text-gray-500 mt-1">PNG, JPG, up to 5MB</span>
                                    </div>
                                ) : (
                                    <div className="relative group rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                                        <img src={URL.createObjectURL(resolutionImage)} alt="Preview" className="w-full h-48 object-cover" />
                                        <button onClick={() => setResolutionImage(null)} className="absolute top-2 right-2 bg-white/90 backdrop-blur text-red-600 p-1.5 rounded-lg shadow-sm font-bold text-xs uppercase tracking-wide hover:bg-red-50 transition-colors">
                                            Remove
                                        </button>
                                    </div>
                                )}
                                <input type="file" id="resolutionFile" className="hidden" accept="image/*" onChange={(e) => handleResolutionImageSelect(e.target.files[0])} />
                            </div>

                            <button
                                onClick={handleResolveIssue}
                                disabled={!resolutionImage || isUploadingResolution}
                                className={`w-full py-3.5 rounded-xl flex items-center justify-center font-bold text-sm transition-colors ${!resolutionImage || isUploadingResolution ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-[#1E3A8A] text-white hover:bg-blue-900 shadow-md'}`}
                            >
                                {isUploadingResolution ? (
                                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Uploading Proof...</>
                                ) : (
                                    <><CheckCircle className="w-4 h-4 mr-2" /> Send for Verification</>
                                )}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style dangerouslySetInnerHTML={{
                __html: `
                /* Make Leaflet Popups match modern styling */
                .leaflet-popup-content-wrapper {
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(10px);
                    border-radius: 12px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                    border: 1px solid #E5E7EB;
                }
                .leaflet-popup-tip {
                    background: rgba(255, 255, 255, 0.95);
                    border: 1px solid #E5E7EB;
                }
                .recharts-legend-item-text {
                    color: #4B5563 !important;
                }
            `}} />
        </div>
    );
};

export default AdminDashboard;
