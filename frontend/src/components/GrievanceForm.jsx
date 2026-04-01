import React, { useState, useRef, useEffect } from 'react';
import { db, auth, storage } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { MapPin, Send, AlertTriangle, Mic, Image as ImageIcon, X, Loader2, Sparkles, MicOff, Search, CheckCircle } from 'lucide-react';
import { analyzeImageForGrievance, enhanceGrievanceAudioText, categorizeGrievance } from '../services/aiService';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { t } from '../utils/translations';
import { useLanguage } from '../contexts/LanguageContext';
import EXIF from 'exif-js';

// Fix for default Leaflet marker icons in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom hook to handle map clicks for manual pin dropping
const LocationMarker = ({ position, setPosition, setAddress }) => {
    const map = useMapEvents({
        click(e) {
            setPosition(e.latlng);
            // Reverse geocode the clicked location
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}`)
                .then(res => res.json())
                .then(data => {
                    if (data && data.display_name) {
                        setAddress(data.display_name);
                    } else {
                        setAddress(`GPS: ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`);
                    }
                })
                .catch(err => {
                    console.error("Reverse geocoding failed", err);
                    setAddress(`GPS: ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`);
                });
        },
    });

    useEffect(() => {
        if (position) {
            map.flyTo(position, map.getZoom());
        }
    }, [position, map]);

    return position === null ? null : (
        <Marker position={position}></Marker>
    );
};


const GrievanceForm = ({ onReturn }) => {
    const { lang } = useLanguage();
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Sanitation');
    const [address, setAddress] = useState('');
    const [latLng, setLatLng] = useState(null); // Will hold {lat, lng}
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchingLocation, setIsSearchingLocation] = useState(false);
    const [isEmergency, setIsEmergency] = useState(false);
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [exifLocation, setExifLocation] = useState(null);

    // AI & Loading States
    const [isListening, setIsListening] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
    const [isEnhancingAudio, setIsEnhancingAudio] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const fileInputRef = useRef(null);
    const recognitionRef = useRef(null);
    const [rawTranscript, setRawTranscript] = useState('');

    const categories = [
        "Roads and Buildings",
        "Sanitation",
        "Water Supply",
        "Electricity",
        "Parks and Gardens",
        "General Administration"
    ];

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-IN'; // Indian English preferred

            recognitionRef.current.onstart = () => setIsListening(true);

            recognitionRef.current.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscriptPart = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscriptPart += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                setRawTranscript(prev => {
                    const newRaw = prev + finalTranscriptPart;
                    // Temporarily show the raw + interim in the box so they know it's working
                    setDescription(newRaw + interimTranscript);
                    return newRaw;
                });
            };

            recognitionRef.current.onend = async () => {
                setIsListening(false);
                // When they stop speaking, if we have a real transcript, send to Gemini immediately
                if (rawTranscript && rawTranscript.trim() !== '') {
                    setIsEnhancingAudio(true);
                    try {
                        const cleanText = await enhanceGrievanceAudioText(rawTranscript);
                        setDescription(cleanText);
                    } catch (err) {
                        console.error("AI cleanup failed, keeping raw text", err);
                        setDescription(rawTranscript); // Fallback to whatever they said
                        setError("Could not run AI audio cleanup, but your original voice note was saved.");
                    } finally {
                        setIsEnhancingAudio(false);
                    }
                }
            };

            recognitionRef.current.onerror = (event) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
                setError("Microphone error: " + event.error);
            };
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        }
    }, [rawTranscript]); // Re-bind if transcript changes so we closure correct values

    const toggleDictation = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            // onend handles the rest
        } else {
            if (!recognitionRef.current) {
                setError("Voice dictation is not supported in this browser.");
                return;
            }
            // If they are starting dictation, append to whatever text is already there
            setRawTranscript(description ? description + " " : "");
            setError('');
            try {
                recognitionRef.current.start();
            } catch (e) {
                console.error("Dictation start error:", e);
                setIsListening(false);
                setError("Could not start microphone. It might be in use.");
            }
        }
    };

    const handleGetLocation = () => {
        if (navigator.geolocation) {
            setIsSearchingLocation(true);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const newPos = { lat: position.coords.latitude, lng: position.coords.longitude };
                    setLatLng(newPos);

                    // Reverse geocode
                    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${newPos.lat}&lon=${newPos.lng}`)
                        .then(res => res.json())
                        .then(data => {
                            if (data && data.display_name) {
                                setAddress(data.display_name);
                                setSearchQuery(data.display_name);
                            } else {
                                setAddress(`GPS: ${newPos.lat.toFixed(4)}, ${newPos.lng.toFixed(4)}`);
                                setSearchQuery(`GPS: ${newPos.lat.toFixed(4)}, ${newPos.lng.toFixed(4)}`);
                            }
                        })
                        .catch(err => {
                            console.error("Reverse geocoding failed", err);
                            setAddress(`GPS: ${newPos.lat.toFixed(4)}, ${newPos.lng.toFixed(4)}`);
                        })
                        .finally(() => setIsSearchingLocation(false));

                },
                (err) => {
                    console.error("GPS error:", err);
                    setIsSearchingLocation(false);
                    setError('Could not get GPS location. Please ensure location services are enabled.');
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            setError('Geolocation is not supported by your browser.');
        }
    };

    const handleSearchLocation = async () => {
        if (!searchQuery.trim()) return;
        setIsSearchingLocation(true);
        setError('');

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
            const data = await response.json();

            if (data && data.length > 0) {
                const newPos = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
                setLatLng(newPos);
                setAddress(data[0].display_name);
            } else {
                setError('Location not found. Please try a different search term or use GPS.');
            }
        } catch (err) {
            setError('Failed to search location. Please try again.');
        } finally {
            setIsSearchingLocation(false);
        }
    };

    // Auto-fetch location on component mount if no location is set
    useEffect(() => {
        if (!latLng) {
            handleGetLocation();
        }
    }, []);

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setError("Image must be less than 5MB");
                return;
            }
            setImageFile(file);

            // Extract EXIF data
            EXIF.getData(file, function() {
                const exifLat = EXIF.getTag(this, "GPSLatitude");
                const exifLng = EXIF.getTag(this, "GPSLongitude");
                const latRef = EXIF.getTag(this, "GPSLatitudeRef") || "N";
                const lngRef = EXIF.getTag(this, "GPSLongitudeRef") || "E";
                
                if (exifLat && exifLng) {
                    const convertToDecimal = (gpsData, ref) => {
                         const degrees = gpsData[0].numerator / gpsData[0].denominator;
                         const minutes = gpsData[1].numerator / gpsData[1].denominator;
                         const seconds = gpsData[2].numerator / gpsData[2].denominator;
                         let decimal = degrees + (minutes / 60) + (seconds / 3600);
                         return (ref === "S" || ref === "W") ? -decimal : decimal;
                    };
                    const latDecimal = convertToDecimal(exifLat, latRef);
                    const lngDecimal = convertToDecimal(exifLng, lngRef);
                    setExifLocation({ lat: latDecimal, lng: lngDecimal });
                } else {
                    setExifLocation(null);
                }
            });

            // Create preview
            const previewUrl = URL.createObjectURL(file);
            setImagePreview(previewUrl);

            // Send to Gemini
            setIsAnalyzingImage(true);
            setError('');

            try {
                const reader = new FileReader();
                reader.onloadend = async () => {
                    const base64data = reader.result;
                    try {
                        const aiDescription = await analyzeImageForGrievance(base64data);
                        setDescription(prev => {
                            if (prev && prev.trim() !== '') {
                                return prev + "\n\n[Auto-Assessed from Image]:\n" + aiDescription;
                            }
                            return aiDescription;
                        });
                    } catch (aiErr) {
                        console.error("AI Error Details:", aiErr);
                        setError(`AI Analysis Failed: ${aiErr?.message || "Unknown error"}. You can still submit the raw image.`);
                    } finally {
                        setIsAnalyzingImage(false);
                    }
                };
                reader.readAsDataURL(file);
            } catch (err) {
                console.error("FileReader error:", err);
                setIsAnalyzingImage(false);
                setError("Could not process image for analysis.");
            }
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
        setExifLocation(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handlePaste = (e) => {
        const items = e.clipboardData?.items;
        if (items) {
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    // Simulate the event for handleImageChange
                    handleImageChange({ target: { files: [file] } });
                    e.preventDefault(); // Stop default pasting behavior
                    break;
                }
            }
        }
    };
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            if (!auth.currentUser) throw new Error("Authentication required.");

            if (!latLng) {
                throw new Error("Geographic location is mandatory. Please use the map or GPS to pin your location.");
            }

            // Add a timeout safeguard for hanging Firebase connections
            const withTimeout = (promise, ms) => {
                let timeoutId;
                const timeoutPromise = new Promise((_, reject) => {
                    timeoutId = setTimeout(() => reject(new Error("Operation timed out. Please check if Firebase Storage/Firestore is properly enabled in your console.")), ms);
                });
                return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
            };

            let imageUrl = null;
            if (imageFile) {
                const imageRef = ref(storage, `complaints/${auth.currentUser.uid}/${Date.now()}_${imageFile.name}`);
                // 15 sec timeout for upload
                const snapshot = await withTimeout(uploadBytes(imageRef, imageFile), 15000);
                imageUrl = await getDownloadURL(snapshot.ref);
            }

            // Run AI Categorization in the background or await it 
            // We pass just description since it contains the image analysis text if one was uploaded
            let aiCategorization = null;
            try {
                // 10 sec timeout for AI to prevent infinite hang
                aiCategorization = await withTimeout(categorizeGrievance(description), 10000);
            } catch (aiErr) {
                console.warn("AI Categorization failed/timed out, saving without AI hints", aiErr);
            }

            // Generate unique CGTA Tracking ID
            const dateStr = new Date().getFullYear().toString().slice(-2) + (new Date().getMonth() + 1).toString().padStart(2, '0');
            const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
            const trackingId = 'CGTA-' + dateStr + '-' + randomStr;

            // Duplicate Detection (50m Master Ticket logic)
            let masterTicketId = null;
            try {
                const q = query(
                    collection(db, 'complaints'),
                    where('category', '==', category),
                    limit(20) // Limit to latest 20 to avoid over-fetching
                );
                const querySnapshot = await getDocs(q);
                
                querySnapshot.forEach((docSnap) => {
                    const data = docSnap.data();
                    // only group active tickets
                    if (data.status !== 'Closed' && data.status !== 'Resolved' && data.latitude && data.longitude) {
                        const distance = getDistanceFromLatLonInM(latLng.lat, latLng.lng, data.latitude, data.longitude);
                        if (distance <= 50) {
                            masterTicketId = data.masterTicketId || docSnap.id; 
                        }
                    }
                });
            } catch (err) {
                console.warn("Could not check for duplicates:", err);
            }

            // 10 sec timeout for database write
            const docRef = await withTimeout(addDoc(collection(db, 'complaints'), {
                trackingId,
                userId: auth.currentUser.uid,
                userEmail: auth.currentUser.email,
                isAnonymous,
                description,
                category, // User selected category
                aiCategory: aiCategorization?.category || null,
                aiUrgency: aiCategorization?.urgency || null,
                aiSummary: aiCategorization?.summary || null,
                address,
                latitude: latLng ? latLng.lat : null,
                longitude: latLng ? latLng.lng : null,
                imageUrl,
                status: 'New',
                urgency: isEmergency ? 'Emergency' : (aiCategorization?.urgency || 'Medium'), // Fallback to medium if AI fails
                masterTicketId,
                beforeImageExif: exifLocation,
                escalationLevel: 0,
                assignedRole: 'field_officer',
                auditTrail: [{ action: 'Created', actor: auth.currentUser.uid, timestamp: new Date().toISOString() }],
                createdAt: serverTimestamp(),
            }), 10000);

            setSuccessMsg(`Grievance submitted successfully! Ticket ID: ${docRef.id} `);
            // Clear form
            setDescription('');
            setAddress('');
            setSearchQuery('');
            setLatLng(null);
            removeImage();
            setRawTranscript('');
            setIsEmergency(false);
            setIsAnonymous(false);

        } catch (err) {
            console.error("Submission Error:", err);
            if (err?.code === 'permission-denied') {
                setError("Permission denied: Check Firestore/Storage Rules.");
            } else {
                setError('Failed: ' + (err.message || 'Unknown error. Check console.'));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (successMsg) {
        return (
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-green-100 max-w-2xl mx-auto text-center relative overflow-hidden">
                <div className="mx-auto w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Report Submitted Successfully</h3>
                <p className="text-gray-600 font-medium mb-8 p-4 bg-gray-50 rounded-lg border border-gray-100">{successMsg}</p>
                <button onClick={onReturn} className="bg-[#1E3A8A] font-medium text-white px-8 py-3 rounded-xl hover:bg-blue-900 transition-colors w-full sm:w-auto">
                    {t(lang, 'returnToDashboard')}
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 sm:p-8 rounded-2xl w-full max-w-2xl mx-auto relative z-10 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center">
                        {t(lang, 'reportIssue')}
                    </h2>
                    <p className="text-gray-500 text-sm mt-1 font-medium">{t(lang, 'autoFillText')}</p>
                </div>
                <button onClick={onReturn} className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full p-2 transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 flex items-start border border-red-100">
                    <AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">{t(lang, 'category')}</label>
                    <div className="relative">
                        <select
                            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] outline-none transition-colors text-gray-900 appearance-none font-medium"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        >
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                        </div>
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-gray-700 text-sm font-bold">{t(lang, 'problemDescription')}</label>
                        <button
                            type="button"
                            onClick={toggleDictation}
                            className={`flex items - center text - xs font - semibold px - 3 py - 1.5 rounded - lg transition - colors border ${isListening ? 'bg-red-50 text-red-600 border-red-200' : 'bg-blue-50 text-[#2563EB] hover:bg-blue-100 border-blue-100'} `}
                            title="Use AI Voice Dictation"
                        >
                            {isListening ? (
                                <><MicOff className="w-4 h-4 mr-1" /> {t(lang, 'stopRecording')}</>
                            ) : (
                                <><Mic className="w-4 h-4 mr-1" /> {t(lang, 'autoDictate')}</>
                            )}
                        </button>
                    </div>

                    <div className="relative group">
                        <textarea
                            className={`w - full px - 4 py - 3 bg - white border rounded - xl outline - none h - 32 transition - colors resize - none font - medium text - gray - 900 placeholder - gray - 400 focus: bg - gray - 50 ${isListening ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300 focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB]'
                                } ${isAnalyzingImage || isEnhancingAudio ? 'opacity-50 pointer-events-none' : ''} `}
                            placeholder={isListening ? t(lang, 'listening') : t(lang, 'describeIssue')}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            onPaste={handlePaste}
                            required
                        />

                        {/* Overlay Loaders for AI operations */}
                        {(isAnalyzingImage || isEnhancingAudio) && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 rounded-xl z-10 transition-all">
                                <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin mb-3" />
                                <span className="text-sm font-bold text-[#2563EB] uppercase tracking-wider">
                                    {isAnalyzingImage ? 'Analyzing Image...' : 'Enhancing Audio...'}
                                </span>
                            </div>
                        )}
                    </div>
                    {isListening && <p className="text-xs text-red-500 mt-2 font-medium">Recording active. Release button to initiate AI formatting.</p>}
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-gray-700 text-sm font-bold">{t(lang, 'photoEvidence')}</label>
                        {!imagePreview && <span className="text-xs font-bold text-[#2563EB] bg-blue-50 border border-blue-100 px-2 py-1 rounded-md">Auto-fill available</span>}
                    </div>

                    {!imagePreview ? (
                        <div
                            onClick={() => !isAnalyzingImage && fileInputRef.current?.click()}
                            className={`border - 2 border - dashed rounded - xl p - 8 flex flex - col items - center justify - center transition - colors ${isAnalyzingImage ? 'border-[#2563EB] bg-blue-50 cursor-wait' : 'border-gray-300 hover:border-[#2563EB] hover:bg-blue-50/50 cursor-pointer bg-gray-50'} `}
                        >
                            <ImageIcon className={`w - 8 h - 8 mb - 2 transition - colors ${isAnalyzingImage ? 'text-[#2563EB]' : 'text-gray-400'} `} />
                            <span className="text-sm font-semibold text-gray-700">{t(lang, 'tapToUpload')}</span>
                            <span className="text-xs text-gray-500 mt-1 center">We can auto-write a description from the image.</span>
                        </div>
                    ) : (
                        <div className="relative inline-block group">
                            <img src={imagePreview} alt="Preview" className="h-32 w-32 object-cover rounded-xl border border-gray-200 shadow-sm transition-transform group-hover:scale-[1.02]" />
                            <button
                                type="button"
                                onClick={removeImage}
                                disabled={isAnalyzingImage}
                                className="absolute -top-3 -right-3 bg-white text-red-500 rounded-full p-1.5 shadow-md border border-gray-200 hover:bg-red-50 hover:text-red-700 hover:scale-110 transition-all disabled:opacity-50"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <div className="absolute -bottom-2 -right-2 bg-[#1E3A8A] text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm flex items-center border border-white tracking-wide uppercase">
                                <Sparkles className="w-3 h-3 mr-1" />
                                Analyzed
                            </div>
                        </div>
                    )}

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        accept="image/*"
                        className="hidden"
                    />
                </div>

                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">{t(lang, 'locationMapping')} <span className="text-red-500">*</span></label>
                    <p className="text-xs text-gray-500 mb-3 font-medium">{t(lang, 'locationHint')}</p>

                    <div className="flex flex-col space-y-3 mb-4">
                        <div className="flex space-x-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    className="w-full text-gray-900 placeholder-gray-400 bg-white border border-gray-300 rounded-xl px-4 py-2.5 pl-9 focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] transition-colors font-medium text-sm"
                                    placeholder="Search location (e.g., Charminar, Hyderabad)"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchLocation())}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleSearchLocation}
                                disabled={isSearchingLocation}
                                className="bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 px-4 py-2.5 rounded-xl transition-colors font-bold text-sm"
                            >
                                Search
                            </button>
                            <button
                                type="button"
                                onClick={handleGetLocation}
                                disabled={isSearchingLocation}
                                className="bg-[#1E3A8A] text-white px-4 py-2.5 rounded-xl hover:bg-blue-900 transition-colors flex items-center justify-center font-bold text-sm whitespace-nowrap"
                                title="Auto-detect GPS"
                            >
                                {isSearchingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="h-64 w-full rounded-xl overflow-hidden border border-gray-300 relative bg-gray-100">
                        {isSearchingLocation && (
                            <div className="absolute inset-0 bg-white/70 z-[400] flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
                            </div>
                        )}
                        <MapContainer
                            center={latLng || [17.3850, 78.4867]}
                            zoom={latLng ? 16 : 11}
                            style={{ height: '100%', width: '100%' }}
                            // Adding key forces re-render when location is first found so map centers correctly
                            key={latLng ? `${latLng.lat} -${latLng.lng} ` : 'default'}
                        >
                            <TileLayer
                                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                            />
                            <LocationMarker position={latLng} setPosition={setLatLng} setAddress={(addr) => { setAddress(addr); setSearchQuery(addr); }} />
                        </MapContainer>
                    </div>
                    {address && (
                        <div className="mt-2 text-xs font-medium text-gray-600 bg-green-50 text-green-700 p-2 rounded-lg border border-green-100 flex items-start">
                            <MapPin className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 mt-0.5" />
                            <span>{address}</span>
                        </div>
                    )}
                </div>

                <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start space-x-3">
                    <div className="flex items-center h-5 mt-0.5">
                        <input
                            id="emergency-checkbox"
                            type="checkbox"
                            checked={isEmergency}
                            onChange={(e) => setIsEmergency(e.target.checked)}
                            className="w-4 h-4 text-red-600 bg-white border-red-300 rounded focus:ring-red-500 focus:ring-2"
                        />
                    </div>
                    <div className="flex flex-col">
                        <label htmlFor="emergency-checkbox" className="text-sm font-bold text-red-900 cursor-pointer">
                            {t(lang, 'markHighPriority')}
                        </label>
                        <p className="text-xs text-red-700 mt-1 font-medium">{t(lang, 'emergencyHint')}</p>
                    </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start space-x-3">
                    <div className="flex items-center h-5 mt-0.5">
                        <input
                            id="anonymous-checkbox"
                            type="checkbox"
                            checked={isAnonymous}
                            onChange={(e) => setIsAnonymous(e.target.checked)}
                            className="w-4 h-4 text-[#2563EB] bg-white border-gray-300 rounded focus:ring-[#2563EB] focus:ring-2"
                        />
                    </div>
                    <div className="flex flex-col">
                        <label htmlFor="anonymous-checkbox" className="text-sm font-bold text-gray-900 cursor-pointer">
                            {t(lang, 'submitAnonymously')}
                        </label>
                        <p className="text-xs text-gray-500 mt-1 font-medium">{t(lang, 'anonymousHint')}</p>
                    </div>
                </div>

                <div className="pt-6 border-t border-gray-100">
                    <button
                        type="submit"
                        disabled={isSubmitting || isAnalyzingImage || isEnhancingAudio}
                        className={`w - full py - 3.5 rounded - xl flex items - center justify - center transition - colors font - bold text - sm ${isSubmitting || isAnalyzingImage || isEnhancingAudio ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-[#1E3A8A] text-white hover:bg-blue-900'} `}
                    >
                        {isSubmitting ? (
                            <><Loader2 className="w-4 h-4 animate-spin mr-2 text-white" /> Submitting...</>
                        ) : (
                            <><Send className="w-4 h-4 mr-2" /> {t(lang, 'submitGrievance')}</>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default GrievanceForm;
