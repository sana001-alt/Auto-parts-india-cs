import React, { useState } from "react";
import { 
  Search, 
  MapPin, 
  Filter, 
  Phone, 
  MessageSquare, 
  Calendar, 
  Car, 
  Compass, 
  X, 
  Tag, 
  ChevronRight, 
  ChevronLeft,
  ChevronDown,
  Sparkles,
  Info,
  Layers,
  Heart,
  SlidersHorizontal,
  Plus,
  Maximize2,
  Star,
  ArrowLeft,
  Share2,
  AlertCircle,
  Image as ImageIcon,
  Zap,
  Wind,
  Disc,
  ShieldCheck,
  Flame,
  Grid,
  Settings,
  CircleDot,
  CheckCircle2,
  Check,
  Bell
} from "lucide-react";
import { SparePart, INDIAN_CAR_BRANDS, CAR_PART_CATEGORIES, CAR_SPARE_PARTS_BY_CATEGORY, POPULAR_LOCATIONS, User, Banner } from "../types";
import { INDIAN_STATES_AND_DISTRICTS } from "../data/indianLocations";
import { motion, AnimatePresence } from "motion/react";
import ImageGalleryModal from "./ImageGalleryModal";
import { fetchSellerReviews, deleteSparePartListing, updateSparePartListing, subscribeToBanners, subscribeToTaxonomyConfig, FullTaxonomyConfig } from "../lib/firebase";
import SellerProfileView from "./SellerProfileView";
import EditListingModal from "./EditListingModal";
import { useLanguage } from "../lib/LanguageContext";
import { translateDynamic } from "../lib/translations";
import LanguageSelector from "./LanguageSelector";
import LocationSelector from "./LocationSelector";
import GMap from "./GMap";
import BrandLogo from "./BrandLogo";

// No fallback categories helper is needed as we only display real uploaded images.

import { detectUserLocationWithReverseGeocode, formatLocationName, calculateDistance, getApproxCoordinates } from "../utils/locationHelper";
import { requestLocationPermissionJIT } from "../utils/permissionUtils";

function getCategoryIcon(catName: string, iconSize = 20, className = "") {
  const lower = (catName || "").toLowerCase();
  if (lower.includes("engine")) return <Layers size={iconSize} className={className} />;
  if (lower.includes("suspension")) return <SlidersHorizontal size={iconSize} className={className} />;
  if (lower.includes("brake")) return <Disc size={iconSize} className={className} />;
  if (lower.includes("electric")) return <Zap size={iconSize} className={className} />;
  if (lower.includes("body")) return <Car size={iconSize} className={className} />;
  if (lower.includes("light")) return <Sparkles size={iconSize} className={className} />;
  if (lower.includes("interior") || lower.includes("wheel")) return <CircleDot size={iconSize} className={className} />;
  if (lower.includes("ac") || lower.includes("air")) return <Wind size={iconSize} className={className} />;
  if (lower.includes("transmission")) return <Settings size={iconSize} className={className} />;
  return <Grid size={iconSize} className={className} />;
}

function getCategoryColorTheme(catName: string, isActive: boolean) {
  const lower = (catName || "").toLowerCase();
  if (isActive) {
    return {
      card: "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/25 ring-2 ring-blue-500 ring-offset-1 scale-[1.03]",
      iconBg: "bg-blue-600 text-white shadow-xs",
      iconColor: "text-white",
      titleColor: "text-white font-black",
      badgeBg: "bg-blue-500/30 text-blue-200 border border-blue-400/30"
    };
  }
  if (lower.includes("engine")) {
    return {
      card: "bg-gradient-to-b from-amber-50/90 to-white border-amber-200/80 hover:border-amber-400 text-slate-800 hover:shadow-md hover:-translate-y-0.5",
      iconBg: "bg-amber-100 text-amber-700 group-hover:bg-amber-500 group-hover:text-white",
      iconColor: "text-amber-700 group-hover:text-white",
      titleColor: "text-slate-800 font-bold",
      badgeBg: "bg-amber-100/80 text-amber-800 border border-amber-200"
    };
  }
  if (lower.includes("suspension") || lower.includes("steering")) {
    return {
      card: "bg-gradient-to-b from-blue-50/90 to-white border-blue-200/80 hover:border-blue-400 text-slate-800 hover:shadow-md hover:-translate-y-0.5",
      iconBg: "bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white",
      iconColor: "text-blue-700 group-hover:text-white",
      titleColor: "text-slate-800 font-bold",
      badgeBg: "bg-blue-100/80 text-blue-800 border border-blue-200"
    };
  }
  if (lower.includes("brake")) {
    return {
      card: "bg-gradient-to-b from-rose-50/90 to-white border-rose-200/80 hover:border-rose-400 text-slate-800 hover:shadow-md hover:-translate-y-0.5",
      iconBg: "bg-rose-100 text-rose-700 group-hover:bg-rose-600 group-hover:text-white",
      iconColor: "text-rose-700 group-hover:text-white",
      titleColor: "text-slate-800 font-bold",
      badgeBg: "bg-rose-100/80 text-rose-800 border border-rose-200"
    };
  }
  if (lower.includes("electric") || lower.includes("light")) {
    return {
      card: "bg-gradient-to-b from-yellow-50/90 to-white border-yellow-200/80 hover:border-yellow-400 text-slate-800 hover:shadow-md hover:-translate-y-0.5",
      iconBg: "bg-yellow-100 text-yellow-800 group-hover:bg-amber-500 group-hover:text-white",
      iconColor: "text-yellow-800 group-hover:text-white",
      titleColor: "text-slate-800 font-bold",
      badgeBg: "bg-yellow-100/80 text-yellow-800 border border-yellow-200"
    };
  }
  if (lower.includes("body")) {
    return {
      card: "bg-gradient-to-b from-indigo-50/90 to-white border-indigo-200/80 hover:border-indigo-400 text-slate-800 hover:shadow-md hover:-translate-y-0.5",
      iconBg: "bg-indigo-100 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white",
      iconColor: "text-indigo-700 group-hover:text-white",
      titleColor: "text-slate-800 font-bold",
      badgeBg: "bg-indigo-100/80 text-indigo-800 border border-indigo-200"
    };
  }
  if (lower.includes("ac") || lower.includes("air")) {
    return {
      card: "bg-gradient-to-b from-cyan-50/90 to-white border-cyan-200/80 hover:border-cyan-400 text-slate-800 hover:shadow-md hover:-translate-y-0.5",
      iconBg: "bg-cyan-100 text-cyan-700 group-hover:bg-cyan-600 group-hover:text-white",
      iconColor: "text-cyan-700 group-hover:text-white",
      titleColor: "text-slate-800 font-bold",
      badgeBg: "bg-cyan-100/80 text-cyan-800 border border-cyan-200"
    };
  }
  return {
    card: "bg-gradient-to-b from-slate-50/90 to-white border-slate-200/80 hover:border-slate-400 text-slate-800 hover:shadow-md hover:-translate-y-0.5",
    iconBg: "bg-slate-100 text-slate-700 group-hover:bg-slate-800 group-hover:text-white",
    iconColor: "text-slate-700 group-hover:text-white",
    titleColor: "text-slate-800 font-bold",
    badgeBg: "bg-slate-100 text-slate-700 border border-slate-200"
  };
}

interface HomeScreenProps {
  parts: SparePart[];
  loading?: boolean;
  onFavoriteToggle?: (partId: string) => void;
  favorites: string[];
  onStartChat?: (part: SparePart) => void;
  currentUser: User | null;
  onPartDeleted?: (partId: string) => void;
  onViewPart?: (part: SparePart) => void;
  unreadNotificationCount?: number;
  onOpenNotifications?: () => void;
}

export default function HomeScreen({ 
  parts, 
  loading = false,
  onFavoriteToggle, 
  favorites, 
  onStartChat, 
  currentUser, 
  onPartDeleted, 
  onViewPart,
  unreadNotificationCount = 0,
  onOpenNotifications
}: HomeScreenProps) {
  const { t, language } = useLanguage();
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);
  const [isDeletingPart, setIsDeletingPart] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };
  const [taxonomy, setTaxonomy] = React.useState<FullTaxonomyConfig>({
    categories: [],
    categoryImages: {},
    subcategories: {},
    brands: {},
    brandLogos: {},
    variants: {},
    states: [],
    districts: {},
    cities: {},
    locations: []
  });

  React.useEffect(() => {
    const unsub = subscribeToTaxonomyConfig((config) => {
      setTaxonomy(config);
    });
    return () => unsub();
  }, []);

  const categories = taxonomy.categories;
  const brands = taxonomy.brands;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("All Brands");
  const [selectedModel, setSelectedModel] = useState("All Models");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedPartName, setSelectedPartName] = useState("All Parts");
  const [selectedState, setSelectedState] = useState(() => {
    return localStorage.getItem("autoparts_selected_state") || "All India";
  });
  const [selectedDistrict, setSelectedDistrict] = useState(() => {
    return localStorage.getItem("autoparts_selected_district") || "All Districts";
  });
  const [isGpsMode, setIsGpsMode] = useState(() => {
    return localStorage.getItem("autoparts_is_gps_mode") === "true";
  });
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(() => {
    const savedLat = localStorage.getItem("autoparts_user_lat");
    const savedLng = localStorage.getItem("autoparts_user_lng");
    if (savedLat && savedLng) {
      const lat = parseFloat(savedLat);
      const lng = parseFloat(savedLng);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
    return null;
  });
  const [selectedRadiusKm, setSelectedRadiusKm] = useState<number>(() => {
    const savedRad = localStorage.getItem("autoparts_radius_km");
    return savedRad ? parseInt(savedRad, 10) : 50;
  });
  const [userDetectedArea, setUserDetectedArea] = useState<string | null>(() => {
    return localStorage.getItem("autoparts_user_area") || null;
  });
  const [selectedCondition, setSelectedCondition] = useState("All Conditions");
  const [selectedPart, setSelectedPart] = useState<SparePart | null>(null);

  const handleViewPart = (part: SparePart) => {
    if (onViewPart) {
      onViewPart(part);
    } else {
      setSelectedPart(part);
    }
  };
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [detailImageIndex, setDetailImageIndex] = useState(0);

  // Viewer Location Detection State
  const [userDetectedState, setUserDetectedState] = useState<string | null>(null);
  const [userDetectedDistrict, setUserDetectedDistrict] = useState<string | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationDetectError, setLocationDetectError] = useState<string | null>(null);

  // Load saved state/district preference on mount
  React.useEffect(() => {
    const savedState = localStorage.getItem("autoparts_selected_state");
    const savedDistrict = localStorage.getItem("autoparts_selected_district");
    const savedIsGps = localStorage.getItem("autoparts_is_gps_mode") === "true";

    if (savedState) {
      setSelectedState(savedState);
      if (savedDistrict) setSelectedDistrict(savedDistrict);
    }
    if (savedIsGps) {
      setIsGpsMode(true);
    }
  }, []);

  const handleDetectLocationClick = async () => {
    setIsDetectingLocation(true);
    setLocationDetectError(null);
    try {
      const permRes = await requestLocationPermissionJIT();
      if (!permRes.granted) {
        setLocationDetectError(permRes.message || "Location access was denied. You can still select your State & District manually.");
        setIsDetectingLocation(false);
        return;
      }

      const res = await detectUserLocationWithReverseGeocode(INDIAN_STATES_AND_DISTRICTS);
      const detectedArea = res.area || res.district || res.state;
      setUserDetectedState(res.state);
      setUserDetectedDistrict(res.district);
      setUserDetectedArea(detectedArea);
      setUserCoords({ lat: res.lat, lng: res.lng });
      setIsGpsMode(true);
      setSelectedState(res.state);
      setSelectedDistrict(res.district || "All Districts");

      const radius = selectedRadiusKm || 50;
      setSelectedRadiusKm(radius);

      localStorage.setItem("autoparts_selected_state", res.state);
      localStorage.setItem("autoparts_selected_district", res.district || "All Districts");
      localStorage.setItem("autoparts_is_gps_mode", "true");
      localStorage.setItem("autoparts_user_lat", res.lat.toString());
      localStorage.setItem("autoparts_user_lng", res.lng.toString());
      localStorage.setItem("autoparts_radius_km", radius.toString());
      localStorage.setItem("autoparts_user_area", detectedArea);

      setShowLocationModal(false);
    } catch (err: any) {
      setLocationDetectError(err.message || "Could not detect location. Please select state manually.");
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleSelectAllIndia = () => {
    setSelectedState("All India");
    setSelectedDistrict("All Districts");
    setIsGpsMode(false);
    setUserDetectedArea(null);

    localStorage.setItem("autoparts_selected_state", "All India");
    localStorage.setItem("autoparts_selected_district", "All Districts");
    localStorage.setItem("autoparts_is_gps_mode", "false");

    setShowLocationModal(false);
  };

  const handleSelectRegion = (state: string, district: string = "All Districts") => {
    setSelectedState(state);
    setSelectedDistrict(district);
    setIsGpsMode(false);

    localStorage.setItem("autoparts_selected_state", state);
    localStorage.setItem("autoparts_selected_district", district);
    localStorage.setItem("autoparts_is_gps_mode", "false");

    setShowLocationModal(false);
  };

  const handleRadiusChange = (radiusKm: number) => {
    setSelectedRadiusKm(radiusKm);
    setIsGpsMode(true);
    localStorage.setItem("autoparts_radius_km", radiusKm.toString());
    localStorage.setItem("autoparts_is_gps_mode", "true");

    if (!userCoords) {
      const approx = getApproxCoordinates(selectedState, selectedDistrict);
      setUserCoords(approx);
      localStorage.setItem("autoparts_user_lat", approx.lat.toString());
      localStorage.setItem("autoparts_user_lng", approx.lng.toString());
    }

    setShowLocationModal(false);
  };
  
  // Local state for editing and deleting own listing
  const [editingPart, setEditingPart] = useState<SparePart | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleSaveListingChanges = async (partId: string, updates: Partial<SparePart>) => {
    try {
      const ok = await updateSparePartListing(partId, updates);
      if (ok) {
        setEditingPart(null);
        setSelectedPart(prev => prev && prev.id === partId ? { ...prev, ...updates } : prev);
      }
    } catch (err: any) {
      setDeleteError(err.message || "Failed to update listing.");
    }
  };
  
  // Local state for toggling advanced filters drawer
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  // Home screen location selector state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locSearchQuery, setLocSearchQuery] = useState("");
  const [locActiveState, setLocActiveState] = useState<string | null>(null);

  // Seller Rating & Reviews states
  const [sellerRating, setSellerRating] = useState<{ average: number; count: number } | null>(null);
  const [showReviews, setShowReviews] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);

  // Recently Viewed Parts state
  const [recentlyViewed, setRecentlyViewed] = useState<SparePart[]>([]);

  React.useEffect(() => {
    if (selectedPart) {
      try {
        const stored = localStorage.getItem("autoparts_recently_viewed_ids") || "[]";
        let ids: string[] = JSON.parse(stored);
        ids = [selectedPart.id, ...ids.filter(id => id !== selectedPart.id)].slice(0, 8);
        localStorage.setItem("autoparts_recently_viewed_ids", JSON.stringify(ids));
      } catch (e) {
        console.warn("Failed to store recently viewed part ID:", e);
      }
    }
  }, [selectedPart]);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("autoparts_recently_viewed_ids") || "[]";
      const ids: string[] = JSON.parse(stored);
      if (ids.length > 0 && parts.length > 0) {
        const matched = ids.map(id => parts.find(p => p.id === id)).filter((p): p is SparePart => p !== undefined);
        setRecentlyViewed(matched);
      }
    } catch (e) {
      // ignore error
    }
  }, [parts]);

  // Carousel Promotional Banner State & Config
  const [activeBanner, setActiveBanner] = useState(0);
  const [firestoreBanners, setFirestoreBanners] = useState<Banner[]>([]);

  React.useEffect(() => {
    const unsub = subscribeToBanners((loaded) => {
      setFirestoreBanners(loaded);
    }, true); // only active banners for home screen
    return () => unsub();
  }, []);

  React.useEffect(() => {
    if (firestoreBanners.length <= 1) return;
    const timer = setInterval(() => {
      setActiveBanner((prev) => (prev + 1) % firestoreBanners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [firestoreBanners.length]);

  // Compute Top Verified Sellers
  const topSellers = React.useMemo(() => {
    const map = new Map<string, { sellerId: string; sellerName: string; location: string; count: number; sampleImage?: string }>();
    parts.forEach(p => {
      if (!p.contactName) return;
      const key = p.sellerId || p.contactName;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        if (!existing.sampleImage && p.imageUrl) existing.sampleImage = p.imageUrl;
      } else {
        map.set(key, {
          sellerId: key,
          sellerName: p.contactName,
          location: p.district || p.location || "India",
          count: 1,
          sampleImage: p.imageUrl
        });
      }
    });
    return Array.from(map.values()).slice(0, 6);
  }, [parts]);

  React.useEffect(() => {
    const updateRating = () => {
      const sId = selectedPart?.sellerId;
      if (sId) {
        fetchSellerReviews(sId).then((revs) => {
          const count = revs.length;
          const average = count > 0 
            ? parseFloat((revs.reduce((sum, r) => sum + r.rating, 0) / count).toFixed(1))
            : 0;
          setSellerRating({ average, count });
        });
      } else {
        setSellerRating(null);
      }
    };

    updateRating();
    setDetailImageIndex(0);
    window.addEventListener("autoparts_reviews_updated", updateRating);
    window.addEventListener("storage", updateRating);
    return () => {
      window.removeEventListener("autoparts_reviews_updated", updateRating);
      window.removeEventListener("storage", updateRating);
    };
  }, [selectedPart]);

  // Flat list of all spare part names, brands, and models for suggestions and search
  const ALL_SPARE_PART_NAMES = React.useMemo(() => Object.values(taxonomy.subcategories || {}).flat(), [taxonomy.subcategories]);
  const ALL_BRANDS = React.useMemo(() => Object.keys(brands), [brands]);
  const ALL_MODELS = React.useMemo(() => Object.values(brands).flat() as string[], [brands]);

  // Search and Multi-tier Fallback Filter Logic
  const activeParts = React.useMemo(() => {
    return parts.filter((part) => {
      const isSold = part.sold === true;
      const isExpired = (Date.now() - part.createdAt) > 90 * 24 * 60 * 60 * 1000;
      return !isSold && !isExpired;
    });
  }, [parts]);

  const { finalFilteredParts, fallbackBanner } = React.useMemo(() => {
    if (activeParts.length === 0) {
      return { finalFilteredParts: [], fallbackBanner: null };
    }

    const query = (searchQuery || "").trim().toLowerCase();

    const getListingCoords = (part: SparePart): { lat: number; lng: number } => {
      if (typeof part.lat === "number" && typeof part.lng === "number" && !isNaN(part.lat) && !isNaN(part.lng) && part.lat !== 0 && part.lng !== 0) {
        return { lat: part.lat, lng: part.lng };
      }
      if (typeof (part as any).latitude === "number" && typeof (part as any).longitude === "number") {
        return { lat: (part as any).latitude, lng: (part as any).longitude };
      }
      if ((part as any).coordinates?.lat && (part as any).coordinates?.lng) {
        return { lat: (part as any).coordinates.lat, lng: (part as any).coordinates.lng };
      }
      return getApproxCoordinates(part.state, part.district);
    };

    const matchesFilterProps = (
      part: SparePart,
      opts: {
        checkQuery?: boolean;
        checkSpecifics?: boolean;
        checkState?: boolean;
        checkDistrict?: boolean;
        checkRadius?: boolean;
      }
    ) => {
      const {
        checkQuery = true,
        checkSpecifics = true,
        checkState = true,
        checkDistrict = true,
        checkRadius = true
      } = opts;

      // Attach calculated Haversine distance if user coordinates exist
      if (userCoords) {
        const pCoords = getListingCoords(part);
        const dist = Math.round(calculateDistance(userCoords.lat, userCoords.lng, pCoords.lat, pCoords.lng));
        (part as any)._distanceKm = dist;
      }

      if (checkQuery && query) {
        const title = (part.title || "").toLowerCase();
        const description = (part.description || "").toLowerCase();
        const carModel = (part.carModel || "").toLowerCase();
        const carBrand = (part.carBrand || "").toLowerCase();
        const category = (part.category || "").toLowerCase();
        const partName = (part.partName || "").toLowerCase();
        const state = (part.state || "").toLowerCase();
        const district = (part.district || "").toLowerCase();
        const location = (part.location || "").toLowerCase();

        const match =
          title.includes(query) ||
          description.includes(query) ||
          carModel.includes(query) ||
          carBrand.includes(query) ||
          category.includes(query) ||
          partName.includes(query) ||
          state.includes(query) ||
          district.includes(query) ||
          location.includes(query);

        if (!match) return false;
      }

      if (checkSpecifics) {
        if (selectedBrand !== "All Brands" && part.carBrand !== selectedBrand) return false;
        if (selectedModel !== "All Models" && part.carModel !== selectedModel) return false;
        if (selectedCategory !== "All Categories" && part.category !== selectedCategory) return false;
        if (
          selectedPartName !== "All Parts" &&
          part.partName !== selectedPartName &&
          !part.title?.toLowerCase().includes((selectedPartName || "").toLowerCase())
        ) return false;
        if (selectedCondition !== "All Conditions" && part.condition !== selectedCondition) return false;
      }

      // GPS & Radius distance filtering (Haversine Formula)
      if (isGpsMode && userCoords) {
        if (checkRadius) {
          const distKm = (part as any)._distanceKm ?? 99999;
          if (distKm > selectedRadiusKm) return false;
        }
        return true;
      }

      // Region / State / District filtering
      if (checkState && selectedState !== "All States" && selectedState !== "All India") {
        const matchesStateField =
          part.state === selectedState ||
          (!part.state && part.location?.toLowerCase().includes((selectedState || "").toLowerCase()));

        if (!matchesStateField) return false;

        if (checkDistrict && selectedDistrict !== "All Districts") {
          const matchesDistField =
            part.district === selectedDistrict ||
            (!part.district && part.location?.toLowerCase().includes((selectedDistrict || "").toLowerCase()));

          if (!matchesDistField) return false;
        }
      }

      return true;
    };

    // Priority 1: Exact Match (State + District / Radius + All Active Filters)
    const tier1 = activeParts.filter(p => matchesFilterProps(p, {
      checkQuery: true,
      checkSpecifics: true,
      checkState: true,
      checkDistrict: true,
      checkRadius: true
    }));

    if (tier1.length > 0) {
      return { finalFilteredParts: tier1, fallbackBanner: null };
    }

    // Priority 2: Wider Radius / Same State (Relaxed location) + All Active Filters
    const tier2 = activeParts.filter(p => matchesFilterProps(p, {
      checkQuery: true,
      checkSpecifics: true,
      checkState: true,
      checkDistrict: false,
      checkRadius: false
    }));

    if (tier2.length > 0) {
      return {
        finalFilteredParts: tier2,
        fallbackBanner: "No exact matches found in your selected area. Showing closest available listings."
      };
    }

    // Priority 3: All India Fallback + Active Filters
    const tier3 = activeParts.filter(p => matchesFilterProps(p, {
      checkQuery: true,
      checkSpecifics: true,
      checkState: false,
      checkDistrict: false,
      checkRadius: false
    }));

    if (tier3.length > 0) {
      return {
        finalFilteredParts: tier3,
        fallbackBanner: "No exact matches found in your area. Showing listings across India."
      };
    }

    // Priority 4: Relaxed Filters (Query-only if present, or all available listings across India)
    if (query) {
      const tier4QueryOnly = activeParts.filter(p => matchesFilterProps(p, {
        checkQuery: true,
        checkSpecifics: false,
        checkState: false,
        checkDistrict: false,
        checkRadius: false
      }));

      if (tier4QueryOnly.length > 0) {
        return {
          finalFilteredParts: tier4QueryOnly,
          fallbackBanner: "No exact matches found. Showing available listings across India."
        };
      }
    }

    // Absolute Fallback: Show all active listings across India
    return {
      finalFilteredParts: activeParts,
      fallbackBanner: "No exact matches found. Showing available listings across India."
    };
  }, [
    activeParts,
    searchQuery,
    selectedBrand,
    selectedModel,
    selectedCategory,
    selectedPartName,
    selectedCondition,
    selectedState,
    selectedDistrict,
    isGpsMode,
    userCoords,
    selectedRadiusKm
  ]);

  const sortedFilteredParts = React.useMemo(() => {
    const list = [...finalFilteredParts];

    if (isGpsMode && userCoords) {
      return list.sort((a, b) => {
        const distA = (a as any)._distanceKm ?? 99999;
        const distB = (b as any)._distanceKm ?? 99999;
        if (distA !== distB) return distA - distB;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
    }

    const targetDistrict = selectedDistrict !== "All Districts" ? selectedDistrict : userDetectedDistrict;
    const targetState = (selectedState !== "All States" && selectedState !== "All India") ? selectedState : userDetectedState;

    return list.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      if (targetDistrict) {
        const targetDistLower = targetDistrict.toLowerCase();
        const aDistMatch = a.district === targetDistrict || (a.location && a.location.toLowerCase().includes(targetDistLower));
        const bDistMatch = b.district === targetDistrict || (b.location && b.location.toLowerCase().includes(targetDistLower));
        if (aDistMatch) scoreA += 10;
        if (bDistMatch) scoreB += 10;
      }

      if (targetState) {
        const targetStateLower = targetState.toLowerCase();
        const aStateMatch = a.state === targetState || (a.location && a.location.toLowerCase().includes(targetStateLower));
        const bStateMatch = b.state === targetState || (b.location && b.location.toLowerCase().includes(targetStateLower));
        if (aStateMatch) scoreA += 5;
        if (bStateMatch) scoreB += 5;
      }

      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }

      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [finalFilteredParts, isGpsMode, userCoords, selectedDistrict, userDetectedDistrict, selectedState, userDetectedState]);

  const trimmedQuery = searchQuery.trim().toLowerCase();
  
  const suggestions = React.useMemo(() => {
    const result: { text: string; type: "Part Name" | "Brand" | "Model" }[] = [];
    if (!trimmedQuery) return result;

    // Match brands
    ALL_BRANDS.forEach(brand => {
      if (brand && brand.toLowerCase().includes(trimmedQuery) && !result.some(s => s.text === brand)) {
        result.push({ text: brand, type: "Brand" });
      }
    });
    
    // Match models
    ALL_MODELS.forEach(model => {
      if (model && model.toLowerCase().includes(trimmedQuery) && !result.some(s => s.text === model)) {
        result.push({ text: model, type: "Model" });
      }
    });

    // Match part names
    ALL_SPARE_PART_NAMES.forEach(name => {
      if (name && name.toLowerCase().includes(trimmedQuery) && !result.some(s => s.text === name)) {
        result.push({ text: name, type: "Part Name" });
      }
    });

    return result.slice(0, 10);
  }, [trimmedQuery, ALL_BRANDS, ALL_MODELS, ALL_SPARE_PART_NAMES]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(price);
  };

  const getRelativeTime = (timestamp: number) => {
    const difference = Date.now() - timestamp;
    const hours = Math.floor(difference / (3600 * 1000));
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "Brand New":
        return "bg-emerald-500 text-white border-emerald-600";
      case "Like New":
        return "bg-cyan-500 text-white border-cyan-600";
      case "Used (Good)":
        return "bg-amber-500 text-white border-amber-600";
      case "For Scrap/Spares":
        return "bg-rose-500 text-white border-rose-600";
      default:
        return "bg-slate-500 text-white border-slate-600";
    }
  };

  // Handle brand selection change to sync/reset model
  const handleBrandChange = (brand: string) => {
    setSelectedBrand(brand);
    setSelectedModel("All Models");
  };

  // Get available models based on selected brand
  const availableModels = selectedBrand !== "All Brands" ? brands[selectedBrand] || [] : [];

  return (
    <div className="flex-1 flex flex-col bg-slate-50 text-slate-900 h-full relative" id="home-screen-container">
      {/* Premium Auto Parts Marketplace Header */}
      <header className="bg-[#0F172A] text-white pt-2.5 pb-2.5 px-3.5 sticky top-0 z-20 shadow-xs border-b border-slate-800">
        {/* Top Header Control Row: Logo -> All India -> Notifications -> Language */}
        <div className="flex items-center justify-between gap-2.5 mb-2.5 w-full">
          {/* Left Controls Group: Logo + All India Selector */}
          <div className="flex items-center gap-2.5 shrink-0 min-w-0">
            <BrandLogo size="sm" variant="horizontal" theme="dark" showTagline={false} className="shrink-0 h-8 flex items-center" />

            {/* Compact All India Location Selector */}
            <LocationSelector
              selectedState={selectedState}
              selectedDistrict={selectedDistrict}
              isGpsMode={isGpsMode}
              radiusKm={selectedRadiusKm}
              userArea={userDetectedArea}
              onClick={() => {
                setLocSearchQuery("");
                setLocActiveState(null);
                setShowLocationModal(true);
              }}
            />
          </div>

          {/* Right Controls Group: Notification Bell + English Selector */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Notification Bell Button */}
            <button
              onClick={onOpenNotifications}
              className="h-8 w-8 rounded-full bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700/80 transition-all duration-200 shadow-2xs active:scale-95 cursor-pointer flex items-center justify-center relative shrink-0 group"
              id="home-notification-bell-btn"
              title="Notifications"
              aria-label="Open notifications"
            >
              <Bell size={16} className="group-hover:text-blue-400 transition-colors" />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-black min-w-[17px] h-[17px] rounded-full px-1 flex items-center justify-center border-2 border-[#0F172A] shadow-xs animate-pulse">
                  {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                </span>
              )}
            </button>

            {/* Language Selector */}
            <LanguageSelector variant="dark" />
          </div>
        </div>

        {/* Search Bar & Filter Button Row */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative h-11">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              placeholder={t("searchPlaceholder")}
              className="w-full h-11 bg-white border border-slate-200/90 rounded-2xl py-2 pl-10 pr-9 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-all duration-200 shadow-xs hover:shadow-sm"
              id="search-parts-input"
            />
            {searchQuery && (
              <button 
                onClick={() => {
                  setSearchQuery("");
                  setShowSuggestions(false);
                }} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-0.5 cursor-pointer"
                id="search-clear-btn"
              >
                <X size={14} />
              </button>
            )}

            {/* Auto-suggestions list with Glassmorphism */}
            {showSuggestions && suggestions.length > 0 && (
              <div 
                className="absolute left-0 right-0 mt-2 bg-white/95 backdrop-blur-2xl border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-100"
                id="search-suggestions-dropdown"
              >
                {suggestions.slice(0, 6).map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setSearchQuery(suggestion.text);
                      setShowSuggestions(false);
                      if (suggestion.type === "Brand") {
                        handleBrandChange(suggestion.text);
                      } else if (suggestion.type === "Model") {
                        const brand = Object.keys(brands).find(b => 
                          brands[b].includes(suggestion.text)
                        );
                        if (brand) {
                          setSelectedBrand(brand);
                          setSelectedModel(suggestion.text);
                        }
                      }
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-slate-800 hover:bg-slate-50 transition-colors flex items-center justify-between"
                  >
                    <span className="font-semibold text-slate-900">{suggestion.text}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      suggestion.type === "Brand" 
                        ? "text-emerald-700 bg-emerald-50 border border-emerald-200" 
                        : suggestion.type === "Model" 
                          ? "text-sky-700 bg-sky-50 border border-sky-200" 
                          : "text-[#2563EB] bg-blue-50 border border-blue-200"
                    }`}>
                      {suggestion.type}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowFiltersModal(true)}
            className={`h-11 w-11 shrink-0 rounded-2xl border flex items-center justify-center transition-all duration-200 cursor-pointer relative shadow-xs active:scale-95 ${
              selectedBrand !== "All Brands" || 
              selectedModel !== "All Models" || 
              selectedCategory !== "All Categories" || 
              selectedPartName !== "All Parts" ||
              selectedState !== "All States" ||
              selectedDistrict !== "All Districts" ||
              selectedCondition !== "All Conditions"
                ? "bg-[#2563EB] border-blue-400 text-white font-bold shadow-blue-500/20 scale-105"
                : "bg-slate-800/90 hover:bg-slate-700/90 border-slate-700/80 text-white"
            }`}
            id="filters-modal-toggle"
            title="Advanced Filters"
          >
            <Filter size={17} />
            {(selectedBrand !== "All Brands" || selectedModel !== "All Models" || selectedCategory !== "All Categories" || selectedPartName !== "All Parts" || selectedState !== "All States" || selectedDistrict !== "All Districts" || selectedCondition !== "All Conditions") && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-400 rounded-full border-2 border-slate-900 animate-pulse" />
            )}
          </button>
        </div>
      </header>

      {/* Main Scrollable Content Container */}
      <div className="flex-1 overflow-y-auto min-h-0 pb-24 scroll-smooth overflow-x-hidden" id="home-scrollable-content">
        
        {/* Category Icons Row with Horizontal Swipe */}
        <div className="bg-white border-b border-slate-200/80 py-2.5 px-3 shadow-2xs">
          <div className="flex items-center justify-between mb-2 px-0.5">
            <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase flex items-center gap-1.5">
              <Grid size={13} className="text-[#2563EB]" /> Top Categories
            </span>
            {selectedCategory !== "All Categories" && (
              <button
                onClick={() => {
                  setSelectedCategory("All Categories");
                  setSelectedPartName("All Parts");
                }}
                className="text-[10px] text-[#2563EB] font-bold hover:underline cursor-pointer flex items-center gap-1"
              >
                <X size={11} /> Clear Filter
              </button>
            )}
          </div>

          <div className="overflow-x-auto whitespace-nowrap flex gap-2.5 scrollbar-none snap-x snap-mandatory scroll-smooth pb-2 pt-1 items-center px-0.5">
            {/* All Parts Tile */}
            <button
              onClick={() => {
                setSelectedCategory("All Categories");
                setSelectedPartName("All Parts");
              }}
              className={`shrink-0 flex-none snap-start group flex flex-col items-center justify-center p-2.5 rounded-2xl w-[86px] h-[82px] transition-all duration-200 cursor-pointer text-center border shadow-2xs ${
                selectedCategory === "All Categories"
                  ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/25 ring-2 ring-blue-500 ring-offset-1 scale-[1.03]"
                  : "bg-gradient-to-b from-slate-50/90 to-white border-slate-200/80 hover:border-slate-400 text-slate-800 hover:shadow-md hover:-translate-y-0.5"
              }`}
              id="category-pill-all"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110 ${
                selectedCategory === "All Categories" ? "bg-blue-600 text-white shadow-xs" : "bg-slate-100 text-slate-700 group-hover:bg-slate-800 group-hover:text-white"
              }`}>
                <Car size={20} />
              </div>
              <div className="flex flex-col items-center w-full">
                <span className={`text-[11px] truncate w-full leading-tight mt-1 ${
                  selectedCategory === "All Categories" ? "text-white font-black" : "text-slate-800 font-bold"
                }`}>
                  All Parts
                </span>
              </div>
            </button>

            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              const theme = getCategoryColorTheme(cat, isActive);

              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setSelectedPartName("All Parts");
                  }}
                  className={`shrink-0 flex-none snap-start group flex flex-col items-center justify-center p-2.5 rounded-2xl w-[86px] h-[82px] transition-all duration-200 cursor-pointer text-center border shadow-2xs ${theme.card}`}
                  id={`category-pill-${cat.replace(/\s+/g, '-').toLowerCase()}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105 ${theme.iconBg}`}>
                    {getCategoryIcon(cat, 20)}
                  </div>
                  <div className="flex flex-col items-center w-full mt-1">
                    <span className={`text-[11px] truncate w-full leading-tight ${theme.titleColor}`}>
                      {translateDynamic(cat, language)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Hero Promotional Banner Carousel */}
        {firestoreBanners.length > 0 && (
          <div className="px-3 pt-1.5 pb-0.5 bg-slate-50">
            <AnimatePresence mode="wait">
              {(() => {
                const currentBanner = firestoreBanners[activeBanner] || firestoreBanners[0];
                if (!currentBanner) return null;

                return (
                  <motion.div
                    key={currentBanner.id || activeBanner}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    onClick={() => {
                      if (currentBanner.targetLink) {
                        if (CAR_PART_CATEGORIES.includes(currentBanner.targetLink) || categories.includes(currentBanner.targetLink)) {
                          setSelectedCategory(currentBanner.targetLink);
                        } else if (INDIAN_CAR_BRANDS[currentBanner.targetLink] || brands[currentBanner.targetLink]) {
                          handleBrandChange(currentBanner.targetLink);
                        } else {
                          setSearchQuery(currentBanner.targetLink);
                        }
                      }
                    }}
                    className={`relative overflow-hidden rounded-2xl border border-slate-200/80 shadow-xs bg-slate-900 ${currentBanner.targetLink ? "cursor-pointer" : ""}`}
                  >
                    {currentBanner.imageUrl ? (
                      /* Compact Banner Image container with fixed height h-32 sm:h-36 */
                      <div className="relative w-full h-32 sm:h-36 overflow-hidden bg-slate-900">
                        <img
                          src={currentBanner.imageUrl}
                          alt={currentBanner.title || "Promotional Banner"}
                          className="w-full h-full object-cover block"
                        />
                        {/* Optional subtle bottom gradient for text legibility if title/subtitle exists */}
                        {(currentBanner.title || currentBanner.subtitle || currentBanner.tag) && (
                          <div className="absolute inset-0 z-10 p-3 sm:p-3.5 flex flex-col justify-end bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent">
                            <div className="space-y-0.5 min-w-0 max-w-full">
                              {currentBanner.tag && (
                                <span className="text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-600 text-white inline-flex items-center gap-1 shadow-xs mb-0.5">
                                  <Sparkles size={10} /> {currentBanner.tag}
                                </span>
                              )}
                              {currentBanner.title && (
                                <h2 className="text-xs sm:text-sm font-black text-white tracking-tight truncate drop-shadow-xs">
                                  {currentBanner.title}
                                </h2>
                              )}
                              {currentBanner.subtitle && (
                                <p className="text-[10px] sm:text-xs text-slate-200 font-medium truncate drop-shadow-xs">
                                  {currentBanner.subtitle}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Fallback for text-only banner without an image */
                      <div className="h-32 sm:h-36 p-3 sm:p-3.5 bg-slate-900 text-white relative z-10 flex items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          {currentBanner.tag && (
                            <span className="text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-600/30 text-blue-300 border border-blue-500/30 inline-flex items-center gap-1">
                              <Sparkles size={10} /> {currentBanner.tag}
                            </span>
                          )}
                          <h2 className="text-xs sm:text-sm font-black text-white tracking-tight truncate">
                            {currentBanner.title}
                          </h2>
                          {currentBanner.subtitle && (
                            <p className="text-[10px] sm:text-xs text-slate-300 font-medium truncate">
                              {currentBanner.subtitle}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0">
                          <div className="w-10 h-10 rounded-2xl bg-[#2563EB] flex items-center justify-center text-white shadow-md border border-blue-400/40">
                            <Car size={20} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Indicator Dots */}
                    {firestoreBanners.length > 1 && (
                      <div className="flex items-center justify-center gap-1.5 py-1.5 bg-slate-950/40 backdrop-blur-xs relative z-20">
                        {firestoreBanners.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveBanner(idx);
                            }}
                            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                              idx === activeBanner ? "w-5 bg-[#2563EB]" : "w-1.5 bg-white/40 hover:bg-white/70"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </div>
        )}

        {/* Quick Popular Brands Horizontal Swipe */}
        <div className="bg-white border-y border-slate-200/80 py-2 px-3 overflow-x-auto whitespace-nowrap flex gap-1.5 scrollbar-none snap-x snap-mandatory scroll-smooth items-center">
          <span className="text-[10px] text-slate-500 font-bold uppercase shrink-0 mr-1">
            Brands:
          </span>
          <button
            onClick={() => handleBrandChange("All Brands")}
            className={`shrink-0 flex-none snap-start px-3 py-1 rounded-full text-[11px] transition-colors cursor-pointer border ${
              selectedBrand === "All Brands"
                ? "bg-slate-900 border-slate-900 text-white font-bold"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
            }`}
            id="brand-chip-all"
          >
            All Brands
          </button>
          {Object.keys(brands).map((b) => {
            const isSel = selectedBrand === b;
            return (
              <button
                key={b}
                onClick={() => handleBrandChange(b)}
                className={`shrink-0 flex-none snap-start px-3 py-1 rounded-full text-[11px] transition-colors cursor-pointer border ${
                  isSel
                    ? "bg-slate-900 border-slate-900 text-white font-bold"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
                }`}
                id={`brand-chip-${b.replace(/\s+/g, '-').toLowerCase()}`}
              >
                {b}
              </button>
            );
          })}
        </div>

        {/* Recently Viewed Row */}
        {recentlyViewed.length > 0 && (
          <div className="bg-white border-b border-slate-200/80 py-2.5 px-3 space-y-2">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase flex items-center gap-1">
                <Tag size={12} className="text-indigo-600" /> Recently Viewed
              </span>
              <button
                onClick={() => {
                  localStorage.removeItem("autoparts_recently_viewed_ids");
                  setRecentlyViewed([]);
                }}
                className="text-[9px] text-slate-400 hover:text-slate-600 font-bold"
              >
                Clear
              </button>
            </div>
            <div className="overflow-x-auto whitespace-nowrap flex gap-2 scrollbar-none pb-0.5">
              {recentlyViewed.map((part) => (
                <div
                  key={`rv-${part.id}`}
                  onClick={() => handleViewPart(part)}
                  className="shrink-0 w-28 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden cursor-pointer hover:border-[#2563EB] transition-all p-1.5 flex flex-col justify-between"
                >
                  <div className="h-16 w-full bg-slate-900 rounded-lg overflow-hidden relative mb-1">
                    {part.imageUrl ? (
                      <img
                        src={part.imageUrl}
                        alt={part.title}
                        className="w-full h-full object-contain p-0.5"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=300&auto=format&fit=crop&q=60";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500">
                        <Car size={16} />
                      </div>
                    )}
                  </div>
                  <h5 className="text-[10px] font-bold text-slate-900 truncate leading-tight">{part.title}</h5>
                  <span className="text-[10px] font-black text-[#2563EB] font-mono mt-0.5">₹{part.price?.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Parts Feed List */}
        <div className="p-2.5 sm:p-3 space-y-2">
          {/* Fallback Notice Banner */}
          {fallbackBanner && sortedFilteredParts.length > 0 && (
            <div className="bg-amber-50 border border-amber-200/90 text-amber-900 px-3 py-1.5 rounded-xl text-xs flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-1.5">
                <Compass size={14} className="text-amber-600 shrink-0" />
                <span className="font-semibold text-[10px] leading-tight">
                  {fallbackBanner}
                </span>
              </div>
              <span className="text-[8px] font-extrabold uppercase tracking-wider bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded shrink-0">
                Closest Matches
              </span>
            </div>
          )}

          <div className="flex justify-between items-center px-0.5">
            <div className="flex flex-col">
              <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
                {selectedCategory === "All Categories" ? "RECOMMENDED PARTS" : selectedCategory.toUpperCase()}
              </h3>
              {selectedBrand !== "All Brands" && (
                <span className="text-[10px] text-[#2563EB] font-bold">
                  Fitment: {selectedBrand} {selectedModel !== "All Models" ? `• ${selectedModel}` : ""}
                </span>
              )}
            </div>
            <span className="text-[10px] font-extrabold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full font-mono">
              {sortedFilteredParts.length} Listed
            </span>
          </div>

        {loading ? (
          <div className="py-8 px-2 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative flex items-center justify-center pt-2">
              <div className="w-10 h-10 rounded-full border-3 border-blue-200 border-t-[#2563EB] animate-spin" />
              <Car size={16} className="text-[#2563EB] absolute" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Loading Spare Parts...</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Fetching latest verified listings from sellers</p>
            </div>
            <div className="w-full grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 pt-2">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-2xs animate-pulse">
                  <div className="w-full h-36 bg-slate-200/80" />
                  <div className="p-3 space-y-2">
                    <div className="h-3.5 bg-slate-200 rounded w-4/5" />
                    <div className="h-2.5 bg-slate-200/60 rounded w-3/5" />
                    <div className="flex justify-between items-center pt-2">
                      <div className="h-4 bg-slate-200 rounded w-2/5" />
                      <div className="h-3 bg-slate-200/60 rounded w-1/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : sortedFilteredParts.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 px-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="w-11 h-11 bg-slate-100 rounded-full flex items-center justify-center mb-2.5 text-slate-400">
              <Compass size={22} />
            </div>
            <h4 className="text-xs font-black text-slate-800">No spare parts found</h4>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs leading-relaxed">
              Try selecting a different brand, category, or resetting location filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedBrand("All Brands");
                setSelectedModel("All Models");
                setSelectedCategory("All Categories");
                setSelectedPartName("All Parts");
                setSelectedState("All States");
                setSelectedDistrict("All Districts");
                setSelectedCondition("All Conditions");
              }}
              className="mt-3 px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs active:scale-95 cursor-pointer"
              id="reset-filters-btn"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 items-stretch sm:grid-cols-3 lg:grid-cols-4" id="parts-grid">
            {sortedFilteredParts.map((part, idx) => {
              const isFav = favorites.includes(part.id);
              return (
                <motion.div
                  key={`${part.id}-${idx}`}
                  whileHover={{ y: -2 }}
                  onClick={() => handleViewPart(part)}
                  className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-md hover:border-[#2563EB]/40 transition-all duration-200 flex flex-col cursor-pointer relative group h-full justify-between"
                  id={`part-card-${part.id}`}
                >
                  {/* Image container */}
                  <div 
                    className="w-full h-36 relative overflow-hidden group/img bg-slate-900 flex items-center justify-center shrink-0"
                  >
                    {part.imageUrl ? (
                      <img
                        src={part.imageUrl}
                        alt={part.title}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          // Fallback on broken image
                          (e.target as HTMLImageElement).style.display = 'none';
                          const parent = (e.target as HTMLImageElement).parentElement;
                          if (parent) {
                            const fallback = parent.querySelector('.image-fallback-container');
                            if (fallback) fallback.classList.remove('hidden');
                          }
                        }}
                        className="w-full h-full object-contain p-1 transition-transform duration-300 group-hover/img:scale-105"
                      />
                    ) : null}

                    {/* Image Fallback container when missing or broken */}
                    <div className={`w-full h-36 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col items-center justify-center text-indigo-300 gap-1 p-2 image-fallback-container ${part.imageUrl ? 'hidden' : ''}`}>
                      <ImageIcon size={22} className="text-blue-400/80 animate-pulse" />
                      <span className="text-[8px] font-extrabold tracking-wider uppercase text-slate-300 text-center line-clamp-2 px-1">
                        {part.partName || part.category}
                      </span>
                    </div>

                    {part.sold && (
                      <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-10">
                        <span className="text-[9px] font-black tracking-widest text-white bg-rose-600 px-2 py-0.5 rounded-full uppercase shadow-md">
                          SOLD OUT
                        </span>
                      </div>
                    )}
                    
                    {/* Condition badge */}
                    <div className="absolute top-2 left-2 flex gap-1 z-10">
                      <span className={`text-[8px] font-black tracking-wider px-1.5 py-0.5 rounded-md shadow-2xs border uppercase ${getConditionColor(part.condition)}`}>
                        {part.condition}
                      </span>
                    </div>

                    {/* Favorite Button */}
                    {onFavoriteToggle && (
                      <motion.button
                        whileTap={{ scale: 0.8 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onFavoriteToggle(part.id);
                        }}
                        className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md transition-all z-10 ${
                          isFav 
                            ? "bg-rose-500 text-white shadow-md shadow-rose-500/30" 
                            : "bg-slate-950/50 text-white hover:bg-slate-950/80 border border-white/20"
                        }`}
                        id={`fav-btn-${part.id}`}
                      >
                        <Heart size={12} fill={isFav ? "currentColor" : "none"} strokeWidth={2.5} />
                      </motion.button>
                    )}

                    {/* Price Tag Overlay */}
                    <div className="absolute bottom-2 left-2 z-10 bg-black/80 backdrop-blur-md text-white font-bold px-2.5 py-1 rounded-md text-xs shadow-md flex items-center gap-0.5 whitespace-nowrap font-mono border border-white/15 max-w-[calc(100%-1rem)]">
                      <span className="text-blue-400 font-extrabold shrink-0">₹</span>
                      <span className="truncate">{part.price ? part.price.toLocaleString("en-IN") : "N/A"}</span>
                    </div>
                  </div>

                  {/* Card Content details */}
                  <div className="p-2.5 flex-1 flex flex-col justify-between bg-white">
                    <div>
                      <div className="flex items-center gap-1 mb-1 font-bold text-[9px]">
                        <span className="text-slate-700 uppercase truncate bg-slate-100 px-1 py-0.5 rounded max-w-[50%]">
                          {part.carBrand}
                        </span>
                        <span className="text-[#2563EB] uppercase truncate bg-[#2563EB]/10 px-1 py-0.5 rounded max-w-[50%]">
                          {part.carModel}
                        </span>
                      </div>
                      
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-[#2563EB] transition-colors leading-tight">
                        {part.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5 font-medium">
                        {part.category}
                      </p>
                    </div>

                    <div className="border-t border-slate-100 pt-1.5 mt-2 flex items-center justify-between text-[9px] text-slate-400 font-semibold">
                      <span className="flex items-center gap-0.5 text-slate-500 max-w-[65%] truncate">
                        <MapPin size={10} className="text-blue-600 shrink-0" />
                        <span className="truncate font-medium">
                          {(part as any)._distanceKm !== undefined && (part as any)._distanceKm !== null
                            ? `${(part as any)._distanceKm} km away • ${part.district || part.location || "India"}`
                            : formatLocationName(part)}
                        </span>
                      </span>
                      <span className="font-mono text-slate-400 shrink-0">{getRelativeTime(part.createdAt)}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>

      {/* Part Detail Drawer Overlay */}
      <AnimatePresence>
        {selectedPart && (
          <motion.div
            key="part-detail-backdrop-motion"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            className="absolute inset-0 bg-slate-50 z-30 flex flex-col text-slate-900 overflow-hidden"
            id="part-detail-backdrop"
          >
            {/* Custom Toast Alert for sharing link */}
            <AnimatePresence>
              {showShareToast && (
                <motion.div
                  key="share-toast-hs-motion"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 10 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="absolute top-14 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-full shadow-lg font-bold flex items-center gap-2 z-[99]"
                >
                  <Sparkles size={14} className="text-amber-400" />
                  <span>Link copied to clipboard!</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sticky Top Header Bar */}
            <div className="sticky top-0 bg-white border-b border-slate-100 px-3.5 py-2.5 flex items-center justify-between z-20 shadow-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedPart(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-full transition-all active:scale-95 cursor-pointer text-slate-800"
                  id="close-detail-btn"
                >
                  <ArrowLeft size={22} strokeWidth={2.5} />
                </button>
                <div className="flex flex-col">
                  <span className="font-extrabold text-xs text-slate-900 tracking-wide uppercase">Ad Details</span>
                  <span className="text-[10px] text-slate-400 font-bold font-mono">ID: {selectedPart.id.substring(0, 8).toUpperCase()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Share Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const shareUrl = window.location.origin + "?part=" + selectedPart.id;
                    if (navigator.share) {
                      navigator.share({
                        title: selectedPart.title,
                        text: `Check out this ${selectedPart.carBrand} ${selectedPart.carModel} ${selectedPart.title} on Autoparts India!`,
                        url: shareUrl
                      }).catch(() => {
                        navigator.clipboard.writeText(shareUrl);
                        setShowShareToast(true);
                        setTimeout(() => setShowShareToast(false), 2000);
                      });
                    } else {
                      navigator.clipboard.writeText(shareUrl);
                      setShowShareToast(true);
                      setTimeout(() => setShowShareToast(false), 2000);
                    }
                  }}
                  className="p-2 hover:bg-slate-100 rounded-full transition-all active:scale-95 text-slate-700 cursor-pointer"
                  title="Share"
                >
                  <Share2 size={20} />
                </button>

                {/* Heart/Favorite Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onFavoriteToggle) onFavoriteToggle(selectedPart.id);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-full transition-all active:scale-95 cursor-pointer text-slate-700"
                  title="Favorite"
                >
                  <Heart
                    size={20}
                    className={favorites.includes(selectedPart.id) ? "fill-red-500 text-red-500 stroke-red-500 animate-pulse" : "text-slate-700"}
                  />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto pb-28 scrollbar-none bg-slate-50 dark:bg-slate-950">
              {/* Cover Image Carousel */}
              {(() => {
                const imageList: string[] = [];
                if (selectedPart.imageUrls && selectedPart.imageUrls.length > 0) {
                  selectedPart.imageUrls.forEach(url => {
                    if (url && !imageList.includes(url)) {
                      imageList.push(url);
                    }
                  });
                } else if (selectedPart.imageUrl) {
                  imageList.push(selectedPart.imageUrl);
                }

                // Touch swipe handlers
                let touchStartX = 0;

                const handleTouchStartLocal = (e: React.TouchEvent) => {
                  touchStartX = e.touches[0].clientX;
                };

                const handleTouchEndLocal = (e: React.TouchEvent) => {
                  const touchEndX = e.changedTouches[0].clientX;
                  const diffX = touchEndX - touchStartX;
                  if (Math.abs(diffX) > 40) {
                    if (diffX > 0) {
                      // swipe right -> previous image
                      setDetailImageIndex(prev => (prev > 0 ? prev - 1 : imageList.length - 1));
                    } else {
                      // swipe left -> next image
                      setDetailImageIndex(prev => (prev < imageList.length - 1 ? prev + 1 : 0));
                    }
                  }
                };

                return (
                  <div 
                    className="w-full aspect-[4/3] max-h-[360px] bg-slate-950 relative cursor-pointer group overflow-hidden select-none touch-pan-y flex items-center justify-center border-b border-slate-200 dark:border-slate-800 shadow-inner"
                    onTouchStart={handleTouchStartLocal}
                    onTouchEnd={handleTouchEndLocal}
                    onClick={() => setIsGalleryOpen(true)}
                    title="Swipe horizontally or click to view gallery"
                  >
                    <AnimatePresence mode="wait">
                      {imageList[detailImageIndex] ? (
                        <motion.img
                          key={detailImageIndex}
                          src={imageList[detailImageIndex]}
                          alt={selectedPart.title}
                          referrerPolicy="no-referrer"
                          initial={{ opacity: 0.85, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0.85, scale: 0.98 }}
                          transition={{ duration: 0.2 }}
                          className="w-full h-full object-contain max-h-[360px] select-none"
                        />
                      ) : (
                        <div className="w-full h-full min-h-[220px] bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center text-indigo-400 gap-2 p-4">
                          <ImageIcon size={36} className="text-indigo-400/80 animate-pulse" />
                          <span className="text-xs font-bold tracking-wider uppercase opacity-80 text-center">{selectedPart.partName || selectedPart.category}</span>
                        </div>
                      )}
                    </AnimatePresence>

                    {/* Left/Right click arrow buttons for desktop */}
                    {imageList.length > 1 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailImageIndex(prev => (prev > 0 ? prev - 1 : imageList.length - 1));
                          }}
                          className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-indigo-600 text-white rounded-full transition-all z-10 cursor-pointer shadow-md opacity-0 group-hover:opacity-100 md:opacity-80 flex items-center justify-center border border-white/10"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailImageIndex(prev => (prev < imageList.length - 1 ? prev + 1 : 0));
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-indigo-600 text-white rounded-full transition-all z-10 cursor-pointer shadow-md opacity-0 group-hover:opacity-100 md:opacity-80 flex items-center justify-center border border-white/10"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </>
                    )}

                    {/* Progress indicators dots or pills */}
                    {imageList.length > 1 && (
                      <div className="absolute bottom-3 left-4 flex items-center gap-1.5 z-10">
                        {imageList.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailImageIndex(idx);
                            }}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              idx === detailImageIndex ? "w-4 bg-indigo-500" : "w-1.5 bg-white/45"
                            }`}
                          />
                        ))}
                      </div>
                    )}

                    {/* Image Counter Badge (OLX style) */}
                    <div className="absolute bottom-3 right-4 bg-black/70 backdrop-blur-xs text-[11px] font-bold text-white px-2.5 py-1 rounded-md tracking-wider font-mono z-10 border border-white/10">
                      {detailImageIndex + 1} / {imageList.length}
                    </div>

                    {/* Gallery hint badge (Top Left) */}
                    <div className="absolute top-3 left-4 bg-slate-900/80 backdrop-blur-sm text-[10px] font-black tracking-wider text-white px-2.5 py-1.5 rounded-md flex items-center gap-1 border border-white/10 opacity-90 transition-all z-10">
                      <Maximize2 size={10} className="text-indigo-400 animate-pulse" />
                      VIEW FULLSCREEN
                    </div>

                    {selectedPart.sold && (
                      <div className="absolute inset-0 bg-slate-950/75 flex items-center justify-center z-20 backdrop-blur-2xs">
                        <span className="text-xs font-black tracking-widest text-white bg-rose-600 px-4 py-2 rounded-lg uppercase shadow-xl border border-rose-500">
                          SOLD OUT
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="p-3.5 space-y-3.5">
                {/* Price, Title, Location details */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight font-sans">
                      {formatPrice(selectedPart.price)}
                    </span>
                    <span className={`inline-block px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${getConditionColor(selectedPart.condition)}`}>
                      {selectedPart.condition}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug tracking-tight">
                    {selectedPart.title}
                  </h3>
                  <div className="h-px bg-slate-100 dark:bg-slate-800 my-2" />
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    <span className="flex items-center gap-1 font-bold">
                      <MapPin size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                      {selectedPart.district || selectedPart.location}, {selectedPart.state || "All India"}
                    </span>
                    <span className="font-semibold text-slate-400">
                      {new Date(selectedPart.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short"
                      })}
                    </span>
                  </div>
                </div>

                {/* Key attributes/Specification grid */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide border-l-3 border-indigo-600 pl-2">
                    Details & Specifications
                  </h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 pt-1">
                    <div className="flex flex-col border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Brand</span>
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{selectedPart.carBrand}</span>
                    </div>
                    <div className="flex flex-col border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Model Compatibility</span>
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{selectedPart.carModel}</span>
                    </div>
                    <div className="flex flex-col border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Category</span>
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{selectedPart.category}</span>
                    </div>
                    <div className="flex flex-col border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Condition</span>
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{selectedPart.condition}</span>
                    </div>
                    <div className="flex flex-col border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">State</span>
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{selectedPart.state || "All India"}</span>
                    </div>
                    <div className="flex flex-col border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">District</span>
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{selectedPart.district || "All Districts"}</span>
                    </div>
                  </div>
                </div>

                {/* Description block */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide border-l-3 border-indigo-600 pl-2">
                    Description
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line font-medium pt-1">
                    {selectedPart.description}
                  </p>
                </div>

                {/* Verified Seller info */}
                <div 
                  onClick={() => setShowReviews(true)}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-indigo-50 dark:bg-slate-800 rounded-full border border-indigo-100 dark:border-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-sm uppercase shadow-2xs">
                      {selectedPart.contactName.substring(0, 2)}
                    </div>
                    <div>
                      <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-black tracking-widest block uppercase leading-none">Verified Seller</span>
                      <h5 className="text-xs font-black text-slate-800 dark:text-slate-100 mt-1">{selectedPart.contactName}</h5>
                      
                      {/* Rating details button */}
                      {sellerRating ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Star size={11} className="fill-amber-500 text-amber-500" />
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                            {sellerRating.count > 0 ? `${sellerRating.average} (${sellerRating.count} reviews)` : "New Seller (No reviews)"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">Click to view seller profile</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                </div>

                {/* Map approximate location card */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide border-l-3 border-indigo-600 pl-2">
                    Posted In
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-bold">
                    <MapPin size={14} className="text-indigo-600 dark:text-indigo-400" />
                    <span>{formatLocationName(selectedPart)}</span>
                  </div>
                  <GMap
                    lat={selectedPart.lat}
                    lng={selectedPart.lng}
                    state={selectedPart.state}
                    district={selectedPart.district}
                    location={selectedPart.location}
                    height="180px"
                  />
                </div>
              </div>
            </div>

            {/* Toast Notification */}
            {toast && (
              <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full shadow-lg font-extrabold text-xs flex items-center gap-2 transition-all animate-bounce ${
                toast.type === "error" ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
              }`}>
                <span>{toast.message}</span>
              </div>
            )}

            {/* Sticky Bottom Call / Chat Action Bar */}
            <div className="absolute bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-3 flex items-center gap-3 z-20 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
              {currentUser && (selectedPart.sellerId === currentUser.id || currentUser.email === "wwwautoparts2@gmail.com") ? (
                <>
                  <button
                    onClick={() => {
                      setEditingPart(selectedPart);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                    id="edit-own-listing-btn"
                  >
                    Edit Listing
                  </button>
                  <button
                    onClick={async () => {
                      if (window.confirm("Are you sure you want to permanently delete this listing? This will delete images and data from everywhere.")) {
                        try {
                          setIsDeletingPart(true);
                          const ok = await deleteSparePartListing(selectedPart.id);
                          if (ok) {
                            if (onPartDeleted) {
                              onPartDeleted(selectedPart.id);
                            }
                            setSelectedPart(null);
                            showToast("Listing permanently deleted from everywhere.");
                          } else {
                            showToast("Failed to delete listing.", "error");
                          }
                        } catch (err: any) {
                          showToast("Error deleting listing: " + (err.message || String(err)), "error");
                        } finally {
                          setIsDeletingPart(false);
                        }
                      }
                    }}
                    disabled={isDeletingPart}
                    className="flex-1 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-xs transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                    id="delete-own-listing-btn"
                  >
                    {isDeletingPart ? "Deleting..." : "Delete Listing"}
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2.5 w-full">
                  {/* Left Button: Chat */}
                  <button
                    onClick={() => {
                      if (selectedPart.sold) return;
                      if (!currentUser) {
                        showToast("Please sign in to message sellers.", "error");
                        return;
                      }
                      const targetUrl = `/chat?sellerId=${selectedPart.sellerId}&listingId=${selectedPart.id}`;
                      try {
                        window.history.pushState({}, "", targetUrl);
                      } catch (e) {}
                      if (onStartChat) {
                        onStartChat(selectedPart);
                      }
                      setSelectedPart(null); // Close the detail drawer so the chat window overlay is visible
                    }}
                    disabled={selectedPart.sold}
                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-xs transition-all active:scale-[0.98] cursor-pointer ${
                      selectedPart.sold
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60 border border-slate-200 dark:border-slate-700"
                        : "bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white border border-slate-900 dark:border-slate-700"
                    }`}
                    id="inapp-chat-btn"
                  >
                    <MessageSquare size={16} />
                    <span>{selectedPart.sold ? t("soldOut") : "Chat"}</span>
                  </button>

                  {/* Right Button: Call */}
                  <button
                    onClick={() => {
                      if (selectedPart.sold) return;
                      const rawPhone = selectedPart.phoneNumber || selectedPart.contactPhone || (selectedPart as any).phone || "";
                      const phone = rawPhone.toString().trim();
                      if (phone && phone.length > 0) {
                        window.location.href = `tel:${phone}`;
                      } else {
                        showToast("Seller has not provided a phone number", "error");
                      }
                    }}
                    disabled={selectedPart.sold}
                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-xs transition-all active:scale-[0.98] cursor-pointer ${
                      selectedPart.sold
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60 border border-slate-200 dark:border-slate-700"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white"
                    }`}
                    id="seller-call-btn"
                  >
                    <Phone size={16} />
                    <span>{selectedPart.sold ? t("soldOut") : "Call"}</span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Seller Profile View Overlay */}
      <AnimatePresence>
        {showReviews && selectedPart && (
          <SellerProfileView
            key="seller-profile-view-hs"
            sellerId={selectedPart.sellerId}
            sellerName={selectedPart.contactName}
            currentUser={currentUser}
            onClose={() => setShowReviews(false)}
            onStartChat={onStartChat}
            allParts={parts}
            onSelectPart={(part) => handleViewPart(part)}
            favorites={favorites}
            onToggleFavorite={onFavoriteToggle}
          />
        )}
      </AnimatePresence>

      {/* Advanced Filter Drawer */}
      <AnimatePresence>
        {showFiltersModal && (
          <motion.div
            key="filters-backdrop-hs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowFiltersModal(false)}
            className="absolute inset-0 bg-black/60 z-30 flex items-end"
            id="filters-backdrop"
          >
            <motion.div
              key="filters-content-hs"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-[32px] w-full max-h-[85%] overflow-y-auto p-5 space-y-5 shadow-2xl relative text-slate-900"
              id="filters-modal-body"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <SlidersHorizontal size={16} className="text-indigo-600" />
                  Advanced Filter
                </h3>
                <button
                  onClick={() => setShowFiltersModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full"
                  id="close-filters-btn"
                >
                  <X size={16} />
                </button>
              </div>

              {/* 1. Brand Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  1. Select Car Brand
                </label>
                <select
                  value={selectedBrand}
                  onChange={(e) => handleBrandChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="All Brands">All Brands (India)</option>
                  {Object.keys(brands).map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* 2. Model Dropdown (Disabled if Brand is All Brands) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  2. Select Specific Model
                </label>
                <select
                  value={selectedModel}
                  disabled={selectedBrand === "All Brands"}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-slate-50 disabled:opacity-55 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="All Models">All Models</option>
                  {availableModels.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                {selectedBrand === "All Brands" && (
                  <span className="text-[9px] text-slate-400 font-medium block">Choose a Brand first to view specific models.</span>
                )}
              </div>

              {/* 3. Category Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  3. Part Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setSelectedPartName("All Parts");
                  }}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="All Categories">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* 3b. Specific Part Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  3b. Specific Spare Part
                </label>
                <select
                  value={selectedPartName}
                  disabled={selectedCategory === "All Categories"}
                  onChange={(e) => setSelectedPartName(e.target.value)}
                  className="w-full bg-slate-50 disabled:opacity-55 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="All Parts">All Parts</option>
                  {(selectedCategory !== "All Categories" ? CAR_SPARE_PARTS_BY_CATEGORY[selectedCategory] || [] : []).map((part) => (
                    <option key={part} value={part}>{part}</option>
                  ))}
                </select>
                {selectedCategory === "All Categories" && (
                  <span className="text-[9px] text-slate-400 font-medium block">Choose a Category first to view specific spare parts.</span>
                )}
              </div>

              {/* 4. Condition Filter */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  4. Part Condition
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {["All Conditions", "Brand New", "Like New", "Used (Good)", "For Scrap/Spares"].map((cond) => (
                    <button
                      key={cond}
                      onClick={() => setSelectedCondition(cond)}
                      className={`py-1.5 px-1 text-[10px] font-bold rounded-xl border text-center transition-all truncate ${
                        selectedCondition === cond
                          ? "bg-blue-50 border-blue-200 text-[#2563EB] font-bold shadow-2xs"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                      title={cond}
                    >
                      {cond === "All Conditions" ? "All" : cond}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Cascading Location Filter */}
              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  5. Location (Cascading Filter)
                </span>
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 block">STATE</span>
                    <select
                      value={selectedState}
                      onChange={(e) => {
                        setSelectedState(e.target.value);
                        setSelectedDistrict("All Districts");
                      }}
                      className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-bold rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="All States">All India</option>
                      {INDIAN_STATES_AND_DISTRICTS.map((s) => (
                        <option key={s.state} value={s.state}>{s.state}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 block">DISTRICT</span>
                    <select
                      value={selectedDistrict}
                      disabled={selectedState === "All States"}
                      onChange={(e) => setSelectedDistrict(e.target.value)}
                      className="w-full bg-white disabled:opacity-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="All Districts">All Districts</option>
                      {(INDIAN_STATES_AND_DISTRICTS.find(s => s.state === selectedState)?.districts || []).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={() => {
                    setSelectedBrand("All Brands");
                    setSelectedModel("All Models");
                    setSelectedCategory("All Categories");
                    setSelectedPartName("All Parts");
                    setSelectedState("All States");
                    setSelectedDistrict("All Districts");
                    setSelectedCondition("All Conditions");
                    setShowFiltersModal(false);
                  }}
                  className="flex-1 py-3 border border-slate-200 text-slate-500 font-bold text-xs rounded-2xl hover:bg-slate-50 transition-all text-center"
                  id="filter-reset-all-btn"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowFiltersModal(false)}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow-sm text-center"
                  id="filter-apply-all-btn"
                >
                  Show Results
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Home Location Selector Modal */}
      <AnimatePresence>
        {showLocationModal && (
          <motion.div
            key="location-modal-backdrop-hs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLocationModal(false)}
            className="absolute inset-0 bg-black/60 z-35 flex items-end"
            id="location-selector-backdrop"
          >
            <motion.div
              key="location-modal-content-hs"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-[32px] w-full h-[80%] flex flex-col shadow-2xl relative text-slate-900 overflow-hidden"
              id="location-selector-modal-body"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    Select Location
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {selectedState === "All States" ? "All India" : selectedDistrict === "All Districts" ? `${selectedState} > All Districts` : `${selectedState} > ${selectedDistrict}`}
                  </p>
                </div>
                <button
                  onClick={() => setShowLocationModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 p-1.5 rounded-full transition-colors"
                  id="close-location-modal-btn"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Search Box, Radius Filter & Auto Detect */}
              <div className="p-3.5 border-b border-slate-100 shrink-0 bg-white space-y-2.5">
                <button
                  onClick={handleDetectLocationClick}
                  disabled={isDetectingLocation}
                  className="w-full bg-blue-50 hover:bg-blue-100/70 text-[#2563EB] border border-blue-200/80 rounded-xl py-2.5 px-3 flex items-center justify-between transition-all active:scale-[0.99] shadow-2xs cursor-pointer"
                  id="detect-location-btn"
                >
                  <div className="flex items-center gap-2">
                    <Compass size={15} className={`text-[#2563EB] shrink-0 ${isDetectingLocation ? "animate-spin" : ""}`} />
                    <div className="text-left">
                      <span className="text-xs font-bold block leading-none text-slate-900">
                        {isDetectingLocation ? "Detecting location..." : "Use Current Location"}
                      </span>
                      <span className="text-[10px] text-[#2563EB] font-medium">
                        {isGpsMode && (userDetectedArea || userDetectedState)
                          ? `Nearby: ${userDetectedArea || userDetectedState} (${selectedRadiusKm}km)`
                          : "Auto-detect via GPS"}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-[#2563EB] text-white font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shadow-2xs">
                    GPS
                  </span>
                </button>

                {/* Radius Filter Bar (Haversine Distance) */}
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                  <div className="flex items-center justify-between mb-1.5 px-0.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Compass size={11} className="text-[#2563EB]" /> Radius Distance Filter
                    </span>
                    <span className="text-[10px] font-bold text-[#2563EB] bg-blue-100/60 px-1.5 py-0.5 rounded">
                      {isGpsMode ? `${selectedRadiusKm} km` : "All India"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                    {[20, 50, 100, 250, 500].map((rad) => {
                      const isSelected = isGpsMode && selectedRadiusKm === rad;
                      return (
                        <button
                          key={rad}
                          type="button"
                          onClick={() => handleRadiusChange(rad)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all shrink-0 cursor-pointer border ${
                            isSelected
                              ? "bg-[#2563EB] text-white border-[#2563EB] shadow-2xs"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {rad} km
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={handleSelectAllIndia}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all shrink-0 cursor-pointer border ${
                        !isGpsMode && (selectedState === "All India" || selectedState === "All States")
                          ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      All India
                    </button>
                  </div>
                </div>

                {locationDetectError && (
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-[10px] text-rose-600 flex items-center gap-1.5">
                    <AlertCircle size={12} className="shrink-0" />
                    <span>{locationDetectError}</span>
                  </div>
                )}

                <div className="relative">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={locSearchQuery}
                    onChange={(e) => {
                      setLocSearchQuery(e.target.value);
                      if (e.target.value.trim()) {
                        setLocActiveState(null);
                      }
                    }}
                    placeholder="Search states or districts (e.g. Pune, Goa, Delhi)..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-8 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                    id="location-search-input"
                  />
                  {locSearchQuery && (
                    <button
                      onClick={() => setLocSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Modal Content / Lists */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {locSearchQuery.trim() ? (
                  /* --- SEARCH RESULTS VIEW --- */
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1 mb-2">
                      Search Results
                    </span>

                    {/* All India option if matched */}
                    {("all india".includes(locSearchQuery.trim().toLowerCase()) || "india".includes(locSearchQuery.trim().toLowerCase())) && (
                      <button
                        onClick={handleSelectAllIndia}
                        className="w-full text-left px-3.5 py-3 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between border border-transparent hover:border-slate-100"
                      >
                        <div className="flex items-center gap-2.5">
                          <Compass size={14} className="text-sky-500 shrink-0" />
                          <span className="text-xs font-bold text-slate-800">All India</span>
                        </div>
                        <span className="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase">Default</span>
                      </button>
                    )}

                    {/* State & District matches */}
                    {(() => {
                      const query = locSearchQuery.trim().toLowerCase();
                      const items: React.ReactNode[] = [];
                      
                      INDIAN_STATES_AND_DISTRICTS.forEach((s) => {
                        // Check state name match
                        if (s.state.toLowerCase().includes(query)) {
                          items.push(
                            <button
                              key={`state-${s.state}`}
                              onClick={() => {
                                // Transition to showing districts for this state
                                setLocActiveState(s.state);
                                setLocSearchQuery(""); // Clear search to show district list directly
                              }}
                              className="w-full text-left px-3.5 py-3 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between border border-transparent hover:border-slate-100"
                            >
                              <div className="flex items-center gap-2.5">
                                <MapPin size={14} className="text-indigo-500 shrink-0" />
                                <span className="text-xs font-bold text-slate-800">{s.state}</span>
                              </div>
                              <span className="text-[9px] bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded font-mono font-bold uppercase">State</span>
                            </button>
                          );
                        }

                        // Check district matches
                        s.districts.forEach((d) => {
                          if (d.toLowerCase().includes(query)) {
                            items.push(
                              <button
                                key={`dist-${s.state}-${d}`}
                                onClick={() => {
                                  setSelectedState(s.state);
                                  setSelectedDistrict(d);
                                  setShowLocationModal(false);
                                }}
                                className="w-full text-left px-3.5 py-3 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between border border-transparent hover:border-slate-100"
                              >
                                <div className="flex items-center gap-2.5">
                                  <MapPin size={14} className="text-emerald-500 shrink-0" />
                                  <span className="text-xs font-bold text-slate-800">
                                    {s.state} <span className="text-slate-400 font-medium">›</span> {d}
                                  </span>
                                </div>
                                <span className="text-[9px] bg-emerald-50 text-emerald-500 px-1.5 py-0.5 rounded font-mono font-bold uppercase">District</span>
                              </button>
                            );
                          }
                        });
                      });

                      if (items.length === 0 && !("all india".includes(query) || "india".includes(query))) {
                        return (
                          <div className="text-center py-8">
                            <span className="text-xs text-slate-400 font-medium">No states or districts match your search</span>
                          </div>
                        );
                      }

                      return items;
                    })()}
                  </div>
                ) : locActiveState ? (
                  /* --- DISTRICTS LIST FOR ACTIVE STATE --- */
                  <div className="space-y-1">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <button
                        onClick={() => setLocActiveState(null)}
                        className="text-xs font-bold text-sky-500 hover:text-sky-600 flex items-center gap-1"
                        id="loc-back-to-states-btn"
                      >
                        ← Back to States
                      </button>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {locActiveState} Districts
                      </span>
                    </div>

                    {/* All Districts of this State option */}
                    <button
                      onClick={() => {
                        setSelectedState(locActiveState);
                        setSelectedDistrict("All Districts");
                        setShowLocationModal(false);
                      }}
                      className="w-full text-left px-3.5 py-3 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between border border-transparent hover:border-slate-100"
                    >
                      <div className="flex items-center gap-2.5">
                        <Compass size={14} className="text-indigo-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-800">All Districts in {locActiveState}</span>
                      </div>
                      <span className="text-[9px] bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded font-mono font-bold uppercase">All Districts</span>
                    </button>

                    {/* List of Districts */}
                    {(INDIAN_STATES_AND_DISTRICTS.find(s => s.state === locActiveState)?.districts || []).map((d) => {
                      const isCurrentlySelected = selectedState === locActiveState && selectedDistrict === d;
                      return (
                        <button
                          key={d}
                          onClick={() => {
                            setSelectedState(locActiveState);
                            setSelectedDistrict(d);
                            setShowLocationModal(false);
                          }}
                          className={`w-full text-left px-3.5 py-3 rounded-xl transition-colors flex items-center justify-between border ${
                            isCurrentlySelected 
                              ? "bg-blue-50 border-blue-200 text-[#2563EB]" 
                              : "border-transparent hover:bg-slate-50 hover:border-slate-100 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <MapPin size={14} className={isCurrentlySelected ? "text-[#2563EB] shrink-0" : "text-slate-400 shrink-0"} />
                            <span className="text-xs font-bold">{d}</span>
                          </div>
                          {isCurrentlySelected && (
                            <span className="text-[9px] bg-[#2563EB] text-white px-1.5 py-0.5 rounded font-mono font-bold uppercase">Selected</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* --- DEFAULT STATES LIST --- */
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1 mb-2">
                      All Regions
                    </span>

                    {/* All India default option */}
                    <button
                      onClick={handleSelectAllIndia}
                      className={`w-full text-left px-3.5 py-3 rounded-xl transition-colors flex items-center justify-between border ${
                        !isGpsMode && (selectedState === "All India" || selectedState === "All States")
                          ? "bg-blue-50 border-blue-200 text-[#2563EB]"
                          : "border-transparent hover:bg-slate-50 hover:border-slate-100 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Compass size={14} className={!isGpsMode && (selectedState === "All India" || selectedState === "All States") ? "text-[#2563EB] shrink-0" : "text-slate-400 shrink-0"} />
                        <span className="text-xs font-bold">All India</span>
                      </div>
                      <span className="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase">Default</span>
                    </button>

                    <div className="border-t border-slate-100 my-2"></div>

                    {/* List of States */}
                    {INDIAN_STATES_AND_DISTRICTS.map((s) => {
                      const isStateSelected = selectedState === s.state;
                      return (
                        <button
                          key={s.state}
                          onClick={() => {
                            // Immediately transition to show district list for this state
                            setLocActiveState(s.state);
                          }}
                          className={`w-full text-left px-3.5 py-3 rounded-xl transition-colors flex items-center justify-between border ${
                            isStateSelected 
                              ? "bg-blue-50 border-blue-200 text-[#2563EB]" 
                              : "border-transparent hover:bg-slate-50 hover:border-slate-100 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <MapPin size={14} className={isStateSelected ? "text-[#2563EB] shrink-0" : "text-slate-400 shrink-0"} />
                            <span className="text-xs font-bold">{s.state}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold">
                              {s.districts.length} districts
                            </span>
                            <ChevronRight size={12} className="text-slate-400" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen Image Gallery Modal */}
      <ImageGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        part={selectedPart}
        initialIndex={detailImageIndex}
      />

      {editingPart && (
        <EditListingModal
          part={editingPart}
          onClose={() => setEditingPart(null)}
          onSave={handleSaveListingChanges}
          onDelete={async (id) => {
            const ok = await deleteSparePartListing(id);
            if (ok) {
              setEditingPart(null);
              setSelectedPart(null);
            }
          }}
        />
      )}

      {deleteError && (
        <div className="fixed bottom-4 left-4 right-4 bg-rose-600 text-white p-3 rounded-xl shadow-lg z-50 text-xs flex items-center justify-between">
          <span>{deleteError}</span>
          <button onClick={() => setDeleteError(null)} className="font-bold underline">Dismiss</button>
        </div>
      )}
    </div>
  );
}
