import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function AssignedMap({ onResolveIntent, userId }) {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTix = async () => {
            try {
                // To support Pan-India assignment, Officers could be bound by zone, 
                // but here we just fetch "Pending/Assigned" tickets for simulation.
                const q = query(
                    collection(db, 'tickets'),
                    where('status', 'in', ['Submitted', 'Assigned', 'In Progress', 'SLA_BREACHED'])
                );
                
                const snap = await getDocs(q);
                let results = [];
                snap.forEach(doc => {
                    const data = doc.data();
                    if (data.location && data.location.lat) {
                        results.push({ id: doc.id, ...data });
                    }
                });
                setTickets(results);
            } catch (err) {
                console.error("Map Fetch:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchTix();
    }, []);

    if(loading) return <div className="p-8 text-center text-gray-500 font-bold tracking-widest uppercase text-sm h-full flex items-center justify-center">Loading Geospatial Data...</div>;

    // Center on India or default
    const indiaCenter = [20.5937, 78.9629];

    return (
        <MapContainer center={indiaCenter} zoom={5} style={{ height: '100%', width: '100%', zIndex: 0 }}>
            {/* Professional light map tiles, avoiding neon styles */}
            <TileLayer
               url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
               attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            />
            
            <MarkerClusterGroup chunkedLoading>
                {tickets.map(tix => (
                    <Marker 
                        key={tix.id} 
                        position={[tix.location.lat, tix.location.lng]}
                    >
                        <Popup className="custom-popup">
                            <div className="p-1">
                                <span className={`badge mb-2 block w-fit ${tix.severity === 'Emergency' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>{tix.severity}</span>
                                <h3 className="font-bold text-sm mb-1">{tix.title}</h3>
                                <p className="text-xs text-gray-500 mb-3">{tix.category}</p>
                                <button 
                                    onClick={() => onResolveIntent(tix)} 
                                    className="w-full btn-primary py-1.5 text-xs font-bold"
                                >
                                    Verify & Resolve &rarr;
                                </button>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MarkerClusterGroup>
        </MapContainer>
    );
}
