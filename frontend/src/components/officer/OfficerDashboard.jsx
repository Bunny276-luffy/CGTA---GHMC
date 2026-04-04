import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';
import { useLanguage } from '../../i18n/LanguageContext';

// Components
import AssignedMap from './AssignedMap';
import PhotoUploadVerifier from './PhotoUploadVerifier';
import { LogOut, Map as MapIcon, UploadCloud, WifiOff, HardHat } from 'lucide-react';

export default function OfficerDashboard() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [view, setView] = useState('assignments'); // assignments, upload, offline
    const [selectedTicketToResolve, setSelectedTicketToResolve] = useState(null);

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/');
    };

    return (
        <div className="min-h-screen flex bg-[var(--bg)] font-sans text-[var(--text-primary)]">
            
            {/* Sidebar identical to CitizenDashboard */}
            <aside className="w-[220px] bg-[var(--sidebar-bg)] border-r border-[var(--border)] fixed inset-y-0 left-0 flex flex-col z-20">
                <div className="p-6 flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-[var(--warning)] rounded flex justify-center items-center text-white font-bold text-lg">
                        O
                    </div>
                    <div>
                        <h2 className="font-extrabold text-[#111827] leading-tight">CGTA</h2>
                        <p className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-widest">Field Officer</p>
                    </div>
                </div>

                <nav className="flex-1 px-4">
                    <button onClick={() => {setView('assignments'); setSelectedTicketToResolve(null);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-full font-semibold transition-colors mb-2 ${view === 'assignments' ? 'bg-[var(--primary)] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                        <MapIcon size={20} /> <span>My Assignments</span>
                    </button>
                    <button onClick={() => {setView('upload'); setSelectedTicketToResolve(null);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-full font-semibold transition-colors mb-2 ${view === 'upload' || (view==='upload' && selectedTicketToResolve) ? 'bg-[var(--primary)] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                        <UploadCloud size={20} /> <span>Upload Resolution</span>
                    </button>
                    <button onClick={() => {setView('offline'); setSelectedTicketToResolve(null);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-full font-semibold transition-colors mb-2 ${view === 'offline' ? 'bg-[var(--primary)] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                        <WifiOff size={20} /> <span>Offline Queue</span>
                    </button>
                </nav>

                <div className="p-4 border-t border-[var(--border)]">
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-600 font-semibold hover:bg-red-50 rounded-full transition">
                        <LogOut size={20} /> Logout
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 ml-[220px] flex flex-col min-h-screen">
                <header className="h-16 bg-white border-b border-[var(--border)] px-8 flex items-center justify-between sticky top-0 z-10">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <HardHat size={20} className="text-[var(--text-secondary)]" />
                        {view === 'assignments' && 'Active Field Map'}
                        {view === 'upload' && 'Upload Structural Proof'}
                        {view === 'offline' && 'Dormant Sync Queue'}
                    </h1>
                    <select className="text-sm font-semibold outline-none bg-transparent cursor-pointer text-[var(--text-secondary)]">
                        <option value="en">EN</option>
                        <option value="hi">HI</option>
                    </select>
                </header>

                <div className="p-8 flex-1 overflow-auto">
                    {view === 'assignments' && (
                        <div className="max-w-[1400px] mx-auto h-[600px] rounded-xl overflow-hidden border border-[var(--border)] shadow-sm">
                            <AssignedMap 
                                userId={auth.currentUser?.uid} 
                                onResolveIntent={(t) => { setSelectedTicketToResolve(t); setView('upload'); }} 
                            />
                        </div>
                    )}

                    {view === 'upload' && (
                        <div className="max-w-2xl mx-auto">
                            {selectedTicketToResolve ? (
                                <PhotoUploadVerifier ticket={selectedTicketToResolve} onSuccess={() => setView('assignments')} />
                            ) : (
                                <div className="card-flat text-center p-12 text-gray-500 border-dashed border-2 bg-gray-50">
                                    <MapIcon size={48} className="mx-auto mb-4 text-gray-300" />
                                    <h3 className="font-bold text-lg">No Ticket Selected</h3>
                                    <p className="text-sm">Please select an assigned pin from the Active Field Map to begin resolution uploads.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {view === 'offline' && (
                        <div className="max-w-2xl mx-auto card-flat text-center p-12 text-gray-500 bg-gray-50 border-dashed border-2">
                            <WifiOff size={48} className="mx-auto mb-4 text-gray-300" />
                            <h3 className="font-bold text-lg mb-2">Offline Queue Active</h3>
                            <p className="text-sm max-w-sm mx-auto">Any resolutions completed out of network range are securely stored via IndexedDB and will transmit autonomously when navigator.onLine fires.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
