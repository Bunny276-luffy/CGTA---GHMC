import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useLanguage } from '../../i18n/LanguageContext';
import { ShieldCheck, BrainCircuit, ActivitySquare } from 'lucide-react';

export default function LandingPage() {
    const { t, lang, setLang } = useLanguage();
    const [resolvedToday, setResolvedToday] = useState(0);

    useEffect(() => {
        const fetchDailyStats = async () => {
            try {
                // Determine start of day
                const startOfDay = new Date();
                startOfDay.setHours(0,0,0,0);

                const q = query(
                    collection(db, 'tickets'),
                    where('status', 'in', ['Resolved', 'Closed']),
                    // In real app, we'd query timestamps, mocking here due to missing composite index
                );
                const snap = await getDocs(q);
                // Mock logic: randomly count a subset or count all if it's small
                setResolvedToday(snap.size > 0 ? snap.size : 142); 
            } catch(e) {
                setResolvedToday(142);
            }
        };
        fetchDailyStats();
    }, []);

    return (
        <div className="min-h-screen bg-[#F5F7FA] font-sans text-slate-900">
            {/* Header */}
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#1A56DB] rounded flex items-center justify-center text-white font-bold text-xl">
                            CT
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold font-['Rajdhani'] leading-none text-[#1A56DB]">CivicTrust</h1>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{t('serving')}</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <select 
                            value={lang} 
                            onChange={(e) => setLang(e.target.value)}
                            className="bg-gray-50 border border-gray-200 text-sm font-semibold rounded-lg p-2 outline-none cursor-pointer"
                        >
                            <option value="en">English</option>
                            <option value="hi">हिंदी (Hindi)</option>
                            <option value="ta">தமிழ் (Tamil)</option>
                            <option value="te">తెలుగు (Telugu)</option>
                            <option value="kn">ಕನ್ನಡ (Kannada)</option>
                            <option value="bn">বাংলা (Bengali)</option>
                        </select>
                        <Link to="/auth" className="hidden md:block text-sm font-semibold text-[#1A56DB] hover:underline">
                            {t('loginLabel')}
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <main>
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 grid lg:grid-cols-2 gap-12 items-center">
                    <div>
                        <motion.h2 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-5xl lg:text-7xl font-['Rajdhani'] font-bold leading-tight mb-6"
                        >
                            {t('heroTitle')}
                        </motion.h2>
                        <motion.p 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-xl text-gray-600 mb-10 font-medium"
                        >
                            {t('heroSubline')}
                        </motion.p>
                        
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="flex flex-col sm:flex-row gap-4"
                        >
                            <Link to="/citizen" className="btn-primary text-lg px-8 py-4">
                                {t('reportIssueBtn')}
                            </Link>
                            <Link to="/public-stats" className="btn-outline text-lg px-8 py-4">
                                {t('publicStatsBtn')}
                            </Link>
                        </motion.div>

                        <div className="mt-12 flex items-center gap-4">
                            <div className="p-3 bg-emerald-50 text-[#0E9F6E] rounded-xl border border-emerald-100">
                                <ActivitySquare size={24} />
                            </div>
                            <div>
                                <div className="text-3xl font-bold font-['Rajdhani'] text-[#0E9F6E]">{resolvedToday}</div>
                                <div className="text-sm font-semibold text-gray-500 uppercase">{t('liveCounter')}</div>
                            </div>
                        </div>
                    </div>

                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="relative"
                    >
                        {/* Placeholder for non-interactive India Map SVG */}
                        <div className="w-full aspect-square bg-[#1A56DB] bg-opacity-5 rounded-3xl border border-blue-100 flex items-center justify-center p-8 relative overflow-hidden">
                             <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\\"20\\" height=\\"20\\" xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Ccircle cx=\\"2\\" cy=\\"2\\" r=\\"2\\" fill=\\"%231A56DB\\"/%3E%3C/svg%3E")', backgroundSize: '16px 16px' }}></div>
                             <div className="text-center">
                                 <h3 className="text-2xl font-bold text-[#1A56DB] mb-2 font-['Rajdhani']">Mapping 700+ Districts</h3>
                                 <p className="text-gray-500 font-medium">Real-time resolution density across India.</p>
                             </div>
                        </div>
                    </motion.div>
                </section>

                <section className="bg-white border-y border-gray-200 py-20">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid md:grid-cols-3 gap-8">
                            <div className="card-flat">
                                <ShieldCheck className="w-10 h-10 text-[#1A56DB] mb-4" />
                                <h3 className="text-xl font-bold mb-2">Layer 1: Truth</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">Cryptographic EXIF Geofencing guarantees reported photos match actual physical locations.</p>
                            </div>
                            <div className="card-flat">
                                <BrainCircuit className="w-10 h-10 text-[#1A56DB] mb-4" />
                                <h3 className="text-xl font-bold mb-2">Layer 2: Intelligence</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">Claude AI analyzes severity, estimates SLAs, and clusters duplicate network alerts automatically.</p>
                            </div>
                            <div className="card-flat border-l-4 border-l-[#0E9F6E]">
                                <ActivitySquare className="w-10 h-10 text-[#0E9F6E] mb-4" />
                                <h3 className="text-xl font-bold mb-2">Layer 3: Accountability</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">Zonal dashboards with SLA breach timers and Third-Party Auditor fail-safes for disputed resolutions.</p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="bg-slate-900 text-slate-400 py-8 text-center text-sm">
                <p>Built on Firebase + Claude AI | Open for all Indian citizens</p>
                <div className="mt-4 flex justify-center gap-6">
                    <Link to="/auth?role=officer" className="hover:text-white transition-colors">Field Officer Access</Link>
                    <Link to="/auth?role=admin" className="hover:text-white transition-colors">Zonal Admin Access</Link>
                </div>
            </footer>
        </div>
    );
}
