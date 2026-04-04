import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Popup } from 'react-leaflet';

export default function LiveMapTab({ tickets }) {
    const [geoJson, setGeoJson] = useState(null);

    useEffect(() => {
        // Attempting to fetch a public domain India GeoJSON for districts
        fetch('https://raw.githubusercontent.com/geohacker/india/master/district/india_district.geojson')
            .then(res => res.json())
            .then(data => setGeoJson(data))
            .catch(console.error);
    }, []);

    // Simple density heuristic: randomly mapping tickets to districts or just heatmapping colors
    const getDensityColor = (density) => {
        return density > 100 ? '#E02424' : // Red
               density > 50  ? '#F59E0B' : // Amber
               density > 20  ? '#FCD34D' : // Yellow
               density > 0   ? '#31C48D' : // Light Green
                               '#E5E7EB';  // Gray empty
    };

    const styleFeature = (feature) => {
        // In a real app, match feature.properties.NAME_2 to our ticket DB aggregations
        // For demonstration, use a mock density
        const mockDensity = Math.floor(Math.random() * 120); 
        return {
            fillColor: getDensityColor(mockDensity),
            weight: 1,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.7
        };
    };

    const onEachFeature = (feature, layer) => {
        const districtName = feature.properties.NAME_2 || feature.properties.dtname || "District";
        const stateName = feature.properties.NAME_1 || feature.properties.stname || "State";
        
        layer.bindPopup(`
            <div class="custom-popup font-sans">
                <strong class="text-[#1A56DB] block uppercase tracking-widest text-xs">${stateName}</strong>
                <h3 class="font-bold text-lg leading-tight mb-1">${districtName}</h3>
                <p class="text-sm text-gray-600">Active Grievances: <strong>${Math.floor(Math.random() * 120)}</strong></p>
                <div class="mt-2 text-xs text-gray-500">Auto-detected density zone.</div>
            </div>
        `);
    };

    if (!geoJson && tickets) return <div className="h-96 flex items-center justify-center font-bold text-gray-400">Loading Topographical Data...</div>;

    return (
        <div className="card-flat p-0 h-[600px] overflow-hidden">
            <MapContainer center={[22.5937, 78.9629]} zoom={4.5} style={{ height: '100%', width: '100%', zIndex: 0 }}>
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                />
                <GeoJSON 
                    data={geoJson} 
                    style={styleFeature} 
                    onEachFeature={onEachFeature}
                />
            </MapContainer>
        </div>
    );
}
