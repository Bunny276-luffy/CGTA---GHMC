import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, onSnapshot, getDocs } from 'firebase/firestore';
import { useLanguage } from '../../i18n/LanguageContext';

// Icons & Tabs
import { LogOut, Activity, BarChart2, Map as MapIcon, ShieldCheck, Scale, RefreshCw, AlertTriangle } from 'lucide-react';
import AnalyticsTab from './AnalyticsTab';
import LiveMapTab from './LiveMapTab';
import TPAQueue from './TPAQueue';

function StatusBadge({ status }) {
    const s = status.toUpperCase();
    if (s === 'SUBMITTED' || s === 'PENDING') return <span className="badge bg-amber-100 text-amber-800">PENDING</span>;
    if (s === 'IN PROGRESS') return <span className="badge bg-orange-100 text-orange-800">IN PROGRESS</span>;
    if (s === 'ASSIGNED') return <span className="badge border border-blue-600 text-blue-600">ASSIGNED</span>;
    if (s === 'RESOLVED' || s === 'CLOSED') return <span className="badge bg-green-100 text-green-800">RESOLVED</span>;
    if (s === 'SLA_BREACHED') return <span className="badge border border-red-600 text-red-600">SLA BREACHED</span>;
    if (s === 'TPA_REVIEW') return <span className="badge bg-purple-100 text-purple-800 tracking-wider">TPA/AUDIT</span>;
    return <span className="badge bg-gray-100 text-gray-800">{s}</span>;
}

function PriorityBadge({ severity }) {
    const s = (severity || '').toUpperCase();
    if (s === 'EMERGENCY' || s === 'CRITICAL') return <span className="badge bg-red-600 text-white shadow-sm">CRITICAL</span>;
    if (s === 'NORMAL' || s === 'LOW') return <span className="badge bg-green-600 text-white shadow-sm">NORMAL</span>;
    return <span className="badge bg-gray-200 text-gray-700">PENDING AI</span>;
}

export default function AdminDashboard() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('board');
    const [tickets, setTickets] = useState([]);
    const [highRiskZones, setHighRiskZones] = useState([]);

    useEffect(() => {
        const q = query(collection(db, 'tickets'));
        const unsub = onSnapshot(q, (snap) => {
            let res = [];
            snap.forEach(doc => res.push({ id: doc.id, ...doc.data() }));
            
            // Sort to latest first naturally
            res.sort((a,b) => (b.createdAt?.toMillis()||0) - (a.createdAt?.toMillis()||0));
            setTickets(res);

            // Compute Predictive Decay
            computePredictiveDecay(res);
        });
        return () => unsub();
    }, []);

    function computePredictiveDecay(data) {
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const recentTickets = data.filter(t => t.createdAt && t.createdAt.toMillis() > sevenDaysAgo);
        
        // Group by an arbitrary grid square (Ward simulation rounded to 2 decimals) and Category
        const zones = {};
        recentTickets.forEach(t => {
            if(!t.location || !t.location.lat) return;
            // Simulated Zone Grid Name
            const zoneName = `Sector ${t.location.lat.toFixed(2)}-${t.location.lng.toFixed(2)}`;
            const key = `${zoneName}_${t.category}`;
            
            if(!zones[key]) zones[key] = { count: 0, zone: zoneName, category: t.category };
            zones[key].count++;
        });

        // Flag zones with 3+ identical categories
        const risks = Object.values(zones).filter(z => z.count >= 3);
        setHighRiskZones(risks);
    };

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-[var(--bg)] font-sans text-[var(--text-primary)] flex flex-col">
            
            {/* Top Bar Only */}
            <header className="bg-[var(--sidebar-bg)] border-b border-[var(--border)] px-8 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[var(--primary-dark)] rounded-lg flex justify-center items-center text-white shadow">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-extrabold text-[#111827] leading-tight flex items-center gap-2">
                            CivicTrust <span className="text-gray-300 font-normal">|</span> Admin Dashboard
                        </h1>
                        <p className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-widest mt-0.5">Grievance Management System</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <select className="text-sm font-semibold outline-none bg-transparent cursor-pointer text-[var(--text-primary)]">
                        <option value="en">English (US)</option>
                        <option value="hi">हिंदी</option>
                    </select>

                    <button className="flex items-center gap-2 text-sm font-bold text-[var(--primary)] hover:underline border border-[var(--primary)] px-3 py-1.5 rounded bg-blue-50">
                        <RefreshCw size={14} /> syncData
                    </button>

                    <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-bold text-white bg-red-600 px-4 py-2 rounded shadow-sm hover:bg-red-700 transition">
                        <LogOut size={16} /> Sign Out
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className="bg-white border-b border-[var(--border)] px-8">
                <div className="flex gap-4">
                    <button onClick={() => setActiveTab('board')} className={`flex items-center gap-2 px-6 py-4 font-bold transition-all border-b-2 ${activeTab === 'board' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-gray-500 hover:text-gray-900'}`}><Activity size={18} /> Data Board</button>
                    <button onClick={() => setActiveTab('analytics')} className={`flex items-center gap-2 px-6 py-4 font-bold transition-all border-b-2 ${activeTab === 'analytics' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-gray-500 hover:text-gray-900'}`}><BarChart2 size={18} /> Analytics</button>
                    <button onClick={() => setActiveTab('map')} className={`flex items-center gap-2 px-6 py-4 font-bold transition-all border-b-2 ${activeTab === 'map' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-gray-500 hover:text-gray-900'}`}><MapIcon size={18} /> Live Map</button>
                    <button onClick={() => setActiveTab('tpa')} className={`flex items-center gap-2 px-6 py-4 font-bold transition-all border-b-2 ${activeTab === 'tpa' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-gray-500 hover:text-gray-900'}`}><Scale size={18} /> TPA Queue</button>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-auto">
                <div className="max-w-[1600px] mx-auto">
                    
                    {/* Predictive Alerts render above Data Board */}
                    {activeTab === 'board' && highRiskZones.length > 0 && (
                        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {highRiskZones.map((risk, idx) => (
                                <div key={idx} className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded shadow-sm flex gap-3 items-start">
                                    <AlertTriangle className="text-amber-600 mt-0.5 shrink-0" size={20} />
                                    <div>
                                        <h4 className="text-amber-900 font-bold mb-1">High Risk Zone: {risk.zone}</h4>
                                        <p className="text-amber-800 text-xs font-semibold">Possible infrastructure failure. {risk.count} rapid reports of "{risk.category}" mapped in 7 days.</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Data Board View */}
                    {activeTab === 'board' && (
                        <div className="card-flat p-0 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead className="bg-gray-50 border-b border-[var(--border)] text-[var(--text-secondary)] text-xs uppercase tracking-wider font-bold">
                                        <tr>
                                            <th className="p-4 py-5 whitespace-nowrap">Issue Description</th>
                                            <th className="p-4 py-5">Classification</th>
                                            <th className="p-4 py-5">Priority Level</th>
                                            <th className="p-4 py-5 w-[300px]">AI Synopsis</th>
                                            <th className="p-4 py-5">State</th>
                                            <th className="p-4 py-5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border)]">
                                        {tickets.map(t => (
                                            <tr key={t.id} className="hover:bg-gray-50 transition">
                                                <td className="p-4">
                                                    <div className="font-bold text-[var(--text-primary)] mb-1 relative pr-4">
                                                        {t.trackingId}
                                                    </div>
                                                    <div className="text-xs text-gray-500 max-w-xs truncate">{t.description}</div>
                                                </td>
                                                <td className="p-4 font-semibold text-gray-700">{t.category}</td>
                                                <td className="p-4"><PriorityBadge severity={t.severity} /></td>
                                                <td className="p-4 text-gray-600 text-xs leading-relaxed">{t.aiSynopsis || '—'}</td>
                                                <td className="p-4 flex flex-col items-start gap-1">
                                                    <StatusBadge status={t.status} />
                                                    {t.status === 'SLA_BREACHED' && <span className="text-[10px] text-red-500 font-bold uppercase mt-1">SLA Limit Exceeded</span>}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button className="text-[var(--primary)] font-bold text-xs uppercase hover:underline">
                                                        VIEW EVIDENCE
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {tickets.length === 0 && (
                                            <tr><td colSpan="6" className="p-8 text-center text-gray-500 font-semibold">No data currently available in system</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'analytics' && <AnalyticsTab data={tickets} />}
                    {activeTab === 'map' && <LiveMapTab data={tickets} />}
                    {activeTab === 'tpa' && <TPAQueue />}

                </div>
            </main>
        </div>
    );
}
