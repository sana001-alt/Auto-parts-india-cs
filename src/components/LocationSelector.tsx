import React from "react";
import { Compass, MapPin } from "lucide-react";

interface LocationSelectorProps {
  selectedState?: string;
  selectedDistrict?: string;
  isGpsMode?: boolean;
  radiusKm?: number | null;
  userArea?: string | null;
  onClick: () => void;
  className?: string;
}

export default function LocationSelector({
  selectedState = "All India",
  selectedDistrict = "All Districts",
  isGpsMode = false,
  radiusKm = null,
  userArea = null,
  onClick,
  className = "",
}: LocationSelectorProps) {
  let displayText = "All India";

  if (isGpsMode) {
    const radiusLabel = radiusKm ? `${radiusKm}km` : "50km";
    if (userArea) {
      displayText = `${userArea} (${radiusLabel})`;
    } else if (selectedDistrict && selectedDistrict !== "All Districts") {
      displayText = `${selectedDistrict} (${radiusLabel})`;
    } else if (selectedState && selectedState !== "All States" && selectedState !== "All India") {
      displayText = `${selectedState} (${radiusLabel})`;
    } else {
      displayText = `Nearby (${radiusLabel})`;
    }
  } else if (!selectedState || selectedState === "All States" || selectedState === "All India") {
    displayText = "All India";
  } else if (!selectedDistrict || selectedDistrict === "All Districts") {
    displayText = selectedState;
  } else {
    displayText = `${selectedDistrict}`;
  }

  return (
    <button
      onClick={onClick}
      type="button"
      id="header-location-picker-btn"
      title="Select Location"
      className={`h-8 inline-flex items-center justify-center gap-1.5 px-3 rounded-full text-xs font-bold text-white bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0 whitespace-nowrap ${className}`}
    >
      {isGpsMode ? (
        <Compass size={13} className="text-blue-400 shrink-0" />
      ) : selectedState && selectedState !== "All States" && selectedState !== "All India" ? (
        <MapPin size={13} className="text-emerald-400 shrink-0" />
      ) : (
        <Compass size={13} className="text-sky-400 shrink-0" />
      )}
      <span className="text-white text-[11px] font-bold tracking-wide whitespace-nowrap" id="selected-location-text">
        {displayText}
      </span>
    </button>
  );
}
