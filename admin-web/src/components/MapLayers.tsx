import { TileLayer } from 'react-leaflet';

export type MapLayer = 'street' | 'satellite';

interface MapLayersProps {
    layer?: MapLayer;
    attribution?: string;
    url?: string;
}

export default function MapLayers({ layer }: MapLayersProps) {
    if (layer !== 'street') {
        return <TileLayer attribution="Tiles &copy; Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />;
    }

    return <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />;
}
