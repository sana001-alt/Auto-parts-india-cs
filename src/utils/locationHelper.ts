export interface LatLng {
  lat: number;
  lng: number;
}

const DISTRICT_COORDINATES: Record<string, LatLng> = {
  // Delhi
  "new delhi": { lat: 28.6139, lng: 77.2090 },
  "north delhi": { lat: 28.7041, lng: 77.1025 },
  "south delhi": { lat: 28.5300, lng: 77.2628 },
  "east delhi": { lat: 28.6304, lng: 77.2921 },
  "west delhi": { lat: 28.6675, lng: 77.1250 },
  "dwarka": { lat: 28.5889, lng: 77.0578 },
  "rohini": { lat: 28.7455, lng: 77.1149 },
  "connaught place": { lat: 28.6304, lng: 77.2177 },

  // Maharashtra
  "mumbai": { lat: 19.0760, lng: 72.8777 },
  "pune": { lat: 18.5204, lng: 73.8567 },
  "nagpur": { lat: 21.1458, lng: 79.0882 },
  "thane": { lat: 19.2183, lng: 72.9781 },
  "nashik": { lat: 19.9975, lng: 73.7898 },
  "navi mumbai": { lat: 19.0330, lng: 73.0297 },
  "aurangabad": { lat: 19.8762, lng: 75.3433 },
  "solapur": { lat: 17.6599, lng: 75.9064 },
  "kolhapur": { lat: 16.7050, lng: 74.2433 },

  // Karnataka
  "bengaluru": { lat: 12.9716, lng: 77.5946 },
  "mysuru": { lat: 12.2958, lng: 76.6394 },
  "mangaluru": { lat: 12.9141, lng: 74.8560 },
  "hubballi-dharwad": { lat: 15.3647, lng: 75.1240 },
  "belagavi": { lat: 15.8497, lng: 74.4977 },

  // Tamil Nadu
  "chennai": { lat: 13.0827, lng: 80.2707 },
  "coimbatore": { lat: 11.0168, lng: 76.9558 },
  "madurai": { lat: 9.9252, lng: 78.1198 },
  "trichy": { lat: 10.7905, lng: 78.7047 },
  "salem": { lat: 11.6643, lng: 78.1460 },

  // Telangana
  "hyderabad": { lat: 17.3850, lng: 78.4867 },
  "warangal": { lat: 17.9689, lng: 79.5941 },
  "nizamabad": { lat: 18.6725, lng: 78.0941 },

  // Gujarat
  "ahmedabad": { lat: 23.0225, lng: 72.5714 },
  "surat": { lat: 21.1702, lng: 72.8311 },
  "vadodara": { lat: 22.3072, lng: 73.1812 },
  "rajkot": { lat: 22.3039, lng: 70.8022 },
  "gandhinagar": { lat: 23.2156, lng: 72.6369 },

  // West Bengal
  "kolkata": { lat: 22.5726, lng: 88.3639 },
  "howrah": { lat: 22.5958, lng: 88.2636 },
  "darjeeling": { lat: 27.0410, lng: 88.2627 },
  "siliguri": { lat: 26.7271, lng: 88.3953 },

  // Uttar Pradesh
  "lucknow": { lat: 26.8467, lng: 80.9462 },
  "kanpur": { lat: 26.4499, lng: 80.3319 },
  "noida": { lat: 28.5355, lng: 77.3910 },
  "ghaziabad": { lat: 28.6692, lng: 77.4538 },
  "agra": { lat: 27.1767, lng: 78.0081 },
  "varanasi": { lat: 25.3176, lng: 82.9739 },

  // Kerala
  "kochi": { lat: 9.9312, lng: 76.2673 },
  "thiruvananthapuram": { lat: 8.5241, lng: 76.9366 },
  "kozhikode": { lat: 11.2588, lng: 75.7804 },

  // Rajasthan
  "jaipur": { lat: 26.9124, lng: 75.7873 },
  "jodhpur": { lat: 26.2389, lng: 73.0243 },
  "udaipur": { lat: 24.5854, lng: 73.7125 },

  // Haryana
  "gurugram": { lat: 28.4595, lng: 77.0266 },
  "faridabad": { lat: 28.4089, lng: 77.3178 },

  // Punjab
  "ludhiana": { lat: 30.9010, lng: 75.8573 },
  "amritsar": { lat: 31.6340, lng: 74.8723 },

  // Bihar
  "patna": { lat: 25.5941, lng: 85.1376 },

  // Madhya Pradesh
  "indore": { lat: 22.7196, lng: 75.8577 },
  "bhopal": { lat: 23.2599, lng: 77.4126 },

  // Andhra Pradesh
  "visakhapatnam": { lat: 17.6868, lng: 83.2185 },

  // Assam
  "guwahati": { lat: 26.1445, lng: 91.7362 }
};

const STATE_COORDINATES: Record<string, LatLng> = {
  "andhra pradesh": { lat: 15.9129, lng: 79.7400 },
  "assam": { lat: 26.2006, lng: 92.9376 },
  "bihar": { lat: 25.0961, lng: 85.3131 },
  "delhi": { lat: 28.7041, lng: 77.1025 },
  "gujarat": { lat: 22.2587, lng: 71.1924 },
  "haryana": { lat: 29.0588, lng: 76.0856 },
  "karnataka": { lat: 15.3173, lng: 75.7139 },
  "kerala": { lat: 10.8505, lng: 76.2711 },
  "madhya pradesh": { lat: 22.9734, lng: 78.6569 },
  "maharashtra": { lat: 19.7515, lng: 75.7139 },
  "punjab": { lat: 31.1471, lng: 75.3412 },
  "rajasthan": { lat: 27.0238, lng: 74.2179 },
  "tamil nadu": { lat: 11.1271, lng: 78.6569 },
  "telangana": { lat: 18.1124, lng: 79.0193 },
  "uttar pradesh": { lat: 26.8467, lng: 80.9462 },
  "west bengal": { lat: 22.9868, lng: 87.8550 }
};

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

export function findNearestStateAndDistrict(lat: number, lng: number): { state: string; district: string } {
  let closestDistrictName = "New Delhi";
  let minDistDist = Infinity;

  for (const [distKey, coords] of Object.entries(DISTRICT_COORDINATES)) {
    const d = calculateDistance(lat, lng, coords.lat, coords.lng);
    if (d < minDistDist) {
      minDistDist = d;
      closestDistrictName = distKey;
    }
  }

  let closestStateName = "Delhi";
  let minStateDist = Infinity;

  for (const [stateKey, coords] of Object.entries(STATE_COORDINATES)) {
    const d = calculateDistance(lat, lng, coords.lat, coords.lng);
    if (d < minStateDist) {
      minStateDist = d;
      closestStateName = stateKey;
    }
  }

  // Capitalize nicely
  const capitalize = (str: string) => str.replace(/\b\w/g, l => l.toUpperCase());
  return {
    state: capitalize(closestStateName),
    district: capitalize(closestDistrictName)
  };
}

export async function reverseGeocodeOSM(lat: number, lng: number): Promise<{
  state: string;
  district: string;
  area: string;
  displayName: string;
  lat: number;
  lng: number;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        signal: controller.signal,
        headers: {
          "Accept-Language": "en"
        }
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const addr = data?.address || {};

      const state = addr.state || addr.region || addr.territory || "";
      const district = addr.state_district || addr.county || addr.city || addr.district || addr.town || "";
      const area = addr.suburb || addr.neighbourhood || addr.village || addr.town || addr.road || addr.locality || addr.commercial || "";
      const displayName = data.display_name || [area, district, state].filter(Boolean).join(", ");

      return {
        state: state || "Delhi",
        district: district || "New Delhi",
        area: area || "",
        displayName,
        lat,
        lng
      };
    }
  } catch (e) {
    console.warn("Reverse geocoding OSM fetch failed/timed out:", e);
  }

  // Fallback if network/OSM fails
  const nearest = findNearestStateAndDistrict(lat, lng);
  return {
    state: nearest.state,
    district: nearest.district,
    area: "",
    displayName: `${nearest.district}, ${nearest.state}`,
    lat,
    lng
  };
}

export interface LocationSearchResult {
  label: string;
  lat: number;
  lng: number;
  state: string;
  district: string;
  area: string;
}

export async function searchLocationsOSM(query: string): Promise<LocationSearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query.trim())}&format=json&limit=6&addressdetails=1`,
      {
        signal: controller.signal,
        headers: {
          "Accept-Language": "en"
        }
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map((item: any) => {
          const addr = item.address || {};
          const state = addr.state || addr.region || "";
          const district = addr.state_district || addr.county || addr.city || addr.district || addr.town || "";
          const area = addr.suburb || addr.neighbourhood || addr.village || addr.town || addr.road || addr.locality || "";
          
          return {
            label: item.display_name || [area, district, state].filter(Boolean).join(", "),
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            state: state || "Delhi",
            district: district || "New Delhi",
            area: area || ""
          };
        }).filter(item => !isNaN(item.lat) && !isNaN(item.lng));
      }
    }
  } catch (e) {
    console.warn("OSM Search failed or timed out:", e);
  }

  return [];
}

export async function detectUserLocationWithReverseGeocode(
  allStatesAndDistricts: { state: string; districts: string[] }[]
): Promise<{ state: string; district: string; area: string; lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser or device."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lng = parseFloat(position.coords.longitude.toFixed(6));

        try {
          const rev = await reverseGeocodeOSM(lat, lng);

          // Match state in allStatesAndDistricts if possible
          let matchedState = allStatesAndDistricts.find(
            s => rev.state.toLowerCase().includes(s.state.toLowerCase()) || s.state.toLowerCase().includes(rev.state.toLowerCase())
          );

          if (matchedState) {
            let matchedDistrict = matchedState.districts.find(
              d => rev.district.toLowerCase().includes(d.toLowerCase()) || d.toLowerCase().includes(rev.district.toLowerCase())
            );

            resolve({
              state: matchedState.state,
              district: matchedDistrict || matchedState.districts[0] || rev.district || "All Districts",
              area: rev.area,
              lat,
              lng
            });
            return;
          }

          // Return exact OSM parsed location if no taxonomy state match
          resolve({
            state: rev.state || "Delhi",
            district: rev.district || "New Delhi",
            area: rev.area || "",
            lat,
            lng
          });
        } catch (e) {
          const nearest = findNearestStateAndDistrict(lat, lng);
          resolve({
            state: nearest.state,
            district: nearest.district,
            area: "",
            lat,
            lng
          });
        }
      },
      (err: GeolocationPositionError) => {
        let msg = "Unable to retrieve your current location.";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "GPS permission was denied. Please allow location access in your browser or device settings.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = "GPS position unavailable. Please ensure location services are enabled on your device.";
        } else if (err.code === err.TIMEOUT) {
          msg = "GPS location request timed out. Please try again or tap manually on the map.";
        }
        reject(new Error(msg));
      },
      { timeout: 10000, enableHighAccuracy: true, maximumAge: 30000 }
    );
  });
}

export function formatLocationName(listing: { location?: string; district?: string; state?: string }): string {
  const district = (listing.district || "").trim();
  const state = (listing.state || "").trim();
  const loc = (listing.location || "").trim();

  if (district && state) {
    if (district.toLowerCase() === state.toLowerCase()) {
      return district;
    }
    return `${district}, ${state}`;
  }

  if (loc) {
    return loc;
  }

  if (district) return district;
  if (state) return state;

  return "India";
}

export function getApproxCoordinates(state?: string, district?: string): LatLng {
  const normDistrict = district?.toLowerCase().trim() || "";
  const normState = state?.toLowerCase().trim() || "";

  // 1. Direct match in DISTRICT_COORDINATES
  if (normDistrict && DISTRICT_COORDINATES[normDistrict]) {
    return DISTRICT_COORDINATES[normDistrict];
  }

  // 2. Substring match in DISTRICT_COORDINATES
  if (normDistrict) {
    const distEntry = Object.entries(DISTRICT_COORDINATES).find(
      ([key]) => normDistrict.includes(key) || key.includes(normDistrict)
    );
    if (distEntry) return distEntry[1];
  }

  // 3. Match in STATE_COORDINATES
  if (normState && STATE_COORDINATES[normState]) {
    return STATE_COORDINATES[normState];
  }

  if (normState) {
    const stateEntry = Object.entries(STATE_COORDINATES).find(
      ([key]) => normState.includes(key) || key.includes(normState)
    );
    if (stateEntry) return stateEntry[1];
  }

  // Default center if no match
  return { lat: 28.6139, lng: 77.2090 };
}

export async function geocodeLocation(state?: string, district?: string): Promise<LatLng> {
  const queryParts = [district, state, "India"].filter(Boolean).map(s => s?.trim()).filter(Boolean);

  if (queryParts.length > 0) {
    try {
      const query = queryParts.join(", ");
      console.log(`[Nominatim Geocode] Fetching Nominatim API for: "${query}"`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        { 
          signal: controller.signal,
          headers: {
            "Accept-Language": "en"
          }
        }
      );
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
            console.log(`[Nominatim Geocode] Success: lat=${lat}, lng=${lng}`);
            return { lat, lng };
          }
        }
      }
    } catch (e) {
      console.warn("[Nominatim Geocode] Request failed or timed out, falling back:", e);
    }
  }

  // Fallback to local dictionary if Nominatim API is unreachable or times out
  const normDistrict = district?.toLowerCase().trim() || "";
  if (normDistrict && DISTRICT_COORDINATES[normDistrict]) {
    return DISTRICT_COORDINATES[normDistrict];
  }

  return getApproxCoordinates(state, district);
}
