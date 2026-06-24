import React, { useState } from 'react';
import { db } from '../../firebase';
import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { ChevronLeft, CheckCircle, XCircle, AlertTriangle, Scale } from 'lucide-react';
import TicketTimeline from './TicketTimeline';

export default function TicketDetail({ ticket, onBack, user }) {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const isResolvedByOfficer = ticket.status === 'Resolved';
    const rejectionCount = ticket.rejectionCount ?? ticket.rejections ?? 0;
    const isTPALocked = rejectionCount >= 2;

    const handleConfirm = async () => {
        try {
            await updateDoc(doc(db, 'complaints', ticket.id), {
                status: 'Closed',
                citizenConfirmed: true,
                closedAt: new Date()
            });
        } catch (err) {
            setError('Failed to update confirmation status.');
        }
    };

    const handleReject = async () => {
        try {
            const newCount = (ticket.rejectionCount ?? 0) + 1;
            await updateDoc(doc(db, 'complaints', ticket.id), {
                rejectionCount: newCount,
                status: newCount >= 2 ? 'TPA_REVIEW' : 'Resolved'
            });
        } catch (err) {
            setError('Failed to update confirmation status.');
        }
    };

    const getStatusBadge = (status) => {
        const s = status?.toUpperCase();
        if (s === 'SUBMITTED' || s === 'PENDING') return 'bg-amber-50 text-amber-700 border border-amber-200';
        if (s === 'IN PROGRESS' || s === 'ASSIGNED') return 'bg-blue-50 text-blue-700 border border-blue-200';
        if (s === 'RESOLVED' || s === 'CLOSED') return 'bg-green-50 text-green-700 border border-green-200';
        if (s === 'SLA_BREACHED') return 'bg-red-50 text-red-700 border border-red-200';
        if (s === 'TPA_REVIEW') return 'bg-purple-50 text-purple-700 border border-purple-200';
        return 'bg-gray-50 text-gray-700 border border-gray-200';
    };

    return (
        <div className="w-full bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-xs">
            <button onClick={onBack} className="inline-flex items-center gap-2 text-[var(--primary)] font-bold hover:underline mb-6 bg-blue-50 px-3.5 py-1.5 rounded-lg text-sm transition">
                <ChevronLeft size={16} /> Back to Track Status
            </button>

            {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold p-3 rounded-lg mb-6 shadow-2xs">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    {error}
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 border-b border-gray-100 pb-6">
                <div>
                    <h2 className="text-xl md:text-2xl font-black mb-2 text-gray-900">{ticket.category}</h2>
                    <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-[var(--primary)] bg-blue-50 px-2.5 py-1 rounded-lg">
                            {ticket.trackingId}
                        </span>
                        <span className={`badge ${getStatusBadge(ticket.status)}`}>
                            {ticket.status}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="space-y-6">
                    <div>
                        <h3 className="font-bold text-lg mb-3 text-gray-900">AI Synopsis & Details</h3>
                        <p className="text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm leading-relaxed">
                            {ticket.aiSynopsis || ticket.description}
                        </p>
                    </div>
                    
                    <div>
                        <h4 className="font-bold text-xs text-[var(--text-secondary)] mb-2.5 uppercase tracking-wider">Original Evidence</h4>
                        {ticket.photoUrl ? (
                            <img src={ticket.photoUrl} alt="Original Grievance" className="w-full h-52 object-cover rounded-xl border border-gray-200 shadow-2xs" />
                        ) : (
                            <div className="w-full h-52 bg-gray-50 flex items-center justify-center text-gray-400 rounded-xl border border-gray-200 font-bold text-sm">No Image</div>
                        )}
                    </div>
                </div>
                <div>
                    <h3 className="font-bold text-lg mb-3 text-gray-900">Processing Timeline</h3>
                    <div className="bg-gray-50/50 p-5 rounded-xl border border-gray-100">
                        <TicketTimeline ticket={ticket} />
                    </div>
                </div>
            </div>

            {/* Resolution Block */}
            {ticket.resolutionPhotoUrl && (
                <div className="mt-6 border-t border-gray-100 pt-6">
                    <h3 className="font-bold text-lg mb-4 text-[var(--accent-green)] flex items-center gap-2">
                        <CheckCircle size={20} /> Officer Work Proof
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-green-50/10 p-5 rounded-2xl border border-green-100">
                        <img src={ticket.resolutionPhotoUrl} alt="Resolved" className="w-full h-48 object-cover rounded-xl border border-green-200 shadow-sm" />
                        <div className="flex flex-col justify-center space-y-3">
                            <p className="text-sm font-bold text-gray-900">Distance Variance: <span className="text-[var(--accent-green)]">Verified &lt; 50m</span></p>
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Resolution Notes</span>
                                <p className="text-sm text-gray-600 bg-white p-3 rounded-lg border border-gray-100 italic mt-1">
                                    "{ticket.resolutionNotes || 'No notes provided by officer.'}"
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Validation / TPA Actions */}
            {isTPALocked ? (
                <div className="mt-8 bg-amber-50 border border-amber-200 p-6 rounded-2xl flex flex-col items-center text-center gap-3">
                    <span className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 border border-amber-300 font-extrabold px-4 py-2 rounded-full text-sm">
                        <Scale size={16} /> Escalated to Independent Auditor
                    </span>
                    <p className="text-sm text-amber-900 font-medium max-w-md">
                        Rejected twice. A neutral third-party auditor has been assigned to inspect the resolution and make a final ruling.
                    </p>
                </div>
            ) : isResolvedByOfficer ? (
                <div className="mt-8 bg-blue-50 border border-blue-200 p-6 rounded-2xl">
                    <h3 className="text-lg font-bold text-blue-900 mb-2 flex items-center gap-2"><AlertTriangle size={20}/> Validate Resolution</h3>
                    <p className="text-sm text-blue-800 mb-6 font-medium">Please inspect the officer's work proof above. Do you confirm that the grievance has been fully and satisfactorily resolved?</p>
                    
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button onClick={handleConfirm} disabled={submitting} className="flex-1 btn-success">
                            <CheckCircle size={18} className="mr-2"/> Yes, Confirm Closure
                        </button>
                        <button onClick={handleReject} disabled={submitting} className="flex-1 btn-danger">
                            <XCircle size={18} className="mr-2"/> No, Reject Work
                        </button>
                    </div>
                </div>
            ) : null}

        </div>
    );
}
