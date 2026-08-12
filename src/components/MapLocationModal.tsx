import React, { useState, useEffect } from "react";
import { X, MapPin, Check, Compass, Locate, RefreshCw, Search, Loader2 } from "lucide-react";
import GMap from "./GMap";
import { requestLocationPermissionJIT } from "../utils/permissionUtils";
import { 
  getApproxCoordinates, 
  reverseGeocodeOSM, 
  searchLocationsOSM, 
  LocationSearchResult, 
  detectUserLocationWithReverseGeocode 
} from "../utils/locationHelper";
import { INDIAN_STATES_AND_DISTRICTS } from "../data/indianLocations";

interface MapLocationModalProps {
  initialLat?: number;
  initialLng?: number;
  state?: string;
  district?: string;
  onConfirm: (
    lat: number, 
    lng: number, 
    details?: { state?: string; district?: string; area?: string }
  ) => void;
  onClose: () => void;
}

export default function MapLocationModal({
  initialLat,
  initialLng,
  state,
  district,
  onConfirm,
  onClose
}: MapLocationModalProps) {
  const defaultCoords = getApproxCoordinates(state, district);
  const [selectedLat, setSelectedLat] = useState<number>(initialLat || defaultCoords.lat);
  const [selectedLng, setSelectedLng] = useState<number>(initialLng || defaultCoords.lng);
  const [hasSelected, setHasSelected] = useState<boolean>(
    Boolean(initialLat && initialLng && initialLat !== 0 && initialLng !== 0)
  );
  
  const [addressDetails, setAddressDetails] = useState<{
    state?: string;
    district?: string;
    area?: string;
    displayName?: string;
  }>({});
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Reverse geocode initial coordinates if valid
  useEffect(() => {
    if (initialLat && initialLng && initialLat !== 0 && initialLng !== 0) {
      reverseGeocodeOSM(initialLat, initialLng).then((res) => {
        setAddressDetails({
          state: res.state,
          district: res.district,
          area: res.area,
          displayName: res.displayName
        });
      }).catch(() => {});
    }
  }, []);

  // Debounced OpenStreetMap location search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchLocationsOSM(searchQuery);
        setSearchResults(results);
      } catch (e) {
        console.warn("Search locations error:", e);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleLocationSelect = async (lat: number, lng: number) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
    setHasSelected(true);
    setError(null);

    // Reverse-geocode selected point via OpenStreetMap
    try {
      const res = await reverseGeocodeOSM(lat, lng);
      setAddressDetails({
        state: res.state,
        district: res.district,
        area: res.area,
        displayName: res.displayName
      });
    } catch (e) {
      console.warn("Reverse geocode on select failed:", e);
    }
  };

  const handleSelectSearchResult = (result: LocationSearchResult) => {
    setSelectedLat(result.lat);
    setSelectedLng(result.lng);
    setHasSelected(true);
    setAddressDetails({
      state: result.state,
      district: result.district,
      area: result.area,
      displayName: result.label
    });
    setSearchQuery("");
    setSearchResults([]);
    setError(null);
  };

  const handleUseCurrentLocation = async () => {
    setError(null);
    setIsLocating(true);

    try {
      const loc = await detectUserLocationWithReverseGeocode(INDIAN_STATES_AND_DISTRICTS);
      setSelectedLat(loc.lat);
      setSelectedLng(loc.lng);
      setHasSelected(true);
      setAddressDetails({
        state: loc.state,
        district: loc.district,
        area: loc.area,
        displayName: [loc.area, loc.district, loc.state].filter(Boolean).join(", ")
      });
    } catch (e: any) {
      console.error("GPS location request error:", e);
      setError(e.message || "Unable to obtain GPS location. Please check permissions or tap on the map.");
    } finally {
      setIsLocating(false);
    }
  };

  const handleSave = () => {
    onConfirm(selectedLat, selectedLng, {
      state: addressDetails.state,
      district: addressDetails.district,
      area: addressDetails.area
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200" id="map-picker-modal">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh] text-slate-100 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex flex-row items-center justify-between px-5 py-3.5 border-b border-slate-800 shrink-0">
          <div className="flex flex-row items-center gap-2">
            <div className="p-1.5 bg-rose-500/10 text-rose-400 rounded-xl">
              <MapPin size={16} />
            </div>
            <div>
              <span className="text-xs font-black text-white uppercase tracking-wider block">Interactive Location Map</span>
              <span className="text-[10px] text-slate-400 block">OpenStreetMap & GPS pin locator</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
            id="close-map-picker-modal-btn"
          >
            <X size={16} />
          </button>
        </div>

        {/* Location Search Bar & GPS row */}
        <div className="p-3 bg-slate-950/90 border-b border-slate-800/80 shrink-0 space-y-2 relative z-20">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search city, area, pincode or landmark..."
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2 pl-9 pr-8 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium"
                id="map-search-input"
              />
              {isSearching ? (
                <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-400 animate-spin" />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X size={13} />
                </button>
              ) : null}
            </div>

            <button
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              className="flex flex-row items-center gap-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 border border-rose-500 px-3 py-2 rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
              id="gps-locate-btn"
              title="Detect current device location via GPS"
            >
              {isLocating ? (
                <RefreshCw size={12} className="animate-spin text-white" />
              ) : (
                <Locate size={12} className="text-white" />
              )}
              <span className="text-xs text-white font-bold">{isLocating ? "GPS..." : "Use GPS"}</span>
            </button>
          </div>

          {/* Search suggestions dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute left-3 right-3 top-full mt-1 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-48 overflow-y-auto divide-y divide-slate-800">
              {searchResults.map((res, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSearchResult(res)}
                  className="w-full text-left p-2.5 hover:bg-slate-800/80 transition-colors flex items-start gap-2 cursor-pointer"
                >
                  <MapPin size={13} className="text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-slate-100 font-semibold block truncate">{res.label}</span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {res.lat.toFixed(4)}, {res.lng.toFixed(4)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Modal Content - Map Container */}
        <div className="p-3 sm:p-4 flex-1 flex flex-col space-y-3 min-h-0">
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex-1 min-h-[260px]">
            <GMap
              lat={selectedLat}
              lng={selectedLng}
              state={state}
              district={district}
              interactive={true}
              onLocationSelect={handleLocationSelect}
              height="100%"
              className="absolute inset-0"
            />
          </div>

          {/* Location details and GPS controls */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 space-y-2">
            {error && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/25 rounded-xl">
                <span className="text-[10px] text-rose-400 font-medium leading-relaxed block">{error}</span>
              </div>
            )}

            {addressDetails.displayName ? (
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex items-start gap-2">
                <MapPin size={14} className="text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1 text-[11px] min-w-0">
                  <span className="text-slate-200 font-bold block truncate">{addressDetails.displayName}</span>
                  <span className="text-slate-400 text-[10px] block font-mono mt-0.5">
                    Lat: {selectedLat.toFixed(5)} | Lng: {selectedLng.toFixed(5)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-row items-center justify-between gap-2">
                <div className="flex flex-row items-center gap-2 text-slate-300 font-mono text-[10px]">
                  <Compass size={13} className="text-rose-400" />
                  <span className="font-extrabold text-slate-400">COORDINATES:</span>
                  <span className="text-slate-300">
                    {typeof selectedLat === "number" ? selectedLat.toFixed(5) : "0.00000"}, {typeof selectedLng === "number" ? selectedLng.toFixed(5) : "0.00000"}
                  </span>
                </div>
              </div>
            )}

            <div className="text-[10px] flex flex-row items-start gap-1 bg-slate-900/50 p-2 rounded-xl border border-slate-800/40">
              <span className="text-rose-400 font-bold shrink-0">Tip:</span>
              <p className="text-[10px] text-slate-400 flex-1">
                {hasSelected
                  ? "Tap anywhere on the map or drag the pin to set your exact item location."
                  : `Centered on ${district || state || "your region"}. Tap on the map grid to place your item pin.`}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/40 flex flex-row gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2.5 rounded-2xl text-xs text-slate-300 font-bold transition-colors cursor-pointer"
            id="cancel-map-picker-btn"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-rose-600 hover:bg-rose-500 border border-rose-500 px-4 py-2.5 rounded-2xl flex flex-row items-center justify-center gap-1.5 shadow-lg shadow-rose-600/20 text-xs font-black text-white transition-colors cursor-pointer"
            id="confirm-map-picker-btn"
          >
            <Check size={14} className="text-white" />
            <span>Confirm Pin</span>
          </button>
        </div>

      </div>
    </div>
  );
}

