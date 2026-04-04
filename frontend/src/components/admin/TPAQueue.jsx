import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { logAuditAction } from '../../lib/slaEngine';
import { Scale, CheckCircle, Unlock, Info } from 'lucide-react';

export default function TPAQueue() {
    const [tpaTickets, setTpaTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchQueue = async () => {
        try {
            const q = query(collection(db, 'tickets'), where('status', '==', 'TPA_REVIEW'));
            const snap = await getDocs(q);
            let res = [];
            snap.forEach(d => res.push({ id: d.id, ...d.data() }));
            setTpaTickets(res);
        } catch (e) {
            console.error("TPA Fetch error:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueue();
    }, []);

    const handleVerdict = async (ticketId, decision) => {
        try {
            const updates = { 
                updatedAt: serverTimestamp(),
                tpaRulingAt: serverTimestamp()
            };
            
            if (decision === 'FORCE_CLOSE') {
                updates.status = 'Closed';
                updates.tpaVerdict = 'Citizen Rejection Overridden. Structural fix sufficient.';
            } else {
                updates.status = 'In Progress'; // Reopen
                updates.tpaVerdict = 'Citizen Rejection Validated. Rework assigned.';
            }

            await updateDoc(doc(db, 'tickets', ticketId), updates);
            
            await logAuditAction(ticketId, `TPA_${decision}`, 'TPA_SYSTEM', 
                decision === 'FORCE_CLOSE' ? 'Dispute Closed heavily' : 'Dispute sent for Rework');
            
            setTpaTickets(prev => prev.filter(t => t.id !== ticketId));
        } catch (error) {
            console.error("Verdict error:", error);
        }
    };

    if (loading) return <div className="p-8 font-bold animate-pulse text-gray-500">Loading Auditor Sync...</div>;

    return (
        <div className="card-flat min-h-[500px]">
             <div className="flex items-center justify-between mb-8 pb-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-700">
                        <Scale size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-extrabold text-[var(--text-primary)]">TPA Neutral Arbitration Queue</h2>
                        <p className="text-sm font-semibold text-[var(--text-secondary)] tracking-widest uppercase">Disputed Resolution Evidence</p>
                    </div>
                </div>
            </div>

            {tpaTickets.length === 0 ? (
                <div className="text-center py-16 text-gray-500 bg-gray-50 rounded-xl border border-[var(--border)] border-dashed">
                    <CheckCircle size={48} className="mx-auto mb-4 text-[var(--accent-green)]" />
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">No Active Disputes</h3>
                    <p className="text-sm mt-1">The arbitration queue is currently clear.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {tpaTickets.map(t => (
                         <div key={t.id} className="border border-[var(--border)] rounded-xl p-6 shadow-sm">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-[#111827]">{t.category}</h3>
                                    <span className="font-mono text-sm bg-blue-50 text-[var(--primary-dark)] px-2 py-0.5 rounded font-bold">{t.trackingId}</span>
                                </div>
                                <div className="text-right">
                                    <span className="badge bg-red-100 text-red-800 border border-red-200">Rejections: {t.rejections}</span>
                                </div>
                            </div>
                            
                            <div className="grid md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <h4 className="text-xs font-bold uppercase text-[var(--text-secondary)] mb-2 shadow-sm inline-block px-2 py-1 bg-gray-100 rounded">Before (Citizen Original)</h4>
                                    <img src={t.photoUrl} alt="Before" className="w-full h-56 object-cover rounded border border-[var(--border)]" />
                                    <div className="mt-2 text-sm text-gray-700 font-medium bg-gray-50 p-2 border border-gray-100 rounded line-clamp-3">
                                        "{t.aiSynopsis || t.description}"
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold uppercase text-[var(--accent-green)] mb-2 shadow-sm inline-block px-2 py-1 bg-green-50 rounded">After (Officer Claim)</h4>
                                    <img src={t.resolutionPhotoUrl} alt="After" className="w-full h-56 object-cover rounded border border-[var(--accent-green)] shadow-sm" />
                                    <div className="mt-2 text-sm text-[var(--accent-green)] font-medium flex items-center gap-1 bg-green-50 p-2 border border-green-100 rounded">
                                        <Info size={16} /> GPS Co-location strictly verified
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 border-t border-[var(--border)] pt-6">
                                <button onClick={() => handleVerdict(t.id, 'FORCE_CLOSE')} className="flex-1 btn-success">
                                    <Scale size={18} className="mr-2"/> Force Close & Override Citizen
                                </button>
                                <button onClick={() => handleVerdict(t.id, 'REOPEN')} className="flex-1 btn-outline border-purple-600 text-purple-700 hover:bg-purple-50">
                                    <Unlock size={18} className="mr-2"/> Reopen & Assign Rework
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
