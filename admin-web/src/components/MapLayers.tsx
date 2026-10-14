import { useEffect } from 'react';
import { TileLayer, useMap } from 'react-leaflet';

export type MapLayer = 'street' | 'satellite';

interface MapLayersProps {
    layer?: MapLayer;
    attribution?: string;
    url?: string;
}

export default function MapLayers({ layer = 'street' }: MapLayersProps) {
    const map = useMap();

    useEffect(() => {
        const timer = window.setTimeout(() => {
            map.invalidateSize();
        }, 150);
        return () => window.clearTimeout(timer);
    }, [map, layer]);

    if (layer === 'satellite') {
        return (
            <TileLayer
                attribution="Tiles &copy; Esri"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
        );
    }

    // Bản đồ đường phố miễn phí của Esri (Không cần API Key, không giới hạn)
    return (
        <TileLayer
            attribution="Tiles &copy; Esri &mdash; Source: Esri, OpenStreetMap"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
        />
    );
}