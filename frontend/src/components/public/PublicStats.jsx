import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { ActivitySquare, MapPin, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PublicStats() {
    const [stats, setStats] = useState({ sortedZones: [], total: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const q = query(collection(db, 'tickets'));
                const querySnapshot = await getDocs(q);
                
                let vol = 0;
                const zoneMap = {};

                querySnapshot.forEach(doc => {
                    const t = doc.data();
                    vol++;
                    const zone = t.zone || 'Central District';
                    
                    if (!zoneMap[zone]) {
                        zoneMap[zone] = { name: zone, count: 0, resolved: 0, totalHours: 0 };
                    }
                    zoneMap[zone].count++;

                    if (t.status === 'Closed' || t.status === 'Resolved') {
                        zoneMap[zone].resolved++;
                        if (t.createdAt && t.updatedAt) {
                            const start = t.createdAt.toMillis();
                            const end = t.updatedAt.toMillis();
                            const hrs = (end - start) / (1000 * 60 * 60);
                            zoneMap[zone].totalHours += hrs;
                        }
                    }
                });

                const table = Object.values(zoneMap).map(z => {
                    const avg = z.resolved > 0 ? z.totalHours / z.resolved : Infinity;
                    return {
                        ...z,
                        avgSpeedHrs: avg,
                        rate: z.count > 0 ? (z.resolved / z.count) : 0
                    };
                });

                table.sort((a,b) => {
                    // Fastest first
                    return a.avgSpeedHrs - b.avgSpeedHrs;
                });

                setStats({ sortedZones: table, total: vol });
            } catch(e) {
                console.error("Leaderboard error", e);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, []);

    if (loading) return <div className="p-20 text-center font-bold text-gray-400 uppercase tracking-widest text-sm">Aggregating Civic Data...</div>;

    return (
        <div className="min-h-screen bg-[#F5F7FA] font-sans text-slate-900 pb-20">
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link to="/" className="text-gray-500 hover:text-gray-900 font-bold text-sm bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors border border-gray-200 flex items-center">
                        <ChevronLeft className="w-4 h-4 mr-1" /> Home
                    </Link>
                    <div className="text-xl font-bold font-['Rajdhani'] text-[#1A56DB]">Wall of Accountability</div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 mt-10">
                <div className="mb-10 text-center">
                    <h2 className="text-3xl font-extrabold text-slate-900 font-['Rajdhani'] mb-3">District Performance Leaderboard</h2>
                    <p className="text-gray-600 font-medium">Districts ranked strictly by their average resolution speed.</p>
                </div>

                <div className="card-flat">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="py-4 font-bold text-xs uppercase tracking-widest text-gray-500">Rank/District</th>
                                    <th className="py-4 font-bold text-xs text-right uppercase tracking-widest text-gray-500">Volume</th>
                                    <th className="py-4 font-bold text-xs text-right uppercase tracking-widest text-gray-500">Avg Resolution</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.sortedZones.map((z, idx) => {
                                    // Top 3 = Green, Bottom 3 = Red
                                    const isTop = idx < 3;
                                    const isBottom = idx >= stats.sortedZones.length - 3 && stats.sortedZones.length > 5;
                                    const rankColor = isTop ? 'bg-emerald-100 text-[#0E9F6E]' : isBottom ? 'bg-red-100 text-[#E02424]' : 'bg-gray-100 text-gray-600';

                                    return (
                                        <tr key={z.name} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                                            <td className="py-4 flex items-center font-bold">
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mr-3 ${rankColor}`}>
                                                    {idx + 1}
                                                </span>
                                                {z.name}
                                            </td>
                                            <td className="py-4 text-right font-medium text-gray-600">{z.count}</td>
                                            <td className="py-4 text-right font-bold text-slate-800">
                                                {z.avgSpeedHrs === Infinity ? '--' : 
                                                    z.avgSpeedHrs < 24 ? Math.round(z.avgSpeedHrs) + 'h' : Math.round(z.avgSpeedHrs/24) + 'd'
                                                }
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
