import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';
import { useLanguage } from '../../contexts/LanguageContext';
import { LogOut, LayoutDashboard, PlusCircle, FileText, Bell, User } from 'lucide-react';
import GrievanceForm from './GrievanceForm';
import GrievanceList from './GrievanceList';

export default function CitizenDashboard() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const user = auth.currentUser;
    const [view, setView] = useState('overview'); // overview, report, track, detail

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/');
    };

    const stats = {
        total: 0,
        pending: 0,
        inProgress: 0,
        resolved: 0,
        actionRequired: 0
    };

    return (
        <div className="min-h-screen flex bg-[var(--bg)] font-sans text-[var(--text-primary)]">
            
            {/* Sidebar (220px fixed) */}
            <aside className="w-[220px] bg-[var(--sidebar-bg)] border-r border-[var(--border)] fixed inset-y-0 left-0 flex flex-col z-20">
                <div className="p-6 flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-[var(--primary-dark)] rounded flex justify-center items-center text-white font-bold text-lg">
                        C
                    </div>
                    <div>
                        <h2 className="font-extrabold text-[#111827] leading-tight">CGTA</h2>
                        <p className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-widest">Citizen Portal</p>
                    </div>
                </div>

                <nav className="flex-1 px-4">
                    <button 
                        onClick={() => { setView('overview'); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-full font-semibold transition-colors mb-2 ${view === 'overview' ? 'bg-[var(--primary)] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        <LayoutDashboard size={20} /> <span>Dashboard</span>
                    </button>
                    <button 
                        onClick={() => { setView('report'); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-full font-semibold transition-colors mb-2 ${view === 'report' ? 'bg-[var(--primary)] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        <PlusCircle size={20} /> <span>Report Issue</span>
                    </button>
                    <button 
                        onClick={() => setView('track')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-full font-semibold transition-colors mb-2 ${view === 'track' || view === 'detail' ? 'bg-[var(--primary)] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        <FileText size={20} /> <span>Track Status</span>
                    </button>
                </nav>

                <div className="p-4 border-t border-[var(--border)]">
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-600 font-semibold hover:bg-red-50 rounded-full transition">
                        <LogOut size={20} /> Logout
                    </button>
                </div>
            </aside>

            {/* Main Layout Area */}
            <main className="flex-1 ml-[220px] flex flex-col min-h-screen">
                {/* Topbar */}
                <header className="h-16 bg-white border-b border-[var(--border)] px-8 flex items-center justify-between sticky top-0 z-10">
                    <h1 className="text-xl font-bold">
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
                        <button className="flex items-center gap-2 bg-gray-50 border border-[var(--border)] px-4 py-1.5 rounded-full hover:bg-gray-100 transition">
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
                        <GrievanceList onReturn={() => setView('overview')} />
                    )}

                </div>
            </main>
        </div>
    );
}
