import React, { useEffect, useRef } from 'react';

const InteractiveMap = ({ latitude, longitude, onLocationSelect }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);

    useEffect(() => {
        // Wait for Leaflet to load from CDN
        const initMap = () => {
            if (!window.L || !mapRef.current || mapInstanceRef.current) return;

            const L = window.L;

            // Fix for default marker icons
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            });

            const defaultLat = latitude || 22.5726;
            const defaultLng = longitude || 88.3639;

            mapInstanceRef.current = L.map(mapRef.current).setView([defaultLat, defaultLng], 13);

            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(mapInstanceRef.current);

            // Add initial marker if coordinates exist
            if (latitude && longitude) {
                markerRef.current = L.marker([latitude, longitude]).addTo(mapInstanceRef.current);
            }

            // Add click event to map
            mapInstanceRef.current.on('click', (e) => {
                const { lat, lng } = e.latlng;

                // Remove existing marker
                if (markerRef.current) {
                    mapInstanceRef.current.removeLayer(markerRef.current);
                }

                // Add new marker
                markerRef.current = L.marker([lat, lng]).addTo(mapInstanceRef.current);

                // Call callback with new coordinates
                if (onLocationSelect) {
                    onLocationSelect(lat, lng);
                }
            });
        };

        // Check if Leaflet is loaded, if not wait for it
        if (window.L) {
            initMap();
        } else {
            // Load Leaflet script if not already loaded
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
            script.crossOrigin = '';
            script.onload = initMap;
            document.head.appendChild(script);
        }

        // Cleanup on unmount
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    // Update marker when coordinates change externally
    useEffect(() => {
        if (mapInstanceRef.current && latitude && longitude && window.L) {
            const L = window.L;

            // Remove existing marker
            if (markerRef.current) {
                mapInstanceRef.current.removeLayer(markerRef.current);
            }

            // Add new marker
            markerRef.current = L.marker([latitude, longitude]).addTo(mapInstanceRef.current);

            // Center map on new location
            mapInstanceRef.current.setView([latitude, longitude], 13);
        }
    }, [latitude, longitude]);

    return (
        <div
            ref={mapRef}
            style={{ height: '400px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}
            className="border border-gray-700"
        />
    );
};

export default InteractiveMap;
