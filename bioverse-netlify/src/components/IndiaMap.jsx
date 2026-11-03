import React from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import { regions } from '../lib/regions';

function Focus({ region }) {
  const map = useMap();
  React.useEffect(() => { if (region) map.flyTo([region.lat, region.lng], 6, { duration: 0.9 }); }, [region, map]);
  return null;
}

export default function IndiaMap({ selected, onSelect }) {
  const hotspots = [
    { name: 'Kaziranga landscape', lat: 26.58, lng: 93.17, subtitle: 'Floodplain grasslands & wetlands' },
    { name: 'Nilgiri Biosphere', lat: 11.4, lng: 76.7, subtitle: 'Montane forests & shola grasslands' },
    { name: 'Sundarbans', lat: 21.95, lng: 89.18, subtitle: 'Tidal mangrove ecosystem' },
    { name: 'Great Himalayan region', lat: 31.9, lng: 78.2, subtitle: 'Alpine and temperate habitats' },
    { name: 'Little Rann of Kutch', lat: 23.3, lng: 71.2, subtitle: 'Arid saline grasslands' },
    { name: 'Andaman Islands', lat: 11.7, lng: 92.7, subtitle: 'Island forest & marine habitats' },
  ];
  return <div className="map-shell">
    <MapContainer center={[22.8, 82.2]} zoom={4} scrollWheelZoom={false} className="india-map">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Focus region={selected} />
      {hotspots.map((spot) => <CircleMarker key={spot.name} center={[spot.lat, spot.lng]} radius={8} pathOptions={{ color: '#f1d18b', fillColor: '#e4bd70', fillOpacity: 0.92, weight: 2 }}>
        <Popup><strong>{spot.name}</strong><br />{spot.subtitle}</Popup>
      </CircleMarker>)}
      {selected && <CircleMarker center={[selected.lat, selected.lng]} radius={14} pathOptions={{ color: '#e3ffbc', fillColor: '#71b58a', fillOpacity: 0.32, weight: 2 }} />}
    </MapContainer>
    <div className="map-legend"><span><i className="legend-dot gold" /> Biodiversity landscape</span><span><i className="legend-dot green" /> Selected search region</span></div>
  </div>;
}
