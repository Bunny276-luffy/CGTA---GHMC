import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, MapPin, XCircle } from 'lucide-react';

export default function TicketTimeline({ ticket }) {
    const steps = [
        { title: 'Submitted', key: 'Submitted', icon: Clock },
        { title: 'Assigned', key: 'Assigned', icon: MapPin },
        { title: 'In Progress', key: 'In Progress', icon: Clock },
        { title: 'Resolved', key: 'Resolved', icon: CheckCircle2 },
        { title: 'Closed', key: 'Closed', icon: CheckCircle2 }
    ];

    const currentStepIndex = steps.findIndex(s => s.key === ticket.status || (ticket.status === 'SLA_BREACHED' && s.key === 'In Progress') || (ticket.status === 'TPA_REVIEW' && s.key === 'Resolved'));

    return (
        <div className="relative border-l-2 border-gray-200 ml-4 pl-6 py-4 space-y-8">
            {steps.map((step, idx) => {
                const isActive = idx <= currentStepIndex;
                const Icon = step.icon;
                
                return (
                    <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        key={step.key} 
                        className="relative"
                    >
                        <div className={`absolute -left-[35px] w-6 h-6 rounded-full border-2 flex items-center justify-center bg-white
                            ${isActive ? 'border-[#1A56DB] text-[#1A56DB]' : 'border-gray-300 text-gray-300'}`}
                        >
                            <Icon size={14} />
                        </div>
                        <div className={`font-bold text-sm ${isActive ? 'text-[#1A56DB]' : 'text-gray-400'}`}>
                            {step.title}
                        </div>
                        {ticket.status === 'SLA_BREACHED' && step.key === 'In Progress' && (
                           <p className="text-red-600 text-xs font-bold mt-1 animate-pulse">SLA BREACHED: ESCALATED TO ADMIN</p>
                        )}
                        {ticket.status === 'TPA_REVIEW' && step.key === 'Resolved' && (
                           <p className="text-amber-600 text-xs font-bold mt-1">TPA REVIEW: CITIZEN REJECTED REPEATEDLY</p>
                        )}
                        {isActive && idx === currentStepIndex && ticket.updatedAt && (
                            <div className="text-xs text-slate-500 font-medium mt-1">
                                {new Date(ticket.updatedAt.toMillis()).toLocaleString()}
                            </div>
                        )}
                    </motion.div>
                );
            })}
        </div>
    );
}
