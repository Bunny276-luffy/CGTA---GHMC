import React from 'react';
import { AlertCircle, Clock } from 'lucide-react';

export default function EscalationTab({ tickets }) {
    // Filter SLAs breached
    const breached = tickets.filter(t => t.status === 'SLA_BREACHED').sort((a,b) => {
        // Sort by severity (Emergency first)
        const sevA = a.severity === 'Emergency' ? 0 : a.severity === 'High' ? 1 : 2;
        const sevB = b.severity === 'Emergency' ? 0 : b.severity === 'High' ? 1 : 2;
        return sevA - sevB;
    });

    if (breached.length === 0) return (
         <div className="card-flat text-center py-20 bg-emerald-50 border-emerald-100">
             <AlertCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
             <h3 className="text-xl font-bold font-['Rajdhani'] mb-2 text-emerald-800">Operational Excellence</h3>
             <p className="text-emerald-700 font-medium">Zero active SLA breaches. All districts are currently operating within compliance limits.</p>
         </div>
    );

    return (
        <div className="card-flat border-red-200">
            <h3 className="text-xl font-bold font-['Rajdhani'] mb-6 text-[#E02424] flex items-center gap-2">
                <AlertCircle /> Automated Escalation Matrix
            </h3>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-gray-200 text-xs font-bold uppercase tracking-widest text-gray-500">
                            <th className="py-4">Ticket Trace</th>
                            <th className="py-4">Severity Tier</th>
                            <th className="py-4 text-right">Escalation Timer</th>
                            <th className="py-4 text-right">Zone Command</th>
                        </tr>
                    </thead>
                    <tbody>
                        {breached.map(tix => {
                            let hrsOver = 0;
                            if(tix.updatedAt) {
                                hrsOver = Math.round((Date.now() - tix.updatedAt.toMillis()) / (1000 * 60 * 60));
                            }

                            return (
                                <tr key={tix.id} className="border-b border-gray-100 last:border-0 hover:bg-red-50 transition-colors">
                                    <td className="py-4">
                                        <h4 className="font-bold text-slate-800">{tix.title}</h4>
                                        <p className="text-xs text-gray-500 font-mono mt-1">ID: {tix.id.substring(0,8)} | Cat: {tix.category}</p>
                                    </td>
                                    <td className="py-4">
                                        <span className={`badge ${tix.severity === 'Emergency' ? 'bg-red-200 text-red-900 border border-red-300 font-black animate-pulse' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                                            {tix.severity}
                                        </span>
                                    </td>
                                    <td className="py-4 text-right">
                                        <span className="text-[#E02424] font-bold text-lg font-['Rajdhani'] flex justify-end items-center gap-1">
                                            <Clock size={16} /> +{hrsOver} HRS
                                        </span>
                                    </td>
                                    <td className="py-4 text-right">
                                        <button className="btn-outline border-red-300 text-red-700 hover:bg-red-100 text-xs py-1 px-3 ml-auto">Re-Assign</button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
