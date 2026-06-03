import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useLanguage } from '../../contexts/LanguageContext';
import { LogOut, LayoutDashboard, PlusCircle, List, Bell, User } from 'lucide-react';
import GrievanceForm from './GrievanceForm';
import TicketList from './TicketList';
import TicketDetail from './TicketDetail';

const ShieldIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </svg>
);

export default function CitizenDashboard() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const user = auth.currentUser;
    const [view, setView] = useState('overview'); // overview, report, track, detail
    const [tickets, setTickets] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'tickets'), where('userId', '==', user.uid));
        const unsub = onSnapshot(q, (snap) => {
            let res = [];
            snap.forEach(doc => res.push({id: doc.id, ...doc.data()}));
            setTickets(res);
        });
        return () => unsub();
    }, [user]);

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/');
    };

    const stats = {
        total: tickets.length,
        pending: tickets.filter(t => t.status === 'Submitted' || t.status === 'Assigned').length,
        inProgress: tickets.filter(t => t.status === 'In Progress').length,
        resolved: tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length,
        actionRequired: tickets.filter(t => t.status === 'Resolved' && t.rejections < 2).length
    };

    return (
        <div className="min-h-screen flex bg-[#F5F7FA] font-sans text-[var(--text-primary)]">
            
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 fixed inset-y-0 left-0 flex flex-col z-20">
                <div className="flex flex-col h-full p-6">
                    <div className="flex items-center space-x-3 mb-10 pb-4 border-b border-gray-100">
                        <div className="w-10 h-10 rounded-lg bg-[#1E3A8A] border border-[#1E3A8A] flex items-center justify-center">
                            <ShieldIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight">CGTA</h2>
                        </div>
                    </div>

                    <nav className="flex-1 space-y-1.5">
                        <button 
                            onClick={() => { setView('overview'); setSelectedTicket(null); }}
                            className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors font-medium text-sm ${view === 'overview' ? 'bg-[#2563EB] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            <LayoutDashboard className={`w-5 h-5 mr-3 ${view === 'overview' ? 'text-white' : 'text-gray-400'}`} /> Dashboard Overview
                        </button>
                        <button 
                            onClick={() => { setView('report'); setSelectedTicket(null); }}
                            className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors font-medium text-sm ${view === 'report' ? 'bg-[#2563EB] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            <PlusCircle className={`w-5 h-5 mr-3 ${view === 'report' ? 'text-white' : 'text-gray-400'}`} /> Report Issue
                        </button>
                        <button 
                            onClick={() => { setView('track'); setSelectedTicket(null); }}
                            className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors font-medium text-sm ${view === 'track' || view === 'detail' ? 'bg-[#2563EB] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            <List className={`w-5 h-5 mr-3 ${view === 'track' || view === 'detail' ? 'text-white' : 'text-gray-400'}`} /> Track Status
                        </button>
                    </nav>

                    <div className="pt-6 border-t border-gray-200 mt-auto">
                        <button onClick={handleLogout} className="flex items-center px-4 py-3 text-gray-600 hover:text-red-700 hover:bg-red-50 rounded-lg w-full transition-colors font-medium text-sm">
                            <LogOut className="w-5 h-5 mr-3 text-gray-400 group-hover:text-red-600" /> Logout
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Layout Area */}
            <main className="flex-1 ml-64 flex flex-col min-h-screen">
                {/* Topbar */}
                <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between sticky top-0 z-10">
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                        {view === 'overview' && 'Dashboard Overview'}
                        {view === 'report' && 'Report New Issue'}
                        {view === 'track' && 'Track Active Status'}
                        {view === 'detail' && 'Grievance Details'}
                    </h1>
                    
                    <div className="flex items-center gap-6">
                        <select className="text-sm font-semibold outline-none cursor-pointer text-[var(--text-secondary)]">
                            <option value="en">EN</option>
                            <option value="hi">HI</option>
                        </select>
                        <button className="text-gray-400 hover:text-[var(--primary)] transition relative">
                            <Bell size={20} />
                            {stats.actionRequired > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full"></span>}
                        </button>
                        <button className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-4 py-1.5 rounded-full hover:bg-gray-100 transition">
                            <User size={16} className="text-gray-500"/>
                            <span className="text-sm font-semibold">Citizen Profile</span>
                        </button>
                    </div>
                </header>

                <div className="p-8 flex-1 overflow-auto">
                    {/* Overview View */}
                    {view === 'overview' && (
                        <div className="max-w-5xl mx-auto">
                            
                            {stats.actionRequired > 0 && (
                                <div className="bg-blue-50 border-l-4 border-[var(--primary)] p-4 rounded-r-lg mb-8 flex justify-between items-center shadow-sm">
                                    <div>
                                        <h3 className="text-blue-900 font-bold mb-1">Action Required</h3>
                                        <p className="text-sm text-blue-800">You have {stats.actionRequired} pending verifications. Officers have uploaded resolution proofs.</p>
                                    </div>
                                    <button onClick={() => setView('track')} className="btn-primary py-1.5 px-4 text-sm text-white">Review Validations</button>
                                </div>
                            )}

                            {/* 4 Stat Cards */}
                            <div className="grid grid-cols-4 gap-6 mb-8">
                                <div className="card-flat p-5 border-t-4 border-t-[var(--primary)] border-x-0 border-b-0 shadow border border-[var(--border)] relative pt-6 text-center">
                                    <div className="text-[var(--text-secondary)] text-xs font-bold uppercase tracking-wider mb-2">Total Complaints</div>
                                    <div className="text-4xl font-extrabold text-[var(--primary)]">{stats.total}</div>
                                </div>
                                <div className="card-flat p-5 border-t-4 border-t-[var(--warning)] border-x-0 border-b-0 shadow border border-[var(--border)] relative pt-6 text-center">
                                    <div className="text-[var(--text-secondary)] text-xs font-bold uppercase tracking-wider mb-2">Pending</div>
                                    <div className="text-4xl font-extrabold text-[var(--warning)]">{stats.pending}</div>
                                </div>
                                <div className="card-flat p-5 border-t-4 border-t-[var(--primary-dark)] border-x-0 border-b-0 shadow border border-[var(--border)] relative pt-6 text-center">
                                    <div className="text-[var(--text-secondary)] text-xs font-bold uppercase tracking-wider mb-2">In Progress</div>
                                    <div className="text-4xl font-extrabold text-[var(--primary-dark)]">{stats.inProgress}</div>
                                </div>
                                <div className="card-flat p-5 border-t-4 border-t-[var(--accent-green)] border-x-0 border-b-0 shadow border border-[var(--border)] relative pt-6 text-center">
                                    <div className="text-[var(--text-secondary)] text-xs font-bold uppercase tracking-wider mb-2">Resolved</div>
                                    <div className="text-4xl font-extrabold text-[var(--accent-green)]">{stats.resolved}</div>
                                </div>
                            </div>

                            {/* Action Cards */}
                            <div className="grid grid-cols-2 gap-8">
                                <button onClick={() => setView('report')} className="card-flat hover:border-[var(--primary)] transition flex flex-col items-center justify-center text-center p-12 group cursor-pointer border hover:shadow-md">
                                    <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-[var(--primary)] mb-4 group-hover:scale-110 transition">
                                        <PlusCircle size={32} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Report a New Issue</h3>
                                    <p className="text-[var(--text-secondary)]">Log a new GPS-verified civic complaint</p>
                                </button>

                                <button onClick={() => setView('track')} className="card-flat hover:border-[var(--primary)] transition flex flex-col items-center justify-center text-center p-12 group cursor-pointer border hover:shadow-md">
                                    <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-[var(--primary)] mb-4 group-hover:scale-110 transition">
                                        <FileText size={32} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Track Active Status</h3>
                                    <p className="text-[var(--text-secondary)]">Review ongoing fixes and auditor escalations</p>
                                </button>
                            </div>
                        </div>
                    )}

                    {view === 'report' && (
                        <div className="max-w-4xl mx-auto">
                            <GrievanceForm user={user} onSuccess={() => setView('track')}/>
                        </div>
                    )}

                    {view === 'track' && (
                        <div className="max-w-5xl mx-auto">
                            <TicketList tickets={tickets} onViewDetail={t => { setSelectedTicket(t); setView('detail'); }} />
                        </div>
                    )}

                    {view === 'detail' && selectedTicket && (
                        <div className="max-w-4xl mx-auto">
                            <TicketDetail ticket={selectedTicket} onBack={() => setView('track')} user={user} />
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
}
