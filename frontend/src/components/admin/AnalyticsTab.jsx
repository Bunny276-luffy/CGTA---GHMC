import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AnalyticsTab({ tickets }) {
    const [catData, setCatData] = useState([]);
    const [statusData, setStatusData] = useState([]);

    useEffect(() => {
        const categories = { 'Roads': 0, 'Water': 0, 'Sanitation': 0, 'Electricity': 0, 'Other': 0 };
        const statuses = { 'Submitted': 0, 'In Progress': 0, 'Resolved': 0, 'Closed': 0, 'SLA_BREACHED': 0, 'TPA_REVIEW': 0 };

        tickets.forEach(t => {
            if (categories[t.category] !== undefined) categories[t.category]++;
            else categories['Other']++;

            if (statuses[t.status] !== undefined) statuses[t.status]++;
        });

        setCatData(Object.keys(categories).map(k => ({ name: k, count: categories[k] })));
        setStatusData(Object.keys(statuses).map(k => ({ name: k, value: statuses[k] })).filter(d => d.value > 0));
    }, [tickets]);

    const COLORS = ['#1A56DB', '#0E9F6E', '#E02424', '#F59E0B', '#6B7280', '#8B5CF6'];

    return (
        <div className="grid lg:grid-cols-2 gap-8">
            <div className="card-flat">
                <h3 className="text-xl font-bold font-['Rajdhani'] mb-6 text-[#1A56DB]">Grievances by Category</h3>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={catData}>
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis />
                            <Tooltip cursor={{ fill: '#F5F7FA' }} />
                            <Bar dataKey="count" fill="#1A56DB" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="card-flat">
                <h3 className="text-xl font-bold font-['Rajdhani'] mb-6 text-[#1A56DB]">Resolution Status Distribution</h3>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={statusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                label
                            >
                                {statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
