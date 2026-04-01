import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { BarChart3, PieChart, TrendingUp, Users, MapPin, CheckCircle, Clock, ShieldAlert, ChevronLeft, ArrowRight } from 'lucide-react';

const PublicStats = ({ onNavigateBack }) => {
    const [stats, setStats] = useState({
        total: 0,
        resolved: 0,
        pending: 0,
        avgResolutionTime: 0, // In hours
        topCategories: [],
        zoneLeaderboard: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const q = query(collection(db, 'complaints'));
                const querySnapshot = await getDocs(q);

                let totalCount = 0;
                let resolvedCount = 0;
                let pendingCount = 0;
                let totalResolutionTime = 0;
                let resolvedWithTimeCount = 0;
                const categoryCounts = {};
                const zoneStats = {};

                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    totalCount++;

                    if (data.status === 'Resolved' || data.status === 'Closed' || data.status === 'Awaiting Citizen Confirmation') {
                        resolvedCount++;

                        // Calculate resolution time if both timestamps exist
                        if (data.createdAt && data.updatedAt) {
                            const start = data.createdAt.toMillis ? data.createdAt.toMillis() : Date.parse(data.createdAt);
                            const end = data.updatedAt.toMillis ? data.updatedAt.toMillis() : Date.parse(data.updatedAt);

                            if (start && end && end > start) {
                                totalResolutionTime += (end - start);
                                resolvedWithTimeCount++;
                            }
                        }
                    } else {
                        pendingCount++;
                    }

                    const cat = data.category || 'Other';
                    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

                    // Zonal parsing from Nominatim addresses (usually e.g. "Street, Suburb, City, State...")
                    const zone = data.address ? (data.address.split(',').length >= 3 ? data.address.split(',').slice(-4, -3)[0].trim() : "Central District") : "Central District";
                    
                    if (!zoneStats[zone]) {
                         zoneStats[zone] = { name: zone, volume: 0, resolved: 0, totalResolutionTime: 0 };
                    }
                    zoneStats[zone].volume += 1;
                    if (data.status === 'Resolved' || data.status === 'Closed' || data.status === 'Awaiting Citizen Confirmation') {
                         zoneStats[zone].resolved += 1;
                         if (data.createdAt && data.updatedAt) {
                             const start = data.createdAt.toMillis ? data.createdAt.toMillis() : Date.parse(data.createdAt);
                             const end = data.updatedAt.toMillis ? data.updatedAt.toMillis() : Date.parse(data.updatedAt);
                             if (start && end && end > start) {
                                 zoneStats[zone].totalResolutionTime += (end - start);
                             }
                         }
                    }
                });

                // Top categories
                const topCats = Object.entries(categoryCounts)
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 3);

                // Average Resolution Time (Hours)
                let avgTime = 0;
                if (resolvedWithTimeCount > 0) {
                    avgTime = (totalResolutionTime / resolvedWithTimeCount) / (1000 * 60 * 60);
                }

                // Zonal Leaderboard Calculation
                const leaderboard = Object.values(zoneStats).map(z => {
                    const avgTimeInHrs = z.resolved > 0 ? (z.totalResolutionTime / z.resolved) / (1000 * 60 * 60) : 0;
                    return {
                        ...z,
                        resolutionSpeedScore: z.resolved > 0 ? (100 / (avgTimeInHrs || 1)) * (z.resolved / z.volume) : 0,
                        avgTimeStr: avgTimeInHrs > 0 ? (avgTimeInHrs < 24 ? Math.round(avgTimeInHrs)+'h' : Math.round(avgTimeInHrs/24)+'d') : '--'
                    };
                }).sort((a, b) => b.resolutionSpeedScore - a.resolutionSpeedScore).slice(0, 5);

                setStats({
                    total: totalCount,
                    resolved: resolvedCount,
                    pending: pendingCount,
                    avgResolutionTime: avgTime,
                    topCategories: topCats,
                    zoneLeaderboard: leaderboard
                });
            } catch (error) {
                console.error("Failed to load public stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-gray-200 border-t-[#2563EB] rounded-full animate-spin mb-4"></div>
                    <span className="font-bold text-[#1E3A8A] uppercase tracking-widest text-sm">Compiling Civic Data...</span>
                </div>
            </div>
        );
    }

    const resolvedPercentage = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;

    return (
        <div className="min-h-screen bg-[#F5F7FA] text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-[#1E3A8A] rounded-xl flex items-center justify-center shadow-md">
                            <ShieldAlert className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-none">CGTA Transparency</h1>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Public Accountability Dashboard</p>
                        </div>
                    </div>
                    {onNavigateBack && (
                        <button
                            onClick={onNavigateBack}
                            className="text-gray-500 hover:text-gray-900 font-bold text-sm bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors border border-gray-200 flex items-center"
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" /> Portal Login
                        </button>
                    )}
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
                <div className="mb-10 text-center max-w-2xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">Open Governance Data</h2>
                    <p className="text-gray-500 text-lg font-medium leading-relaxed">
                        We believe in complete transparency. Track the city's overall performance in resolving civic issues in real-time.
                    </p>
                </div>

                {/* Primary Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-500 font-bold uppercase tracking-widest text-[11px]">Total Reports</h3>
                            <div className="p-2 bg-blue-50 text-[#2563EB] rounded-lg"><BarChart3 className="w-5 h-5" /></div>
                        </div>
                        <div className="text-4xl font-black text-gray-900">{stats.total}</div>
                        <div className="mt-2 text-sm text-gray-500 font-medium">Recorded grievances</div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-500 font-bold uppercase tracking-widest text-[11px]">Resolution Rate</h3>
                            <div className="p-2 bg-green-50 text-green-600 rounded-lg"><CheckCircle className="w-5 h-5" /></div>
                        </div>
                        <div className="text-4xl font-black text-green-600">{resolvedPercentage}%</div>
                        <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
                            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: resolvedPercentage + '%' }}></div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-500 font-bold uppercase tracking-widest text-[11px]">Active Issues</h3>
                            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Clock className="w-5 h-5" /></div>
                        </div>
                        <div className="text-4xl font-black text-amber-600">{stats.pending}</div>
                        <div className="mt-2 text-sm text-gray-500 font-medium">Currently being addressed</div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-500 font-bold uppercase tracking-widest text-[11px]">Avg Clear Time</h3>
                            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><TrendingUp className="w-5 h-5" /></div>
                        </div>
                        <div className="text-4xl font-black text-purple-600">
                            {stats.avgResolutionTime > 0 ? (
                                stats.avgResolutionTime < 24
                                    ? Math.round(stats.avgResolutionTime) + 'hr'
                                    : Math.round(stats.avgResolutionTime / 24) + 'd'
                            ) : '--'}
                        </div>
                        <div className="mt-2 text-sm text-gray-500 font-medium">Historical average</div>
                    </div>
                </div>

                {/* Secondary Data Blocks */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Categories */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
                        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                            <PieChart className="w-5 h-5 mr-2 text-[#2563EB]" />
                            Most Reported Categories
                        </h3>
                        <div className="space-y-6">
                            {stats.topCategories.map((cat, idx) => (
                                <div key={cat.name}>
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="font-bold text-gray-700 text-sm">{idx + 1}. {cat.name}</span>
                                        <span className="font-bold text-gray-900">{cat.count} <span className="text-gray-400 text-xs font-normal">reports</span></span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div
                                            className="bg-[#2563EB] h-2 rounded-full"
                                            style={{ width: Math.min(100, (cat.count / Math.max(1, stats.total)) * 100) + '%' }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                            {stats.topCategories.length === 0 && (
                                <p className="text-gray-500 font-medium text-center py-4">No data available yet.</p>
                            )}
                        </div>
                    </div>

                    {/* Community Engagement Banner */}
                    <div className="bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] rounded-2xl shadow-sm p-8 text-white flex flex-col justify-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
                        <Users className="w-12 h-12 text-white/80 mb-6" />
                        <h3 className="text-2xl font-bold mb-3">Civic Participation is Key</h3>
                        <p className="text-blue-100 mb-8 font-medium max-w-md line-clamp-3 leading-relaxed">
                            A smart city thrives on the active engagement of its administrative staff and citizens. Use the portal to report issues, verify resolutions, and ensure your neighborhood remains pristine.
                        </p>
                        {onNavigateBack && (
                            <button
                                onClick={onNavigateBack}
                                className="bg-white text-[#1E3A8A] hover:bg-gray-50 font-bold py-3 px-6 rounded-xl transition-colors align-self-start inline-flex items-center w-max shadow-md"
                            >
                                Report an Issue Now <ArrowRight className="w-4 h-4 ml-2" />
                            </button>
                        )}
                    </div>

                    {/* Zonal Leaderboard */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 lg:col-span-2">
                         <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                            <MapPin className="w-5 h-5 mr-2 text-green-600" />
                            Ward-wise Performance Leaderboard
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead>
                                    <tr>
                                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Rank/Ward</th>
                                        <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-widest">Complaints Vol.</th>
                                        <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-widest">Resolution Rate</th>
                                        <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-widest">Avg Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {stats.zoneLeaderboard.map((zone, idx) => (
                                        <tr key={zone.name} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-gray-200 text-gray-700' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                                                        {idx + 1}
                                                    </span>
                                                    <span className="font-bold text-gray-900">{zone.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-right font-medium text-gray-600">
                                                {zone.volume}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end">
                                                    <span className="font-bold text-green-600 mr-2">{Math.round((zone.resolved / zone.volume) * 100)}%</span>
                                                    <div className="w-16 bg-gray-100 rounded-full h-1.5 hidden sm:block">
                                                        <div className="bg-green-500 h-1.5 rounded-full" style={{ width: Math.round((zone.resolved / zone.volume) * 100) + '%' }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-right font-medium text-gray-600">
                                                {zone.avgTimeStr}
                                            </td>
                                        </tr>
                                    ))}
                                    {stats.zoneLeaderboard.length === 0 && (
                                        <tr><td colSpan="4" className="text-center py-6 text-gray-500 text-sm">No data available for leaderboard.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
};

export default PublicStats;
