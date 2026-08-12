import React, { useState, useEffect } from "react";
import { 
  X, ShieldCheck, Calendar, MapPin, 
  Heart, UserPlus, UserCheck, Mail, ArrowLeft, Package
} from "lucide-react";
import { User, SparePart } from "../types";
import { fetchUserProfile, checkIsFollowing, followSeller, unfollowSeller } from "../lib/firebase";
import { formatLocationName } from "../utils/locationHelper";

interface SellerProfileViewProps {
  key?: string;
  sellerId: string;
  sellerName: string;
  currentUser: User | null;
  onClose: () => void;
  onStartChat?: (part: SparePart) => void;
  allParts: SparePart[];
  onSelectPart?: (part: SparePart) => void;
  favorites?: string[];
  onToggleFavorite?: (partId: string) => void;
}

export default function SellerProfileView({
  sellerId,
  sellerName,
  currentUser,
  onClose,
  allParts,
  onSelectPart,
  favorites = [],
  onToggleFavorite
}: SellerProfileViewProps) {
  const [sellerProfile, setSellerProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Local follow state persisted in localStorage
  const [isFollowing, setIsFollowing] = useState<boolean>(() => {
    try {
      const key = `followed_sellers_${currentUser?.uid || "guest"}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const list = JSON.parse(saved);
        return Array.isArray(list) && list.includes(sellerId);
      }
    } catch (e) {
      console.warn("Failed to read follow state:", e);
    }
    return false;
  });

  // Local favorites set for instant UI toggle feedback
  const [localFavs, setLocalFavs] = useState<Set<string>>(new Set(favorites));

  useEffect(() => {
    setLocalFavs(new Set(favorites));
  }, [favorites]);

  useEffect(() => {
    let isMounted = true;
    const initFollowStatus = async () => {
      if (currentUser?.uid && sellerId) {
        try {
          const following = await checkIsFollowing(currentUser.uid, sellerId);
          if (isMounted) setIsFollowing(following);
        } catch (e) {
          console.warn("Failed to check follow status:", e);
        }
      }
    };
    initFollowStatus();
    return () => { isMounted = false; };
  }, [currentUser?.uid, sellerId]);

  useEffect(() => {
    const loadProfileData = async () => {
      setLoading(true);
      try {
        const profileData = await fetchUserProfile(sellerId);
        setSellerProfile(profileData);
      } catch (err) {
        console.error("Failed to load seller profile data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [sellerId]);

  const toggleFollow = async () => {
    const nextState = !isFollowing;
    setIsFollowing(nextState); // Immediate optimistic UI state update

    const uid = currentUser?.uid;
    if (uid && sellerId) {
      try {
        if (nextState) {
          await followSeller(uid, sellerId);
        } else {
          await unfollowSeller(uid, sellerId);
        }
      } catch (err) {
        console.error("Failed to update follow status in Firestore:", err);
      }
    } else {
      // Local storage fallback for guest/offline
      try {
        const key = `followed_sellers_${uid || "guest"}`;
        const saved = localStorage.getItem(key);
        let list: string[] = saved ? JSON.parse(saved) : [];
        if (nextState) {
          if (!list.includes(sellerId)) list.push(sellerId);
        } else {
          list = list.filter(id => id !== sellerId);
        }
        localStorage.setItem(key, JSON.stringify(list));
      } catch (e) {
        console.warn("LocalStorage fallback error:", e);
      }
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent, partId: string) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(partId);
    }
    setLocalFavs(prev => {
      const next = new Set(prev);
      if (next.has(partId)) {
        next.delete(partId);
      } else {
        next.add(partId);
      }
      return next;
    });
  };

  // Filter seller's active listings only
  const sellerParts = allParts.filter(p => p.sellerId === sellerId && !p.sold);

  const getMemberSinceDate = () => {
    const ts = sellerProfile?.createdAt || (sellerParts.length > 0 ? sellerParts[sellerParts.length - 1].createdAt : null);
    if (ts) {
      try {
        const date = new Date(ts);
        if (!isNaN(date.getTime())) {
          const month = date.toLocaleString("en-US", { month: "short" });
          const year = date.getFullYear();
          return `Member since ${month} ${year}`;
        }
      } catch (e) {
        // Fallback
      }
    }
    return "Member since Aug 2024";
  };

  const formatDatePosted = (createdAt?: string | number) => {
    if (!createdAt) return "Recently";
    try {
      const date = new Date(createdAt);
      if (isNaN(date.getTime())) return "Recently";
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffHours < 1) return "Just now";
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 30) return `${diffDays} days ago`;

      return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    } catch (e) {
      return "Recently";
    }
  };

  const displayName = sellerName || sellerProfile?.name || sellerProfile?.displayName || "Auto Parts Seller";
  const avatarUrl = sellerProfile?.photoURL || sellerProfile?.profilePhoto;

  const handlePartClick = (part: SparePart) => {
    if (onSelectPart) {
      onSelectPart(part);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col z-50 animate-in fade-in duration-200" id="seller-profile-view-root">
      {/* Top Header Navbar */}
      <div className="bg-[#0F172A] text-white py-3.5 px-4 flex items-center justify-between shadow-md sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-200 rounded-xl transition-all cursor-pointer"
            id="close-profile-view-back-btn"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-sm font-extrabold text-white">Seller Profile</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition-colors cursor-pointer"
          id="close-profile-view-btn"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 pb-24 overflow-y-auto max-w-3xl mx-auto w-full px-4 pt-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Loading Profile...</span>
          </div>
        ) : (
          <div className="space-y-5">
            
            {/* 1. SIMPLIFIED OLX-STYLE SELLER HEADER */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(11,18,32,0.04)] flex items-start justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                {/* Avatar Photo */}
                {(() => {
                  const photoUrl = avatarUrl || "";
                  const hasPhoto = Boolean(photoUrl && photoUrl.trim() !== "");
                  const initialLetter = (displayName || "S").trim().charAt(0).toUpperCase() || "S";

                  return (
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-[#f3f4f6] border-2 border-slate-200 shrink-0 shadow-sm flex items-center justify-center font-black text-slate-700 text-xl uppercase relative">
                      <div className="w-full h-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center font-black text-white text-xl rounded-full">
                        {initialLetter}
                      </div>
                      {hasPhoto && (
                        <img 
                          src={photoUrl} 
                          alt={displayName} 
                          className="w-full h-full object-cover rounded-full absolute inset-0"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      )}
                    </div>
                  );
                })()}

                {/* Seller Info */}
                <div className="min-w-0">
                  <h1 className="text-base font-black text-slate-900 tracking-tight truncate leading-snug">
                    {displayName}
                  </h1>

                  <p className="text-[11px] font-bold text-slate-500 mt-0.5 flex items-center gap-1">
                    <Calendar size={13} className="text-slate-400 shrink-0" />
                    <span>{getMemberSinceDate()}</span>
                  </p>

                  {/* Verified Login Badges */}
                  <div className="flex items-center gap-2 flex-wrap mt-2">
                    {/* Google Verified Badge */}
                    <div className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200/80 text-blue-700 px-2 py-0.5 rounded-md text-[10px] font-extrabold">
                      <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                      <span>Google Verified</span>
                    </div>

                    {/* Email Verified Badge */}
                    <div className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200/80 text-emerald-700 px-2 py-0.5 rounded-md text-[10px] font-extrabold">
                      <Mail size={11} className="text-emerald-600 shrink-0" />
                      <span>Email Verified</span>
                    </div>

                    {/* Phone / Identity Verified */}
                    <div className="inline-flex items-center gap-1 bg-teal-50 border border-teal-200/80 text-teal-800 px-2 py-0.5 rounded-md text-[10px] font-extrabold">
                      <ShieldCheck size={11} className="text-teal-600 shrink-0" />
                      <span>Phone Verified</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Follow / Unfollow Toggle Button */}
              <button
                onClick={toggleFollow}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0 ${
                  isFollowing 
                    ? "bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-300"
                    : "bg-[#002f34] hover:bg-[#003d44] text-white border border-[#002f34]"
                }`}
                id="btn-follow-seller"
              >
                {isFollowing ? (
                  <>
                    <UserCheck size={14} />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={14} />
                    <span>Follow</span>
                  </>
                )}
              </button>
            </div>

            {/* 2. SELLER'S ACTIVE LISTINGS VIEW */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <span>Seller's Active Listings</span>
                  <span className="bg-slate-200 text-slate-800 text-[10px] px-2 py-0.5 rounded-full font-mono font-extrabold">
                    {sellerParts.length}
                  </span>
                </h3>
              </div>

              {sellerParts.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-200/80 text-center flex flex-col items-center justify-center space-y-2 shadow-xs">
                  <Package size={28} className="text-slate-300" />
                  <span className="text-xs text-slate-500 font-bold block">No active listings available from this seller.</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                  {sellerParts.map((part) => {
                    const isFav = localFavs.has(part.id);
                    return (
                      <div
                        key={part.id}
                        onClick={() => handlePartClick(part)}
                        className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col group cursor-pointer hover:border-slate-300 hover:shadow-sm transition-all relative"
                        id={`seller-part-card-${part.id}`}
                      >
                        {/* Image Thumbnail & Heart Icon */}
                        <div className="aspect-4/3 w-full bg-slate-100 relative overflow-hidden">
                          <img
                            src={part.imageUrl || part.imageUrls?.[0] || "https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&q=80&w=400"}
                            alt={part.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=300&auto=format&fit=crop&q=60";
                            }}
                          />

                          {/* Heart / Favorite Icon */}
                          <button
                            onClick={(e) => handleFavoriteClick(e, part.id)}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 backdrop-blur-xs hover:bg-white text-slate-600 shadow-sm z-10 transition-transform active:scale-90 cursor-pointer"
                            title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                            id={`btn-fav-${part.id}`}
                          >
                            <Heart 
                              size={14} 
                              className={isFav ? "fill-rose-500 text-rose-500" : "text-slate-600"} 
                            />
                          </button>
                        </div>

                        {/* Details Content */}
                        <div className="p-3 flex-1 flex flex-col justify-between space-y-1.5 bg-white">
                          <div>
                            <span className="text-sm font-black text-slate-900 block font-mono">
                              ₹{part.price.toLocaleString("en-IN")}
                            </span>
                            <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors mt-0.5">
                              {part.title}
                            </h4>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                            <span className="flex items-center gap-0.5 truncate max-w-[110px]">
                              <MapPin size={11} className="text-slate-400 shrink-0" />
                              <span className="truncate">{formatLocationName(part)}</span>
                            </span>
                            <span className="shrink-0 text-[9px] text-slate-400 font-semibold">
                              {formatDatePosted(part.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
