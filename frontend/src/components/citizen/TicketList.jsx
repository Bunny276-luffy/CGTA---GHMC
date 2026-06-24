import React, { useState } from 'react';
import { Search, Filter, X, Info, MapPin, Calendar, Hash } from 'lucide-react';


export default function TicketList({ tickets, onViewDetail }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');

    const filteredTickets = tickets.filter(t => {
        const matchesSearch = (t.trackingId || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (t.category || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === 'All' ? true : t.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    const getSeverityBadge = (severity) => {
        const s = severity?.toUpperCase();
        if (s === 'EMERGENCY' || s === 'CRITICAL') return 'bg-red-50 text-red-700 border border-red-200';
        if (s === 'MEDIUM') return 'bg-amber-50 text-amber-700 border border-amber-200';
        return 'bg-green-50 text-green-700 border border-green-200';
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
        <div className="w-full bg-white rounded-2xl shadow-xs border border-gray-100 min-h-[500px] overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gray-50/50">
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-900">Complaint Overview</h2>
                    <Info size={16} className="text-gray-400" />
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                    <div className="relative w-full sm:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={16} className="text-gray-400" />
                        </div>
                        <input 
                            type="text" 
                            className="input-field pl-10 h-10" 
                            placeholder="Search Tracking ID..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="relative w-full sm:w-auto shrink-0">
                        <select 
                            className="input-field h-10 pr-8 appearance-none bg-white font-semibold text-sm cursor-pointer"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="All">All Statuses</option>
                            <option value="Submitted">Pending</option>
                            <option value="Assigned">Assigned</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                            <option value="TPA_REVIEW">TPA Review</option>
                        </select>
                        <Filter size={14} className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
                    </div>

                    {(searchTerm || filterStatus !== 'All') && (
                        <button 
                            onClick={() => { setSearchTerm(''); setFilterStatus('All'); }}
                            className="text-sm font-semibold text-[var(--danger)] hover:underline flex items-center gap-1 shrink-0 mt-2 sm:mt-0"
                        >
                            <X size={14} /> Clear
                        </button>
                    )}
                </div>
            </div>

            {/* List Body */}
            <div className="p-6">
                {filteredTickets.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                        <Filter size={48} className="mx-auto mb-4 text-gray-300" />
                        <h3 className="font-bold text-gray-900 text-lg">No Grievances Found</h3>
                        <p className="text-sm text-gray-500 mt-1">Try adjusting your filters or submitting a new issue.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredTickets.map(ticket => (
                            <div 
                                key={ticket.id} 
                                onClick={() => onViewDetail(ticket)}
                                className="border border-gray-100 rounded-2xl p-5 md:p-6 hover:shadow-md transition-all duration-300 cursor-pointer hover:border-blue-200 bg-white"
                            >
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <span className="font-extrabold text-base md:text-lg text-gray-900">{ticket.category}</span>
                                        <span className={`badge ${getSeverityBadge(ticket.severity)}`}>
                                            {ticket.severity || 'NORMAL'}
                                        </span>
                                        <span className={`badge ${getStatusBadge(ticket.status)}`}>
                                            {ticket.status === 'Submitted' ? 'PENDING' : ticket.status}
                                        </span>
                                        {ticket.rejections >= 2 && (
                                            <span className="badge bg-purple-50 text-purple-700 border border-purple-200">
                                                ESCALATED TO TPA
                                            </span>
                                        )}
                                    </div>
                                    <div className="font-mono text-xs font-bold text-[var(--primary)] bg-blue-50 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                                        {ticket.trackingId || 'GHMC-XXXX-XXXX'}
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <p className="text-sm text-gray-600 line-clamp-2">
                                        <span className="font-bold text-gray-900 mr-2">AI Synopsis:</span>
                                        {ticket.aiSynopsis || ticket.description}
                                    </p>
                                </div>

                                <div className="flex justify-between items-center border-t border-gray-50 pt-4 mt-2">
                                    <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                                        <MapPin size={14} />
                                        <span>GPS: {ticket.location?.lat?.toFixed(4)}, {ticket.location?.lng?.toFixed(4)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                                        <Calendar size={14} />
                                        <span>{ticket.createdAt ? ticket.createdAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown Date'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
