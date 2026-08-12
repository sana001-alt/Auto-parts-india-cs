import React, { useState, useEffect, useMemo } from "react";
import { 
  Shield, Users, Tag, PlusCircle, Trash2, Megaphone, 
  Settings, Ban, CheckCircle, Search, Edit2, Check, X,
  MapPin, Car, Plus, AlertCircle, RefreshCw, Globe,
  Sparkles, Download, Star, ShieldCheck, CheckCircle2,
  XCircle, RotateCcw, Eye, UserCheck, CheckSquare, Square,
  Filter, AlertTriangle, DollarSign, Phone, Mail, FileText,
  Clock, Flag, Layers, Image as ImageIcon, ArrowUp, ArrowDown,
  ToggleLeft, ToggleRight, EyeOff, Upload
} from "lucide-react";
import { User, SparePart, AppVersionConfig, Banner } from "../types";
import { 
  fetchAllUsers, subscribeToUsers, toggleUserBlockStatus, sendAnnouncement,
  fetchMetadataConfig, saveMetadataConfig, deleteSparePartListing,
  updateSparePartListing, fetchAppVersionConfig, updateAppVersionConfig,
  deleteUserAccount, updateAdminUserProfile, fetchAnnouncementsHistory,
  deleteAnnouncement, updateAnnouncement, AnnouncementItem,
  subscribeToBanners, createBanner, updateBanner, deleteBanner, reorderBanners
} from "../lib/firebase";
import EditListingModal from "./EditListingModal";
import SellerProfileView from "./SellerProfileView";
import AdminTaxonomyCMS from "./AdminTaxonomyCMS";

interface AdminDashboardScreenProps {
  currentUser: User | null;
  allParts: SparePart[];
  onPartUpdated: () => void;
  onBackToApp: () => void;
}

export default function AdminDashboardScreen({
  currentUser,
  allParts,
  onPartUpdated,
  onBackToApp
}: AdminDashboardScreenProps) {
  if (currentUser?.email !== "wwwautoparts2@gmail.com") {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-50">
        <h2 className="text-lg font-black text-slate-800">Access Denied</h2>
        <p className="text-xs text-slate-500 mt-2">You do not have administrative permissions to view this section.</p>
        <button
          onClick={onBackToApp}
          className="mt-4 bg-[#0056D2] text-white px-4 py-2 rounded-full text-xs font-bold cursor-pointer"
        >
          Return to App
        </button>
      </div>
    );
  }

  // Navigation tabs inside Admin Panel
  const [activeTab, setActiveTab] = useState<"users" | "listings" | "banners" | "metadata" | "announcements" | "version">("users");

  // Banner Management State
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loadingBanners, setLoadingBanners] = useState(true);
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  // Banner Form State
  const [bannerTitle, setBannerTitle] = useState("");
  const [bannerSubtitle, setBannerSubtitle] = useState("");
  const [bannerTag, setBannerTag] = useState("Special Offer");
  const [bannerTargetLink, setBannerTargetLink] = useState("");
  const [bannerActive, setBannerActive] = useState(true);
  const [bannerOrder, setBannerOrder] = useState(0);
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [isSavingBanner, setIsSavingBanner] = useState(false);
  const [bannerFormError, setBannerFormError] = useState<string | null>(null);

  // State
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Toast / Alert State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Real-time Banners Listener from Firestore
  useEffect(() => {
    setLoadingBanners(true);
    const unsub = subscribeToBanners((loaded) => {
      setBanners(loaded);
      setLoadingBanners(false);
    }, false);
    return () => unsub();
  }, []);

  const handleOpenAddBanner = () => {
    setEditingBanner(null);
    setBannerTitle("");
    setBannerSubtitle("");
    setBannerTag("Special Offer");
    setBannerTargetLink("");
    setBannerActive(true);
    setBannerOrder(banners.length > 0 ? Math.max(...banners.map(b => b.order)) + 1 : 0);
    setBannerImageUrl("");
    setBannerFormError(null);
    setBannerModalOpen(true);
  };

  const handleOpenEditBanner = (b: Banner) => {
    setEditingBanner(b);
    setBannerTitle(b.title || "");
    setBannerSubtitle(b.subtitle || "");
    setBannerTag(b.tag || "Special Offer");
    setBannerTargetLink(b.targetLink || "");
    setBannerActive(b.active !== false);
    setBannerOrder(typeof b.order === "number" ? b.order : 0);
    setBannerImageUrl(b.imageUrl || "");
    setBannerFormError(null);
    setBannerModalOpen(true);
  };

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setBannerFormError("Image size must be less than 8MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setBannerImageUrl(reader.result as string);
      setBannerFormError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBanner = async () => {
    if (!bannerTitle.trim()) {
      setBannerFormError("Please enter a banner title.");
      return;
    }
    if (!bannerImageUrl.trim()) {
      setBannerFormError("Please select or upload a banner image.");
      return;
    }

    setIsSavingBanner(true);
    setBannerFormError(null);

    try {
      if (editingBanner) {
        await updateBanner(
          editingBanner.id,
          {
            title: bannerTitle.trim(),
            subtitle: bannerSubtitle.trim(),
            tag: bannerTag.trim(),
            targetLink: bannerTargetLink.trim(),
            active: bannerActive,
            order: bannerOrder,
            imageUrl: bannerImageUrl
          },
          editingBanner.imageUrl
        );
        showToast("Banner updated & image synced to Cloudinary + Firestore!", "success");
      } else {
        await createBanner({
          title: bannerTitle.trim(),
          subtitle: bannerSubtitle.trim(),
          tag: bannerTag.trim(),
          targetLink: bannerTargetLink.trim(),
          active: bannerActive,
          order: bannerOrder,
          imageUrl: bannerImageUrl
        });
        showToast("New banner created & image uploaded to Cloudinary!", "success");
      }
      setBannerModalOpen(false);
    } catch (err: any) {
      console.error("Save banner error:", err);
      setBannerFormError(err.message || "Failed to save banner.");
      showToast("Error saving banner: " + (err.message || "Unknown error"), "error");
    } finally {
      setIsSavingBanner(false);
    }
  };

  const handleToggleBannerActive = async (b: Banner) => {
    try {
      await updateBanner(b.id, { active: !b.active });
      showToast(b.active ? "Banner disabled." : "Banner enabled and active!", "info");
    } catch (err: any) {
      showToast("Failed to toggle banner status: " + err.message, "error");
    }
  };

  const handleMoveBanner = async (b: Banner, direction: "up" | "down") => {
    const sorted = [...banners].sort((x, y) => x.order - y.order);
    const idx = sorted.findIndex(item => item.id === b.id);
    if (idx === -1) return;

    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;

    // Swap items
    const temp = sorted[idx];
    sorted[idx] = sorted[targetIdx];
    sorted[targetIdx] = temp;

    // Reassign orders sequentially 0, 1, 2...
    const bannerOrders = sorted.map((item, index) => ({
      id: item.id,
      order: index
    }));

    try {
      await reorderBanners(bannerOrders);
      showToast("Banner display order reordered successfully!", "success");
    } catch (err: any) {
      showToast("Failed to reorder banners: " + err.message, "error");
    }
  };

  const handleDeleteBanner = (b: Banner) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Banner Permanently",
      message: `Are you sure you want to permanently delete "${b.title}"? This will delete the banner document from Firestore and remove the image asset from Cloudinary permanently.`,
      confirmText: "Delete Banner",
      isDanger: true,
      onConfirm: async () => {
        try {
          await deleteBanner(b.id, b.imageUrl);
          showToast("Banner permanently deleted from Firestore and Cloudinary.", "success");
        } catch (err: any) {
          showToast("Error deleting banner: " + err.message, "error");
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    isDanger?: boolean;
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  // Listing Details Modal State
  const [detailModalPart, setDetailModalPart] = useState<SparePart | null>(null);

  // Edit Listing Modal State
  const [editingModalPart, setEditingModalPart] = useState<SparePart | null>(null);

  // Seller Profile Modal State
  const [sellerProfileModal, setSellerProfileModal] = useState<{ id: string; name: string } | null>(null);

  // Listing Status Filter
  const [listingFilter, setListingFilter] = useState<"all" | "active" | "sold" | "pending" | "featured" | "verified" | "reported" | "trash">("all");

  // Multi-select for bulk actions
  const [selectedPartIds, setSelectedPartIds] = useState<string[]>([]);
  
  // Metadata state
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<Record<string, string[]>>({});
  const [locations, setLocations] = useState<string[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);

  // New items fields
  const [newCategory, setNewCategory] = useState("");
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandModels, setNewBrandModels] = useState("");
  const [newLocation, setNewLocation] = useState("");

  // Announcements state
  const [annTitle, setAnnTitle] = useState("");
  const [annText, setAnnText] = useState("");
  const [annSuccess, setAnnSuccess] = useState(false);
  const [sendingAnn, setSendingAnn] = useState(false);

  // App Version management states
  const [vLatestVersion, setVLatestVersion] = useState("1.0.0");
  const [vMinVersion, setVMinVersion] = useState("1.0.0");
  const [vForceUpdate, setVForceUpdate] = useState(false);
  const [vApkUrl, setVApkUrl] = useState("https://autopartsindia.app/download/app-latest.apk");
  const [vReleaseNotes, setVReleaseNotes] = useState("Performance improvements & bug fixes.");
  const [vReleaseDate, setVReleaseDate] = useState("2026-07-22");
  const [vUpdatedAt, setVUpdatedAt] = useState<string | undefined>(undefined);
  const [vUpdatedBy, setVUpdatedBy] = useState<string | undefined>(undefined);
  const [loadingVersion, setLoadingVersion] = useState(false);
  const [savingVersion, setSavingVersion] = useState(false);
  const [versionSaveSuccess, setVersionSaveSuccess] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);

  const loadVersionData = async () => {
    setLoadingVersion(true);
    setVersionError(null);
    try {
      const config = await fetchAppVersionConfig();
      setVLatestVersion(config.latestVersion || "");
      setVMinVersion(config.minimumSupportedVersion || "");
      setVForceUpdate(Boolean(config.forceUpdate));
      setVApkUrl(config.apkDownloadUrl || "");
      setVReleaseNotes(config.releaseNotes || "");
      setVReleaseDate(config.releaseDate || "");
      setVUpdatedAt(config.updatedAt);
      setVUpdatedBy(config.updatedBy);
    } catch (e: any) {
      console.error("Failed to load app version config in admin:", e);
      setVersionError("Failed to load app version config from Firestore: " + (e?.message || String(e)));
    } finally {
      setLoadingVersion(false);
    }
  };

  const handleSaveVersionConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setVersionError(null);
    setVersionSaveSuccess(false);

    // 1. Validate version fields not empty
    if (!vLatestVersion.trim()) {
      const msg = "Latest Version (latestVersion) field cannot be empty.";
      setVersionError(msg);
      showToast(msg, "error");
      return;
    }
    if (!vMinVersion.trim()) {
      const msg = "Minimum Supported Version (minimumSupportedVersion) field cannot be empty.";
      setVersionError(msg);
      showToast(msg, "error");
      return;
    }

    // 2. Validate apkDownloadUrl is a valid URL
    let isUrlValid = false;
    try {
      const parsed = new URL(vApkUrl.trim());
      isUrlValid = parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      isUrlValid = false;
    }
    if (!isUrlValid) {
      const msg = "APK Download URL must be a valid HTTP or HTTPS URL (e.g. https://domain.com/app.apk).";
      setVersionError(msg);
      showToast("APK Download URL must be a valid URL.", "error");
      return;
    }

    // 3. Validate date and release notes
    if (!vReleaseDate.trim()) {
      const msg = "Release Date field cannot be empty.";
      setVersionError(msg);
      showToast(msg, "error");
      return;
    }
    if (!vReleaseNotes.trim()) {
      const msg = "Release Notes field cannot be empty.";
      setVersionError(msg);
      showToast(msg, "error");
      return;
    }

    setSavingVersion(true);
    try {
      const updatedConfig: AppVersionConfig = {
        latestVersion: vLatestVersion.trim(),
        minimumSupportedVersion: vMinVersion.trim(),
        forceUpdate: vForceUpdate,
        apkDownloadUrl: vApkUrl.trim(),
        releaseNotes: vReleaseNotes.trim(),
        releaseDate: vReleaseDate.trim()
      };
      const adminEmail = currentUser?.email || "admin@autoparts.com";
      const success = await updateAppVersionConfig(updatedConfig, adminEmail);
      if (success) {
        setVersionSaveSuccess(true);
        showToast("App update configuration saved to Firestore!");
        await loadVersionData();
        setTimeout(() => setVersionSaveSuccess(false), 5000);
      } else {
        const msg = "Failed to save app update configuration to Firestore.";
        setVersionError(msg);
        showToast(msg, "error");
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      setVersionError("Error saving app update config: " + errMsg);
      showToast("Error saving app update config: " + errMsg, "error");
    } finally {
      setSavingVersion(false);
    }
  };

  // User edit state
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Announcement history state
  const [announcementsList, setAnnouncementsList] = useState<AnnouncementItem[]>([]);
  const [loadingAnn, setLoadingAnn] = useState(false);

  // Pagination states
  const [usersPage, setUsersPage] = useState(1);
  const [listingsPage, setListingsPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const loadAnnouncements = async () => {
    setLoadingAnn(true);
    try {
      const history = await fetchAnnouncementsHistory();
      setAnnouncementsList(history);
    } catch (e) {
      console.error("Failed to load announcements history:", e);
    } finally {
      setLoadingAnn(false);
    }
  };

  const handleDeleteUser = (user: User) => {
    if (user.email === "wwwautoparts2@gmail.com") {
      showToast("Cannot delete Super Admin account!", "error");
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: "Delete User Account",
      message: `Are you sure you want to permanently delete user account for ${user.name} (${user.email})? This action cannot be undone.`,
      confirmText: "Delete Account",
      isDanger: true,
      onConfirm: async () => {
        try {
          const success = await deleteUserAccount(user.id);
          if (success) {
            setUsers(prev => prev.filter(u => u.id !== user.id));
            showToast(`User account for ${user.name} permanently deleted.`);
          }
        } catch (e: any) {
          showToast("Failed to delete user account: " + (e?.message || e), "error");
        }
      }
    });
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const success = await updateAdminUserProfile(editingUser.id, {
        name: editingUser.name,
        email: editingUser.email,
        phone: editingUser.phone,
        district: editingUser.district,
        state: editingUser.state
      });
      if (success) {
        setUsers(prev => prev.map(u => u.id === editingUser.id ? editingUser : u));
        showToast(`User profile for ${editingUser.name} updated!`);
        setEditingUser(null);
      }
    } catch (e: any) {
      showToast("Failed to update user profile: " + (e?.message || e), "error");
    }
  };

  const exportUsersCSV = () => {
    if (users.length === 0) return;
    const headers = ["ID", "Name", "Email", "Phone", "District", "State", "IsBlocked"];
    const rows = users.map(u => [
      u.id,
      `"${u.name.replace(/"/g, '""')}"`,
      `"${u.email.replace(/"/g, '""')}"`,
      `"${(u.phone || "").replace(/"/g, '""')}"`,
      `"${(u.district || "").replace(/"/g, '""')}"`,
      `"${(u.state || "").replace(/"/g, '""')}"`,
      u.isBlocked ? "YES" : "NO"
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `autoparts_users_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Exported user accounts to CSV.");
  };

  const exportListingsCSV = () => {
    if (allParts.length === 0) return;
    const headers = ["ID", "Title", "Price", "Brand", "Model", "Category", "Condition", "Seller", "Phone", "District", "State", "Featured", "Verified", "Sold", "Approved"];
    const rows = allParts.map(p => [
      p.id,
      `"${p.title.replace(/"/g, '""')}"`,
      p.price,
      `"${p.carBrand.replace(/"/g, '""')}"`,
      `"${p.carModel.replace(/"/g, '""')}"`,
      `"${p.category.replace(/"/g, '""')}"`,
      `"${(p.condition || "").replace(/"/g, '""')}"`,
      `"${p.contactName.replace(/"/g, '""')}"`,
      `"${(p.contactPhone || "").replace(/"/g, '""')}"`,
      `"${(p.district || "").replace(/"/g, '""')}"`,
      `"${(p.state || p.location || "").replace(/"/g, '""')}"`,
      p.featured ? "YES" : "NO",
      p.verified ? "YES" : "NO",
      p.sold ? "YES" : "NO",
      p.approved !== false ? "YES" : "NO"
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `autoparts_listings_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Exported listings to CSV.");
  };

  const handleDeleteAnnouncement = (id: string, title: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Announcement",
      message: `Are you sure you want to delete announcement "${title}"?`,
      confirmText: "Delete",
      isDanger: true,
      onConfirm: async () => {
        try {
          await deleteAnnouncement(id);
          setAnnouncementsList(prev => prev.filter(a => a.id !== id));
          showToast(`Announcement "${title}" deleted.`);
        } catch (e: any) {
          showToast("Failed to delete announcement: " + (e?.message || e), "error");
        }
      }
    });
  };

  // Load all users
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const allUsers = await fetchAllUsers();
      console.log(`[Super Admin Users Page] Firestore collection path: "users" | Total user documents loaded: ${allUsers.length}`);
      setUsers(allUsers);
    } catch (e) {
      console.error("Failed to load users for admin:", e);
      showToast("Failed to load user accounts.", "error");
    } finally {
      setLoadingUsers(false);
    }
  };

  // Load metadata
  const loadMeta = async () => {
    setLoadingMeta(true);
    try {
      const config = await fetchMetadataConfig();
      setCategories(config.categories);
      setBrands(config.brands);
      setLocations(config.locations);
    } catch (e) {
      console.error("Failed to load metadata config:", e);
      showToast("Failed to load metadata.", "error");
    } finally {
      setLoadingMeta(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadMeta();
      loadVersionData();
      loadAnnouncements();
      const unsubUsers = subscribeToUsers((allUsers) => {
        console.log(`[Super Admin Real-time Listener] Firestore collection path: "users" | Total user documents loaded: ${allUsers.length}`);
        setUsers(allUsers);
        setLoadingUsers(false);
      });
      return () => {
        if (unsubUsers) unsubUsers();
      };
    }
  }, [currentUser]);

  // Block/unblock handler
  const handleToggleBlock = async (userId: string, currentBlocked: boolean) => {
    if (userId === currentUser?.id) {
      showToast("You cannot block yourself!", "error");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: currentBlocked ? "Unblock User Account" : "Suspend User Account",
      message: `Are you sure you want to ${currentBlocked ? "unblock" : "suspend/block"} this user account?`,
      confirmText: currentBlocked ? "Unblock Account" : "Suspend Account",
      isDanger: !currentBlocked,
      onConfirm: async () => {
        try {
          const success = await toggleUserBlockStatus(userId, currentBlocked);
          if (success) {
            setUsers(prev => 
              prev.map(u => u.id === userId ? { ...u, isBlocked: !currentBlocked } : u)
            );
            showToast(`User successfully ${currentBlocked ? "unblocked" : "suspended"}.`);
          }
        } catch (e: any) {
          showToast("Failed to change block status: " + (e?.message || e), "error");
        }
      }
    });
  };

  // Category additions
  const handleAddCategory = async () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      showToast("Category already exists!", "error");
      return;
    }
    const updated = [...categories, trimmed];
    try {
      await saveMetadataConfig("categories", { list: updated });
      setCategories(updated);
      setNewCategory("");
      showToast(`Category "${trimmed}" added.`);
    } catch (e: any) {
      showToast("Failed to save categories: " + (e?.message || e), "error");
    }
  };

  const handleDeleteCategory = async (cat: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Category",
      message: `Are you sure you want to delete category "${cat}"?`,
      confirmText: "Delete Category",
      isDanger: true,
      onConfirm: async () => {
        const updated = categories.filter(c => c !== cat);
        try {
          await saveMetadataConfig("categories", { list: updated });
          setCategories(updated);
          showToast(`Category "${cat}" deleted.`);
        } catch (e: any) {
          showToast("Failed to delete category: " + (e?.message || e), "error");
        }
      }
    });
  };

  // Brand additions
  const handleAddBrand = async () => {
    const brandName = newBrandName.trim();
    if (!brandName) return;
    const modelsList = newBrandModels
      .split(",")
      .map(m => m.trim())
      .filter(m => m.length > 0);

    if (brands[brandName]) {
      showToast("Brand already exists!", "error");
      return;
    }

    const updated = { ...brands, [brandName]: modelsList };
    try {
      await saveMetadataConfig("brands", { map: updated });
      setBrands(updated);
      setNewBrandName("");
      setNewBrandModels("");
      showToast(`Brand "${brandName}" added.`);
    } catch (e: any) {
      showToast("Failed to save brands: " + (e?.message || e), "error");
    }
  };

  const handleDeleteBrand = async (brand: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Brand",
      message: `Are you sure you want to delete brand "${brand}"?`,
      confirmText: "Delete Brand",
      isDanger: true,
      onConfirm: async () => {
        const updated = { ...brands };
        delete updated[brand];
        try {
          await saveMetadataConfig("brands", { map: updated });
          setBrands(updated);
          showToast(`Brand "${brand}" deleted.`);
        } catch (e: any) {
          showToast("Failed to delete brand: " + (e?.message || e), "error");
        }
      }
    });
  };

  // Location additions
  const handleAddLocation = async () => {
    const trimmed = newLocation.trim();
    if (!trimmed) return;
    if (locations.includes(trimmed)) {
      showToast("Location already exists!", "error");
      return;
    }
    const updated = [...locations, trimmed];
    try {
      await saveMetadataConfig("locations", { list: updated });
      setLocations(updated);
      setNewLocation("");
      showToast(`Location "${trimmed}" added.`);
    } catch (e: any) {
      showToast("Failed to save locations: " + (e?.message || e), "error");
    }
  };

  const handleDeleteLocation = async (loc: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Location",
      message: `Are you sure you want to delete location "${loc}"?`,
      confirmText: "Delete Location",
      isDanger: true,
      onConfirm: async () => {
        const updated = locations.filter(l => l !== loc);
        try {
          await saveMetadataConfig("locations", { list: updated });
          setLocations(updated);
          showToast(`Location "${loc}" deleted.`);
        } catch (e: any) {
          showToast("Failed to delete location: " + (e?.message || e), "error");
        }
      }
    });
  };

  // Single Action Handlers for Listings
  const handleToggleFeatured = async (part: SparePart) => {
    const newFeatured = !part.featured;
    try {
      const success = await updateSparePartListing(part.id, { featured: newFeatured });
      if (success) {
        showToast(`Listing "${part.title}" ${newFeatured ? "marked as Featured ⭐" : "removed from Featured"}.`);
        onPartUpdated();
      } else {
        showToast("Failed to update featured status.", "error");
      }
    } catch (e: any) {
      showToast("Error updating featured status: " + (e?.message || e), "error");
    }
  };

  const handleToggleVerified = async (part: SparePart) => {
    const newVerified = !part.verified;
    try {
      const success = await updateSparePartListing(part.id, { verified: newVerified });
      if (success) {
        showToast(`Listing "${part.title}" ${newVerified ? "marked as Verified ✓" : "unverified"}.`);
        onPartUpdated();
      } else {
        showToast("Failed to update verified status.", "error");
      }
    } catch (e: any) {
      showToast("Error updating verified status: " + (e?.message || e), "error");
    }
  };

  const handleToggleApproved = async (part: SparePart, approve: boolean) => {
    try {
      const success = await updateSparePartListing(part.id, { 
        approved: approve,
        status: approve ? "approved" : "rejected"
      });
      if (success) {
        showToast(`Listing "${part.title}" ${approve ? "approved" : "rejected"}.`);
        onPartUpdated();
      } else {
        showToast("Failed to update approval status.", "error");
      }
    } catch (e: any) {
      showToast("Error updating approval status: " + (e?.message || e), "error");
    }
  };

  const handleToggleSold = async (part: SparePart) => {
    const newSold = !part.sold;
    try {
      const success = await updateSparePartListing(part.id, { sold: newSold });
      if (success) {
        showToast(`Listing "${part.title}" ${newSold ? "marked as Sold" : "marked as Available"}.`);
        onPartUpdated();
      } else {
        showToast("Failed to update sold status.", "error");
      }
    } catch (e: any) {
      showToast("Error updating sold status: " + (e?.message || e), "error");
    }
  };

  const handleSoftDelete = async (part: SparePart) => {
    setConfirmModal({
      isOpen: true,
      title: "Move Listing to Trash",
      message: `Are you sure you want to move "${part.title}" to Trash?`,
      confirmText: "Move to Trash",
      isDanger: true,
      onConfirm: async () => {
        try {
          const success = await updateSparePartListing(part.id, { isDeleted: true });
          if (success) {
            showToast(`Listing "${part.title}" moved to Trash.`);
            onPartUpdated();
          } else {
            showToast("Failed to move listing to Trash.", "error");
          }
        } catch (e: any) {
          showToast("Error moving listing to Trash: " + (e?.message || e), "error");
        }
      }
    });
  };

  const handleRestoreListing = async (part: SparePart) => {
    try {
      const success = await updateSparePartListing(part.id, { isDeleted: false });
      if (success) {
        showToast(`Listing "${part.title}" restored from Trash.`);
        onPartUpdated();
      } else {
        showToast("Failed to restore listing.", "error");
      }
    } catch (e: any) {
      showToast("Error restoring listing: " + (e?.message || e), "error");
    }
  };

  const handlePermanentDelete = async (part: SparePart) => {
    setConfirmModal({
      isOpen: true,
      title: "Permanently Delete Listing",
      message: `Are you sure you want to permanently delete "${part.title}"? This cannot be undone and will permanently remove listing images and data from Firestore, Cloudinary, and Storage.`,
      confirmText: "Delete Permanently",
      isDanger: true,
      onConfirm: async () => {
        try {
          const success = await deleteSparePartListing(part.id);
          if (success) {
            showToast(`Listing "${part.title}" permanently deleted from everywhere.`);
            if (detailModalPart?.id === part.id) {
              setDetailModalPart(null);
            }
            if (editingModalPart?.id === part.id) {
              setEditingModalPart(null);
            }
            setSelectedPartIds(prev => prev.filter(id => id !== part.id));
            onPartUpdated();
          } else {
            showToast("Failed to permanently delete listing.", "error");
          }
        } catch (e: any) {
          showToast("Error deleting listing: " + (e?.message || String(e)), "error");
        }
      }
    });
  };

  // Bulk action handler
  const handleBulkAction = async (action: "delete") => {
    if (selectedPartIds.length === 0) return;

    if (action === "delete") {
      setConfirmModal({
        isOpen: true,
        title: "Bulk Delete Listings",
        message: `Are you sure you want to permanently delete ${selectedPartIds.length} listing(s)? This will permanently remove all documents, Cloudinary images, Storage files, and linked references.`,
        confirmText: `Delete ${selectedPartIds.length} Listing(s)`,
        isDanger: true,
        onConfirm: async () => {
          try {
            let count = 0;
            for (const id of selectedPartIds) {
              const ok = await deleteSparePartListing(id);
              if (ok) count++;
            }
            showToast(`Permanently deleted ${count} listing(s).`);
            setSelectedPartIds([]);
            onPartUpdated();
          } catch (e: any) {
            showToast("Bulk delete error: " + (e?.message || e), "error");
          }
        }
      });
      return;
    }
  };

  // Broadcast announcement
  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = annTitle.trim();
    const text = annText.trim();
    if (!title || !text) return;

    setSendingAnn(true);
    try {
      await sendAnnouncement(title, text);
      setAnnSuccess(true);
      setAnnTitle("");
      setAnnText("");
      showToast("Announcement successfully broadcast!");
      setTimeout(() => setAnnSuccess(false), 5000);
    } catch (e: any) {
      showToast("Failed to send announcement: " + (e?.message || e), "error");
    } finally {
      setSendingAnn(false);
    }
  };

  // Filters users list
  const filteredUsers = useMemo(() => {
    const query = (searchTerm || "").toLowerCase().trim();
    return users.filter(u => 
      (u.name || "").toLowerCase().includes(query) ||
      (u.email || "").toLowerCase().includes(query) ||
      (u.phone && u.phone.includes(searchTerm))
    );
  }, [users, searchTerm]);

  // Counts for listing status tabs
  const listingCounts = useMemo(() => {
    return {
      all: allParts.filter(p => !p.isDeleted).length,
      active: allParts.filter(p => !p.isDeleted && !p.sold && p.approved !== false).length,
      sold: allParts.filter(p => !p.isDeleted && p.sold).length,
      pending: allParts.filter(p => !p.isDeleted && (p.approved === false || p.status === "pending")).length,
      featured: allParts.filter(p => !p.isDeleted && p.featured).length,
      verified: allParts.filter(p => !p.isDeleted && p.verified).length,
      reported: allParts.filter(p => !p.isDeleted && p.reported).length,
      trash: allParts.filter(p => p.isDeleted).length,
    };
  }, [allParts]);

  // Filters ads list based on status filter & search query
  const filteredParts = useMemo(() => {
    const query = (searchTerm || "").toLowerCase().trim();
    return allParts.filter(part => {
      // 1. Status Filter
      if (listingFilter === "all" && part.isDeleted) return false;
      if (listingFilter === "active" && (part.isDeleted || part.sold || part.approved === false)) return false;
      if (listingFilter === "sold" && (part.isDeleted || !part.sold)) return false;
      if (listingFilter === "pending" && (part.isDeleted || (part.approved !== false && part.status !== "pending"))) return false;
      if (listingFilter === "featured" && (part.isDeleted || !part.featured)) return false;
      if (listingFilter === "verified" && (part.isDeleted || !part.verified)) return false;
      if (listingFilter === "reported" && (part.isDeleted || !part.reported)) return false;
      if (listingFilter === "trash" && !part.isDeleted) return false;

      // 2. Search Query
      if (!query) return true;

      return (
        (part.title || "").toLowerCase().includes(query) ||
        (part.carBrand || "").toLowerCase().includes(query) ||
        (part.carModel || "").toLowerCase().includes(query) ||
        (part.category || "").toLowerCase().includes(query) ||
        (part.contactName || "").toLowerCase().includes(query) ||
        (part.sellerEmail || "").toLowerCase().includes(query) ||
        (part.location || "").toLowerCase().includes(query) ||
        (part.district && part.district.toLowerCase().includes(query)) ||
        (part.state && part.state.toLowerCase().includes(query)) ||
        (part.id || "").toLowerCase().includes(query)
      );
    });
  }, [allParts, listingFilter, searchTerm]);

  // Handle Select All / Deselect All
  const isAllSelected = useMemo(() => {
    if (filteredParts.length === 0) return false;
    return filteredParts.every(p => selectedPartIds.includes(p.id));
  }, [filteredParts, selectedPartIds]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedPartIds([]);
    } else {
      setSelectedPartIds(filteredParts.map(p => p.id));
    }
  };

  const toggleSelectPart = (id: string) => {
    setSelectedPartIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden h-full relative">
      {/* Toast Notification Banner */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full shadow-lg text-xs font-bold flex items-center gap-2 animate-bounce transition-all ${
          toast.type === "error" 
            ? "bg-rose-600 text-white" 
            : toast.type === "info" 
              ? "bg-indigo-600 text-white" 
              : "bg-emerald-600 text-white"
        }`}>
          {toast.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-80 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <header className="bg-[#0056D2] text-white px-4 py-3.5 flex items-center justify-between shadow-md select-none shrink-0">
        <div className="flex items-center gap-2">
          <Shield className="text-yellow-400 fill-yellow-400" size={24} />
          <div>
            <h1 className="font-sans font-black text-lg tracking-tight leading-none">Super Admin</h1>
            <p className="text-[10px] text-blue-100 mt-0.5 opacity-90">Auto Parts India Management Dashboard</p>
          </div>
        </div>
        
        <button 
          onClick={onBackToApp}
          className="bg-white/15 hover:bg-white/20 active:bg-white/10 px-3 py-1.5 rounded-full text-xs font-black tracking-tight flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <X size={14} />
          Exit Admin
        </button>
      </header>

      {/* Admin Quick Tabs */}
      <div className="bg-white border-b border-slate-100 flex items-center justify-around select-none shrink-0 shadow-[0_4px_12px_rgba(0,0,0,0.02)] overflow-x-auto scrollbar-none">
        <button
          onClick={() => { setActiveTab("users"); setSearchTerm(""); }}
          className={`px-3 py-3 text-xs font-black tracking-tight border-b-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === "users" 
              ? "border-[#0056D2] text-[#0056D2]" 
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Users size={16} />
          Users ({users.length})
        </button>

        <button
          onClick={() => { setActiveTab("listings"); setSearchTerm(""); }}
          className={`px-3 py-3 text-xs font-black tracking-tight border-b-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === "listings" 
              ? "border-[#0056D2] text-[#0056D2]" 
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Tag size={16} />
          Ads & Listings ({allParts.length})
        </button>

        <button
          onClick={() => { setActiveTab("banners"); setSearchTerm(""); }}
          className={`px-3 py-3 text-xs font-black tracking-tight border-b-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === "banners" 
              ? "border-[#0056D2] text-[#0056D2]" 
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <ImageIcon size={16} />
          Banner Management ({banners.length})
        </button>

        <button
          onClick={() => { setActiveTab("metadata"); setSearchTerm(""); }}
          className={`px-3 py-3 text-xs font-black tracking-tight border-b-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === "metadata" 
              ? "border-[#0056D2] text-[#0056D2]" 
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Settings size={16} />
          Catalog Metadata
        </button>

        <button
          onClick={() => { setActiveTab("announcements"); setSearchTerm(""); }}
          className={`px-3 py-3 text-xs font-black tracking-tight border-b-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === "announcements" 
              ? "border-[#0056D2] text-[#0056D2]" 
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Megaphone size={16} />
          Announcements
        </button>

        <button
          onClick={() => { setActiveTab("version"); setSearchTerm(""); loadVersionData(); }}
          className={`px-3 py-3 text-xs font-black tracking-tight border-b-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === "version" 
              ? "border-[#0056D2] text-[#0056D2]" 
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Sparkles size={16} />
          App Update
        </button>
      </div>

      {/* Main Panel Content (Scrollable Container) */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        
        {/* TAB 1: USERS MANAGEMENT */}
        {activeTab === "users" && (
          <div className="space-y-4">
            {/* Firestore Collection Path & Document Count Status Banner */}
            <div id="firestore-users-status-banner" className="bg-blue-50/90 border border-blue-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-blue-900 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-blue-600 font-bold uppercase tracking-wider text-[10px]">Firestore Collection Path:</span>
                <code className="bg-blue-100 text-blue-900 font-mono px-2 py-0.5 rounded-md font-bold text-xs">users</code>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-600 font-bold uppercase tracking-wider text-[10px]">Total User Documents Loaded:</span>
                <span className="bg-blue-600 text-white font-black px-2.5 py-0.5 rounded-full text-xs">{users.length}</span>
              </div>
            </div>

            {/* Search, Export and Refresh bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search by email address..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setUsersPage(1); }}
                  className="w-full bg-white border border-slate-200 rounded-full pl-9 pr-4 py-2.5 text-xs font-medium focus:outline-none focus:border-[#0056D2] shadow-xs"
                />
              </div>

              <button 
                onClick={exportUsersCSV}
                className="px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-800 font-bold text-xs hover:bg-emerald-100 transition-all cursor-pointer shadow-xs flex items-center gap-1.5 shrink-0"
                title="Export Users to CSV"
              >
                <Download size={14} />
                <span>Export CSV</span>
              </button>

              <button 
                onClick={loadUsers}
                disabled={loadingUsers}
                className="p-2.5 bg-white border border-slate-200 rounded-full text-slate-600 hover:text-[#0056D2] hover:border-blue-100 disabled:opacity-50 transition-all cursor-pointer shadow-xs flex items-center justify-center shrink-0"
                title="Refresh user accounts"
              >
                <RefreshCw size={16} className={loadingUsers ? "animate-spin" : ""} />
              </button>
            </div>

            {loadingUsers ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <RefreshCw className="animate-spin text-[#0056D2] mb-2" size={24} />
                <span className="text-xs font-bold">Fetching user accounts...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-150 p-8 text-center text-slate-400">
                <Users className="mx-auto mb-2 opacity-50 text-slate-300" size={32} />
                <p className="text-xs font-bold">No registered users matched your filter.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredUsers.slice((usersPage - 1) * ITEMS_PER_PAGE, usersPage * ITEMS_PER_PAGE).map((user, idx) => {
                  const emailVal = user.email || (currentUser?.id === user.id ? currentUser.email : "");

                  return (
                    <div 
                      key={`${user.id || user.uid || 'usr'}-${idx}`}
                      className={`bg-white rounded-2xl p-4 border transition-all flex items-center justify-between gap-4 shadow-xs ${
                        user.isBlocked 
                          ? "border-rose-200 bg-rose-50/20" 
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-bold text-slate-900 select-all truncate block">
                          {emailVal}
                        </span>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5 justify-end">
                        {user.email === "wwwautoparts2@gmail.com" ? (
                          <span className="text-[10px] text-amber-700 font-bold px-2.5 py-1 bg-amber-50 rounded-full border border-amber-200 select-none">
                            Immutable
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleToggleBlock(user.id, !!user.isBlocked)}
                              className={`px-3 py-1.5 rounded-full text-[10px] font-black tracking-tight flex items-center gap-1 transition-all cursor-pointer border ${
                                user.isBlocked 
                                  ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200" 
                                  : "bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200"
                              }`}
                            >
                              {user.isBlocked ? (
                                <>
                                  <CheckCircle size={12} />
                                  Unblock
                                </>
                              ) : (
                                <>
                                  <Ban size={12} />
                                  Suspend
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-full text-xs transition-all cursor-pointer border border-rose-100"
                              title="Delete User Account"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Users Pagination */}
                {filteredUsers.length > ITEMS_PER_PAGE && (
                  <div className="flex items-center justify-between pt-2 text-xs font-bold text-slate-600">
                    <span>
                      Showing {((usersPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(usersPage * ITEMS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                        disabled={usersPage === 1}
                        className="px-3 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer"
                      >
                        Previous
                      </button>
                      <span className="px-2">{usersPage} / {Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)}</span>
                      <button
                        onClick={() => setUsersPage(p => Math.min(Math.ceil(filteredUsers.length / ITEMS_PER_PAGE), p + 1))}
                        disabled={usersPage >= Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)}
                        className="px-3 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LISTINGS & ADS MANAGEMENT */}
        {activeTab === "listings" && (
          <div className="space-y-3.5">
            {/* Status Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: "all", label: "All Ads", count: listingCounts.all },
                { id: "active", label: "Active", count: listingCounts.active },
                { id: "pending", label: "Pending Approval", count: listingCounts.pending },
                { id: "featured", label: "Featured", count: listingCounts.featured },
                { id: "verified", label: "Verified", count: listingCounts.verified },
                { id: "sold", label: "Sold", count: listingCounts.sold },
                { id: "reported", label: "Reported", count: listingCounts.reported },
                { id: "trash", label: "Trash / Deleted", count: listingCounts.trash },
              ].map(filter => (
                <button
                  key={filter.id}
                  onClick={() => { setListingFilter(filter.id as any); setSelectedPartIds([]); }}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold tracking-tight transition-all shrink-0 cursor-pointer flex items-center gap-1 border ${
                    listingFilter === filter.id
                      ? "bg-[#0056D2] text-white border-[#0056D2] shadow-xs"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span>{filter.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                    listingFilter === filter.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                    {filter.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search, Export CSV and Refresh Bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search title, brand, seller name/email, category, location..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setListingsPage(1); }}
                  className="w-full bg-white border border-slate-200 rounded-full pl-9 pr-4 py-2.5 text-xs font-medium focus:outline-none focus:border-[#0056D2] shadow-xs"
                />
              </div>

              <button 
                onClick={exportListingsCSV}
                className="px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-800 font-bold text-xs hover:bg-emerald-100 transition-all cursor-pointer shadow-xs flex items-center gap-1.5 shrink-0"
                title="Export Listings to CSV"
              >
                <Download size={14} />
                <span>Export CSV</span>
              </button>

              <button 
                onClick={onPartUpdated}
                className="p-2.5 bg-white border border-slate-200 rounded-full text-slate-600 hover:text-[#0056D2] transition-all cursor-pointer shadow-xs shrink-0"
                title="Refresh listings"
              >
                <RefreshCw size={16} />
              </button>
            </div>

            {/* Bulk Action Controls */}
            {filteredParts.length > 0 && (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-2.5 flex flex-wrap items-center justify-between gap-2 shadow-2xs text-xs select-none">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 text-slate-700 font-bold hover:text-[#0056D2] cursor-pointer"
                >
                  {isAllSelected ? <CheckSquare className="text-[#0056D2]" size={16} /> : <Square className="text-slate-400" size={16} />}
                  <span>Select All ({filteredParts.length})</span>
                </button>

                {selectedPartIds.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-1">
                      {selectedPartIds.length} Selected
                    </span>

                    <button
                      onClick={() => handleBulkAction("delete")}
                      className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Trash2 size={13} /> Delete Selected
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Listings List */}
            {filteredParts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-150 p-8 text-center text-slate-400">
                <Tag className="mx-auto mb-2 opacity-50 text-slate-300" size={32} />
                <p className="text-xs font-bold">No spare part listings found matching your current filter.</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                {filteredParts.slice((listingsPage - 1) * ITEMS_PER_PAGE, listingsPage * ITEMS_PER_PAGE).map((part, idx) => {
                  const isSelected = selectedPartIds.includes(part.id);
                  return (
                    <div 
                      key={`${part.id || 'prt'}-${idx}`}
                      className={`bg-white rounded-2xl border p-3.5 flex flex-col gap-3 shadow-2xs transition-all ${
                        isSelected ? "border-[#0056D2] ring-1 ring-[#0056D2]/20 bg-blue-50/10" : "border-slate-200/80 hover:border-slate-300"
                      }`}
                    >
                      {/* Top Row: Thumbnail + Specs + Quick Badges */}
                      <div className="flex gap-3">
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleSelectPart(part.id)}
                          className="self-center p-1 text-slate-400 hover:text-[#0056D2] cursor-pointer shrink-0"
                        >
                          {isSelected ? <CheckSquare className="text-[#0056D2]" size={18} /> : <Square size={18} />}
                        </button>

                        {/* Image Thumbnail */}
                        <div 
                          className="h-20 w-20 rounded-xl bg-slate-100 border border-slate-200/80 overflow-hidden shrink-0 flex items-center justify-center relative"
                        >
                          {(part.imageUrls && part.imageUrls[0]) || part.imageUrl ? (
                            <img 
                              src={(part.imageUrls && part.imageUrls[0]) || part.imageUrl} 
                              alt={part.title}
                              className="h-full w-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <Car className="text-slate-300" size={28} />
                          )}

                          {part.sold && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <span className="text-[8px] bg-emerald-600 text-white font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                Sold
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Title, Specs, Badges */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-1">
                              <h3 className="font-bold text-xs text-slate-800 leading-tight truncate">
                                {part.title}
                              </h3>
                              <span className="font-black text-xs text-[#0056D2] shrink-0">₹{part.price.toLocaleString("en-IN")}</span>
                            </div>

                            <p className="text-[10px] text-slate-500 flex items-center gap-1 flex-wrap mt-0.5 font-medium">
                              <span className="text-slate-700 font-semibold">{part.carBrand} {part.carModel}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-600">{part.category}</span>
                              {part.condition && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-slate-500">{part.condition}</span>
                                </>
                              )}
                            </p>

                            <p className="text-[10px] text-slate-500 font-medium mt-0.5 truncate flex items-center gap-1">
                              <span>Seller:</span>
                              <span className="text-slate-700 font-bold truncate">
                                {part.contactName} ({part.sellerEmail || part.contactPhone})
                              </span>
                            </p>

                            <p className="text-[9px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin size={9} />
                              {[part.district, part.state || part.location].filter(Boolean).join(", ")}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Control Bar for Admin Actions: ONLY EDIT AND DELETE */}
                      <div className="border-t border-slate-100 pt-2 flex items-center justify-end gap-2 text-xs select-none">
                        <button
                          onClick={() => setEditingModalPart(part)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-all border border-slate-200/80 shadow-2xs"
                          title="Edit Listing Details"
                        >
                          <Edit2 size={13} /> Edit
                        </button>

                        <button
                          onClick={() => handlePermanentDelete(part)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                          title="Delete Listing permanently from Firestore and Cloudinary"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Listings Pagination */}
              {filteredParts.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between pt-2 text-xs font-bold text-slate-600 bg-white p-3 rounded-2xl border border-slate-200">
                  <span>
                    Showing {((listingsPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(listingsPage * ITEMS_PER_PAGE, filteredParts.length)} of {filteredParts.length} listings
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setListingsPage(p => Math.max(1, p - 1))}
                      disabled={listingsPage === 1}
                      className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer"
                    >
                      Previous
                    </button>
                    <span className="px-2">{listingsPage} / {Math.ceil(filteredParts.length / ITEMS_PER_PAGE)}</span>
                    <button
                      onClick={() => setListingsPage(p => Math.min(Math.ceil(filteredParts.length / ITEMS_PER_PAGE), p + 1))}
                      disabled={listingsPage >= Math.ceil(filteredParts.length / ITEMS_PER_PAGE)}
                      className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
              </>
            )}
          </div>
        )}

        {/* TAB 3: BANNER MANAGEMENT MODULE */}
        {activeTab === "banners" && (
          <div className="space-y-4 text-left">
            {/* Top Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4 text-white shadow-md flex flex-wrap items-center justify-between gap-3 border border-indigo-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600/30 border border-indigo-400/30 rounded-xl text-indigo-300">
                  <ImageIcon size={22} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white flex items-center gap-2">
                    Banner Management Module
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Cloudinary + Firestore
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-300 font-medium">
                    Manage promotional hero banners, upload image assets, set display ordering, and enable/disable banners in real-time.
                  </p>
                </div>
              </div>
              <button
                onClick={handleOpenAddBanner}
                className="bg-[#0056D2] hover:bg-blue-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus size={16} /> Add New Banner
              </button>
            </div>

            {/* Banners List */}
            {loadingBanners ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center space-y-2">
                <RefreshCw size={24} className="animate-spin text-blue-600 mx-auto" />
                <p className="text-xs font-bold text-slate-600">Loading banners from Firestore...</p>
              </div>
            ) : banners.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center space-y-3">
                <ImageIcon size={40} className="text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-800">No Banners Found</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  No banners have been added to Firestore yet. Click the button below to create your first promotional banner!
                </p>
                <button
                  onClick={handleOpenAddBanner}
                  className="bg-[#0056D2] hover:bg-blue-600 text-white font-black text-xs px-4 py-2 rounded-xl cursor-pointer"
                >
                  + Add First Banner
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {banners.map((banner, index) => (
                  <div
                    key={banner.id}
                    className={`bg-white rounded-2xl border ${banner.active ? "border-slate-200 shadow-xs" : "border-slate-200/60 bg-slate-50/50 opacity-75"} overflow-hidden flex flex-col justify-between transition-all`}
                  >
                    {/* Image Preview & Badges */}
                    <div className="relative min-h-36 bg-slate-900 overflow-hidden group flex items-center justify-center">
                      {banner.imageUrl ? (
                        <img
                          src={banner.imageUrl}
                          alt={banner.title}
                          className="w-full h-auto block max-h-60"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-xs">
                          No Image Uploaded
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent p-3 flex flex-col justify-between">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900/80 text-white border border-white/20 backdrop-blur-xs">
                            Order #{banner.order}
                          </span>
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border backdrop-blur-xs flex items-center gap-1 ${
                            banner.active
                              ? "bg-emerald-500/80 text-white border-emerald-400"
                              : "bg-slate-700/80 text-slate-200 border-slate-500"
                          }`}>
                            {banner.active ? <CheckCircle2 size={12} /> : <EyeOff size={12} />}
                            {banner.active ? "Active" : "Disabled"}
                          </span>
                        </div>

                        <div>
                          {banner.tag && (
                            <span className="text-[9px] font-black uppercase tracking-wider text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-500/30 inline-block mb-1">
                              {banner.tag}
                            </span>
                          )}
                          <h3 className="text-xs sm:text-sm font-black text-white line-clamp-1">
                            {banner.title}
                          </h3>
                          {banner.subtitle && (
                            <p className="text-[10px] text-slate-300 font-medium line-clamp-1">
                              {banner.subtitle}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Banner Details & Action Toolbar */}
                    <div className="p-3 bg-white space-y-2.5 flex-1 flex flex-col justify-between">
                      {banner.targetLink && (
                        <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1 truncate">
                          <Globe size={12} className="text-blue-600 shrink-0" />
                          <span className="font-bold text-slate-700">Target Action:</span>
                          <span className="truncate bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono">{banner.targetLink}</span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        {/* Move Controls */}
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                          <button
                            onClick={() => handleMoveBanner(banner, "up")}
                            disabled={index === 0}
                            title="Move Up"
                            className="p-1 hover:bg-white rounded-lg text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-all"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <span className="text-[10px] font-black font-mono text-slate-600 px-1">
                            #{banner.order}
                          </span>
                          <button
                            onClick={() => handleMoveBanner(banner, "down")}
                            disabled={index === banners.length - 1}
                            title="Move Down"
                            className="p-1 hover:bg-white rounded-lg text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-all"
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Toggle Active Switch */}
                          <button
                            onClick={() => handleToggleBannerActive(banner)}
                            className={`px-2.5 py-1.5 rounded-xl text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
                              banner.active
                                ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                            }`}
                          >
                            {banner.active ? <EyeOff size={13} /> : <CheckCircle2 size={13} />}
                            {banner.active ? "Disable" : "Enable"}
                          </button>

                          {/* Edit Banner */}
                          <button
                            onClick={() => handleOpenEditBanner(banner)}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-all cursor-pointer border border-blue-200"
                            title="Edit Banner Details & Image"
                          >
                            <Edit2 size={14} />
                          </button>

                          {/* Delete Banner */}
                          <button
                            onClick={() => handleDeleteBanner(banner)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all cursor-pointer border border-rose-200"
                            title="Delete Banner permanently from Firestore & Cloudinary"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add / Edit Banner Modal */}
            {bannerModalOpen && (
              <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 overflow-y-auto">
                <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4 my-8 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <ImageIcon className="text-[#0056D2]" size={18} />
                      {editingBanner ? "Edit Banner Details" : "Add New Promotional Banner"}
                    </h3>
                    <button
                      onClick={() => setBannerModalOpen(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {bannerFormError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
                      <AlertCircle size={16} className="shrink-0 text-rose-600" />
                      <span>{bannerFormError}</span>
                    </div>
                  )}

                  <div className="space-y-3 text-left">
                    {/* Image Preview & Upload Input */}
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                        Banner Image <span className="text-rose-500">*</span>
                      </label>
                      <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-3 bg-slate-50 text-center space-y-2 transition-all">
                        {bannerImageUrl ? (
                          <div className="relative min-h-32 rounded-xl overflow-hidden group bg-slate-900 flex items-center justify-center">
                            <img
                              src={bannerImageUrl}
                              alt="Banner Preview"
                              className="w-full h-auto block max-h-60"
                            />
                            <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                              <button
                                type="button"
                                onClick={() => setBannerImageUrl("")}
                                className="bg-rose-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-md cursor-pointer flex items-center gap-1"
                              >
                                <Trash2 size={12} /> Replace Image
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="cursor-pointer block py-4 space-y-2">
                            <Upload size={28} className="text-blue-600 mx-auto" />
                            <div>
                              <p className="text-xs font-black text-slate-800">
                                Click to upload image or drag & drop
                              </p>
                              <p className="text-[10px] text-slate-500">
                                PNG, JPG, or WEBP (Saved directly to Cloudinary)
                              </p>
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageFileSelect}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                      <div className="mt-1.5">
                        <input
                          type="text"
                          placeholder="Or paste image URL (https://...)"
                          value={bannerImageUrl.startsWith("data:") ? "" : bannerImageUrl}
                          onChange={(e) => setBannerImageUrl(e.target.value)}
                          className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 outline-none font-mono"
                        />
                      </div>
                    </div>

                    {/* Title */}
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                        Banner Title <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 100% OEM & Quality Spare Parts"
                        value={bannerTitle}
                        onChange={(e) => setBannerTitle(e.target.value)}
                        className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 outline-none"
                      />
                    </div>

                    {/* Subtitle */}
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                        Subtitle / Description
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Verified by top mechanics & dismantling hubs"
                        value={bannerSubtitle}
                        onChange={(e) => setBannerSubtitle(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Tag / Badge */}
                      <div>
                        <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                          Tag Badge
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Verified Marketplace"
                          value={bannerTag}
                          onChange={(e) => setBannerTag(e.target.value)}
                          className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 outline-none"
                        />
                      </div>

                      {/* Order Position */}
                      <div>
                        <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                          Display Order Rank
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={bannerOrder}
                          onChange={(e) => setBannerOrder(parseInt(e.target.value) || 0)}
                          className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 outline-none font-mono"
                        />
                      </div>
                    </div>

                    {/* Target Action Link */}
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                        Target Link / Filter Action
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Engine Components, Maruti Suzuki, or search term"
                        value={bannerTargetLink}
                        onChange={(e) => setBannerTargetLink(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 outline-none font-mono"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        When users click this banner on Home, it will filter by category or search term.
                      </p>
                    </div>

                    {/* Active Switch */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div>
                        <p className="text-xs font-bold text-slate-800">Banner Active Status</p>
                        <p className="text-[10px] text-slate-500">Enable to display this banner immediately on the Home screen carousel.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBannerActive(!bannerActive)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                          bannerActive
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-slate-300 text-slate-700"
                        }`}
                      >
                        {bannerActive ? <CheckCircle2 size={14} /> : <EyeOff size={14} />}
                        {bannerActive ? "Active" : "Disabled"}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => setBannerModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveBanner}
                      disabled={isSavingBanner}
                      className="px-5 py-2 rounded-xl text-xs font-extrabold text-white bg-[#0056D2] hover:bg-blue-600 disabled:opacity-50 shadow-md cursor-pointer flex items-center gap-2"
                    >
                      {isSavingBanner ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          Saving to Cloudinary & Firestore...
                        </>
                      ) : (
                        <>
                          <Check size={14} /> Save Banner
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: METADATA & SCHEMA CONFIG */}
        {activeTab === "metadata" && (
          <div className="pb-6">
            <AdminTaxonomyCMS
              allParts={allParts}
              onPartUpdated={onPartUpdated}
              showToast={showToast}
              setConfirmModal={setConfirmModal}
              currentUser={currentUser}
            />
          </div>
        )}

        {/* TAB 4: BROADCAST SYSTEM */}
        {activeTab === "announcements" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs space-y-4">
              <div className="flex items-center gap-1.5 border-b border-slate-50 pb-2.5 select-none">
                <Megaphone className="text-[#0056D2]" size={18} />
                <h2 className="text-xs font-black text-slate-800">Broadcast Announcement</h2>
              </div>

              {annSuccess && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-[11px] text-emerald-800 font-bold flex items-center gap-2 animate-fade-in select-none">
                  <CheckCircle className="text-emerald-500" size={16} />
                  Announcement successfully broadcast to all registered users!
                </div>
              )}

              <form onSubmit={handleSendAnnouncement} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Announcement Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. App Maintenance Scheduled"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#0056D2]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Detailed Content</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Type the message details. This will be sent as an instant in-app notification and message to all users in the marketplace..."
                    value={annText}
                    onChange={(e) => setAnnText(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#0056D2]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sendingAnn || !annTitle || !annText}
                  className="w-full bg-[#0056D2] hover:bg-blue-700 disabled:opacity-50 text-white font-black py-2.5 rounded-full text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md select-none mt-4"
                >
                  <Megaphone size={14} />
                  {sendingAnn ? "Sending Announcement..." : "Broadcast Message"}
                </button>
              </form>
            </div>

            {/* Announcement History */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-50 pb-2.5 select-none">
                <div className="flex items-center gap-1.5">
                  <Clock className="text-[#0056D2]" size={16} />
                  <h2 className="text-xs font-black text-slate-800">Sent Announcements History ({announcementsList.length})</h2>
                </div>
                <button
                  onClick={loadAnnouncements}
                  disabled={loadingAnn}
                  className="p-1.5 hover:bg-slate-50 text-slate-500 rounded-lg transition-all cursor-pointer"
                  title="Refresh Announcement History"
                >
                  <RefreshCw size={14} className={loadingAnn ? "animate-spin" : ""} />
                </button>
              </div>

              {loadingAnn ? (
                <div className="py-6 text-center text-xs text-slate-400 font-bold flex flex-col items-center gap-2">
                  <RefreshCw className="animate-spin text-[#0056D2]" size={18} />
                  Loading announcements history...
                </div>
              ) : announcementsList.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400 font-medium">No previous broadcast announcements found.</p>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {announcementsList.map((ann, idx) => (
                    <div key={`${ann.id || 'ann'}-${idx}`} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-black text-slate-800">{ann.title}</h4>
                        <span className="text-[9px] text-slate-400 shrink-0 font-medium">
                          {new Date(ann.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">{ann.text}</p>
                      <div className="flex items-center justify-end pt-1">
                        <button
                          onClick={() => handleDeleteAnnouncement(ann.id, ann.title)}
                          className="text-[10px] text-rose-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: APP VERSION MANAGEMENT */}
        {activeTab === "version" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs space-y-4 text-left">
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h2 className="text-xs font-black text-slate-800">App Version & Update Configuration</h2>
                    <p className="text-[10px] text-slate-400">Manage release metadata stored in Firestore document app_config/version</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={loadVersionData}
                  disabled={loadingVersion}
                  className="p-1.5 hover:bg-slate-50 text-slate-600 rounded-xl transition-all cursor-pointer border border-slate-200"
                  title="Reload version from Firestore"
                >
                  <RefreshCw size={14} className={loadingVersion ? "animate-spin" : ""} />
                </button>
              </div>

              {(vUpdatedAt || vUpdatedBy) && (
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-[11px] text-slate-600 font-mono space-y-1">
                  {vUpdatedBy && (
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-700">Updated By:</span>
                      <span className="bg-blue-100 text-[#0056D2] px-2 py-0.5 rounded text-[10px] font-semibold">{vUpdatedBy}</span>
                    </div>
                  )}
                  {vUpdatedAt && (
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-700">Last Server Timestamp:</span>
                      <span className="text-slate-800">{vUpdatedAt}</span>
                    </div>
                  )}
                </div>
              )}

              {versionError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 font-medium flex items-center justify-between animate-fade-in">
                  <span>{versionError}</span>
                  <button type="button" onClick={() => setVersionError(null)} className="font-bold underline text-rose-600 shrink-0 ml-2">Dismiss</button>
                </div>
              )}

              {versionSaveSuccess && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-[11px] text-emerald-800 font-bold flex items-center gap-2 animate-fade-in select-none">
                  <CheckCircle className="text-emerald-500" size={16} />
                  App version configuration updated successfully in Firestore!
                </div>
              )}

              <form onSubmit={handleSaveVersionConfig} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                      Latest Version (latestVersion)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 1.1.0"
                      value={vLatestVersion}
                      onChange={(e) => setVLatestVersion(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-[#0056D2]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                      Minimum Supported (minimumSupportedVersion)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 1.0.0"
                      value={vMinVersion}
                      onChange={(e) => setVMinVersion(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-[#0056D2]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl">
                  <input
                    type="checkbox"
                    id="forceUpdateCheck"
                    checked={vForceUpdate}
                    onChange={(e) => setVForceUpdate(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="forceUpdateCheck" className="text-xs font-bold text-amber-900 cursor-pointer">
                    Force Update Required (forceUpdate)
                    <span className="block text-[10px] text-amber-700 font-normal mt-0.5">
                      When enabled, users cannot dismiss the update dialog or continue using the app until they update.
                    </span>
                  </label>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                    APK Download URL (apkDownloadUrl)
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://autopartsindia.app/download/app-latest.apk"
                    value={vApkUrl}
                    onChange={(e) => setVApkUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#0056D2]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                    Release Date (releaseDate)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2026-07-22"
                    value={vReleaseDate}
                    onChange={(e) => setVReleaseDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#0056D2]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                    Release Notes (releaseNotes)
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe changes in this update..."
                    value={vReleaseNotes}
                    onChange={(e) => setVReleaseNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#0056D2]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingVersion}
                  className="w-full bg-[#0056D2] hover:bg-blue-700 disabled:opacity-50 text-white font-black py-2.5 rounded-full text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md select-none mt-4"
                >
                  <Sparkles size={14} />
                  {savingVersion ? "Saving Version Config..." : "Publish App Update Config"}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>

      {/* Confirmation Modal Overlay */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in select-none">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl shrink-0 ${confirmModal.isDanger ? "bg-rose-100 text-rose-600" : "bg-blue-100 text-[#0056D2]"}`}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">{confirmModal.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed font-medium">
                  {confirmModal.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const action = confirmModal.onConfirm;
                  setConfirmModal(null);
                  await action();
                }}
                className={`px-4 py-2 rounded-full font-bold text-xs text-white cursor-pointer shadow-xs transition-all ${
                  confirmModal.isDanger ? "bg-rose-600 hover:bg-rose-700" : "bg-[#0056D2] hover:bg-blue-700"
                }`}
              >
                {confirmModal.confirmText || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail View Modal Overlay */}
      {detailModalPart && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in select-none">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-black text-sm text-slate-800">Listing Details</h3>
              <button 
                onClick={() => setDetailModalPart(null)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Image Preview */}
              <div className="h-48 w-full bg-slate-100 rounded-2xl overflow-hidden border border-slate-100 flex items-center justify-center relative">
                {(detailModalPart.imageUrls && detailModalPart.imageUrls[0]) || detailModalPart.imageUrl ? (
                  <img 
                    src={(detailModalPart.imageUrls && detailModalPart.imageUrls[0]) || detailModalPart.imageUrl} 
                    alt={detailModalPart.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Car size={40} className="text-slate-300" />
                )}
                {detailModalPart.sold && (
                  <div className="absolute top-2 right-2 bg-emerald-600 text-white font-black text-[9px] px-2 py-0.5 rounded-full uppercase">
                    Sold
                  </div>
                )}
              </div>

              {/* Title & Price */}
              <div>
                <h2 className="font-bold text-base text-slate-900 leading-tight">{detailModalPart.title}</h2>
                <p className="font-black text-lg text-[#0056D2] mt-0.5">₹{detailModalPart.price.toLocaleString("en-IN")}</p>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5">
                {detailModalPart.featured && (
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Star size={10} className="fill-amber-500" /> Featured
                  </span>
                )}
                {detailModalPart.verified && (
                  <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck size={10} /> Verified
                  </span>
                )}
                {detailModalPart.approved === false || detailModalPart.status === "pending" ? (
                  <span className="bg-orange-100 text-orange-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Pending Approval
                  </span>
                ) : (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Approved
                  </span>
                )}
                {detailModalPart.sold && (
                  <span className="bg-slate-200 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Sold Out
                  </span>
                )}
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Brand & Model</span>
                  <span className="font-bold text-slate-800">{detailModalPart.carBrand} {detailModalPart.carModel}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Category</span>
                  <span className="font-bold text-slate-800">{detailModalPart.category}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Condition</span>
                  <span className="font-bold text-slate-800">{detailModalPart.condition || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Location</span>
                  <span className="font-bold text-slate-800">{[detailModalPart.district, detailModalPart.state || detailModalPart.location].filter(Boolean).join(", ")}</span>
                </div>
              </div>

              {/* Seller details */}
              <div className="bg-blue-50/60 border border-blue-100 p-3 rounded-2xl text-xs space-y-1">
                <span className="text-[10px] text-blue-600 font-black uppercase tracking-wider block">Seller Information</span>
                <p className="font-bold text-slate-800">{detailModalPart.contactName}</p>
                <p className="text-slate-600">Email: {detailModalPart.sellerEmail || "N/A"}</p>
                <p className="text-slate-600">Phone: {detailModalPart.contactPhone || "N/A"}</p>
                <button
                  onClick={() => {
                    const sellerId = detailModalPart.sellerId;
                    const sellerName = detailModalPart.contactName;
                    setDetailModalPart(null);
                    setSellerProfileModal({ id: sellerId, name: sellerName });
                  }}
                  className="mt-1 text-[11px] font-bold text-[#0056D2] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <UserCheck size={12} /> View Full Seller Profile
                </button>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Description</span>
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100 whitespace-pre-wrap">
                  {detailModalPart.description || "No description provided."}
                </p>
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2 rounded-b-3xl">
              <button
                onClick={() => {
                  const p = detailModalPart;
                  setDetailModalPart(null);
                  setEditingModalPart(p);
                }}
                className="px-3 py-1.5 bg-[#0056D2] text-white rounded-full font-bold text-xs hover:bg-blue-700 cursor-pointer flex items-center gap-1"
              >
                <Edit2 size={12} /> Edit Listing
              </button>
              <button
                onClick={() => {
                  const p = detailModalPart;
                  handlePermanentDelete(p);
                }}
                className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-full font-bold text-xs cursor-pointer flex items-center gap-1"
              >
                <Trash2 size={12} /> Delete Listing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Listing Modal */}
      {editingModalPart && (
        <EditListingModal
          part={editingModalPart}
          onClose={() => setEditingModalPart(null)}
          onSave={async (partId, updates) => {
            try {
              const success = await updateSparePartListing(partId, updates);
              if (success) {
                showToast("Listing updated successfully!");
                setEditingModalPart(null);
                onPartUpdated();
              } else {
                showToast("Failed to update listing.", "error");
              }
            } catch (err: any) {
              showToast("Error updating listing: " + (err?.message || err), "error");
            }
          }}
          onDelete={async (partId) => {
            try {
              const success = await deleteSparePartListing(partId);
              if (success) {
                showToast("Listing deleted successfully!");
                setEditingModalPart(null);
                onPartUpdated();
              } else {
                showToast("Failed to delete listing.", "error");
              }
            } catch (err: any) {
              showToast("Error deleting listing: " + (err?.message || err), "error");
            }
          }}
        />
      )}

      {/* Seller Profile Modal */}
      {sellerProfileModal && (
        <SellerProfileView
          sellerId={sellerProfileModal.id}
          sellerName={sellerProfileModal.name}
          currentUser={currentUser}
          onClose={() => setSellerProfileModal(null)}
          allParts={allParts}
          onSelectPart={(part) => {
            setSellerProfileModal(null);
            setDetailModalPart(part);
          }}
        />
      )}

      {/* Edit User Profile Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in select-none">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-800">Edit User Account</h3>
              <button 
                onClick={() => setEditingUser(null)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-500 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveUserEdit} className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#0056D2]"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Email Address</label>
                <input
                  type="email"
                  required
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#0056D2]"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Phone Number</label>
                <input
                  type="text"
                  value={editingUser.phone || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#0056D2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">District</label>
                  <input
                    type="text"
                    value={editingUser.district || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, district: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#0056D2]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">State</label>
                  <input
                    type="text"
                    value={editingUser.state || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, state: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#0056D2]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full bg-[#0056D2] hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
