"use client";

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface FarmMapProps {
  onPolygonChange?: (points: [number, number][]) => void;
  initialPolygon?: [number, number][];
  readOnly?: boolean;
  heightClassName?: string;
}

function ClickHandler({ onMapClick }: { onMapClick: (latlng: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      onMapClick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMapEvents({});
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
}

const createHandleIcon = (index: number) =>
  L.divIcon({
    className: "custom-handle-icon",
    html: `<div style="background-color: #16a34a; border: 2px solid white; width: 22px; height: 22px; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: bold; cursor: grab;">${index + 1}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

export default function FarmMap({ onPolygonChange, initialPolygon = [], readOnly = false, heightClassName = "h-[450px]" }: FarmMapProps) {
  const [points, setPoints] = useState<[number, number][]>(initialPolygon);

  // Default center: India [20.5937, 78.9629], default zoom: 5
  const defaultCenter: [number, number] = initialPolygon.length > 0 ? initialPolygon[0] : [20.5937, 78.9629];
  const defaultZoom = initialPolygon.length > 0 ? 13 : 5;

  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);
  const [mapZoom, setMapZoom] = useState<number>(defaultZoom);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const handleMapClick = (latlng: [number, number]) => {
    if (readOnly) return;
    if (points.length >= 4) return;
    const newPoints = [...points, latlng];
    setPoints(newPoints);
    if (onPolygonChange) {
      onPolygonChange(newPoints);
    }
  };

  const handlePointDrag = (index: number, e: L.LeafletEvent) => {
    if (readOnly) return;
    const marker = e.target as L.Marker;
    const pos = marker.getLatLng();
    const newPoints = [...points];
    newPoints[index] = [pos.lat, pos.lng];
    setPoints(newPoints);
    if (onPolygonChange) {
      onPolygonChange(newPoints);
    }
  };

  const handleClear = () => {
    if (readOnly) return;
    setPoints([]);
    if (onPolygonChange) {
      onPolygonChange([]);
    }
  };

  const handleSearch = async (e?: React.FormEvent | React.KeyboardEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError("");
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const first = data[0];
        const newLat = parseFloat(first.lat);
        const newLng = parseFloat(first.lon);
        setMapCenter([newLat, newLng]);
        setMapZoom(first.type === "country" || first.class === "boundary" ? 5 : 12);
      } else {
        setSearchError("Location not found. Try adding city or state name.");
      }
    } catch (err) {
      setSearchError("Failed to search location.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-2 w-full">
      {!readOnly && (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="🔍 Search city, state, or country (e.g., Ludhiana, Punjab, India)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch(e)}
            className="flex-1 px-3 py-1.5 text-sm border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-gray-800"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching}
            className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md shadow-sm transition disabled:opacity-50"
          >
            {searching ? "Searching..." : "Search"}
          </button>
        </div>
      )}
      {searchError && <p className="text-red-500 text-xs">{searchError}</p>}

      <div className={`relative w-full ${heightClassName} min-h-[450px] rounded-md overflow-hidden border shadow-inner`}>
        {!readOnly && (
          <div className="absolute top-2 right-2 z-[1000] bg-white/95 backdrop-blur p-3 rounded-lg shadow-md border border-gray-200 max-w-xs">
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="font-semibold text-xs text-gray-800">
                {points.length < 4 ? `Step 1: Place Dots (${points.length}/4)` : "Step 2: Adjust Shape"}
              </span>
              <button
                type="button"
                onClick={handleClear}
                className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded font-medium transition"
              >
                Clear
              </button>
            </div>
            <p className="text-xs text-gray-600">
              {points.length < 4
                ? "Click map 4 times to place 4 corner dots."
                : "4 dots placed! Click & drag any numbered green dot to smoothly adjust side lengths."}
            </p>
          </div>
        )}
        <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: "450px", width: "100%", minHeight: "450px" }}>
          <MapController center={mapCenter} zoom={mapZoom} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onMapClick={handleMapClick} />
          {points.map((pt, idx) => (
            <Marker
              key={idx}
              position={pt}
              draggable={!readOnly}
              icon={createHandleIcon(idx)}
              eventHandlers={{
                dragend: (e) => handlePointDrag(idx, e),
              }}
            />
          ))}
          {points.length > 0 && <Polygon positions={points} pathOptions={{ color: "#16a34a", weight: 3, fillOpacity: 0.2 }} />}
        </MapContainer>
      </div>
    </div>
  );
}
