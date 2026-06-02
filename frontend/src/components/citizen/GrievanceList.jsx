import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { collection, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { Clock, CheckCircle, AlertCircle, MapPin, Search, Filter, X, ChevronRight, FileText, Image as ImageIcon, Calendar, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '../../utils/translations';
import { useLanguage } from '../../contexts/LanguageContext';

const GrievanceList = ({ onReturn }) => {
    const { lang } = useLanguage();
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filtering State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterPriority, setFilterPriority] = useState('All');
    const [showFilters, setShowFilters] = useState(false);

    // Detail & Image Modal State
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [enlargedImage, setEnlargedImage] = useState(null);

    // Clear error when a new ticket is opened
    useEffect(() => { setError(''); }, [selectedIssue])

    const categories = ["All", "Roads and Buildings", "Sanitation", "Water Supply", "Electricity", "Parks and Gardens", "General Administration"];
    const statuses = ["All", "New", "Pending", "In Progress", "Resolved", "Awaiting Citizen Confirmation", "Closed"];
    const priorities = ["All", "Low", "Medium", "High"];

    useEffect(() => {
        const fetchComplaints = async () => {
            if (!auth.currentUser) return;
            try {
                const q = query(
                    collection(db, 'complaints'),
                    where('userId', '==', auth.currentUser.uid)
                );
                const querySnapshot = await getDocs(q);
                const fetched = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    // Normalize urgency to Low/Medium/High
                    let urgency = data.urgency || 'Medium';
                    if (urgency === 'Normal') urgency = 'Medium';
                    fetched.push({ id: doc.id, ...data, urgency });
                });

                fetched.sort((a, b) => {
                    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now();
                    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now();
                    return timeB - timeA;
                });

                setComplaints(fetched);
            } catch (err) {
                console.error(err);
                setError("Failed to load complaints: " + err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchComplaints();
    }, []);

    const getStatusStyles = (status) => {
        if (status === 'Resolved' || status === 'Closed') return 'text-green-700 bg-green-50 border-green-200';
        if (status === 'Awaiting Citizen Confirmation') return 'text-purple-700 bg-purple-50 border-purple-200';
        if (status === 'Pending') return 'text-amber-700 bg-amber-50 border-amber-200';
        return 'text-[#2563EB] bg-blue-50 border-blue-200';
    };

    const getPriorityStyles = (priority) => {
        if (priority === 'High') return 'text-red-700 bg-red-50 border-red-200';
        if (priority === 'Medium') return 'text-amber-700 bg-amber-50 border-amber-200';
        return 'text-gray-600 bg-gray-100 border-gray-200'; // Low
    };

    const getStatusIcon = (status) => {
        if (status === 'Resolved') return <CheckCircle className="w-4 h-4 mr-1.5" />;
        if (status === 'Pending') return <Clock className="w-4 h-4 mr-1.5" />;
        return <Activity className="w-4 h-4 mr-1.5" />;
    };

    const filteredComplaints = complaints.filter(c => {
        const matchSearch = c.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCategory = filterCategory === 'All' || c.category === filterCategory;
        const matchStatus = filterStatus === 'All' || c.status === filterStatus;
        const matchPriority = filterPriority === 'All' || c.urgency === filterPriority;
        return matchSearch && matchCategory && matchStatus && matchPriority;
    });

    const formatTime = (ts) => {
        if (!ts) return 'Just now';
        return new Date(ts.toDate()).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const TimelineTracker = ({ currentStatus }) => {
        const stages = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Citizen Confirmed'];
        const getMappedStatus = (s) => {
            if (s === 'New') return 'Submitted';
            if (s === 'Pending') return 'Under Review';
            if (s === 'Assigned') return 'Assigned';
            if (s === 'In Progress') return 'In Progress';
            if (s === 'Resolved' || s === 'Awaiting Citizen Confirmation') return 'Resolved';
            if (s === 'Closed') return 'Citizen Confirmed';
            return 'Submitted'; // Default fallback
        };
        const mappedStatus = getMappedStatus(currentStatus);
        const currentIndex = stages.indexOf(mappedStatus);

        return (
            <div className="relative flex justify-between items-center mt-8 mb-4 px-2">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 rounded-full z-0"></div>
                <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[#2563EB] rounded-full z-0 transition-all duration-1000"
                    style={{ width: `${(currentIndex / (stages.length - 1)) * 100}%` }}
                ></div>

                {stages.map((stage, index) => {
                    const isCompleted = index <= currentIndex;
                    const isActive = index === currentIndex;
                    return (
                        <div key={stage} className="relative z-10 flex flex-col items-center group">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${isActive ? 'bg-white border-[#2563EB] scale-110 shadow-sm' : isCompleted ? 'bg-[#2563EB] border-[#2563EB]' : 'bg-white border-gray-300'}`}>
                                {isCompleted && !isActive ? <CheckCircle className="w-4 h-4 text-white" /> : <div className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-[#2563EB]' : 'bg-transparent'}`}></div>}
                            </div>
                            <span className={`absolute top-10 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${isActive ? 'text-[#2563EB]' : isCompleted ? 'text-gray-700' : 'text-gray-400'}`}>
                                {stage}
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    };

    const handleCitizenConfirmation = async (ticketId, action) => {
        setError('');
        try {
            const ticketRef = doc(db, 'complaints', ticketId);
            if (action === 'confirm') {
                await updateDoc(ticketRef, { status: 'Closed', citizenConfirmed: true, closedAt: new Date() });
                setSelectedIssue(prev => ({ ...prev, status: 'Closed' }));
            } else {
                const newCount = (selectedIssue?.rejectionCount ?? 0) + 1;
                const newStatus = newCount >= 2 ? 'TPA_REVIEW' : 'Resolved';
                await updateDoc(ticketRef, { rejectionCount: newCount, status: newStatus });
                setSelectedIssue(prev => ({ ...prev, rejectionCount: newCount, status: newStatus }));
            }
        } catch (err) {
            console.error('Firestore error:', err.code, err.message);
            setError('Failed to update: ' + err.message);
        }
    };
    return (
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200 max-w-4xl mx-auto relative z-10 w-full mb-10">
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0 relative z-20">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center">
                        <AlertCircle className="w-6 h-6 text-[#2563EB] mr-2" />
                        {selectedIssue ? 'Complaint Details' : 'Complaint Overview'}
                    </h2>
                    <p className="text-gray-500 text-sm mt-1 font-medium">
                        {selectedIssue ? `Tracing Ticket: ${selectedIssue.trackingId || selectedIssue.id.slice(0, 8).toUpperCase()}` : t(lang, 'trackHint')}
                    </p>
                </div>

                <div className="flex items-center space-x-3">
                    {!selectedIssue && (
                        <>
                            <div className="relative group">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2563EB] transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search tickets..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-full pl-9 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] w-full sm:w-48 transition-all"
                                />
                            </div>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`p-2.5 rounded-full border transition-colors ${showFilters ? 'bg-blue-50 border-[#2563EB] text-[#2563EB]' : 'bg-white border-gray-300 text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                                title="Filter Parameters"
                            >
                                <Filter className="w-4 h-4" />
                            </button>
                        </>
                    )}
                    <button onClick={selectedIssue ? () => setSelectedIssue(null) : onReturn} className="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 px-3 py-2 rounded-xl text-sm leading-none flex items-center shadow-sm font-medium">
                        {selectedIssue ? <><ChevronRight className="w-4 h-4 mr-1 rotate-180" /> Back</> : <><X className="w-4 h-4" /></>}
                    </button>
                </div>
            </div>

            {/* Expander Filter Panel */}
            <AnimatePresence>
                {!selectedIssue && showFilters && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-b border-gray-100 bg-gray-50 overflow-hidden"
                    >
                        <div className="p-4 md:px-6 flex flex-wrap gap-4 items-center text-sm">
                            <div className="flex items-center space-x-2">
                                <span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Category:</span>
                                <select className="bg-white border border-gray-300 rounded-lg px-2 py-1 text-gray-900 outline-none cursor-pointer focus:border-[#2563EB]" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Status:</span>
                                <select className="bg-white border border-gray-300 rounded-lg px-2 py-1 text-gray-900 outline-none cursor-pointer focus:border-[#2563EB]" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Priority:</span>
                                <select className="bg-white border border-gray-300 rounded-lg px-2 py-1 text-gray-900 outline-none cursor-pointer focus:border-[#2563EB]" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                                    {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error & Loading */}
            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl m-6 flex items-start border border-red-100">
                    <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">{error}</span>
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="w-10 h-10 border-4 border-gray-200 border-t-[#2563EB] rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium">Loading Records...</p>
                </div>
            ) : selectedIssue ? (
                /* Detail View */
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-6 md:p-8 space-y-8">

                    {/* Status & Timeline Header */}
                    <div className="bg-white border border-gray-200 p-6 rounded-2xl relative overflow-hidden group shadow-sm">
                        <div className="flex flex-wrap justify-between items-start mb-6 gap-4">
                            <div>
                                <h3 className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mb-1">Issue Category</h3>
                                <div className="text-xl font-bold text-gray-900">{selectedIssue.category}</div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getPriorityStyles(selectedIssue.urgency)} uppercase tracking-wider flex items-center`}>
                                    Priority: {selectedIssue.urgency}
                                </span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center border ${getStatusStyles(selectedIssue.status)} uppercase tracking-wider`}>
                                    {getStatusIcon(selectedIssue.status)} {selectedIssue.status}
                                </span>
                            </div>
                        </div>

                        <TimelineTracker currentStatus={selectedIssue.status} />

                        {/* 2-Way Resolution Verification Action Box */}
                        {selectedIssue.status === 'Awaiting Citizen Confirmation' && (
                            <div className="mt-8 bg-purple-50 border border-purple-200 rounded-xl p-6 shadow-sm">
                                <h4 className="font-bold text-purple-900 mb-2 flex items-center">
                                    <CheckCircle className="w-5 h-5 mr-2 text-purple-600" />
                                    Admin Marked as Resolved
                                </h4>
                                <p className="text-purple-700 text-sm mb-4 font-medium">The administration has marked this issue as resolved. Please verify if the work is satisfactory to officially close this ticket.</p>
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        onClick={() => handleCitizenConfirmation(selectedIssue.id, 'confirm')}
                                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-5 rounded-lg transition-colors text-sm shadow-sm"
                                    >
                                        Confirm & Close Ticket
                                    </button>
                                    <button
                                        onClick={() => handleCitizenConfirmation(selectedIssue.id, 'reject')}
                                        className="bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 font-bold py-2.5 px-5 rounded-lg transition-colors text-sm shadow-sm"
                                    >
                                        Reject (Issue Persists)
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                            <h4 className="flex items-center font-bold text-gray-700 text-sm tracking-wide uppercase mb-3"><FileText className="w-4 h-4 mr-2 text-[#2563EB]" /> AI Summary & Description</h4>
                            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap font-medium">{selectedIssue.description}</p>
                        </div>
                        <div className="space-y-6">
                            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex items-center space-x-4">
                                <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                                    <MapPin className="w-6 h-6 text-[#2563EB]" />
                                </div>
                                <div className="overflow-hidden">
                                    <h4 className="font-bold text-gray-500 text-[10px] tracking-widest uppercase mb-1">Location Coordinates</h4>
                                    <p className="text-gray-900 text-sm font-medium truncate">{selectedIssue.address || "No Manual Override Location"}</p>
                                    <p className="text-gray-500 font-mono text-[10px] mt-1">{selectedIssue.latitude ? `LAT ${selectedIssue.latitude.toFixed(4)} / LNG ${selectedIssue.longitude.toFixed(4)}` : 'GPS Offline'}</p>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex items-center space-x-4">
                                <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                                    <Calendar className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div className="overflow-hidden">
                                    <h4 className="font-bold text-gray-500 text-[10px] tracking-widest uppercase mb-1">Temporal Data</h4>
                                    <p className="text-gray-900 text-sm font-medium truncate">{formatTime(selectedIssue.createdAt)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Image Evidence */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {selectedIssue.imageUrl && (
                            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                                <h4 className="flex items-center font-bold text-gray-700 text-sm tracking-wide uppercase mb-4"><ImageIcon className="w-4 h-4 mr-2 text-[#2563EB]" /> Visual Evidence (Submitted)</h4>
                                <div
                                    className="relative group cursor-pointer overflow-hidden rounded-xl border border-gray-200 max-w-sm inline-block shadow-sm"
                                    onClick={() => setEnlargedImage(selectedIssue.imageUrl)}
                                >
                                    <img src={selectedIssue.imageUrl} alt="Evidence" className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                        <span className="text-white text-xs font-bold tracking-wide uppercase flex items-center"><Search className="w-3 h-3 mr-1" /> Enlarge</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedIssue.resolutionEvidenceUrl && (
                            <div className="bg-green-50 rounded-2xl p-5 border border-green-100">
                                <h4 className="flex items-center font-bold text-green-800 text-sm tracking-wide uppercase mb-4"><CheckCircle className="w-4 h-4 mr-2 text-green-600" /> Resolution Proof (Admin)</h4>
                                <div
                                    className="relative group cursor-pointer overflow-hidden rounded-xl border border-green-200 max-w-sm inline-block shadow-sm"
                                    onClick={() => setEnlargedImage(selectedIssue.resolutionEvidenceUrl)}
                                >
                                    <img src={selectedIssue.resolutionEvidenceUrl} alt="Resolution" className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                        <span className="text-white text-xs font-bold tracking-wide uppercase flex items-center"><Search className="w-3 h-3 mr-1" /> Enlarge</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            ) : filteredComplaints.length === 0 ? (
                /* Empty / No Matches View */
                <div className="text-center py-20 bg-gray-50">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium text-lg">{t(lang, 'noGrievances')}</p>
                </div>
            ) : (
                /* Main List View */
                <motion.div
                    initial="hidden"
                    animate="show"
                    className="space-y-4 p-4 md:p-6"
                >
                    {filteredComplaints.map((complaint, index) => (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: "spring", bounce: 0.3, delay: index * 0.05 }}
                            key={complaint.id}
                            onClick={() => setSelectedIssue(complaint)}
                            className="bg-white border border-gray-200 hover:border-[#2563EB]/50 hover:shadow-md flex flex-col sm:flex-row justify-between p-5 rounded-2xl group cursor-pointer transition-all"
                        >
                            <div className="flex-1 mb-4 sm:mb-0 pr-4">
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                    <span className="font-bold text-gray-900 tracking-wide mr-2 text-lg">{complaint.category}</span>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${getPriorityStyles(complaint.urgency)} uppercase tracking-widest`}>
                                        {complaint.urgency}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold flex items-center border ${getStatusStyles(complaint.status)} uppercase tracking-widest`}>
                                        {complaint.status}
                                    </span>
                                </div>
                                <p className="text-gray-600 text-sm mb-3 line-clamp-2 leading-relaxed font-medium">{complaint.description}</p>
                                <div className="text-xs text-gray-500 flex items-center font-medium">
                                    <MapPin className="w-3.5 h-3.5 mr-1.5 text-gray-400 group-hover:text-[#2563EB] transition-colors" />
                                    {complaint.address || "No precise coordinates provided"}
                                </div>
                            </div>

                            <div className="text-left sm:text-right flex flex-col justify-between border-t sm:border-t-0 sm:border-l border-gray-100 pt-4 sm:pt-0 sm:pl-5 sm:min-w-[140px] relative">
                                <div className="flex flex-row sm:flex-col justify-between items-center sm:items-end w-full h-full">
                                    <div className="text-left sm:text-right">
                                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">{t(lang, 'trackingId')}</div>
                                        <div className="font-mono text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded border border-gray-200">{complaint.trackingId || complaint.id.slice(0, 8)}</div>
                                    </div>

                                    <div className="mt-0 sm:mt-auto text-left sm:text-right">
                                        <div className="text-sm text-gray-500 font-medium group-hover:text-gray-900 transition-colors">
                                            {formatTime(complaint.createdAt).split(',')[0]}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            )}

            {/* Enlarge Image Modal */}
            <AnimatePresence>
                {enlargedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-gray-900/90 flex items-center justify-center p-4"
                        onClick={() => setEnlargedImage(null)}
                    >
                        <button className="absolute top-6 right-6 text-white bg-gray-800 p-3 rounded-full hover:bg-gray-700 transition-colors z-50">
                            <X className="w-6 h-6" />
                        </button>
                        <motion.img
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            src={enlargedImage}
                            alt="View"
                            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-lg border border-gray-700 relative z-40"
                            onClick={e => e.stopPropagation()}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GrievanceList;
