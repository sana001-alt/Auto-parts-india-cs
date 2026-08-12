import React, { useState, useEffect } from "react";
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  LogOut, 
  Trash2, 
  Heart, 
  Tag, 
  Grid, 
  MapPin, 
  ChevronRight, 
  ShieldAlert, 
  Info, 
  CheckCircle2, 
  MessageSquare, 
  HelpCircle,
  Lock,
  ArrowLeft,
  ExternalLink,
  Settings,
  ShieldCheck,
  Star,
  Compass,
  Database,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Download,
  Clock,
  ArrowUpRight,
  Globe,
  Moon,
  Sun,
  Bell,
  UserX,
  Check,
  X,
  Camera,
  Calendar,
  Package,
  Plus,
  Loader2,
  Image as ImageIcon
} from "lucide-react";
import { Capacitor } from '@capacitor/core';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { requestCameraPermissionJIT } from "../utils/permissionUtils";
import { User, SparePart, AppVersionConfig } from "../types";
import BrandLogo from "./BrandLogo";
import { 
  signOut, 
  deleteSparePartListing, 
  updateSparePartListing,
  fetchSellerReviews,
  subscribeToSellerReviews,
  subscribeToUserListings,
  deleteFullUserAccount,
  fetchAppVersionConfig,
  uploadProductImage,
  updateUserProfile,
  deleteImagesFromCloudinary,
  subscribeToUserFollowStats,
  FollowStats,
  auth
} from "../lib/firebase";
import { CURRENT_APP_VERSION, compareVersions } from "../utils/versionUtils";
import EditListingModal from "./EditListingModal";
import { INDIAN_STATES_AND_DISTRICTS } from "../data/indianLocations";
import { geocodeLocation, formatLocationName } from "../utils/locationHelper";
import MapLocationModal from "./MapLocationModal";
import { useLanguage } from "../lib/LanguageContext";
import { useTheme } from "../lib/ThemeContext";

interface ProfileScreenProps {
  currentUser: User;
  onLogout: (message?: string) => void;
  parts: SparePart[];
  favorites: string[];
  onPartDeleted: (partId: string) => void;
  onFavoriteToggle?: (partId: string) => void;
  onViewPart?: (part: SparePart) => void;
  onUpdateUser?: (updatedUser: User) => void;
  onToggleSold?: (partId: string) => void;
  onUpdatePrice?: (partId: string, newPrice: number) => void;
  activeTab?: string;
  onTabChange?: (tab: "home" | "chats" | "sell" | "myads" | "account") => void;
  onOpenAdminDashboard?: () => void;
}

type SubScreen = "menu" | "view_profile" | "edit_profile" | "personal_info" | "my_listings" | "saved" | "privacy" | "support" | "about" | "my_reviews" | "app_update" | "settings";

export default function ProfileScreen({ 
  currentUser, 
  onLogout, 
  parts, 
  favorites, 
  onPartDeleted,
  onFavoriteToggle,
  onViewPart,
  onUpdateUser,
  onToggleSold,
  onUpdatePrice,
  activeTab,
  onTabChange,
  onOpenAdminDashboard
}: ProfileScreenProps) {
  const [activeSubScreen, setActiveSubScreen] = useState<SubScreen>(
    activeTab === "myads" ? "my_listings" : "menu"
  );

  useEffect(() => {
    if (activeTab === "myads") {
      setActiveSubScreen("my_listings");
    } else if (activeTab === "account") {
      if (activeSubScreen === "my_listings") {
        setActiveSubScreen("menu");
      }
    }
  }, [activeTab]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editPriceValue, setEditPriceValue] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [myAdsTab, setMyAdsTab] = useState<"active" | "sold" | "expired">("active");
  const [editingPart, setEditingPart] = useState<SparePart | null>(null);

  // Personal Info & Edit Profile Form State
  const [editName, setEditName] = useState(currentUser.name || currentUser.displayName || "");
  const [editPhone, setEditPhone] = useState(currentUser.phone || "");
  const [editState, setEditState] = useState(currentUser.state || "");
  const [editDistrict, setEditDistrict] = useState(currentUser.district || "");
  const [editLat, setEditLat] = useState<number | undefined>(currentUser.lat);
  const [editLng, setEditLng] = useState<number | undefined>(currentUser.lng);
  const [showMapModal, setShowMapModal] = useState(false);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string>(currentUser.photoURL || currentUser.profilePhoto || "");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadPhotoError, setUploadPhotoError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showPhotoActionSheet, setShowPhotoActionSheet] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputGalleryRef = React.useRef<HTMLInputElement>(null);
  const fileInputCameraRef = React.useRef<HTMLInputElement>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Follower / Following Stats state
  const [followStats, setFollowStats] = useState<FollowStats>({ followersCount: 0, followingCount: 0 });

  // Settings State & Language Context
  const { language, setLanguage } = useLanguage();
  const { isDarkMode, toggleTheme: toggleThemeMode } = useTheme();
  const [showLangModal, setShowLangModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showBlockedUsersModal, setShowBlockedUsersModal] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);

  const [chatNotifs, setChatNotifs] = useState(() => localStorage.getItem("notif_chat_messages") !== "false");
  const [promoNotifs, setPromoNotifs] = useState(() => localStorage.getItem("notif_promotions") !== "false");

  // Blocked users state
  interface BlockedUserItem {
    id: string;
    name: string;
    phone?: string;
    blockedAt?: string;
  }

  const [blockedUsers, setBlockedUsers] = useState<BlockedUserItem[]>(() => {
    try {
      const saved = localStorage.getItem("autoparts_blocked_users");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse blocked users", e);
    }
    return [];
  });

  // Sync saved location on mount if not available in currentUser
  useEffect(() => {
    try {
      const savedLoc = localStorage.getItem("autoparts_default_location");
      if (savedLoc) {
        const parsed = JSON.parse(savedLoc);
        if (parsed.state && !editState) setEditState(parsed.state);
        if (parsed.district && !editDistrict) setEditDistrict(parsed.district);
        if (parsed.lat && !editLat) setEditLat(parsed.lat);
        if (parsed.lng && !editLng) setEditLng(parsed.lng);
      }
    } catch (e) {
      console.error("Failed to load default location", e);
    }
  }, []);

  const toggleChatNotifs = () => {
    const next = !chatNotifs;
    setChatNotifs(next);
    localStorage.setItem("notif_chat_messages", String(next));
  };

  const togglePromoNotifs = () => {
    const next = !promoNotifs;
    setPromoNotifs(next);
    localStorage.setItem("notif_promotions", String(next));
  };

  const handleSaveLocationSetting = () => {
    const locData = {
      state: editState,
      district: editDistrict,
      lat: editLat,
      lng: editLng
    };
    localStorage.setItem("autoparts_default_location", JSON.stringify(locData));

    if (onUpdateUser) {
      onUpdateUser({
        ...currentUser,
        ...locData
      });
    }
    setShowLocationModal(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleUnblockUser = (userId: string) => {
    const updated = blockedUsers.filter(u => u.id !== userId);
    setBlockedUsers(updated);
    localStorage.setItem("autoparts_blocked_users", JSON.stringify(updated));
  };

  const handleAddSampleBlockedUser = () => {
    const sampleNames = ["Spam Spares Vendor", "Unauthorized Buyer", "Market Scraper", "Telemarketer"];
    const randomName = sampleNames[Math.floor(Math.random() * sampleNames.length)];
    const sample: BlockedUserItem = {
      id: `blocked_${Date.now()}`,
      name: randomName,
      phone: `+91 ${Math.floor(6000000000 + Math.random() * 3999999999)}`,
      blockedAt: new Date().toLocaleDateString("en-IN")
    };
    const updated = [...blockedUsers, sample];
    setBlockedUsers(updated);
    localStorage.setItem("autoparts_blocked_users", JSON.stringify(updated));
  };

  // Privacy confirm state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Real-time Firestore user parts & toast states
  const [realUserParts, setRealUserParts] = useState<SparePart[]>([]);
  const [showUpdateToast, setShowUpdateToast] = useState(false);

  // Seller ratings and reviews for logged-in user
  const [userReviews, setUserReviews] = useState<any[]>([]);
  const [userRating, setUserRating] = useState<{ average: number; count: number } | null>(null);

  // App Update System state
  const [appVersionConfig, setAppVersionConfig] = useState<AppVersionConfig | null>(null);
  const [checkingVersion, setCheckingVersion] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(() => localStorage.getItem("app_version_last_checked") || null);
  const [versionStatusMessage, setVersionStatusMessage] = useState<string | null>(null);

  const handleCheckForUpdates = async () => {
    setCheckingVersion(true);
    setVersionStatusMessage(`Checking for updates... You are using the latest version v${CURRENT_APP_VERSION}`);
    setShowUpdateToast(true);
    try {
      const config = await fetchAppVersionConfig();
      setAppVersionConfig(config);
      const nowStr = new Date().toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
      setLastChecked(nowStr);
      localStorage.setItem("app_version_last_checked", nowStr);

      const comp = compareVersions(CURRENT_APP_VERSION, config.latestVersion);
      if (comp >= 0) {
        setVersionStatusMessage(`Checking for updates... You are using the latest version v${CURRENT_APP_VERSION}`);
      } else {
        setVersionStatusMessage(`New update v${config.latestVersion} is available!`);
      }
    } catch (e) {
      console.error("Error checking for app updates:", e);
      setVersionStatusMessage(`Checking for updates... You are using the latest version v${CURRENT_APP_VERSION}`);
    } finally {
      setCheckingVersion(false);
      setTimeout(() => {
        setShowUpdateToast(false);
      }, 4000);
    }
  };

  useEffect(() => {
    const activeUid = auth?.currentUser?.uid || currentUser.uid || currentUser.id;
    if (!activeUid) return;

    const unsubListings = subscribeToUserListings(activeUid, (userParts) => {
      setRealUserParts(userParts);
    });

    const unsubReviews = subscribeToSellerReviews(activeUid, (data) => {
      setUserReviews(data);
      const count = data.length;
      const average = count > 0 
        ? parseFloat((data.reduce((sum, r) => sum + r.rating, 0) / count).toFixed(1))
        : 0;
      setUserRating({ average, count });
    });

    const unsubFollows = subscribeToUserFollowStats(activeUid, (stats) => {
      setFollowStats(stats);
    });

    return () => {
      unsubListings();
      unsubReviews();
      unsubFollows();
    };
  }, [currentUser.id, currentUser.uid]);

  // Sync edits when currentUser changes
  useEffect(() => {
    setEditName(currentUser.name || currentUser.displayName || "");
    setEditPhone(currentUser.phone || "");
    setEditState(currentUser.state || "");
    setEditDistrict(currentUser.district || "");
    setEditLat(currentUser.lat);
    setEditLng(currentUser.lng);
    setPreviewPhotoUrl(currentUser.photoURL || currentUser.profilePhoto || "");
  }, [currentUser]);

  const formatMemberSince = (createdAt?: string | number) => {
    if (!createdAt) return "Member since Aug 2024";
    try {
      const date = new Date(createdAt);
      if (isNaN(date.getTime())) return "Member since Aug 2024";
      const month = date.toLocaleString("en-US", { month: "short" });
      const year = date.getFullYear();
      return `Member since ${month} ${year}`;
    } catch {
      return "Member since Aug 2024";
    }
  };

  const processAndUploadNewPhoto = async (dataUrl: string) => {
    setIsUploadingPhoto(true);
    setUploadPhotoError(null);

    try {
      // 1. If user already has a photoURL saved (existing picture), first call Cloudinary delete API (Destroy) to remove old image
      const existingPhotoUrl = previewPhotoUrl || currentUser.photoURL || currentUser.profilePhoto;
      if (existingPhotoUrl && existingPhotoUrl.includes("cloudinary.com")) {
        try {
          console.log("[Profile Photo] Calling Cloudinary delete API for old photo before upload:", existingPhotoUrl);
          await deleteImagesFromCloudinary([existingPhotoUrl]);
        } catch (delErr) {
          console.warn("[Profile Photo] Cloudinary delete warning on old photo:", delErr);
        }
      }

      // 2. Upload new image to Cloudinary using VITE_CLOUDINARY_UPLOAD_PRESET
      const uploadedUrl = await uploadProductImage(dataUrl);

      // 3. Atomically save this URL to Firestore (users/{userId}.photoURL) and Firebase Auth (updateProfile({ photoURL }))
      const activeUid = auth?.currentUser?.uid || currentUser.uid || currentUser.id;
      if (activeUid) {
        await updateUserProfile(activeUid, {
          photoURL: uploadedUrl,
          profilePhoto: uploadedUrl
        });
      }

      // 4. Update UI preview and local user state immediately
      setPreviewPhotoUrl(uploadedUrl);
      if (onUpdateUser) {
        onUpdateUser({
          ...currentUser,
          photoURL: uploadedUrl,
          profilePhoto: uploadedUrl
        });
      }
    } catch (err: any) {
      console.error("Failed to upload profile picture:", err);
      setUploadPhotoError(err?.message || "Failed to upload photo. Please try again.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleTakePhoto = async () => {
    setShowPhotoActionSheet(false);
    setUploadPhotoError(null);

    if (Capacitor.isNativePlatform()) {
      try {
        const perm = await requestCameraPermissionJIT();
        if (!perm.granted) {
          setUploadPhotoError(perm.message || "Camera permission is required.");
          return;
        }
        const image = await CapCamera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
        });
        if (image?.dataUrl) {
          await processAndUploadNewPhoto(image.dataUrl);
        }
      } catch (err: any) {
        if (err?.message !== "User cancelled photos app" && !err?.message?.includes("cancelled")) {
          console.error("Take photo error:", err);
          setUploadPhotoError(err?.message || "Could not take photo.");
        }
      }
    } else {
      fileInputCameraRef.current?.click();
    }
  };

  const handleChooseFromGallery = async () => {
    setShowPhotoActionSheet(false);
    setUploadPhotoError(null);

    if (Capacitor.isNativePlatform()) {
      try {
        const image = await CapCamera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos,
        });
        if (image?.dataUrl) {
          await processAndUploadNewPhoto(image.dataUrl);
        }
      } catch (err: any) {
        if (err?.message !== "User cancelled photos app" && !err?.message?.includes("cancelled")) {
          console.error("Gallery pick error:", err);
          setUploadPhotoError(err?.message || "Could not choose photo from gallery.");
        }
      }
    } else {
      fileInputGalleryRef.current?.click();
    }
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

      await processAndUploadNewPhoto(dataUrl);
    } catch (err: any) {
      console.error("Failed to read file:", err);
      setUploadPhotoError("Could not read selected image file.");
    } finally {
      if (e.target) e.target.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    setShowPhotoActionSheet(false);
    setUploadPhotoError(null);

    const existingPhotoUrl = previewPhotoUrl || currentUser.photoURL || currentUser.profilePhoto;
    if (existingPhotoUrl && existingPhotoUrl.includes("cloudinary.com")) {
      setIsUploadingPhoto(true);
      try {
        console.log("[Profile Photo] Deleting photo from Cloudinary:", existingPhotoUrl);
        await deleteImagesFromCloudinary([existingPhotoUrl]);
      } catch (delErr) {
        console.warn("[Profile Photo] Failed to delete Cloudinary photo:", delErr);
      } finally {
        setIsUploadingPhoto(false);
      }
    }

    // Explicitly update Firestore users/{userId}.photoURL to null and Firebase Auth updateProfile({ photoURL: "" })
    const activeUid = auth?.currentUser?.uid || currentUser.uid || currentUser.id;
    if (activeUid) {
      try {
        await updateUserProfile(activeUid, {
          photoURL: null as any,
          profilePhoto: null as any
        });
      } catch (e) {
        console.warn("Failed to delete user profile photo in Firestore/Auth:", e);
      }
    }

    // Set UI preview and local state back to default initial avatar circle ("M" or initial letter)
    setPreviewPhotoUrl("");
    if (onUpdateUser) {
      onUpdateUser({
        ...currentUser,
        photoURL: "",
        profilePhoto: ""
      });
    }
  };

  // Filter user listings strictly by userId/sellerId & merge Firestore real-time data
  const activeUid = auth?.currentUser?.uid || currentUser.uid || currentUser.id;
  const propsMyParts = parts.filter(p => 
    (p.userId && p.userId === activeUid) || 
    (p.sellerId && p.sellerId === activeUid) ||
    (p.userId && p.userId === currentUser.id) ||
    (p.sellerId && p.sellerId === currentUser.id)
  );

  const combinedMyPartsMap = new Map<string, SparePart>();
  realUserParts.forEach(p => combinedMyPartsMap.set(p.id, p));
  propsMyParts.forEach(p => {
    if (!combinedMyPartsMap.has(p.id)) {
      combinedMyPartsMap.set(p.id, p);
    }
  });
  const myParts = Array.from(combinedMyPartsMap.values());
  const favParts = parts.filter(p => favorites.includes(p.id));

  // Cascading Location Helpers for Editing Profile Default Location
  const availableDistricts = editState 
    ? INDIAN_STATES_AND_DISTRICTS.find(s => s.state === editState)?.districts || [] 
    : [];

  const handleLogoutClick = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      onLogout("Logged out successfully. Select a Google account to sign in.");
    } catch (e) {
      console.error("Logout failed", e);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleDeleteListing = async (id: string) => {
    setIsDeletingId(id);
    setDeleteError(null);
    setDeleteSuccess(null);
    try {
      const ok = await deleteSparePartListing(id);
      if (ok) {
        onPartDeleted(id);
        setDeleteSuccess("Listing permanently deleted from everywhere.");
        setTimeout(() => setDeleteSuccess(null), 4000);
      } else {
        setDeleteError("Failed to delete listing.");
      }
    } catch (e: any) {
      console.error("Delete failed", e);
      setDeleteError(e.message || String(e));
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleSaveListingChanges = async (partId: string, updates: Partial<SparePart>) => {
    try {
      await updateSparePartListing(partId, updates);
    } catch (e) {
      console.error("Save listing changes failed:", e);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    setIsSavingProfile(true);
    try {
      let finalPhotoUrl = previewPhotoUrl || "";

      if (finalPhotoUrl && (finalPhotoUrl.startsWith("data:") || finalPhotoUrl.startsWith("blob:"))) {
        finalPhotoUrl = await uploadProductImage(finalPhotoUrl);
      }

      const activeUid = auth?.currentUser?.uid || currentUser.uid || currentUser.id;

      await updateUserProfile(activeUid, {
        name: editName.trim(),
        displayName: editName.trim(),
        email: currentUser.email || "",
        phone: editPhone.trim(),
        phoneNumber: editPhone.trim(),
        photoURL: finalPhotoUrl,
        profilePhoto: finalPhotoUrl
      });

      if (onUpdateUser) {
        onUpdateUser({
          ...currentUser,
          name: editName.trim(),
          displayName: editName.trim(),
          email: currentUser.email || "",
          phone: editPhone.trim(),
          phoneNumber: editPhone.trim(),
          photoURL: finalPhotoUrl,
          profilePhoto: finalPhotoUrl
        });
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setActiveSubScreen("view_profile");
      }, 1200);
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveChanges = handleSaveProfile;

  const handleDeleteAccountConfirm = async () => {
    try {
      const activeUid = auth?.currentUser?.uid || currentUser.uid || currentUser.id;
      await deleteFullUserAccount(activeUid);
      onLogout("Your account and associated Firestore listings have been deleted successfully.");
    } catch (err) {
      console.error("Error deleting account", err);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 text-slate-900 h-full overflow-hidden relative" id="profile-screen-container">
      
      {/* Toast Notification */}
      {showUpdateToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-fade-in max-w-xs sm:max-w-md w-full mx-4" id="update-status-toast">
          <Sparkles size={16} className="text-amber-400 shrink-0" />
          <span className="flex-1">{versionStatusMessage || `Checking for updates... You are using the latest version v${CURRENT_APP_VERSION}`}</span>
          <button onClick={() => setShowUpdateToast(false)} className="text-slate-400 hover:text-white cursor-pointer p-0.5">
            <X size={14} />
          </button>
        </div>
      )}
      
      {/* 1. MAIN OPTIONS MENU SCREEN (OLX Layout) */}
      {activeSubScreen === "menu" && (
        <div className="flex-1 flex flex-col overflow-y-auto min-h-0 animate-fade-in overflow-x-hidden" id="profile-main-menu">
          {/* Top Header Card - OLX Style */}
          <div className="bg-[#0B1220] text-white px-4 py-5 relative shadow-md border-b border-[#18233C]" id="profile-header-olx">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                {(() => {
                  const photoUrl = currentUser?.photoURL || currentUser?.profilePhoto || "";
                  const hasPhoto = Boolean(photoUrl && photoUrl.trim() !== "");
                  const initialLetter = (currentUser?.name || currentUser?.displayName || "M").trim().charAt(0).toUpperCase() || "M";

                  return (
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-[#f3f4f6] border-2 border-blue-500/40 shrink-0 shadow-md flex items-center justify-center font-black text-slate-700 text-xl uppercase relative">
                      <div className="w-full h-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center font-black text-white text-lg rounded-full">
                        {initialLetter}
                      </div>
                      {hasPhoto && (
                        <img 
                          src={photoUrl} 
                          alt={currentUser?.name || "Profile"} 
                          className="w-full h-full object-cover rounded-full absolute inset-0"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      )}
                    </div>
                  );
                })()}

                <div className="min-w-0">
                  <h2 className="text-base font-extrabold tracking-tight truncate text-white">
                    {currentUser.name || currentUser.displayName || "Auto Parts Seller"}
                  </h2>
                  <p className="text-[10px] text-slate-300 font-bold mt-0.5 flex items-center gap-1">
                    <ShieldCheck size={11} className="text-emerald-400 shrink-0" />
                    <span>Verified Account</span>
                  </p>
                </div>
              </div>

              {/* Prominent View & Edit Profile Button */}
              <button
                onClick={() => setActiveSubScreen("view_profile")}
                className="bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-extrabold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-all shrink-0 cursor-pointer"
                id="header-view-edit-profile-btn"
              >
                <UserIcon size={14} />
                <span>View & Edit Profile</span>
              </button>
            </div>
          </div>

          {/* Account Options Navigation List */}
          <div className="p-3 space-y-2.5 max-w-2xl mx-auto w-full pb-24">
            <h3 className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest pl-1">
              Account Settings
            </h3>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(11,18,32,0.04)] overflow-hidden divide-y divide-slate-100">
              
              {/* Super Admin Control Center */}
              {currentUser.email === "wwwautoparts2@gmail.com" && onOpenAdminDashboard && (
                <button
                  onClick={onOpenAdminDashboard}
                  className="w-full flex items-center justify-between p-4 bg-amber-500/5 hover:bg-amber-500/10 transition-colors text-left cursor-pointer"
                  id="menu-opt-admin-dashboard"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="p-2.5 bg-amber-100 text-amber-600 rounded-xl animate-pulse">
                      <ShieldAlert size={18} />
                    </span>
                    <div>
                      <h4 className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                        Super Admin Panel
                        <span className="bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                          Active
                        </span>
                      </h4>
                      <p className="text-[10px] text-amber-700 mt-0.5 font-bold">Manage Users, Listings, Categories & Announcements</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-amber-500" />
                </button>
              )}

              {/* View & Edit Public Profile Option */}
              <button
                onClick={() => setActiveSubScreen("view_profile")}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                id="menu-opt-view-profile"
              >
                <div className="flex items-center gap-3.5">
                  <span className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                    <UserIcon size={18} />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">View & Edit Profile</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">View public profile page & edit photo or display name</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </button>
              <button
                onClick={() => {
                  if (onTabChange) {
                    onTabChange("myads");
                  } else {
                    setActiveSubScreen("my_listings");
                  }
                }}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                id="menu-opt-my-listings"
              >
                <div className="flex items-center gap-3.5">
                  <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                    <Tag size={18} />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">My Listings / My Ads</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Manage uploaded spare parts & Mark as Sold</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-xs">
                    {myParts.length}
                  </span>
                  <ChevronRight size={16} className="text-slate-400" />
                </div>
              </button>

              {/* My Seller Reviews Option */}
              <button
                onClick={() => setActiveSubScreen("my_reviews")}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                id="menu-opt-my-reviews"
              >
                <div className="flex items-center gap-3.5">
                  <span className="p-2.5 bg-amber-50 text-amber-500 rounded-2xl">
                    <Star size={18} />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">My Seller Ratings / Reviews</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">View comments and 1-5 star ratings from buyers</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {userRating && userRating.count > 0 ? (
                    <span className="bg-amber-500 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full font-mono flex items-center gap-0.5 shadow-xs">
                      {userRating.average} <Star size={9} fill="currentColor" />
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400">0 Reviews</span>
                  )}
                  <ChevronRight size={16} className="text-slate-400" />
                </div>
              </button>

              {/* Saved Option */}
              <button
                onClick={() => setActiveSubScreen("saved")}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                id="menu-opt-favorites"
              >
                <div className="flex items-center gap-3.5">
                  <span className="p-2.5 bg-rose-50 text-rose-500 rounded-2xl">
                    <Heart size={18} />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Saved / Favorites</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Your bookmarked automobile spare parts</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="bg-rose-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-xs">
                    {favParts.length}
                  </span>
                  <ChevronRight size={16} className="text-slate-400" />
                </div>
              </button>

              {/* Dedicated Settings Page Option */}
              <button
                onClick={() => setActiveSubScreen("settings")}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                id="menu-opt-settings"
              >
                <div className="flex items-center gap-3.5">
                  <span className="p-2.5 bg-[#0F172A] text-white rounded-2xl shadow-xs">
                    <Settings size={18} />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Settings</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">App language, theme, default location & notifications</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </button>

              {/* Privacy Option */}
              <button
                onClick={() => setActiveSubScreen("privacy")}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                id="menu-opt-privacy"
              >
                <div className="flex items-center gap-3.5">
                  <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                    <Lock size={18} />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Privacy & Security</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Manage data guidelines and delete account</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </button>

              {/* Help & Support Option */}
              <button
                onClick={() => setActiveSubScreen("support")}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                id="menu-opt-support"
              >
                <div className="flex items-center gap-3.5">
                  <span className="p-2.5 bg-sky-50 text-sky-600 rounded-2xl">
                    <HelpCircle size={18} />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Help & Support</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Get direct help, support emails & FAQs</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </button>

              {/* About Option */}
              <button
                onClick={() => setActiveSubScreen("about")}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                id="menu-opt-about"
              >
                <div className="flex items-center gap-3.5">
                  <span className="p-2.5 bg-slate-100 text-slate-700 rounded-2xl">
                    <Info size={18} />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">About Auto Parts India</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">App details and version v{CURRENT_APP_VERSION}</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </button>

              {/* Check for Updates Option */}
              <button
                onClick={() => {
                  setActiveSubScreen("app_update");
                  handleCheckForUpdates();
                }}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left cursor-pointer border-t border-slate-100"
                id="menu-opt-check-updates"
              >
                <div className="flex items-center gap-3.5">
                  <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                    <Sparkles size={18} />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Check for Updates</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">App version check & release notes</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full font-mono">
                    v{CURRENT_APP_VERSION}
                  </span>
                  <ChevronRight size={16} className="text-slate-400" />
                </div>
              </button>

            </div>

            {/* Logout Action Area */}
            <div className="pt-4">
              <button
                onClick={handleLogoutClick}
                disabled={isLoggingOut}
                className="w-full flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100/80 text-rose-600 font-extrabold py-3.5 rounded-2xl text-xs transition-all active:scale-[0.98] border border-rose-200/80 cursor-pointer disabled:opacity-50 shadow-xs"
                id="btn-logout-main"
              >
                <LogOut size={16} />
                {isLoggingOut ? "Signing Out..." : "Log Out Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. VIEW PROFILE SUBSCREEN (Public/User View) */}
      {activeSubScreen === "view_profile" && (
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-y-auto animate-fade-in bg-slate-50" id="profile-sub-view-profile">
          {/* Sub Header */}
          <div className="bg-[#0F172A] text-white px-4 py-3.5 flex items-center justify-between sticky top-0 z-20 shadow-md border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveSubScreen("menu")}
                className="p-1.5 hover:bg-slate-800 text-slate-200 rounded-xl transition-all cursor-pointer"
                id="btn-view-profile-back"
              >
                <ArrowLeft size={18} />
              </button>
              <h2 className="text-sm font-extrabold tracking-tight">View Profile</h2>
            </div>
          </div>

          <div className="p-4 space-y-4 max-w-4xl mx-auto w-full pb-28">
            {/* Profile Header Box */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(11,18,32,0.04)] flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {(() => {
                  const photoUrl = currentUser?.photoURL || currentUser?.profilePhoto || "";
                  const hasPhoto = Boolean(photoUrl && photoUrl.trim() !== "");
                  const initialLetter = (currentUser?.name || currentUser?.displayName || "M").trim().charAt(0).toUpperCase() || "M";

                  return (
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-[#f3f4f6] border-2 border-slate-200 shrink-0 shadow-sm flex items-center justify-center font-black text-slate-700 text-2xl uppercase relative">
                      <div className="w-full h-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center font-black text-white text-2xl rounded-full">
                        {initialLetter}
                      </div>
                      {hasPhoto && (
                        <img 
                          src={photoUrl} 
                          alt={currentUser?.name || "Profile"} 
                          className="w-full h-full object-cover rounded-full absolute inset-0"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      )}
                    </div>
                  );
                })()}

                <div>
                  <h2 className="text-lg font-black text-slate-900 leading-tight">
                    {currentUser.name || currentUser.displayName || "Auto Parts Seller"}
                  </h2>
                  <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center justify-center sm:justify-start gap-1">
                    <Calendar size={13} className="text-slate-400 shrink-0" />
                    <span>{formatMemberSince(currentUser.createdAt)}</span>
                  </p>

                  {/* Real-Time Followers / Following Stats */}
                  <div className="flex items-center justify-center sm:justify-start gap-3 mt-2 text-xs font-bold text-slate-700" id="profile-follow-stats">
                    <div className="flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200/60 shadow-2xs">
                      <span className="font-black text-slate-900">{followStats.followersCount}</span>
                      <span className="text-slate-500 font-semibold">Followers</span>
                    </div>
                    <span className="text-slate-300 font-bold">•</span>
                    <div className="flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200/60 shadow-2xs">
                      <span className="font-black text-slate-900">{followStats.followingCount}</span>
                      <span className="text-slate-500 font-semibold">Following</span>
                    </div>
                  </div>

                  {userRating && userRating.count > 0 && (
                    <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200/80 px-2.5 py-0.5 rounded-full text-[10px] font-bold mt-2">
                      <Star size={11} className="fill-amber-400 text-amber-400" />
                      <span>{userRating.average} ({userRating.count} Reviews)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Prominent Blue Edit Profile Button */}
              <button
                onClick={() => setActiveSubScreen("edit_profile")}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-black text-xs px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                id="btn-view-profile-to-edit"
              >
                <UserIcon size={15} />
                <span>Edit Profile</span>
              </button>
            </div>

            {/* User Listings Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <span>User Listings</span>
                  <span className="bg-slate-200 text-slate-800 text-[10px] px-2 py-0.5 rounded-full font-mono font-extrabold">
                    {myParts.length}
                  </span>
                </h3>
                {myParts.length > 0 && (
                  <button
                    onClick={() => {
                      if (onTabChange) onTabChange("sell");
                    }}
                    className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Post New Ad</span>
                  </button>
                )}
              </div>

              {/* Grid View of User Listings */}
              {myParts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {myParts.map((part) => (
                    <div
                      key={part.id}
                      onClick={() => {
                        if (onViewPart) {
                          onViewPart(part);
                        } else {
                          setEditingPart(part);
                        }
                      }}
                      className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden hover:border-slate-300 transition-all cursor-pointer flex flex-col group relative"
                    >
                      <div className="aspect-4/3 w-full bg-slate-100 relative overflow-hidden">
                        <img
                          src={part.imageUrl || part.imageUrls?.[0] || "https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&q=80&w=400"}
                          alt={part.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {part.sold && (
                          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-[1px] flex items-center justify-center">
                            <span className="bg-rose-600 text-white text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider">
                              SOLD
                            </span>
                          </div>
                        )}
                        <span className={`absolute top-2 left-2 text-[8px] font-extrabold px-2 py-0.5 rounded-md uppercase shadow-xs ${
                          part.sold ? "bg-slate-800 text-white" : "bg-emerald-600 text-white"
                        }`}>
                          {part.sold ? "Sold Out" : "Active"}
                        </span>
                      </div>

                      <div className="p-2.5 flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-xs font-black text-slate-900 block font-mono">
                            ₹{part.price.toLocaleString("en-IN")}
                          </span>
                          <h4 className="text-[11px] font-bold text-slate-800 line-clamp-1 mt-0.5">
                            {part.title}
                          </h4>
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400 font-medium">
                          <span className="truncate max-w-[100px]">
                            {formatLocationName(part)}
                          </span>
                          <ChevronRight size={12} className="text-slate-300" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Empty State Illustration */
                <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center flex flex-col items-center justify-center space-y-3 shadow-xs my-2">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-1">
                    <Package size={32} />
                  </div>
                  <div className="max-w-xs mx-auto space-y-1">
                    <h4 className="text-sm font-black text-slate-800">You haven't listed anything yet</h4>
                    <p className="text-xs text-slate-500 font-medium">Post an ad to sell your automotive spare parts to buyers across India.</p>
                  </div>
                  <button
                    onClick={() => {
                      if (onTabChange) onTabChange("sell");
                    }}
                    className="bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white font-extrabold text-xs px-6 py-3 rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer mt-2"
                    id="btn-start-selling-empty"
                  >
                    <Plus size={16} />
                    <span>Start Selling</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. EDIT PROFILE SUBSCREEN (Clean & Minimal) */}
      {(activeSubScreen === "edit_profile" || activeSubScreen === "personal_info") && (
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-y-auto animate-fade-in bg-slate-50" id="profile-sub-edit-profile">
          {/* Sub Header */}
          <div className="bg-[#0F172A] text-white px-4 py-3.5 flex items-center justify-between sticky top-0 z-20 shadow-md border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveSubScreen("view_profile")}
                className="p-1.5 hover:bg-slate-800 text-slate-200 rounded-xl transition-all cursor-pointer"
                id="btn-edit-profile-back"
              >
                <ArrowLeft size={18} />
              </button>
              <h2 className="text-sm font-extrabold tracking-tight">Edit Profile</h2>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="p-4 space-y-5 max-w-lg mx-auto w-full pb-28">
            {saveSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-fade-in">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span>Profile updated successfully!</span>
              </div>
            )}

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(11,18,32,0.04)] space-y-6">
              
              {/* 1. Profile Picture Field */}
              <div className="flex flex-col items-center justify-center text-center space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  Profile Picture
                </label>
                
                {(() => {
                  const photoUrl = previewPhotoUrl || currentUser?.photoURL || currentUser?.profilePhoto || "";
                  const hasPhoto = Boolean(photoUrl && photoUrl.trim() !== "");
                  const initialLetter = (editName || currentUser?.name || currentUser?.displayName || "M").trim().charAt(0).toUpperCase() || "M";

                  return (
                    <div 
                      onClick={() => !isUploadingPhoto && setShowPhotoActionSheet(true)}
                      className="relative w-28 h-28 rounded-full cursor-pointer group shrink-0"
                      id="avatar-upload-trigger"
                    >
                      <div className="w-full h-full rounded-full overflow-hidden bg-[#f3f4f6] border-2 border-indigo-500/30 shadow-md flex items-center justify-center font-black text-slate-700 text-3xl uppercase transition-all group-hover:opacity-90 relative">
                        {isUploadingPhoto ? (
                          <div className="w-full h-full bg-slate-900/80 flex flex-col items-center justify-center text-white gap-1 rounded-full z-10">
                            <Loader2 size={24} className="animate-spin text-blue-400" />
                            <span className="text-[9px] font-extrabold tracking-wide">Processing...</span>
                          </div>
                        ) : (
                          <>
                            <div className="w-full h-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center font-black text-white text-3xl rounded-full">
                              {initialLetter}
                            </div>
                            {hasPhoto && (
                              <img 
                                src={photoUrl} 
                                alt="Profile Avatar" 
                                className="w-full h-full object-cover rounded-full absolute inset-0"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            )}
                          </>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isUploadingPhoto) setShowPhotoActionSheet(true);
                        }}
                        className="absolute bottom-0 right-0 p-2.5 bg-blue-600 text-white rounded-full shadow-lg border-2 border-white group-hover:bg-blue-700 transition-colors cursor-pointer z-20"
                        id="btn-avatar-camera-trigger"
                      >
                        {isUploadingPhoto ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                      </button>
                    </div>
                  );
                })()}

                {/* Hidden File Inputs for Web Browser Fallbacks */}
                <input 
                  type="file"
                  ref={fileInputGalleryRef}
                  accept="image/*"
                  onChange={handlePhotoFileChange}
                  className="hidden"
                  id="input-profile-photo-gallery"
                />
                <input 
                  type="file"
                  ref={fileInputCameraRef}
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoFileChange}
                  className="hidden"
                  id="input-profile-photo-camera"
                />

                {uploadPhotoError && (
                  <p className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
                    {uploadPhotoError}
                  </p>
                )}

                <p className="text-[10px] font-bold text-slate-400">
                  Tap avatar circle or camera icon for photo options
                </p>
              </div>

              {/* 2. Profile Name Field */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  Profile Name *
                </label>
                <div className="relative">
                  <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Your full display name"
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl py-3 pl-10 pr-3 text-xs font-bold text-slate-900 focus:outline-none transition-all"
                    required
                    id="input-edit-profile-name"
                  />
                </div>
              </div>

            </div>

            <button
              type="submit"
              disabled={isSavingProfile}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-blue-200 transition-all cursor-pointer flex items-center justify-center gap-2"
              id="btn-save-profile-changes"
            >
              {isSavingProfile ? (
                <>
                  <Loader2 size={16} className="animate-spin text-white" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </form>
        </div>
      )}





      {/* 3. MY LISTINGS / MY ADS SCREEN */}
      {activeSubScreen === "my_listings" && (() => {
        const now = Date.now();
        const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
        
        const activeMyParts = myParts.filter(p => p.sold !== true && (now - p.createdAt) <= ninetyDaysMs);
        const soldMyParts = myParts.filter(p => p.sold === true);
        const expiredMyParts = myParts.filter(p => p.sold !== true && (now - p.createdAt) > ninetyDaysMs);

        const currentTabParts = myAdsTab === "active" 
          ? activeMyParts 
          : myAdsTab === "sold" 
            ? soldMyParts 
            : expiredMyParts;

        const formatExpiredDate = (createdAt: number) => {
          const expiredAt = createdAt + ninetyDaysMs;
          return new Date(expiredAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric"
          });
        };

        return (
          <div className="flex-1 flex flex-col animate-fade-in bg-slate-50 animate-fade-in" id="profile-sub-my-listings">
            {/* Sub Header & Segmented Tabs */}
            <div className="bg-white border-b border-slate-100 sticky top-0 z-10 shrink-0">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-50">
                {activeTab !== "myads" && (
                  <button
                    onClick={() => {
                      setActiveSubScreen("menu");
                      setDeleteError(null);
                    }}
                    className="p-1.5 hover:bg-slate-50 text-slate-700 rounded-xl transition-all"
                    id="back-btn-my-listings"
                  >
                    <ArrowLeft size={16} />
                  </button>
                )}
                <h2 className="text-sm font-extrabold text-slate-800">My Listings / My Ads</h2>
              </div>
              
              <div className="flex px-4 py-2 gap-1.5 bg-slate-50/50">
                {(["active", "sold", "expired"] as const).map((tab) => {
                  const count = tab === "active" ? activeMyParts.length : tab === "sold" ? soldMyParts.length : expiredMyParts.length;
                  return (
                    <button
                      key={tab}
                      onClick={() => setMyAdsTab(tab)}
                      className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                        myAdsTab === tab
                          ? "bg-slate-900 border-slate-900 text-white shadow-sm font-extrabold"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                      id={`tab-btn-${tab}`}
                    >
                      <span>{tab}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black ${
                        myAdsTab === tab ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
              
              {deleteSuccess && (
                <div className="mx-4 my-2 p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-xs text-emerald-700 flex items-start gap-2 animate-fade-in" id="delete-success-banner">
                  <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-600" />
                  <div className="flex-1">
                    <p className="font-bold">Success</p>
                    <p className="text-[11px] mt-0.5">{deleteSuccess}</p>
                  </div>
                  <button 
                    onClick={() => setDeleteSuccess(null)}
                    className="text-emerald-400 hover:text-emerald-600 font-bold px-1"
                  >
                    ×
                  </button>
                </div>
              )}

              {deleteError && (
                <div className="mx-4 my-2 p-3 bg-rose-50 border border-rose-100 rounded-2xl text-xs text-rose-600 flex items-start gap-2 animate-fade-in" id="delete-error-banner">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold">Deletion Failed</p>
                    <p className="text-[11px] mt-0.5">{deleteError}</p>
                  </div>
                  <button 
                    onClick={() => setDeleteError(null)}
                    className="text-rose-400 hover:text-rose-600 font-bold px-1"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            {/* Scrollable Ads List */}
            <div className="p-4 space-y-3.5 flex-1 pb-16 overflow-y-auto">
              {currentTabParts.length === 0 ? (
                <div className="text-center py-16 px-6 bg-white rounded-3xl border border-slate-100 shadow-sm mt-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3.5 text-slate-400">
                    <Tag size={20} />
                  </div>
                  <h4 className="text-xs font-bold text-slate-700">No {myAdsTab} Ads</h4>
                  <p className="text-[10px] text-slate-400 mt-1.5 max-w-[200px] mx-auto leading-relaxed">
                    {myAdsTab === "active" 
                      ? "You do not have any active advertisements. Post high-quality ads to reach potential buyers." 
                      : myAdsTab === "sold" 
                        ? "You have not marked any automobile parts as sold yet." 
                        : "No expired ads. Every listing is valid and active for 90 days."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentTabParts.map((part, idx) => (
                    <div
                      key={`${part.id}-${idx}`}
                      className="bg-white p-3 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3 relative hover:border-slate-200 transition-all"
                      id={`manage-part-${part.id}`}
                    >
                      <div 
                        onClick={() => onViewPart && onViewPart(part)}
                        className="flex gap-3 cursor-pointer"
                      >
                        <div className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-slate-50">
                          <img
                            src={part.imageUrl}
                            alt={part.title}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain p-0.5 bg-slate-900"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=300&auto=format&fit=crop&q=60";
                            }}
                          />
                          {part.sold && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <span className="text-[9px] font-black tracking-widest text-white bg-rose-600 px-1.5 py-0.5 rounded uppercase">
                                SOLD
                              </span>
                            </div>
                          )}
                          {myAdsTab === "expired" && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <span className="text-[9px] font-black tracking-widest text-white bg-amber-600 px-1.5 py-0.5 rounded uppercase">
                                EXPIRED
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 py-0.5 flex flex-col justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-slate-800 truncate">
                              {part.title}
                            </h4>
                            <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wide mt-0.5">
                              {part.carBrand} · {part.carModel}
                            </p>
                            {myAdsTab === "expired" && (
                              <p className="text-[9px] font-mono text-amber-600 font-extrabold mt-1 uppercase">
                                Expired on: {formatExpiredDate(part.createdAt)}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-extrabold text-slate-900 font-mono">
                              {formatPrice(part.price)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {deleteConfirmId === part.id ? (
                        <div className="border-t border-slate-50 pt-2.5 flex flex-col gap-2 w-full animate-fade-in">
                          <p className="text-[10px] font-extrabold text-rose-600 leading-tight">
                            Delete listing permanently from Firestore? This action is irreversible.
                          </p>
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl transition-all"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                handleDeleteListing(part.id);
                                setDeleteConfirmId(null);
                              }}
                              className="bg-rose-600 hover:bg-rose-500 text-white text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl shadow-sm transition-all"
                            >
                              Confirm Delete
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="border-t border-slate-50 pt-2.5 flex items-center justify-between">
                          {myAdsTab === "active" ? (
                            <>
                              <div className="flex gap-2">
                                {/* Edit Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingPart(part);
                                  }}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                                  id={`edit-listing-btn-${part.id}`}
                                >
                                  Edit Ad
                                </button>

                                {/* Mark as Sold Button */}
                                <button
                                  onClick={() => onToggleSold && onToggleSold(part.id)}
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                                  id={`sold-toggle-${part.id}`}
                                >
                                  Mark as Sold
                                </button>
                              </div>

                              {/* Delete button */}
                              <button
                                onClick={() => setDeleteConfirmId(part.id)}
                                disabled={isDeletingId === part.id}
                                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                                id={`delete-listing-${part.id}`}
                                title="Delete Listing"
                              >
                                {isDeletingId === part.id ? (
                                  <span className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin block" />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                              </button>
                            </>
                          ) : (
                            <>
                              <div>
                                {myAdsTab === "sold" ? (
                                  <span className="text-[10px] font-extrabold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                    Sold Section
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-extrabold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                    Expired Ad
                                  </span>
                                )}
                              </div>

                              {/* Delete button (only action for Sold and Expired ads) */}
                              <button
                                onClick={() => setDeleteConfirmId(part.id)}
                                disabled={isDeletingId === part.id}
                                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                                id={`delete-listing-${part.id}`}
                                title="Delete Listing"
                              >
                                {isDeletingId === part.id ? (
                                  <span className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin block" />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}


      {/* 4. SAVED / FAVORITES SCREEN */}
      {activeSubScreen === "saved" && (
        <div className="flex-1 flex flex-col animate-fade-in bg-slate-50" id="profile-sub-favorites">
          {/* Sub Header */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
            <button
              onClick={() => setActiveSubScreen("menu")}
              className="p-1.5 hover:bg-slate-50 text-slate-700 rounded-xl transition-all"
              id="back-btn-favorites"
            >
              <ArrowLeft size={16} />
            </button>
            <h2 className="text-sm font-extrabold text-slate-800">Saved / Favorites</h2>
          </div>

          <div className="p-4 space-y-3 flex-1 pb-16">
            {favParts.length === 0 ? (
              <div className="text-center py-16 px-6 bg-white rounded-3xl border border-slate-100 shadow-sm mt-4">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3.5 text-slate-400">
                  <Heart size={20} />
                </div>
                <h4 className="text-xs font-bold text-slate-700">No Favorites Yet</h4>
                <p className="text-[10px] text-slate-400 mt-1.5 max-w-[200px] mx-auto">
                  Bookmark car parts while browsing the feed by tapping the Heart icon. They will show up here for easy access!
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {favParts.map((part, idx) => (
                  <div
                    key={`${part.id}-${idx}`}
                    onClick={() => onViewPart && onViewPart(part)}
                    className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex gap-3 cursor-pointer hover:border-slate-200 transition-all group relative"
                    id={`favorite-part-${part.id}`}
                  >
                    <div className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-slate-50">
                      <img
                        src={part.imageUrl}
                        alt={part.title}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain p-0.5 bg-slate-900"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=300&auto=format&fit=crop&q=60";
                        }}
                      />
                      {part.sold && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-[8px] font-black tracking-widest text-white bg-rose-600 px-1 py-0.5 rounded uppercase">
                            SOLD
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                          {part.title}
                        </h4>
                        <p className="text-[10px] text-indigo-600 mt-0.5 font-bold uppercase tracking-wide">
                          {part.carBrand} · {part.carModel}
                        </p>
                      </div>
                      <span className="text-xs font-extrabold text-slate-900 font-mono">
                        {formatPrice(part.price)}
                      </span>
                    </div>

                    {/* Quick toggle favorite status */}
                    {onFavoriteToggle && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onFavoriteToggle(part.id);
                        }}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl self-center transition-all active:scale-95 shrink-0"
                        id={`toggle-fav-${part.id}`}
                        title="Remove Bookmark"
                      >
                        <Heart size={15} fill="currentColor" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}


      {/* 5. PRIVACY & SECURITY SCREEN */}
      {activeSubScreen === "privacy" && (
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-y-auto animate-fade-in bg-slate-50" id="profile-sub-privacy">
          {/* Sub Header */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100 sticky top-0 bg-white z-10 shrink-0">
            <button
              onClick={() => setActiveSubScreen("menu")}
              className="p-1.5 hover:bg-slate-50 text-slate-700 rounded-xl transition-all"
              id="back-btn-privacy"
            >
              <ArrowLeft size={16} />
            </button>
            <h2 className="text-sm font-extrabold text-slate-800">Privacy & Security</h2>
          </div>

          <div className="p-4 space-y-4 pb-28">
            {/* Rules */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3.5">
              <h3 className="text-xs font-extrabold text-indigo-600 uppercase tracking-wide flex items-center gap-1.5">
                <ShieldAlert size={14} />
                Core Data Protection
              </h3>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                We believe in total user data sovereignty. Below are the absolute privacy rules of <strong>Auto Parts India</strong>:
              </p>
              <ul className="text-[11px] text-slate-500 space-y-2 list-disc list-inside">
                <li>Your uploaded listings are shown publicly for buyer inquiries.</li>
                <li>Your contact number is only accessible to logged-in verified users.</li>
                <li>No automated scraping or bulk sharing of database lists takes place.</li>
                <li>All sessions and messages are sandboxed to assure peer safety.</li>
              </ul>
            </div>

            {/* Danger Zone */}
            <div className="bg-rose-50/20 border border-rose-100 rounded-3xl p-5 space-y-3">
              <h3 className="text-xs font-black text-rose-600 uppercase tracking-widest flex items-center gap-1.5">
                <Trash2 size={13} />
                Danger Zone
              </h3>
              <p className="text-[10px] text-slate-500">
                Permanently delete your entire workspace profile and all corresponding active automobile spare part listings. This action is irreversible.
              </p>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold py-2.5 rounded-xl transition-colors cursor-pointer"
                  id="btn-delete-account-trigger"
                >
                  Delete Account & Ads
                </button>
              ) : (
                <div className="bg-white border border-rose-200 rounded-2xl p-4 space-y-3 animate-fade-in">
                  <p className="text-[10px] font-bold text-rose-600 leading-tight">
                    Are you absolutely sure? This will delete your Auto Parts India account and remove all your listed spare parts immediately.
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-xl text-[10px] font-bold transition-all"
                      id="btn-delete-cancel"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccountConfirm}
                      className="bg-rose-600 hover:bg-rose-700 text-white py-2 rounded-xl text-[10px] font-bold transition-all"
                      id="btn-delete-confirm"
                    >
                      Confirm Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* 6. HELP & SUPPORT SCREEN */}
      {activeSubScreen === "support" && (
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-y-auto animate-fade-in bg-slate-50" id="profile-sub-support">
          {/* Sub Header */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100 sticky top-0 bg-white z-10 w-full shrink-0">
            <button
              onClick={() => setActiveSubScreen("menu")}
              className="p-1.5 hover:bg-slate-50 text-slate-700 rounded-xl transition-all"
              id="back-btn-support"
            >
              <ArrowLeft size={16} />
            </button>
            <h2 className="text-sm font-extrabold text-slate-800">Help & Support</h2>
          </div>

          {/* Centered Email Support Container */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center pb-28">
            <div className="w-full max-w-sm bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col items-center gap-4">
              <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Mail size={24} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-extrabold text-slate-800">Email Support</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed max-w-[240px] mx-auto">
                  Have questions or need assistance? Reach out to our support team and we will get back to you as soon as possible.
                </p>
              </div>
              
              <a
                href="mailto:wwwautoparts2@gmail.com"
                className="w-full flex items-center justify-center gap-2 p-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-2xl text-xs font-bold shadow-md shadow-indigo-100 transition-all"
                id="email-support-link"
              >
                <span>Contact Support</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}


      {/* 7. ABOUT AUTO PARTS SCREEN */}
      {activeSubScreen === "about" && (
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-y-auto animate-fade-in bg-slate-50" id="profile-sub-about">
          {/* Sub Header */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100 sticky top-0 bg-white z-10 shrink-0">
            <button
              onClick={() => setActiveSubScreen("menu")}
              className="p-1.5 hover:bg-slate-50 text-slate-700 rounded-xl transition-all"
              id="back-btn-about"
            >
              <ArrowLeft size={16} />
            </button>
            <h2 className="text-sm font-extrabold text-slate-800">About Auto Parts India</h2>
          </div>

          <div className="p-5 flex flex-col items-center justify-center text-center space-y-5 pb-28">
            {/* Official Auto Parts India Logo */}
            <BrandLogo size="lg" variant="icon" theme="dark" showTagline={false} className="mt-4" />

            <div className="space-y-1">
              <h3 className="text-base font-black tracking-tight text-slate-900">Auto Parts India</h3>
              <p className="text-[10px] font-mono text-indigo-600 font-extrabold uppercase bg-indigo-50 px-2 py-0.5 rounded-full inline-block border border-indigo-100">
                Version 1.0.0
              </p>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed max-w-[280px]">
              Auto Parts India is India's premium C2C platform dedicated to trading new, used, and scrap car spare parts.
            </p>

            <div className="w-full bg-white rounded-3xl p-5 border border-slate-100 shadow-sm text-left space-y-2">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Platform Core Highlights</h4>
              <ul className="text-[11px] text-slate-500 space-y-1.5 list-disc list-inside">
                <li>Comprehensive car brands & models mapping.</li>
                <li>Cascading locations covering major Indian states.</li>
                <li>Verified local sellers & peer listings.</li>
                <li>Real-time chat and communication.</li>
              </ul>
            </div>

            <p className="text-[9px] text-slate-400 pt-6">
              © 2026 Auto Parts India. All rights reserved. Built with pride for local workshops, mechanics, and car owners.
            </p>
          </div>
        </div>
      )}

      {/* 8. MY SELLER REVIEWS SCREEN */}
      {activeSubScreen === "my_reviews" && (
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-y-auto animate-fade-in bg-slate-50" id="profile-sub-reviews">
          {/* Sub Header */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100 sticky top-0 bg-white z-10 shadow-sm shrink-0">
            <button
              onClick={() => setActiveSubScreen("menu")}
              className="p-1.5 hover:bg-slate-50 text-slate-700 rounded-xl transition-all cursor-pointer"
              id="back-btn-reviews"
            >
              <ArrowLeft size={16} />
            </button>
            <h2 className="text-sm font-extrabold text-slate-800">My Seller Feedback</h2>
          </div>

          <div className="p-4 space-y-4 pb-28">
            {/* Rating Summary Card */}
            {userRating && (
              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                <div className="grid grid-cols-5 gap-4 items-center">
                  <div className="col-span-2 text-center border-r border-slate-100 pr-2">
                    <span className="text-4xl font-black text-slate-900 tracking-tighter block font-mono">
                      {userRating.count > 0 ? userRating.average : "0.0"}
                    </span>
                    <div className="flex items-center justify-center gap-0.5 text-amber-400 mt-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={12}
                          fill={s <= Math.round(userRating.average) && userRating.count > 0 ? "currentColor" : "none"}
                          stroke="currentColor"
                          strokeWidth={1.5}
                        />
                      ))}
                    </div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1.5 block">
                      {userRating.count} {userRating.count === 1 ? "review" : "reviews"}
                    </span>
                  </div>

                  <div className="col-span-3 pl-2">
                    <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase tracking-wider">
                      TRUSTWORTHY SELLER RATING
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                      Your ratings breakdown is computed from verified auto parts buyer feedback. Deliver quality parts to keep it green!
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                Feedbacks From Buyers
              </h4>

              {userReviews.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 border border-slate-100 text-center shadow-sm">
                  <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-3">
                    <MessageSquare size={16} />
                  </div>
                  <h5 className="text-xs font-bold text-slate-700">No Reviews Yet</h5>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] mx-auto">
                    Once buyers purchase parts from you, they can leave feedback about their experience.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userReviews.map((rev) => (
                    <div 
                      key={rev.id} 
                      className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm text-left space-y-2.5 animate-fade-in"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="text-[11px] font-bold text-slate-800 leading-none">{rev.buyerName}</h5>
                          <span className="text-[8px] text-slate-400 font-bold block mt-1 font-mono">
                            BUYER · {new Date(rev.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric"
                            })}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-0.5 text-amber-400">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star 
                              key={s} 
                              size={10} 
                              fill={s <= rev.rating ? "currentColor" : "none"} 
                              stroke="currentColor" 
                              strokeWidth={1.5}
                            />
                          ))}
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                        "{rev.comment}"
                      </p>

                      {rev.partTitle && (
                        <div className="flex items-center gap-1 text-[9px] text-indigo-600 bg-indigo-50/40 px-2 py-1 rounded-lg border border-indigo-100/30 truncate">
                          <Tag size={10} />
                          <span className="font-bold truncate">Item: {rev.partTitle}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 9. CHECK FOR UPDATES SUBSCREEN */}
      {activeSubScreen === "app_update" && (
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-y-auto animate-fade-in bg-slate-50" id="profile-sub-updates">
          {/* Sub Header */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100 sticky top-0 bg-white z-10 shadow-sm shrink-0">
            <button
              onClick={() => setActiveSubScreen("menu")}
              className="p-1.5 hover:bg-slate-50 text-slate-700 rounded-xl transition-all cursor-pointer"
              id="back-btn-updates"
            >
              <ArrowLeft size={16} />
            </button>
            <h2 className="text-sm font-extrabold text-slate-800">Check for Updates</h2>
          </div>

          <div className="p-4 space-y-4 pb-28">
            {/* Main Version Status Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-blue-600 rounded-3xl flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-100">
                <Sparkles size={28} />
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Auto Parts India</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Android APK & Web Version Management</p>
              </div>

              {/* Version Metrics Table (Current, Last Checked, Latest Version) */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100/80 font-mono text-left">
                <div className="p-2 space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block font-sans">Current Version</span>
                  <span className="text-xs font-black text-slate-800 block">v{CURRENT_APP_VERSION}</span>
                </div>
                <div className="p-2 border-x border-slate-200/60 space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block font-sans">Last Checked</span>
                  <span className="text-[10px] font-bold text-slate-600 block truncate">{lastChecked || "Just now"}</span>
                </div>
                <div className="p-2 space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-500 block font-sans">Latest Version</span>
                  <span className="text-xs font-black text-indigo-700 block">
                    {appVersionConfig ? `v${appVersionConfig.latestVersion}` : "v" + CURRENT_APP_VERSION}
                  </span>
                </div>
              </div>

              {/* Version Status Badge / Notification */}
              {versionStatusMessage && (
                <div
                  className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 ${
                    versionStatusMessage.includes("latest")
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200/80"
                      : "bg-indigo-50 text-indigo-800 border-indigo-200/80"
                  }`}
                >
                  {versionStatusMessage.includes("latest") ? (
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  ) : (
                    <Sparkles size={16} className="text-indigo-600 shrink-0" />
                  )}
                  <span>{versionStatusMessage}</span>
                </div>
              )}

              {/* Update details & Release Notes if update available */}
              {appVersionConfig && compareVersions(CURRENT_APP_VERSION, appVersionConfig.latestVersion) < 0 && (
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 text-left space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                    <span>Release Notes (v{appVersionConfig.latestVersion})</span>
                    <span className="text-[10px] font-medium text-slate-500">{appVersionConfig.releaseDate}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-sans whitespace-pre-line">
                    {appVersionConfig.releaseNotes}
                  </p>
                  
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        if (appVersionConfig.apkDownloadUrl) {
                          window.open(appVersionConfig.apkDownloadUrl, "_blank");
                        }
                      }}
                      className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-100 cursor-pointer"
                    >
                      <Download size={15} />
                      <span>Download & Update Now</span>
                      <ArrowUpRight size={14} className="opacity-70" />
                    </button>
                  </div>
                </div>
              )}

              {/* Manual Check Button */}
              <button
                onClick={handleCheckForUpdates}
                disabled={checkingVersion}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={15} className={checkingVersion ? "animate-spin" : ""} />
                <span>{checkingVersion ? "Checking Firestore..." : "Check for Updates Now"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. DEDICATED SETTINGS SCREEN */}
      {activeSubScreen === "settings" && (
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-y-auto animate-fade-in bg-slate-50" id="profile-sub-settings">
          {/* Header with Dark Header Theme (#0F172A) */}
          <div className="bg-[#0F172A] text-white px-4 py-3.5 flex items-center justify-between sticky top-0 z-20 shadow-md border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveSubScreen("menu")}
                className="p-1.5 hover:bg-slate-800 text-slate-200 rounded-xl transition-all cursor-pointer"
                id="btn-settings-back"
              >
                <ArrowLeft size={18} />
              </button>
              <h2 className="text-sm font-extrabold tracking-tight">Settings</h2>
            </div>
          </div>

          <div className="p-3.5 space-y-5 max-w-2xl mx-auto w-full pb-28">
            {/* Section 1: PREFERENCES */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">
                PREFERENCES
              </h3>
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(11,18,32,0.04)] overflow-hidden divide-y divide-slate-100">
                
                {/* App Language */}
                <button
                  onClick={() => setShowLangModal(true)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  id="setting-opt-language"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                      <Globe size={18} />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">App Language</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Select interface language</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                      {language === "ta" ? "தமிழ்" : language === "hi" ? "हिंदी" : "English"}
                    </span>
                    <ChevronRight size={16} className="text-slate-400" />
                  </div>
                </button>

                {/* Theme Mode */}
                <div className="flex items-center justify-between p-4 text-left" id="setting-opt-theme">
                  <div className="flex items-center gap-3.5">
                    <span className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl">
                      {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Theme Mode</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {isDarkMode ? "Dark Mode enabled" : "Light Mode enabled"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={toggleThemeMode}
                    className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-200 flex items-center cursor-pointer ${
                      isDarkMode ? "bg-slate-900 justify-end" : "bg-slate-200 justify-start"
                    }`}
                    id="btn-toggle-theme"
                  >
                    <span className="w-5 h-5 rounded-full bg-white shadow-md transform transition-transform" />
                  </button>
                </div>

                {/* Default Location */}
                <button
                  onClick={() => setShowLocationModal(true)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  id="setting-opt-location"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                      <MapPin size={18} />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Default Location</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Manage default state & district</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-slate-600 max-w-[130px] truncate">
                      {editDistrict || currentUser.district || "Location"}
                      {editState || currentUser.state ? `, ${editState || currentUser.state}` : ""}
                    </span>
                    <ChevronRight size={16} className="text-slate-400" />
                  </div>
                </button>

              </div>
            </div>

            {/* Section 2: NOTIFICATIONS */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">
                NOTIFICATIONS
              </h3>
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(11,18,32,0.04)] overflow-hidden divide-y divide-slate-100">
                
                {/* Chat & Messages */}
                <div className="flex items-center justify-between p-4 text-left" id="setting-opt-chat-notif">
                  <div className="flex items-center gap-3.5">
                    <span className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                      <Bell size={18} />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Chat & Messages</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Instant alerts for buyer & seller messages</p>
                    </div>
                  </div>
                  <button
                    onClick={toggleChatNotifs}
                    className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-200 flex items-center cursor-pointer ${
                      chatNotifs ? "bg-slate-900 justify-end" : "bg-slate-200 justify-start"
                    }`}
                    id="btn-toggle-chat-notifs"
                  >
                    <span className="w-5 h-5 rounded-full bg-white shadow-md transform transition-transform" />
                  </button>
                </div>

                {/* Promotions & Offers */}
                <div className="flex items-center justify-between p-4 text-left" id="setting-opt-promo-notif">
                  <div className="flex items-center gap-3.5">
                    <span className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl">
                      <Sparkles size={18} />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Promotions & Offers</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Price drop alerts and market deals</p>
                    </div>
                  </div>
                  <button
                    onClick={togglePromoNotifs}
                    className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-200 flex items-center cursor-pointer ${
                      promoNotifs ? "bg-slate-900 justify-end" : "bg-slate-200 justify-start"
                    }`}
                    id="btn-toggle-promo-notifs"
                  >
                    <span className="w-5 h-5 rounded-full bg-white shadow-md transform transition-transform" />
                  </button>
                </div>

              </div>
            </div>

            {/* Section 3: PRIVACY & ACCOUNT */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">
                PRIVACY & ACCOUNT
              </h3>
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(11,18,32,0.04)] overflow-hidden divide-y divide-slate-100">
                
                {/* Blocked Users */}
                <button
                  onClick={() => setShowBlockedUsersModal(true)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  id="setting-opt-blocked"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="p-2.5 bg-purple-50 text-purple-600 rounded-2xl">
                      <UserX size={18} />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Blocked Users</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Manage blocked buyers or sellers</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                      {blockedUsers.length} Blocked
                    </span>
                    <ChevronRight size={16} className="text-slate-400" />
                  </div>
                </button>

                {/* Delete Account */}
                <button
                  onClick={() => setShowDeleteAccountConfirm(true)}
                  className="w-full flex items-center justify-between p-4 hover:bg-rose-50/50 transition-colors text-left cursor-pointer"
                  id="setting-opt-delete-account"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl">
                      <Trash2 size={18} />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-rose-600">Delete Account</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Permanently delete your profile and listings</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-rose-400" />
                </button>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* Language Selection Modal */}
      {showLangModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" id="modal-language-select">
          <div className="bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Globe size={18} className="text-indigo-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Select App Language</h3>
              </div>
              <button
                onClick={() => setShowLangModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              {[
                { code: "en", native: "English", subtitle: "English" },
                { code: "ta", native: "தமிழ்", subtitle: "Tamil" },
                { code: "hi", native: "हिंदी", subtitle: "Hindi" }
              ].map((item) => {
                const isSelected = language === item.code;
                return (
                  <button
                    key={item.code}
                    onClick={() => {
                      setLanguage(item.code as any);
                      setShowLangModal(false);
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-indigo-50/70 border-indigo-300 text-indigo-950 font-bold"
                        : "bg-white border-slate-200 hover:border-slate-300 text-slate-800"
                    }`}
                  >
                    <div className="text-left">
                      <p className="text-xs font-extrabold">{item.native}</p>
                      <p className="text-[10px] text-slate-500">{item.subtitle}</p>
                    </div>
                    {isSelected ? (
                      <CheckCircle2 size={18} className="text-indigo-600" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" id="modal-location-select">
          <div className="bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-emerald-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Manage Default Location</h3>
              </div>
              <button
                onClick={() => setShowLocationModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  State
                </label>
                <select
                  value={editState}
                  onChange={(e) => {
                    setEditState(e.target.value);
                    setEditDistrict("");
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                >
                  <option value="">Select State</option>
                  {INDIAN_STATES_AND_DISTRICTS.map((s) => (
                    <option key={s.state} value={s.state}>{s.state}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  District / City
                </label>
                <select
                  value={editDistrict}
                  onChange={(e) => setEditDistrict(e.target.value)}
                  disabled={!editState}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/20 disabled:opacity-50"
                >
                  <option value="">Select District</option>
                  {availableDistricts.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setShowMapModal(true)}
                  className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Compass size={15} className="text-slate-600" />
                  <span>Select on Map / GPS</span>
                </button>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setShowLocationModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLocationSetting}
                className="flex-1 py-3 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-2xl cursor-pointer shadow-md"
              >
                Save Location
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blocked Users Modal */}
      {showBlockedUsersModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" id="modal-blocked-users">
          <div className="bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserX size={18} className="text-purple-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Blocked Users ({blockedUsers.length})</h3>
              </div>
              <button
                onClick={() => setShowBlockedUsersModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {blockedUsers.length === 0 ? (
              <div className="py-6 text-center space-y-2">
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={24} />
                </div>
                <h4 className="text-xs font-bold text-slate-800">No Blocked Users</h4>
                <p className="text-[10px] text-slate-500 max-w-[220px] mx-auto leading-relaxed">
                  You have not blocked any users. When you block contacts in chat, they will appear here.
                </p>
                <button
                  onClick={handleAddSampleBlockedUser}
                  className="mt-3 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-[10px] font-extrabold rounded-xl transition-all cursor-pointer inline-flex items-center gap-1 border border-purple-200"
                >
                  + Add Sample Blocked User (Test)
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {blockedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-2xl text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 font-black text-xs flex items-center justify-center shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-900 truncate max-w-[130px]">
                          {user.name}
                        </h5>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {user.phone || "Blocked Contact"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnblockUser(user.id)}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-slate-700 text-[10px] font-extrabold rounded-xl transition-all cursor-pointer shadow-2xs"
                    >
                      Unblock
                    </button>
                  </div>
                ))}
                <div className="pt-1 text-center">
                  <button
                    onClick={handleAddSampleBlockedUser}
                    className="text-[10px] font-extrabold text-purple-600 hover:text-purple-700 underline cursor-pointer"
                  >
                    + Add Another Test Contact
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowBlockedUsersModal(false)}
              className="w-full py-3 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-2xl cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Delete Account Dialog */}
      {showDeleteAccountConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" id="modal-delete-account-dialog">
          <div className="bg-white rounded-3xl p-5 shadow-2xl border border-rose-200 max-w-sm w-full text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 size={22} />
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Delete Account Permanently?</h3>
              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to delete your account? All your active listings, saved favorites, and chat messages will be permanently removed.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowDeleteAccountConfirm(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteAccountConfirm(false);
                  handleDeleteAccountConfirm();
                }}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-2xl cursor-pointer shadow-md"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {showMapModal && (
        <MapLocationModal
          initialLat={editLat}
          initialLng={editLng}
          state={editState}
          district={editDistrict}
          onClose={() => setShowMapModal(false)}
          onConfirm={(lat, lng) => {
            setEditLat(lat);
            setEditLng(lng);
            setShowMapModal(false);
          }}
        />
      )}

      {editingPart && (
        <EditListingModal
          part={editingPart}
          onClose={() => setEditingPart(null)}
          onSave={handleSaveListingChanges}
          onDelete={async (id) => {
            const ok = await deleteSparePartListing(id);
            if (ok) {
              setEditingPart(null);
            }
          }}
        />
      )}

      {/* Profile Photo Action Sheet Option Menu */}
      {showPhotoActionSheet && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowPhotoActionSheet(false)}
          id="modal-profile-photo-actionsheet"
        >
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3.5 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Profile Photo Options</h3>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                Choose an action for your profile picture
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleTakePhoto}
                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-900 dark:text-white font-bold text-xs transition-colors cursor-pointer text-left"
                id="btn-action-take-photo"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Camera size={18} />
                </div>
                <div>
                  <div className="font-extrabold">Take Photo</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Use camera to capture photo</div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleChooseFromGallery}
                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-900 dark:text-white font-bold text-xs transition-colors cursor-pointer text-left"
                id="btn-action-choose-gallery"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <ImageIcon size={18} />
                </div>
                <div>
                  <div className="font-extrabold">Choose from Gallery</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Select image from device storage</div>
                </div>
              </button>

              {Boolean((previewPhotoUrl || currentUser?.photoURL || currentUser?.profilePhoto)?.trim()) ? (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 font-bold text-xs transition-colors cursor-pointer text-left"
                  id="btn-action-remove-photo"
                >
                  <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                    <Trash2 size={18} />
                  </div>
                  <div>
                    <div className="font-extrabold">Remove Photo</div>
                    <div className="text-[10px] text-rose-500/80 dark:text-rose-400/80 font-normal">Delete picture and reset to initial avatar</div>
                  </div>
                </button>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setShowPhotoActionSheet(false)}
              className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-xs transition-colors cursor-pointer text-center mt-2"
              id="btn-action-cancel-photo"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
