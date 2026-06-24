import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useLanguage } from '../../contexts/LanguageContext';
import { LogOut, LayoutDashboard, PlusCircle, FileText, Bell, User } from 'lucide-react';
import GrievanceForm from './GrievanceForm';
import TicketList from './TicketList';
import TicketDetail from './TicketDetail';

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
        <div className="min-h-screen flex bg-[var(--bg)] font-sans text-[var(--text-primary)]">
            
            {/* Sidebar (240px fixed, hidden on mobile) */}
            <aside className="hidden md:flex w-[240px] bg-[var(--sidebar-bg)] border-r border-[var(--border)] fixed inset-y-0 left-0 flex-col z-20 shadow-xs">
                <div className="p-6 flex items-center gap-3 mb-4 border-b border-[var(--border)]">
                    <div className="w-9 h-9 bg-[var(--primary)] rounded-xl flex justify-center items-center text-white font-extrabold text-lg shadow-sm">
                        C
                    </div>
                    <div>
                        <h2 className="font-black text-gray-900 leading-tight tracking-tight text-base">CGTA</h2>
                        <p className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-widest">Citizen Portal</p>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    <button 
                        onClick={() => { setView('overview'); setSelectedTicket(null); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${view === 'overview' ? 'bg-[var(--primary)] text-white shadow-md shadow-blue-500/20' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                    >
                        <LayoutDashboard size={18} /> <span>Dashboard Overview</span>
                    </button>
                    <button 
                        onClick={() => { setView('report'); setSelectedTicket(null); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${view === 'report' ? 'bg-[var(--primary)] text-white shadow-md shadow-blue-500/20' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                    >
                        <PlusCircle size={18} /> <span>Report Issue</span>
                    </button>
                    <button 
                        onClick={() => { setView('track'); setSelectedTicket(null); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${view === 'track' || view === 'detail' ? 'bg-[var(--primary)] text-white shadow-md shadow-blue-500/20' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                    >
                        <FileText size={18} /> <span>Track Status</span>
                    </button>
                </nav>

                <div className="p-4 border-t border-[var(--border)]">
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-600 font-semibold text-sm hover:bg-red-50 rounded-xl transition-all duration-200">
                        <LogOut size={18} /> Logout
                    </button>
                </div>
            </aside>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--border)] z-30 flex justify-around py-2 shadow-lg">
                <button 
                    onClick={() => { setView('overview'); setSelectedTicket(null); }}
                    className={`flex flex-col items-center gap-1 transition-colors px-3 py-1.5 rounded-lg ${view === 'overview' ? 'text-[var(--primary)] font-bold' : 'text-gray-500 font-medium'}`}
                >
                    <LayoutDashboard size={20} />
                    <span className="text-[10px]">Overview</span>
                </button>
                <button 
                    onClick={() => { setView('report'); setSelectedTicket(null); }}
                    className={`flex flex-col items-center gap-1 transition-colors px-3 py-1.5 rounded-lg ${view === 'report' ? 'text-[var(--primary)] font-bold' : 'text-gray-500 font-medium'}`}
                >
                    <PlusCircle size={20} />
                    <span className="text-[10px]">Report</span>
                </button>
                <button 
                    onClick={() => { setView('track'); setSelectedTicket(null); }}
                    className={`flex flex-col items-center gap-1 transition-colors px-3 py-1.5 rounded-lg ${(view === 'track' || view === 'detail') ? 'text-[var(--primary)] font-bold' : 'text-gray-500 font-medium'}`}
                >
                    <FileText size={20} />
                    <span className="text-[10px]">Track</span>
                </button>
            </nav>

            {/* Main Layout Area */}
            <main className="flex-1 md:ml-[240px] flex flex-col min-h-screen pb-16 md:pb-0">
                {/* Topbar */}
                <header className="h-16 bg-white border-b border-[var(--border)] px-4 md:px-8 flex items-center justify-between sticky top-0 z-10 shadow-xs">
                    <h1 className="text-lg md:text-xl font-bold text-gray-900">
                        {view === 'overview' && 'Dashboard Overview'}
                        {view === 'report' && 'Report New Issue'}
                        {view === 'track' && 'Track Active Status'}
                        {view === 'detail' && 'Grievance Details'}
                    </h1>
                    
                    <div className="flex items-center gap-4 md:gap-6">
                        <select className="text-sm font-semibold outline-none cursor-pointer text-[var(--text-secondary)] bg-transparent">
                            <option value="en">EN</option>
                            <option value="hi">HI</option>
                        </select>
                        <button className="text-gray-400 hover:text-[var(--primary)] transition relative">
                            <Bell size={20} />
                            {stats.actionRequired > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full"></span>}
                        </button>
                        <button className="flex items-center gap-2 bg-gray-50 border border-[var(--border)] px-3 md:px-4 py-1.5 rounded-full hover:bg-gray-100 transition">
                            <User size={16} className="text-gray-500"/>
                            <span className="text-xs md:text-sm font-semibold">Citizen</span>
                        </button>
                    </div>
                </header>

                <div className="p-4 md:p-8 flex-1 overflow-auto bg-[var(--bg)]">
                    {/* Overview View */}
                    {view === 'overview' && (
                        <div className="max-w-5xl mx-auto space-y-8">
                            
                            {stats.actionRequired > 0 && (
                                <div className="bg-blue-50 border-l-4 border-[var(--primary)] p-5 rounded-r-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xs">
                                    <div>
                                        <h3 className="text-blue-900 font-bold mb-1">Action Required</h3>
                                        <p className="text-sm text-blue-800 font-medium">You have {stats.actionRequired} pending verifications. Officers have uploaded resolution proofs.</p>
                                    </div>
                                    <button onClick={() => setView('track')} className="btn-primary py-2 px-5 text-sm text-white shrink-0 shadow-sm shadow-blue-500/20">Review Validations</button>
                                </div>
                            )}

                            {/* 4 Stat Cards */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                                <div className="bg-white rounded-2xl p-5 md:p-6 border border-gray-100 shadow-xs flex flex-col items-center relative overflow-hidden text-center">
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--primary)]"></div>
                                    <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 mt-1">Total Complaints</div>
                                    <div className="text-3xl md:text-4xl font-black text-[var(--primary)]">{stats.total}</div>
                                </div>
                                <div className="bg-white rounded-2xl p-5 md:p-6 border border-gray-100 shadow-xs flex flex-col items-center relative overflow-hidden text-center">
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--warning)]"></div>
                                    <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 mt-1">Pending</div>
                                    <div className="text-3xl md:text-4xl font-black text-[var(--warning)]">{stats.pending}</div>
                                </div>
                                <div className="bg-white rounded-2xl p-5 md:p-6 border border-gray-100 shadow-xs flex flex-col items-center relative overflow-hidden text-center">
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--primary-dark)]"></div>
                                    <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 mt-1">In Progress</div>
                                    <div className="text-3xl md:text-4xl font-black text-blue-800">{stats.inProgress}</div>
                                </div>
                                <div className="bg-white rounded-2xl p-5 md:p-6 border border-gray-100 shadow-xs flex flex-col items-center relative overflow-hidden text-center">
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--accent-green)]"></div>
                                    <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 mt-1">Resolved</div>
                                    <div className="text-3xl md:text-4xl font-black text-[var(--accent-green)]">{stats.resolved}</div>
                                </div>
                            </div>

                            {/* Action Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <button onClick={() => setView('report')} className="bg-white hover:border-[var(--primary)] transition-all duration-300 flex flex-col items-center justify-center text-center p-8 md:p-12 group cursor-pointer border border-gray-100 rounded-2xl shadow-xs hover:shadow-md">
                                    <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-[var(--primary)] mb-4 group-hover:scale-110 transition-transform">
                                        <PlusCircle size={32} />
                                    </div>
                                    <h3 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] mb-2">Report a New Issue</h3>
                                    <p className="text-sm text-[var(--text-secondary)]">Log a new GPS-verified civic complaint</p>
                                </button>

                                <button onClick={() => setView('track')} className="bg-white hover:border-[var(--primary)] transition-all duration-300 flex flex-col items-center justify-center text-center p-8 md:p-12 group cursor-pointer border border-gray-100 rounded-2xl shadow-xs hover:shadow-md">
                                    <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-[var(--primary)] mb-4 group-hover:scale-110 transition-transform">
                                        <FileText size={32} />
                                    </div>
                                    <h3 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] mb-2">Track Active Status</h3>
                                    <p className="text-sm text-[var(--text-secondary)]">Review ongoing fixes and auditor escalations</p>
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
