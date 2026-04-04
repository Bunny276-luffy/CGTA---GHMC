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
        if (s === 'EMERGENCY') return 'bg-red-100 text-red-800';
        if (s === 'CRITICAL') return 'bg-orange-100 text-orange-800';
        if (s === 'MEDIUM') return 'bg-yellow-100 text-yellow-800';
        return 'bg-green-100 text-green-800';
    };

    const getStatusBadge = (status) => {
        const s = status?.toUpperCase();
        if (s === 'SUBMITTED' || s === 'PENDING') return 'bg-amber-100 text-amber-800 border-amber-200';
        if (s === 'IN PROGRESS') return 'bg-blue-100 text-blue-800 border-blue-200';
        if (s === 'ASSIGNED') return 'bg-transparent text-blue-600 border-blue-600 border';
        if (s === 'RESOLVED' || s === 'CLOSED') return 'bg-green-100 text-green-800 border-green-200';
        if (s === 'SLA_BREACHED') return 'bg-transparent text-red-600 border-red-600 border';
        if (s === 'TPA_REVIEW') return 'bg-purple-100 text-purple-800 border-purple-200';
        return 'bg-gray-100 text-gray-800 border-gray-200';
    };

    return (
        <div className="w-full bg-white rounded-xl shadow-sm border border-[var(--border)] min-h-[500px]">
            {/* Header */}
            <div className="p-6 border-b border-[var(--border)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-extrabold text-[var(--text-primary)]">Complaint Overview</h2>
                    <Info size={18} className="text-[var(--text-secondary)]" />
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
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
                    
                    <div className="relative">
                        <select 
                            className="input-field h-10 pr-8 appearance-none bg-gray-50 border-[var(--border)] font-semibold text-sm"
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
                        <Filter size={14} className="absolute right-3 top-3 text-[var(--text-secondary)] pointer-events-none" />
                    </div>

                    {(searchTerm || filterStatus !== 'All') && (
                        <button 
                            onClick={() => { setSearchTerm(''); setFilterStatus('All'); }}
                            className="text-sm font-semibold text-[var(--danger)] hover:underline flex items-center gap-1 shrink-0"
                        >
                            <X size={14} /> Clear
                        </button>
                    )}
                </div>
            </div>

            {/* List Body */}
            <div className="p-6">
                {filteredTickets.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <Filter size={48} className="mx-auto mb-4 text-gray-300" />
                        <h3 className="font-bold text-[var(--text-primary)] text-lg">No Grievances Found</h3>
                        <p className="text-sm">Try adjusting your filters or submitting a new issue.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredTickets.map(ticket => (
                            <div 
                                key={ticket.id} 
                                onClick={() => onViewDetail(ticket)}
                                className="border border-[var(--border)] rounded-lg p-5 hover:shadow-md transition cursor-pointer hover:border-gray-300 bg-white"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className="font-bold text-lg text-[var(--text-primary)]">{ticket.category}</span>
                                        <span className={`badge ${getSeverityBadge(ticket.severity)}`}>
                                            {ticket.severity || 'NORMAL'}
                                        </span>
                                        <span className={`badge border ${getStatusBadge(ticket.status)}`}>
                                            {ticket.status === 'Submitted' ? 'PENDING' : ticket.status}
                                        </span>
                                        {ticket.rejections >= 2 && (
                                            <span className="badge bg-purple-100 text-purple-800 border border-purple-200">
                                                ESCALATED TO TPA
                                            </span>
                                        )}
                                    </div>
                                    <div className="font-mono text-sm font-bold text-[var(--primary-dark)] bg-blue-50 px-2 py-1 rounded">
                                        {ticket.trackingId || 'GHMC-XXXX-XXXX'}
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <p className="text-sm text-[var(--text-primary)] line-clamp-2">
                                        <span className="font-semibold text-gray-700 mr-2">AI Synopsis:</span>
                                        {ticket.aiSynopsis || ticket.description}
                                    </p>
                                </div>

                                <div className="flex justify-between items-end border-t border-[var(--border)] pt-4 mt-2">
                                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] font-medium">
                                        <MapPin size={16} />
                                        <span>GPS: {ticket.location?.lat?.toFixed(4)}, {ticket.location?.lng?.toFixed(4)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] font-medium">
                                        <Calendar size={16} />
                                        <span>{ticket.createdAt ? ticket.createdAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown Date'}</span>
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
