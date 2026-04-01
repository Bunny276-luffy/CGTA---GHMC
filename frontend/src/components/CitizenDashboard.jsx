import React, { useState } from 'react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import GrievanceForm from './GrievanceForm';
import GrievanceList from './GrievanceList';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { PlusCircle, List, LogOut, LayoutDashboard, Clock, CheckCircle, AlertCircle, Menu, X, User, Bell, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '../utils/translations';
import { useLanguage } from '../contexts/LanguageContext';

const CitizenDashboard = () => {
    const { lang, setLang } = useLanguage();
    const [currentView, setCurrentView] = useState('menu'); // 'menu', 'form', 'list'
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        signOut(auth);
    };

    const navigateTo = (view) => {
        setCurrentView(view);
        setIsMobileMenuOpen(false);
    };

    const [stats, setStats] = React.useState({
        total: 0,
        pending: 0,
        inProgress: 0,
        resolved: 0,
        actionItems: 0
    });

    React.useEffect(() => {
        const fetchStats = async () => {
            if (!auth.currentUser) return;
            try {
                const q = query(
                    collection(db, 'complaints'),
                    where('userId', '==', auth.currentUser.uid)
                );
                const querySnapshot = await getDocs(q);

                let total = 0, pending = 0, inProgress = 0, resolved = 0, actionItems = 0;
                querySnapshot.forEach((doc) => {
                    total++;
                    const status = doc.data().status || 'New';
                    if (status === 'New' || status === 'Pending') pending++;
                    else if (status === 'In Progress') inProgress++;
                    else if (status === 'Resolved' || status === 'Closed') resolved++;

                    if (status === 'Awaiting Citizen Confirmation') actionItems++;
                });

                setStats({ total, pending, inProgress, resolved, actionItems });
            } catch (err) {
                console.error("Error fetching stats:", err);
            }
        };

        fetchStats();
    }, []);

    const StatCard = ({ icon: Icon, title, value, colorClass, highlightClass, delay }) => (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.3 }}
            className={`bg-white p-6 rounded-xl border-t-4 ${colorClass} shadow-sm hover:shadow-md transition-all duration-200 group relative overflow-hidden flex flex-col justify-between h-full`}
        >
            <div className="flex justify-between items-start relative z-10 w-full mb-4">
                <div className={`p-3 rounded-lg ${highlightClass} transition-transform`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
            <div>
                <p className="text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
                <h3 className="text-gray-500 font-medium mt-1 text-sm">{title}</h3>
            </div>
        </motion.div>
    );
    const Sidebar = () => (
        <div className="flex flex-col h-full bg-white border-r border-gray-200 w-64 md:flex-shrink-0 z-20">
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
                        onClick={() => navigateTo('menu')}
                        className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors font-medium text-sm ${currentView === 'menu' ? 'bg-[#2563EB] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <LayoutDashboard className={`w-5 h-5 mr-3 ${currentView === 'menu' ? 'text-white' : 'text-gray-400'}`} /> Dashboard Overview
                    </button>
                    <button
                        onClick={() => navigateTo('form')}
                        className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors font-medium text-sm ${currentView === 'form' ? 'bg-[#2563EB] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <PlusCircle className={`w-5 h-5 mr-3 ${currentView === 'form' ? 'text-white' : 'text-gray-400'}`} /> Report Issue
                    </button>
                    <button
                        onClick={() => navigateTo('list')}
                        className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors font-medium text-sm ${currentView === 'list' ? 'bg-[#2563EB] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <List className={`w-5 h-5 mr-3 ${currentView === 'list' ? 'text-white' : 'text-gray-400'}`} /> Track Status
                    </button>
                </nav>

                <div className="pt-6 border-t border-gray-200 mt-auto">
                    <button
                        onClick={handleLogout}
                        className="flex items-center px-4 py-3 text-gray-600 hover:text-red-700 hover:bg-red-50 rounded-lg w-full transition-colors font-medium text-sm"
                    >
                        <LogOut className="w-5 h-5 mr-3 text-gray-400 group-hover:text-red-600" />
                        {t(lang, 'logout')}
                    </button>
                </div>
            </div>
        </div>
    );

    // Minor generic shield icon to prevent needing more lucide imports
    const ShieldIcon = ({ className }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        </svg>
    );

    return (
        <div className="flex h-screen w-full relative z-10 overflow-hidden bg-[#F5F7FA]">
            {/* Desktop Sidebar */}
            <div className="hidden md:block shadow-sm z-20">
                <Sidebar />
            </div>

            {/* Mobile Header & Sidebar */}
            <div className="md:hidden fixed top-0 w-full z-50 bg-white border-b border-gray-200 px-4 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-[#1E3A8A] flex items-center justify-center">
                        <ShieldIcon className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-gray-900 tracking-wide">CGTA</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-600 focus:outline-none p-1.5 rounded-lg hover:bg-gray-100">
                    {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                        className="fixed inset-0 z-40 bg-gray-900/50 md:hidden pt-16"
                    >
                        <div className="h-full w-64 bg-white shadow-xl">
                            <Sidebar />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-y-auto mt-16 md:mt-0 relative">

                {/* Top Navbar */}
                <header className="hidden md:flex justify-between items-center p-8 pb-4">
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                        {currentView === 'menu' && t(lang, 'dashboard')}
                        {currentView === 'form' && t(lang, 'reportIssue')}
                        {currentView === 'list' && t(lang, 'trackStatus')}
                    </h1>
                    <div className="flex items-center space-x-4">
                        <select
                            value={lang}
                            onChange={(e) => setLang(e.target.value)}
                            className="bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-lg px-3 py-2 outline-none focus:ring-[#2563EB] focus:border-[#2563EB] cursor-pointer"
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
                        <div className="relative bg-white border border-gray-200 p-2 rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors group" title="Notifications">
                            <Bell className="w-5 h-5 text-gray-500 group-hover:text-gray-700 transition-colors" />
                            {(stats.actionItems > 0 || stats.resolved > 0 || stats.inProgress > 0) && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>}
                        </div>
                        <div className="bg-white border border-gray-200 px-4 py-2 rounded-xl flex items-center space-x-3 text-sm font-semibold cursor-pointer hover:bg-gray-50 transition-colors">
                            <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center">
                                <User className="w-4 h-4 text-gray-600" />
                            </div>
                            <span className="text-gray-700 tracking-wide">{t(lang, 'citizenProfile')}</span>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
                    <AnimatePresence mode="wait">
                        {currentView === 'menu' && (
                            <motion.div
                                key="menu"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                {/* Action Required Banner */}
                                {stats.actionItems > 0 && (
                                    <div className="mb-6 bg-blue-50 border border-[#2563EB] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between shadow-sm">
                                        <div className="flex items-start sm:items-center space-x-4 mb-4 sm:mb-0">
                                            <div className="bg-[#2563EB] p-3 rounded-full flex-shrink-0 animate-pulse">
                                                <Bell className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-[#1E3A8A] text-lg">{t(lang, 'actionRequired')}</h3>
                                                <p className="text-[#2563EB] font-medium text-sm mt-1">
                                                    {stats.actionItems} {t(lang, 'actionDesc')}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => navigateTo('list')}
                                            className="whitespace-nowrap bg-[#1E3A8A] text-white px-5 py-2.5 rounded-xl font-bold text-sm tracking-wide hover:bg-blue-900 transition-colors shadow-sm self-start sm:self-auto"
                                        >
                                            {t(lang, 'reviewValidations')}
                                        </button>
                                    </div>
                                )}

                                {/* Stat Overview */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                                    <StatCard icon={AlertCircle} title={t(lang, 'totalComplaints')} value={stats.total} colorClass="border-blue-600" highlightClass="bg-blue-50 text-blue-600" delay={0.0} />
                                    <StatCard icon={Clock} title={t(lang, 'pending')} value={stats.pending} colorClass="border-amber-500" highlightClass="bg-amber-50 text-amber-600" delay={0.1} />
                                    <StatCard icon={LayoutDashboard} title={t(lang, 'inProgress')} value={stats.inProgress} colorClass="border-[#2563EB]" highlightClass="bg-blue-50/50 text-[#2563EB]" delay={0.2} />
                                    <StatCard icon={CheckCircle} title={t(lang, 'resolved')} value={stats.resolved} colorClass="border-green-600" highlightClass="bg-green-50 text-green-600" delay={0.3} />
                                </div>

                                {/* Quick Actions */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div
                                        onClick={() => navigateTo('form')}
                                        className="bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-[#2563EB]/50 p-8 rounded-xl cursor-pointer group flex flex-col items-center justify-center min-h-[200px] transition-all relative overflow-hidden"
                                    >
                                        <div className="bg-blue-50 p-4 rounded-xl mb-5 group-hover:scale-105 transition-transform">
                                            <PlusCircle className="w-8 h-8 text-[#2563EB]" />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-2">{t(lang, 'reportNew')}</h3>
                                        <p className="text-gray-500 text-center text-sm font-medium px-4 leading-relaxed">{t(lang, 'reportDesc')}</p>
                                    </div>

                                    <div
                                        onClick={() => navigateTo('list')}
                                        className="bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-[#2563EB]/50 p-8 rounded-xl cursor-pointer group flex flex-col items-center justify-center min-h-[200px] transition-all relative overflow-hidden"
                                    >
                                        <div className="bg-amber-50 p-4 rounded-xl mb-5 group-hover:scale-105 transition-transform">
                                            <List className="w-8 h-8 text-amber-600" />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-2">{t(lang, 'trackActive')}</h3>
                                        <p className="text-gray-500 text-center text-sm font-medium px-4 leading-relaxed">{t(lang, 'trackDesc')}</p>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {currentView === 'form' && (
                            <motion.div
                                key="form"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <GrievanceForm onReturn={() => setCurrentView('menu')} />
                            </motion.div>
                        )}

                        {currentView === 'list' && (
                            <motion.div
                                key="list"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <GrievanceList onReturn={() => setCurrentView('menu')} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
};

export default CitizenDashboard;
