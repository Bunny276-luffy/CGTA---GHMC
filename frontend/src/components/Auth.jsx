import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Mail, Lock, User, Shield, ArrowRight, Eye, EyeOff, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { t } from '../utils/translations';

const Auth = () => {
    const { lang, setLang } = useLanguage();
    const [isLogin, setIsLogin] = useState(window.location.pathname !== '/register');

    // Shared fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Register specific fields
    const [name, setName] = useState('');
    const [role, setRole] = useState('citizen');

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        window.history.pushState(null, '', isLogin ? '/login' : '/register');
    }, [isLogin]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await setDoc(doc(db, 'users', userCredential.user.uid), {
                    name,
                    email,
                    role,
                    createdAt: new Date().toISOString()
                });
            }
        } catch (err) {
            if (err.code === 'auth/invalid-credential') {
                setError("Invalid email or password.");
            } else if (err.code === 'auth/email-already-in-use') {
                setError("Email already registered. Please sign in instead.");
            } else {
                setError(err.message);
            }
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setError('');
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.3 }
        },
        exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
    };

    return (
        <div className="min-h-screen relative z-10 flex flex-col items-center justify-center p-4">
            
            {/* Language Selector */}
            <div className="absolute top-4 right-4 z-50">
                <select 
                    value={lang} 
                    onChange={(e) => setLang(e.target.value)}
                    className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-[#1E3A8A] focus:border-[#1E3A8A] block p-2 font-medium shadow-sm cursor-pointer hover:border-gray-300 transition-colors"
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
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={isLogin ? 'login' : 'register'}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={cardVariants}
                    className="w-full max-w-md glass-panel overflow-hidden mt-12 sm:mt-0"
                >
                    {/* Clean Top Border Indicator */}
                    <div className="h-1 w-full bg-[#1E3A8A]"></div>

                    <div className="p-8 sm:p-10">
                        <div className="text-center mb-10">
                            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
                                {t(lang, 'loginTitle')}
                            </h2>
                            <p className="text-gray-500 mt-2 text-sm font-medium tracking-wide uppercase">
                                {t(lang, 'loginSubtitle')}
                            </p>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 text-sm flex items-center border border-red-200">
                                <div className="flex-1 font-medium">{error}</div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <AnimatePresence>
                                {!isLogin && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                        className="overflow-hidden space-y-5"
                                    >
                                        {/* Standard Role Selection */}
                                        <div className="flex bg-gray-100 p-1.5 rounded-xl border border-gray-200">
                                            <button
                                                type="button"
                                                className={`flex-1 flex justify-center items-center py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${role === 'citizen' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                                                onClick={() => setRole('citizen')}
                                                tabIndex={isLogin ? -1 : 0}
                                            >
                                                <User className="w-4 h-4 mr-2" /> Citizen
                                            </button>
                                            <button
                                                type="button"
                                                className={`flex-1 flex justify-center items-center py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${role === 'admin' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                                                onClick={() => setRole('admin')}
                                                tabIndex={isLogin ? -1 : 0}
                                            >
                                                <Shield className="w-4 h-4 mr-2" /> Admin
                                            </button>
                                        </div>

                                        {/* Name field */}
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#2563EB] transition-colors">
                                                <User className="h-5 w-5" />
                                            </div>
                                            <input
                                                type="text"
                                                className="block w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors font-medium"
                                                placeholder="Full Name"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                required={!isLogin}
                                                tabIndex={isLogin ? -1 : 0}
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Email field */}
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#2563EB] transition-colors">
                                    <Mail className="h-5 w-5" />
                                </div>
                                <input
                                    type="email"
                                    className="block w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors font-medium"
                                    placeholder={t(lang, 'email')}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
                                    title="Please enter a valid email address"
                                />
                            </div>

                            {/* Password field */}
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#2563EB] transition-colors">
                                    <Lock className="h-5 w-5" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="block w-full pl-10 pr-12 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors font-medium"
                                    placeholder={isLogin ? t(lang, 'password') : `${t(lang, 'password')} (min 6 chars)`}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={isLogin ? undefined : "6"}
                                />
                                <button
                                    type="button"
                                    onClick={togglePasswordVisibility}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                                    tabIndex="-1"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-[#1E3A8A] hover:bg-blue-900 transition-colors mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <div className="flex items-center">
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                                        ...
                                    </div>
                                ) : (
                                    <>
                                        {isLogin ? t(lang, 'signIn') : t(lang, 'register')}
                                        <ArrowRight className="ml-2 w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Mode Toggle Footer */}
                        <div className="mt-8 text-center bg-gray-50 -mx-8 sm:-mx-10 -mb-8 sm:-mb-10 p-6 border-t border-gray-100 flex flex-col space-y-4">
                            <p className="text-sm text-gray-600 font-medium">
                                {isLogin ? t(lang, 'noAccount') : t(lang, 'haveAccount')}{' '}
                                <button
                                    onClick={toggleMode}
                                    className="font-semibold text-[#2563EB] hover:text-blue-800 transition-colors focus:outline-none hover:underline"
                                >
                                    {isLogin ? t(lang, 'registerHere') : t(lang, 'loginInstead')}
                                </button>
                            </p>
                            <div className="pt-4 border-t border-gray-200">
                                <a
                                    href="/public-stats"
                                    className="inline-flex items-center justify-center text-sm font-bold text-gray-500 hover:text-[#1E3A8A] transition-colors text-center"
                                >
                                    <BarChart3 className="w-5 h-5 mr-2 flex-shrink-0" />
                                    <span>{t(lang, 'publicDashboardText')}</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default Auth;
