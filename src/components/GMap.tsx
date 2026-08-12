import React, { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Compass, Navigation, ExternalLink } from "lucide-react";
import { getApproxCoordinates, LatLng } from "../utils/locationHelper";

interface GMapProps {
  lat?: number | string;
  lng?: number | string;
  state?: string;
  district?: string;
  location?: string;
  interactive?: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
  height?: string;
  className?: string;
}

export default function GMap({
  lat,
  lng,
  state,
  district,
  location,
  interactive = false,
  onLocationSelect,
  height = "200px",
  className = ""
}: GMapProps) {
  const [coords, setCoords] = useState<LatLng>({ lat: 28.6139, lng: 77.2090 });
  
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerInstanceRef = useRef<L.Marker | null>(null);

  // Sync internal coordinates state with props
  useEffect(() => {
    const parsedLat = typeof lat === "string" ? parseFloat(lat) : lat;
    const parsedLng = typeof lng === "string" ? parseFloat(lng) : lng;

    const hasValidCoords =
      parsedLat !== undefined &&
      parsedLat !== null &&
      parsedLng !== undefined &&
      parsedLng !== null &&
      !isNaN(parsedLat) &&
      !isNaN(parsedLng) &&
      parsedLat !== 0 &&
      parsedLng !== 0;

    if (hasValidCoords) {
      setCoords({ lat: parsedLat!, lng: parsedLng! });
    } else {
      const approx = getApproxCoordinates(state, district || location);
      setCoords(approx);
    }
  }, [lat, lng, state, district, location]);

  // Handle Leaflet map instance lifecycle
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    // Safely remove any lingering Leaflet instance on this container
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.off();
        mapInstanceRef.current.remove();
      } catch (e) {
        // Ignore silent cleanup errors
      }
      mapInstanceRef.current = null;
      markerInstanceRef.current = null;
    }

    if ((container as any)._leaflet_id) {
      (container as any)._leaflet_id = null;
    }
    container.innerHTML = "";

    // Custom stylized RED location marker pin matching requirement
    const customMarkerIcon = L.divIcon({
      html: `
        <div class="relative flex flex-col items-center select-none">
          <span class="absolute inline-flex h-10 w-10 rounded-full bg-rose-500/30 animate-ping -top-1"></span>
          <div class="bg-rose-600 border-2 border-white p-2 rounded-full shadow-xl relative z-10 text-white flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3" fill="white"/></svg>
          </div>
          <div class="w-2.5 h-2.5 bg-rose-600 rounded-full border-2 border-white -mt-1 shadow-md"></div>
        </div>
      `,
      className: "custom-leaflet-marker",
      iconSize: [40, 48],
      iconAnchor: [20, 42]
    });

    let map: L.Map | null = null;
    try {
      // Initialize Map on container element directly with touch & zoom support
      map = L.map(container, {
        zoomControl: true, // Show zoom controls
        dragging: true,
        scrollWheelZoom: interactive,
        touchZoom: true,
        doubleClickZoom: true,
        boxZoom: false,
        keyboard: false,
        attributionControl: false, // We render clean OSM attribution directly in container
        bounceAtZoomLimits: true
      }).setView([coords.lat, coords.lng], 14);

      // Set up real open source OSM Tile Layer with mandatory OSM copyright attribution
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
      }).addTo(map);

      // Create physical marker at exact coordinates
      const marker = L.marker([coords.lat, coords.lng], {
        icon: customMarkerIcon,
        draggable: interactive
      }).addTo(map);

      mapInstanceRef.current = map;
      markerInstanceRef.current = marker;

      // Handle clicks to position pin in interactive mode
      if (interactive) {
        map.on("click", (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          const roundedLat = parseFloat(lat.toFixed(6));
          const roundedLng = parseFloat(lng.toFixed(6));
          marker.setLatLng([roundedLat, roundedLng]);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.panTo([roundedLat, roundedLng]);
          }
          setCoords({ lat: roundedLat, lng: roundedLng });
          if (onLocationSelect) {
            onLocationSelect(roundedLat, roundedLng);
          }
        });

        // Handle dragging pin in interactive mode
        marker.on("dragend", () => {
          const position = marker.getLatLng();
          const roundedLat = parseFloat(position.lat.toFixed(6));
          const roundedLng = parseFloat(position.lng.toFixed(6));
          if (mapInstanceRef.current) {
            mapInstanceRef.current.panTo([roundedLat, roundedLng]);
          }
          setCoords({ lat: roundedLat, lng: roundedLng });
          if (onLocationSelect) {
            onLocationSelect(roundedLat, roundedLng);
          }
        });
      }

      // Force tile recalculation once rendered in the DOM
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 200);

      // Attach ResizeObserver to container to handle mobile view re-layouts smoothly
      if (window.ResizeObserver) {
        const ro = new ResizeObserver(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        });
        ro.observe(container);
      }
    } catch (err) {
      console.warn("Leaflet init error handled gracefully:", err);
    }

    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.off();
          mapInstanceRef.current.remove();
        } catch (e) {
          // Ignore cleanup errors on unmount
        }
        mapInstanceRef.current = null;
        markerInstanceRef.current = null;
      }
      if (container) {
        (container as any)._leaflet_id = null;
        container.innerHTML = "";
      }
    };
  }, [interactive]);

  // Keep map view & marker synced with external coordinate state changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const marker = markerInstanceRef.current;
    if (map && marker) {
      const currentPos = marker.getLatLng();
      if (currentPos.lat !== coords.lat || currentPos.lng !== coords.lng) {
        marker.setLatLng([coords.lat, coords.lng]);
        map.panTo([coords.lat, coords.lng]);
      }
    }
  }, [coords]);

  // Open external Google Maps driving directions app link as required
  const handleNavigate = (e?: React.MouseEvent, provider: "google" | "osm" = "google") => {
    if (e) {
      e.stopPropagation();
    }

    let url: string;
    const hasValidCoords =
      coords.lat !== undefined &&
      coords.lat !== null &&
      coords.lng !== undefined &&
      coords.lng !== null &&
      !isNaN(coords.lat) &&
      !isNaN(coords.lng) &&
      coords.lat !== 0 &&
      coords.lng !== 0;

    if (provider === "osm") {
      if (hasValidCoords) {
        url = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=;${coords.lat}%2C${coords.lng}`;
      } else {
        const locationQuery = location || [district, state].filter(Boolean).join(", ") || "India";
        url = `https://www.openstreetmap.org/search?query=${encodeURIComponent(locationQuery)}`;
      }
    } else {
      if (hasValidCoords) {
        url = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`;
      } else {
        const locationQuery = location || [district, state].filter(Boolean).join(", ") || "India";
        url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(locationQuery)}`;
      }
    }
    
    window.open(url, "_blank");
  };

  return (
    <div 
      className={`relative rounded-3xl overflow-hidden border border-slate-200 bg-slate-100 flex flex-col text-slate-900 shadow-sm transition-all duration-300 ${className}`}
      style={{ height, touchAction: interactive ? "none" : "pan-y" }}
      id="openstreetmap-container"
    >
      {/* Map Element */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full flex-1 z-0"
        title={!interactive ? "OpenStreetMap - Click controls for driving directions" : undefined}
      />

      {/* Coordinate HUD indicator */}
      <div className="absolute top-3 left-3 z-[400] bg-white/95 border border-slate-200 px-3 py-1.5 rounded-xl font-mono text-[10px] text-slate-700 shadow-sm flex items-center gap-1.5 backdrop-blur-md pointer-events-none">
        <Compass size={11} className="text-rose-600 animate-spin-slow" />
        <span className="font-bold text-slate-500">LAT:</span>
        <span className="font-extrabold text-slate-800">{coords.lat.toFixed(5)}</span>
        <span className="text-slate-300">|</span>
        <span className="font-bold text-slate-500">LNG:</span>
        <span className="font-extrabold text-slate-800">{coords.lng.toFixed(5)}</span>
      </div>

      {/* Mandatory OpenStreetMap attribution overlay */}
      <div className="absolute bottom-1 left-2 z-[400] bg-white/80 dark:bg-slate-900/80 px-2 py-0.5 rounded text-[9px] text-slate-600 dark:text-slate-400 font-sans pointer-events-auto">
        &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-900 dark:hover:text-white">OpenStreetMap</a> contributors
      </div>

      {/* Mode-specific user tips and action buttons */}
      {interactive ? (
        <div className="absolute top-3 right-3 z-[400] bg-rose-600/95 text-white py-1.5 px-3 rounded-2xl text-[10px] font-bold shadow-md flex items-center justify-between gap-2 backdrop-blur-xs pointer-events-none">
          <div className="flex items-center gap-1.5">
            <span>🎯 Tap or drag pin on map</span>
          </div>
        </div>
      ) : (
        <div className="absolute bottom-3 right-3 z-[400] flex flex-wrap gap-1.5 justify-end max-w-full px-2">
          {/* Quick driving directions / Open in Google Maps button */}
          <button
            type="button"
            onClick={(e) => handleNavigate(e, "google")}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 active:scale-95 border border-rose-500 text-white font-black text-[11px] px-3 py-1.5 rounded-xl shadow-lg shadow-rose-600/25 transition-all cursor-pointer"
            id="map-navigate-btn"
            title="Get Directions in Google Maps"
          >
            <Navigation size={11} className="fill-white" />
            <span>Get Directions</span>
          </button>
          
          {/* Open in OpenStreetMap navigation button */}
          <button
            type="button"
            onClick={(e) => handleNavigate(e, "osm")}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 active:scale-95 border border-slate-700 text-white font-black text-[11px] px-2.5 py-1.5 rounded-xl shadow-lg transition-all cursor-pointer"
            id="map-navigate-osm-btn"
            title="Open directions in OpenStreetMap"
          >
            <ExternalLink size={11} />
            <span>OSM Route</span>
          </button>
        </div>
      )}
    </div>
  );
}

