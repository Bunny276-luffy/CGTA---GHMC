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

    return (
        <div className="card-flat">
            <button onClick={onBack} className="flex items-center gap-2 text-[var(--primary)] font-semibold hover:underline mb-6">
                <ChevronLeft size={20} /> Back to Track Status
            </button>

            {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold p-3 rounded-lg mb-6">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    {error}
                </div>
            )}

            <div className="flex justify-between items-start mb-6 border-b border-[var(--border)] pb-6">
                <div>
                    <h2 className="text-2xl font-extrabold mb-2 text-[#111827]">{ticket.category}</h2>
                    <div className="flex items-center gap-3">
                        <span className="font-mono text-[var(--primary-dark)] bg-blue-50 px-2 py-1 rounded font-bold text-sm">
                            {ticket.trackingId}
                        </span>
                        <span className="badge bg-amber-100 text-amber-800">{ticket.status}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div>
                    <h3 className="font-bold text-lg mb-3">AI Synopsis & Details</h3>
                    <p className="text-gray-700 bg-gray-50 p-4 rounded border border-[var(--border)] text-sm leading-relaxed">
                        {ticket.aiSynopsis || ticket.description}
                    </p>
                    
                    <div className="mt-4">
                        <h4 className="font-bold text-sm text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Original Evidence</h4>
                        {ticket.photoUrl ? (
                            <img src={ticket.photoUrl} alt="Original Grievance" className="w-full h-48 object-cover rounded border border-[var(--border)]" />
                        ) : (
                            <div className="w-full h-48 bg-gray-100 flex items-center justify-center text-gray-400 rounded border border-[var(--border)]">No Image</div>
                        )}
                    </div>
                </div>
                <div>
                    <h3 className="font-bold text-lg mb-3">Processing Timeline</h3>
                    <TicketTimeline status={ticket.status} />
                </div>
            </div>

            {/* Resolution Block */}
            {ticket.resolutionPhotoUrl && (
                <div className="mt-6 border-t border-[var(--border)] pt-6">
                    <h3 className="font-bold text-lg mb-3 text-[var(--accent-green)]">Officer Work Proof</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <img src={ticket.resolutionPhotoUrl} alt="Resolved" className="w-full h-48 object-cover rounded border border-[var(--border)] shadow-sm" />
                        <div className="flex flex-col justify-center">
                            <p className="text-sm font-semibold mb-2">Distance Variance: <span className="text-[var(--accent-green)]">Verified &lt; 50m</span></p>
                            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded border border-[var(--border)] italic mb-4">
                                "{ticket.resolutionNotes || 'No notes provided by officer.'}"
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Validation / TPA Actions */}
            {isTPALocked ? (
                <div className="mt-8 flex flex-col items-center gap-3">
                    <span className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 border border-amber-300 font-bold px-4 py-2 rounded-full text-sm">
                        <Scale size={16} /> Escalated to Independent Auditor
                    </span>
                    <p className="text-sm text-gray-600 text-center max-w-md">
                        Rejected twice. A neutral auditor will make the final decision.
                    </p>
                </div>
            ) : isResolvedByOfficer ? (
                <div className="mt-8 bg-blue-50 border border-blue-200 p-6 rounded-lg">
                    <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2"><AlertTriangle size={20}/> Validate Resolution</h3>
                    <p className="text-sm text-blue-800 mb-6 font-medium">Please review the officer's submitted work proof. Do you confirm the issue has been structurally resolved?</p>
                    
                    <div className="flex gap-4">
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
