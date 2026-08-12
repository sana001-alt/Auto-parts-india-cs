import React, { useState, useEffect, useCallback, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { 
  Home as HomeIcon, 
  PlusCircle, 
  Plus,
  User as UserIcon,
  Compass,
  Sparkles,
  Info,
  Calendar,
  X,
  Phone,
  MessageSquare,
  Car,
  MapPin,
  Maximize2,
  Star,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Share2,
  Heart,
  Image as ImageIcon,
  Tag,
  Trash2,
  Loader2,
  Navigation,
  CheckCircle2
} from "lucide-react";
import AuthScreen from "./components/AuthScreen";
import HomeScreen from "./components/HomeScreen";
import SellScreen from "./components/SellScreen";
import { formatLocationName } from "./utils/locationHelper";
import ProfileScreen from "./components/ProfileScreen";
import ChatsScreen from "./components/ChatsScreen";
import ChatRoomWindow from "./components/ChatRoomWindow";
import ImageGalleryModal from "./components/ImageGalleryModal";
import InAppNotification from "./components/InAppNotification";
import SellerProfileView from "./components/SellerProfileView";
import GMap from "./components/GMap";
import NotificationsScreen from "./components/NotificationsScreen";
import AdminDashboardScreen from "./components/AdminDashboardScreen";
import { User, SparePart, Chat, Message, AppVersionConfig, Announcement } from "./types";
import { fetchSpareParts, subscribeToAuth, getOrCreateChat, fetchUserChats, fetchSellerReviews, updateSparePartListing, updateUserProfile, subscribeToUserChats, subscribeToSpareParts, deleteSparePartListing, subscribeToUserNotifications, markChatNotificationsAsRead, subscribeToUserFavorites, addFavorite, removeFavorite, markMessagesAsDelivered, fetchAppVersionConfig, setUserPresence, subscribeToAnnouncements, registerFCMToken, setupFCMForegroundListener, saveFCMNotificationToFirestore } from "./lib/firebase";
import { playNotificationSound, triggerVibration, showPushNotification, requestNotificationPermission } from "./utils/audioNotification";
import { CURRENT_APP_VERSION, evaluateUpdateStatus } from "./utils/versionUtils";
import { UpdateDialogModal } from "./components/UpdateDialogModal";
import { motion, AnimatePresence } from "motion/react";
import EditListingModal from "./components/EditListingModal";
import SplashScreen from "./components/SplashScreen";
import { useLanguage } from "./lib/LanguageContext";
import { translateDynamic } from "./lib/translations";
import BrandLogo from "./components/BrandLogo";
import { initFCMService, FCMNotificationData } from "./lib/fcmService";

export type NavScreen = 
  | { type: "tab"; tab: "home" | "chats" | "sell" | "myads" | "account" }
  | { type: "chat_room"; chat: Chat }
  | { type: "part_detail"; part: SparePart }
  | { type: "admin_dashboard" }
  | { type: "notifications" };

export function screenToPath(screen: NavScreen): string {
  if (!screen) return "/";
  switch (screen.type) {
    case "tab":
      return screen.tab === "home" ? "/" : `/${screen.tab}`;
    case "chat_room":
      if (screen.chat.sellerId && screen.chat.partId) {
        return `/chat?sellerId=${screen.chat.sellerId}&listingId=${screen.chat.partId}`;
      }
      return `/chat/${screen.chat.id}`;
    case "part_detail":
      return `/part/${screen.part.id}`;
    case "admin_dashboard":
      return "/admin";
    case "notifications":
      return "/notifications";
    default:
      return "/";
  }
}

function parseInitialScreenFromUrl(): NavScreen[] {
  try {
    const pathname = window.location.pathname;
    const search = new URLSearchParams(window.location.search);
    const partQuery = search.get("part");
    const sellerIdQuery = search.get("sellerId");
    const listingIdQuery = search.get("listingId");

    if (sellerIdQuery && listingIdQuery) {
      return [
        { type: "tab", tab: "home" },
        { 
          type: "chat_room", 
          chat: { 
            id: `query_${sellerIdQuery}_${listingIdQuery}`, 
            partId: listingIdQuery, 
            buyerId: "", 
            sellerId: sellerIdQuery, 
            partTitle: "Chat", 
            partPrice: 0, 
            partImageUrl: "", 
            sellerName: "Seller", 
            buyerName: "Buyer", 
            lastMessageText: "", 
            lastMessageAt: Date.now() 
          } 
        }
      ];
    }

    if (partQuery) {
      return [
        { type: "tab", tab: "home" },
        { 
          type: "part_detail", 
          part: { id: partQuery, title: "Loading...", price: 0, category: "", carBrand: "", carModel: "", description: "", condition: "Used (Good)", location: "", imageUrl: "", sellerId: "", sellerEmail: "", contactName: "", contactPhone: "", state: "", district: "", status: "approved", createdAt: Date.now() } 
        }
      ];
    }

    if (pathname.startsWith("/part/")) {
      const partId = pathname.substring("/part/".length).trim();
      if (partId) {
        return [
          { type: "tab", tab: "home" },
          { 
            type: "part_detail", 
            part: { id: partId, title: "Loading...", price: 0, category: "", carBrand: "", carModel: "", description: "", condition: "Used (Good)", location: "", imageUrl: "", sellerId: "", sellerEmail: "", contactName: "", contactPhone: "", state: "", district: "", status: "approved", createdAt: Date.now() } 
          }
        ];
      }
    }

    if (pathname.startsWith("/chat/")) {
      const chatId = pathname.substring("/chat/".length).trim();
      if (chatId) {
        return [
          { type: "tab", tab: "home" },
          { 
            type: "chat_room", 
            chat: { id: chatId, partId: "", buyerId: "", sellerId: "", partTitle: "", partPrice: 0, partImageUrl: "", sellerName: "", buyerName: "", lastMessageText: "", lastMessageAt: Date.now() } 
          }
        ];
      }
    }

    const lower = pathname.toLowerCase();
    if (lower === "/chats") return [{ type: "tab", tab: "home" }, { type: "tab", tab: "chats" }];
    if (lower === "/sell") return [{ type: "tab", tab: "home" }, { type: "tab", tab: "sell" }];
    if (lower === "/myads") return [{ type: "tab", tab: "home" }, { type: "tab", tab: "myads" }];
    if (lower === "/account") return [{ type: "tab", tab: "home" }, { type: "tab", tab: "account" }];
    if (lower === "/admin") return [{ type: "tab", tab: "home" }, { type: "admin_dashboard" }];
    if (lower === "/notifications") return [{ type: "tab", tab: "home" }, { type: "notifications" }];
  } catch (e) {
    console.error("Error parsing initial route:", e);
  }

  return [{ type: "tab", tab: "home" }];
}

export default function App() {
  const { t, language } = useLanguage();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [logoutMessage, setLogoutMessage] = useState<string | null>(null);

  const [navStack, setNavStack] = useState<NavScreen[]>(() => {
    const initial = parseInitialScreenFromUrl();
    const top = initial[initial.length - 1];
    const path = screenToPath(top);
    try {
      window.history.replaceState({ index: initial.length - 1, screen: top }, "", path);
    } catch (e) {}
    return initial;
  });

  const currentScreen = navStack[navStack.length - 1] || { type: "tab", tab: "home" };

  const activeTab = (() => {
    for (let i = navStack.length - 1; i >= 0; i--) {
      if (navStack[i].type === "tab") {
        return (navStack[i] as { type: "tab"; tab: "home" | "chats" | "sell" | "myads" | "account" }).tab;
      }
    }
    return "home";
  })();

  const activeChat = currentScreen.type === "chat_room" ? currentScreen.chat : null;
  const detailedPart = currentScreen.type === "part_detail" ? currentScreen.part : null;
  const showAdminDashboard = currentScreen.type === "admin_dashboard";

  const pushScreen = useCallback((screen: NavScreen) => {
    setNavStack((prev) => {
      const top = prev[prev.length - 1];
      if (top) {
        if (top.type === "tab" && screen.type === "tab" && top.tab === screen.tab) return prev;
        if (top.type === "chat_room" && screen.type === "chat_room" && top.chat.id === screen.chat.id) return prev;
        if (top.type === "part_detail" && screen.type === "part_detail" && top.part.id === screen.part.id) return prev;
        if (top.type === "admin_dashboard" && screen.type === "admin_dashboard") return prev;
        if (top.type === "notifications" && screen.type === "notifications") return prev;
      }
      const nextStack = [...prev, screen];
      const path = screenToPath(screen);
      try {
        window.history.pushState({ index: nextStack.length - 1, screen }, "", path);
      } catch (e) {
        console.warn("Failed to push history state:", e);
      }
      return nextStack;
    });
  }, []);

  const goBack = useCallback(() => {
    if (window.history.state && typeof window.history.state.index === "number" && window.history.state.index > 0) {
      window.history.back();
    } else {
      setNavStack((prev) => {
        if (prev.length > 1) {
          const nextStack = prev.slice(0, -1);
          const topScreen = nextStack[nextStack.length - 1];
          const nextPath = screenToPath(topScreen);
          try {
            window.history.replaceState({ index: nextStack.length - 1, screen: topScreen }, "", nextPath);
          } catch (e) {}
          return nextStack;
        }
        return [{ type: "tab", tab: "home" }];
      });
    }
  }, []);

  const [showSplash, setShowSplash] = useState(true);
  const [parts, setParts] = useState<SparePart[]>([]);
  const [partsLoading, setPartsLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [detailImageIndex, setDetailImageIndex] = useState(0);

  const [activeNotification, setActiveNotification] = useState<{ chat: Chat; text: string; id: string } | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);

  useEffect(() => {
    setAnnouncementsLoading(true);
    const unsub = subscribeToAnnouncements(currentUser?.id || null, (list) => {
      setAnnouncements(list);
      setAnnouncementsLoading(false);
    });
    return () => unsub();
  }, [currentUser?.id]);

  const unreadAnnouncementsCount = announcements.filter((a) => !a.isRead).length;

  const [detailedSellerRating, setDetailedSellerRating] = useState<{ average: number; count: number } | null>(null);
  const [showShareToast, setShowShareToast] = useState(false);
  const [showDetailedReviews, setShowDetailedReviews] = useState(false);

  const [versionConfig, setVersionConfig] = useState<AppVersionConfig | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isForceUpdate, setIsForceUpdate] = useState(false);

  useEffect(() => {
    const checkVersionOnLaunch = async () => {
      try {
        const config = await fetchAppVersionConfig();
        setVersionConfig(config);
        const result = evaluateUpdateStatus(CURRENT_APP_VERSION, config);
        if (result.hasUpdate) {
          setShowUpdateModal(true);
          setIsForceUpdate(result.isForceUpdate);
        }
      } catch (err) {
        console.warn("Initial app version check warning:", err);
      }
    };
    checkVersionOnLaunch();
  }, []);

  const currentUserRef = React.useRef<User | null>(null);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    if (parts.length > 0) {
      setNavStack((prev) =>
        prev.map((item) => {
          if (item.type === "part_detail" && (item.part.title === "Loading..." || !item.part.contactName)) {
            const found = parts.find((p) => p.id === item.part.id);
            if (found) {
              return { ...item, part: found };
            }
          }
          return item;
        })
      );
    }
  }, [parts]);

  const [editingPart, setEditingPart] = useState<SparePart | null>(null);
  const [deletingPart, setDeletingPart] = useState<SparePart | null>(null);
  const [isDeletingPart, setIsDeletingPart] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Keep fresh refs for hardware back button handler
  const navStackRef = useRef(navStack);
  const isGalleryOpenRef = useRef(isGalleryOpen);
  const editingPartRef = useRef(editingPart);
  const deletingPartRef = useRef(deletingPart);
  const showDetailedReviewsRef = useRef(showDetailedReviews);
  const showUpdateModalRef = useRef(showUpdateModal);
  const isForceUpdateRef = useRef(isForceUpdate);

  useEffect(() => { navStackRef.current = navStack; }, [navStack]);
  useEffect(() => { isGalleryOpenRef.current = isGalleryOpen; }, [isGalleryOpen]);
  useEffect(() => { editingPartRef.current = editingPart; }, [editingPart]);
  useEffect(() => { deletingPartRef.current = deletingPart; }, [deletingPart]);
  useEffect(() => { showDetailedReviewsRef.current = showDetailedReviews; }, [showDetailedReviews]);
  useEffect(() => { showUpdateModalRef.current = showUpdateModal; }, [showUpdateModal]);
  useEffect(() => { isForceUpdateRef.current = isForceUpdate; }, [isForceUpdate]);

  useEffect(() => {
    const onPopState = () => {
      if (deletingPartRef.current) {
        setDeletingPart(null);
        return;
      }
      if (showUpdateModalRef.current) {
        if (!isForceUpdateRef.current) {
          setShowUpdateModal(false);
        }
        return;
      }
      if (isGalleryOpenRef.current) {
        setIsGalleryOpen(false);
        return;
      }
      if (editingPartRef.current) {
        setEditingPart(null);
        return;
      }
      if (showDetailedReviewsRef.current) {
        setShowDetailedReviews(false);
        return;
      }
      setNavStack((prevStack) => {
        if (prevStack.length > 1) {
          const nextStack = prevStack.slice(0, -1);
          const topScreen = nextStack[nextStack.length - 1];
          const targetPath = screenToPath(topScreen);
          if (window.location.pathname !== targetPath) {
            try {
              window.history.replaceState(
                { index: nextStack.length - 1, screen: topScreen },
                "",
                targetPath
              );
            } catch (e) {}
          }
          return nextStack;
        }
        return prevStack;
      });
    };

    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  // Native Android Hardware Back Button Listener
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let backListenerHandle: any = null;
    const registerBackListener = async () => {
      backListenerHandle = await CapacitorApp.addListener("backButton", () => {
        // 1. Modals first
        if (showUpdateModalRef.current) {
          if (!isForceUpdateRef.current) {
            setShowUpdateModal(false);
          }
          return;
        }

        if (isGalleryOpenRef.current) {
          setIsGalleryOpen(false);
          return;
        }

        if (editingPartRef.current) {
          setEditingPart(null);
          return;
        }

        if (showDetailedReviewsRef.current) {
          setShowDetailedReviews(false);
          return;
        }

        // 2. Navigation stack
        const currentStack = navStackRef.current;
        if (currentStack.length > 1) {
          goBack();
          return;
        }

        // 3. Root stack level
        const topScreen = currentStack[0];
        if (topScreen && topScreen.type === "tab" && topScreen.tab !== "home") {
          setNavStack([{ type: "tab", tab: "home" }]);
          return;
        }

        // 4. On Home tab - exit/minimize app natively
        CapacitorApp.minimizeApp();
      });
    };

    registerBackListener();

    return () => {
      if (backListenerHandle && typeof backListenerHandle.remove === "function") {
        backListenerHandle.remove();
      }
    };
  }, [goBack]);

  const handleSaveListingChanges = async (partId: string, updates: Partial<SparePart>) => {
    try {
      const ok = await updateSparePartListing(partId, updates);
      if (ok) {
        setEditingPart(null);
        setNavStack(prev => prev.map(item => {
          if (item.type === "part_detail" && item.part.id === partId) {
            return { ...item, part: { ...item.part, ...updates } };
          }
          return item;
        }));
      }
    } catch (err: any) {
      setDeleteError(err.message || "Failed to update listing.");
    }
  };

  useEffect(() => {
    const updateRating = () => {
      const sId = detailedPart?.sellerId;
      if (sId) {
        fetchSellerReviews(sId).then((revs) => {
          const count = revs.length;
          const average = count > 0 
            ? parseFloat((revs.reduce((sum, r) => sum + r.rating, 0) / count).toFixed(1))
            : 0;
          setDetailedSellerRating({ average, count });
        });
      } else {
        setDetailedSellerRating(null);
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
  }, [detailedPart]);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setFavorites([]);
      return;
    }

    const unsubscribe = subscribeToUserFavorites(
      currentUser.id,
      (userFavorites) => {
        setFavorites(userFavorites);
      },
      (err) => {
        console.error("Error subscribing to user favorites:", err);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    requestNotificationPermission();
    setUserPresence(currentUser.id, true);

    const handleOnline = () => setUserPresence(currentUser.id, true);
    const handleOffline = () => setUserPresence(currentUser.id, false);
    const handleVisibility = () => {
      if (document.hidden) {
        setUserPresence(currentUser.id, false);
      } else {
        setUserPresence(currentUser.id, true);
      }
    };
    const handleBeforeUnload = () => setUserPresence(currentUser.id, false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      setUserPresence(currentUser.id, false);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) return;

    let cleanupFCM: (() => void) | null = null;

    const handleFCMNavigation = (data: FCMNotificationData) => {
      console.log("[FCM Navigation] Notification clicked, navigating with data:", data);
      if (data.chatId) {
        const chatObj: Chat = {
          id: data.chatId,
          partId: data.partId || data.chatId.split("_")[2] || "",
          partTitle: data.partTitle || "Auto Part",
          partImageUrl: data.partImageUrl || "",
          partPrice: Number(data.partPrice) || 0,
          buyerId: data.buyerId || "",
          buyerName: data.buyerName || "Buyer",
          sellerId: data.sellerId || "",
          sellerName: data.sellerName || "Seller",
          lastMessageText: data.lastMessageText || "",
          lastMessageAt: Date.now(),
          lastSenderId: data.senderId || ""
        };
        pushScreen({ type: "chat_room", chat: chatObj });
      } else if (data.partId) {
        const foundPart = parts.find((p) => p.id === data.partId);
        if (foundPart) {
          pushScreen({ type: "part_detail", part: foundPart });
        } else {
          pushScreen({
            type: "part_detail",
            part: {
              id: data.partId,
              title: data.partTitle || "Loading...",
              price: Number(data.partPrice) || 0,
              category: "",
              carBrand: "",
              carModel: "",
              description: "",
              condition: "Used (Good)",
              location: "",
              imageUrl: data.partImageUrl || "",
              sellerId: data.sellerId || "",
              sellerEmail: "",
              contactName: "",
              contactPhone: "",
              state: "",
              district: "",
              status: "approved",
              createdAt: Date.now()
            }
          });
        }
      } else if (data.screen === "chats") {
        pushScreen({ type: "tab", tab: "chats" });
      } else if (data.screen === "myads") {
        pushScreen({ type: "tab", tab: "myads" });
      } else if (data.screen === "notifications") {
        pushScreen({ type: "notifications" });
      } else {
        pushScreen({ type: "notifications" });
      }
    };

    const handleFCMInAppBanner = (title: string, body: string, data: FCMNotificationData) => {
      const chatId = data.chatId;
      if (chatId) {
        const chatObj: Chat = {
          id: chatId,
          partId: data.partId || chatId.split("_")[2] || "",
          partTitle: data.partTitle || "Auto Part",
          partImageUrl: data.partImageUrl || "",
          partPrice: Number(data.partPrice) || 0,
          buyerId: data.buyerId || "",
          buyerName: data.buyerName || "Buyer",
          sellerId: data.sellerId || "",
          sellerName: data.sellerName || "Seller",
          lastMessageText: body,
          lastMessageAt: Date.now(),
          lastSenderId: data.senderId || ""
        };

        setActiveNotification({
          chat: chatObj,
          text: body,
          id: `fcm_${Date.now()}`
        });
      } else {
        setActiveNotification({
          chat: {
            id: `general_${Date.now()}`,
            partId: data.partId || "",
            partTitle: title,
            partImageUrl: data.partImageUrl || "",
            partPrice: Number(data.partPrice) || 0,
            buyerId: "",
            buyerName: title,
            sellerId: "",
            sellerName: "",
            lastMessageText: body,
            lastMessageAt: Date.now(),
            lastSenderId: ""
          },
          text: body,
          id: `fcm_${Date.now()}`
        });
      }

      try {
        playNotificationSound();
        triggerVibration();
      } catch (e) {}
    };

    initFCMService(currentUser.id, handleFCMNavigation, handleFCMInAppBanner).then((cleanup) => {
      cleanupFCM = cleanup;
    });

    const handleCustomNavigate = (e: any) => {
      if (e.detail) {
        handleFCMNavigation(e.detail);
      }
    };

    const handleCustomBanner = (e: any) => {
      if (e.detail) {
        handleFCMInAppBanner(e.detail.title || "Notification", e.detail.body || "", e.detail.data || {});
      }
    };

    window.addEventListener("fcm_navigate_screen", handleCustomNavigate);
    window.addEventListener("fcm_inapp_notification", handleCustomBanner);

    return () => {
      if (cleanupFCM) cleanupFCM();
      window.removeEventListener("fcm_navigate_screen", handleCustomNavigate);
      window.removeEventListener("fcm_inapp_notification", handleCustomBanner);
    };
  }, [currentUser?.id, parts, pushScreen]);

  useEffect(() => {
    if (!currentUser) {
      setUnreadCounts({});
      return;
    }

    const unsubscribe = subscribeToUserNotifications(
      currentUser.id,
      (notifications) => {
        const nextUnreadCounts: Record<string, number> = {};
        const uniqueChatsToMarkDelivered = new Set<string>();
        
        notifications.forEach((notification) => {
          nextUnreadCounts[notification.chatId] = (nextUnreadCounts[notification.chatId] || 0) + 1;
          
          if (!activeChat || activeChat.id !== notification.chatId) {
            uniqueChatsToMarkDelivered.add(notification.chatId);
          }
          
          const isFresh = Date.now() - notification.createdAt < 30000;
          const lastNotifiedAtStr = sessionStorage.getItem(`autoparts_notified_at_${notification.chatId}`);
          const lastNotifiedAt = lastNotifiedAtStr ? parseInt(lastNotifiedAtStr, 10) : 0;
          
          if (isFresh && notification.createdAt > lastNotifiedAt) {
            sessionStorage.setItem(`autoparts_notified_at_${notification.chatId}`, notification.createdAt.toString());
            
            const chatObj: Chat = {
              id: notification.chatId,
              partId: notification.chatId.split("_")[2] || "",
              partTitle: notification.partTitle,
              partImageUrl: notification.partImageUrl,
              partPrice: notification.partPrice,
              buyerId: notification.buyerId,
              buyerName: notification.buyerName,
              sellerId: notification.sellerId,
              sellerName: notification.sellerName,
              lastMessageText: notification.text,
              lastMessageAt: notification.createdAt,
              lastSenderId: notification.senderId
            };
            
            setActiveNotification({
              chat: chatObj,
              text: notification.text,
              id: notification.id
            });

            playNotificationSound();
            triggerVibration([150, 60, 150]);

            const senderName = notification.senderId === notification.buyerId ? notification.buyerName : notification.sellerName;
            showPushNotification({
              title: `💬 New Message from ${senderName}`,
              body: notification.text,
              icon: notification.partImageUrl || "/favicon.ico",
              tag: `chat_${notification.chatId}`,
              onClick: () => {
                pushScreen({ type: "tab", tab: "chats" });
                pushScreen({ type: "chat_room", chat: chatObj });
              }
            });
          }
        });

        uniqueChatsToMarkDelivered.forEach((chatId) => {
          markMessagesAsDelivered(chatId, currentUser.id);
        });
        
        setUnreadCounts(nextUnreadCounts);
      },
      (err) => {
        console.error("Error subscribing to user notifications:", err);
      }
    );

    return () => unsubscribe();
  }, [currentUser, activeChat]);

  useEffect(() => {
    if (activeChat && currentUser) {
      markChatNotificationsAsRead(activeChat.id, currentUser.id);
      
      if (activeNotification && activeNotification.chat.id === activeChat.id) {
        setActiveNotification(null);
      }
    }
  }, [activeChat, currentUser, unreadCounts, activeNotification]);

  useEffect(() => {
    setPartsLoading(true);
    const unsubscribe = subscribeToSpareParts(
      (data) => {
        setParts(data);
        setPartsLoading(false);
      },
      (err) => {
        console.error("Failed to listen to spare parts updates", err);
        setPartsLoading(false);
      }
    );

    const handleCustomUpdate = async () => {
      try {
        const data = await fetchSpareParts();
        setParts(data);
      } catch (e) {
        console.warn("Failed to reload parts on custom update:", e);
      }
    };

    window.addEventListener("autoparts_listings_updated", handleCustomUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener("autoparts_listings_updated", handleCustomUpdate);
    };
  }, []);

  const loadPartsData = async () => {
    try {
      const data = await fetchSpareParts();
      setParts(data);
    } catch (err) {
      console.error("Failed to manual load spare parts:", err);
    }
  };

  const handleFavoriteToggle = async (partId: string) => {
    if (!currentUser) {
      let updatedFavorites: string[];
      if (favorites.includes(partId)) {
        updatedFavorites = favorites.filter((id) => id !== partId);
      } else {
        updatedFavorites = [...favorites, partId];
      }
      setFavorites(updatedFavorites);
      localStorage.setItem("autoparts_favorites", JSON.stringify(updatedFavorites));
      return;
    }

    try {
      if (favorites.includes(partId)) {
        await removeFavorite(currentUser.id, partId);
      } else {
        await addFavorite(currentUser.id, partId);
      }
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    }
  };

  const handlePublishSuccess = (newPart: SparePart) => {
    setParts((prevParts) => {
      if (prevParts.some(p => p.id === newPart.id)) return prevParts;
      const titleClean = (newPart.title || "").trim().toLowerCase();
      const descClean = (newPart.description || "").trim().toLowerCase();
      const isDup = prevParts.some(p => 
        p.sellerId === newPart.sellerId &&
        (p.title || "").trim().toLowerCase() === titleClean &&
        p.price === newPart.price &&
        (p.description || "").trim().toLowerCase() === descClean
      );
      if (isDup) return prevParts;
      return [newPart, ...prevParts];
    });
    pushScreen({ type: "tab", tab: "home" });
  };

  const [toastBanner, setToastBanner] = useState<{ text: string; type?: "success" | "error" } | null>(null);

  const showToast = useCallback((text: string, type: "success" | "error" = "success") => {
    setToastBanner({ text, type });
    setTimeout(() => {
      setToastBanner(null);
    }, 3500);
  }, []);

  const handlePartDeleted = async (deletedPartId: string) => {
    try {
      setIsDeletingPart(false);
      setDeletingPart(null);
      setEditingPart(null);

      setParts((prevParts) => prevParts.filter((p) => p.id !== deletedPartId));

      if (favorites.includes(deletedPartId)) {
        if (currentUser) {
          try {
            await removeFavorite(currentUser.id, deletedPartId);
          } catch (err) {
            console.error("Failed to remove deleted part from favorites:", err);
          }
        } else {
          const updated = favorites.filter((id) => id !== deletedPartId);
          setFavorites(updated);
          localStorage.setItem("autoparts_favorites", JSON.stringify(updated));
        }
      }

      // Execute immediate navigation command replacing route to Home screen ("/")
      const homeScreen: NavScreen = { type: "tab", tab: "home" };
      setNavStack([homeScreen]);
      try {
        window.history.replaceState({ index: 0, screen: homeScreen }, "", "/");
      } catch (e) {
        console.warn("Replace state error on deletion:", e);
      }

      showToast("Listing deleted successfully", "success");
    } catch (e: any) {
      console.warn("Error processing part deletion:", e);
    }
  };

  const handleUpdateUser = async (updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem("autoparts_current_user", JSON.stringify(updatedUser));
    const usersRaw = localStorage.getItem("autoparts_users");
    if (usersRaw) {
      const usersList: any[] = JSON.parse(usersRaw);
      const updatedUsers = usersList.map((u) => 
        u.id === updatedUser.id 
          ? { 
              ...u, 
              name: updatedUser.name, 
              phone: updatedUser.phone, 
              state: updatedUser.state, 
              district: updatedUser.district,
              lat: updatedUser.lat,
              lng: updatedUser.lng 
            } 
          : u
      );
      localStorage.setItem("autoparts_users", JSON.stringify(updatedUsers));
    }

    try {
      await updateUserProfile(updatedUser.id, {
        name: updatedUser.name,
        phone: updatedUser.phone,
        state: updatedUser.state,
        district: updatedUser.district,
        lat: updatedUser.lat,
        lng: updatedUser.lng
      });
    } catch (e) {
      console.error("Failed to update user profile in Firestore:", e);
    }
  };

  const handleToggleSold = async (partId: string) => {
    const partToToggle = parts.find(p => p.id === partId);
    if (!partToToggle) return;
    const nextSoldState = !partToToggle.sold;

    await updateSparePartListing(partId, { sold: nextSoldState });

    setParts((prevParts) => 
      prevParts.map((p) => p.id === partId ? { ...p, sold: nextSoldState } : p)
    );
    const localData = localStorage.getItem("autoparts_listings");
    if (localData) {
      const list: SparePart[] = JSON.parse(localData);
      const updated = list.map((p) => p.id === partId ? { ...p, sold: nextSoldState } : p);
      localStorage.setItem("autoparts_listings", JSON.stringify(updated));
    }
    setNavStack(prev => prev.map(item => {
      if (item.type === "part_detail" && item.part.id === partId) {
        return { ...item, part: { ...item.part, sold: nextSoldState } };
      }
      return item;
    }));
  };

  const handleUpdatePrice = async (partId: string, newPrice: number) => {
    await updateSparePartListing(partId, { price: newPrice });
    
    setParts((prevParts) => 
      prevParts.map((p) => p.id === partId ? { ...p, price: newPrice } : p)
    );
    const localData = localStorage.getItem("autoparts_listings");
    if (localData) {
      const list: SparePart[] = JSON.parse(localData);
      const updated = list.map((p) => p.id === partId ? { ...p, price: newPrice } : p);
      localStorage.setItem("autoparts_listings", JSON.stringify(updated));
    }
    setNavStack(prev => prev.map(item => {
      if (item.type === "part_detail" && item.part.id === partId) {
        return { ...item, part: { ...item.part, price: newPrice } };
      }
      return item;
    }));
  };

  const handleAuthSuccess = (user: User) => {
    setLogoutMessage(null);
    setCurrentUser(user);
    loadPartsData();
  };

  const handleLogout = (msg?: string) => {
    setLogoutMessage(msg || "Signed out successfully.");
    setCurrentUser(null);
    setNavStack([{ type: "tab", tab: "home" }]);
  };

  const handleStartChat = async (part: SparePart) => {
    if (!currentUser) {
      alert("Please sign in to message sellers.");
      return;
    }
    try {
      const chat = await getOrCreateChat(part, currentUser);
      pushScreen({ type: "chat_room", chat });
    } catch (err: any) {
      alert(err.message || "Failed to start chat.");
    }
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-slate-950 text-slate-900 flex flex-col items-center justify-center font-sans relative" id="app-root">
      <AnimatePresence>
        {showSplash && (
          <SplashScreen onFinish={() => setShowSplash(false)} />
        )}
      </AnimatePresence>

      {authLoading ? (
        <div className="w-full max-w-md h-[100dvh] flex flex-col items-center justify-center bg-[#0B192C] text-white relative overflow-hidden border-x border-slate-800/20 shadow-2xl" id="splash-screen">
          <div className="flex flex-col items-center justify-center text-center z-10">
            <BrandLogo size="xl" variant="full" theme="dark" showTagline={true} className="mb-6" />
          </div>
          <div className="absolute bottom-12 flex flex-col items-center z-10">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">
              Connecting Marketplace...
            </span>
          </div>
        </div>
      ) : !currentUser ? (
        <div className="w-full max-w-md h-[100dvh] flex flex-col relative overflow-hidden border-x border-slate-800/20 shadow-2xl">
          <AuthScreen 
            onAuthSuccess={handleAuthSuccess} 
            logoutMessage={logoutMessage}
            onClearLogoutMessage={() => setLogoutMessage(null)}
          />
        </div>
      ) : currentUser.isBlocked ? (
        <div className="w-full max-w-md h-[100dvh] flex flex-col items-center justify-center bg-slate-50 text-slate-800 px-6 text-center border-x border-slate-800/20 shadow-2xl" id="suspended-screen">
          <h2 className="text-xl font-black tracking-tight text-slate-900">Account Suspended</h2>
          <p className="text-slate-500 text-xs mt-2 max-w-sm leading-relaxed font-medium">
            Your marketplace account has been suspended by a Super Administrator for policy or terms violations. If you believe this was an error, please contact support.
          </p>
          <button
            onClick={async () => {
              const { signOut: firebaseSignOut } = await import("./lib/firebase");
              await firebaseSignOut();
              handleLogout("Signed out successfully.");
            }}
            className="mt-6 bg-[#0056D2] hover:bg-blue-700 text-white font-black px-6 py-2.5 rounded-full text-xs shadow-md transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      ) : showAdminDashboard && (currentUser.email === "wwwautoparts2@gmail.com") ? (
        <div className="w-full max-w-md h-[100dvh] flex flex-col relative overflow-hidden border-x border-slate-800/20 shadow-2xl">
          <AdminDashboardScreen
            currentUser={currentUser}
            allParts={parts}
            onPartUpdated={async () => {
              const { fetchSpareParts } = await import("./lib/firebase");
              const allParts = await fetchSpareParts();
              setParts(allParts);
            }}
            onBackToApp={goBack}
          />
        </div>
      ) : (
        <div className="w-full max-w-md h-[100dvh] max-h-[100dvh] bg-slate-50 flex flex-col relative overflow-hidden border-x border-slate-800/40 shadow-2xl" id="app-shell">
          
          <InAppNotification
            notification={activeNotification}
            onClose={() => setActiveNotification(null)}
            onClick={(chat) => {
              pushScreen({ type: "tab", tab: "chats" });
              pushScreen({ type: "chat_room", chat });
              setActiveNotification(null);
            }}
          />

          <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col w-full">
            {activeTab === "home" && (
              <div className="absolute inset-0 flex flex-col overflow-hidden">
                <HomeScreen 
                  parts={parts} 
                  loading={partsLoading}
                  favorites={favorites}
                  onFavoriteToggle={handleFavoriteToggle} 
                  onStartChat={handleStartChat}
                  currentUser={currentUser}
                  onPartDeleted={handlePartDeleted}
                  onViewPart={(part) => pushScreen({ type: "part_detail", part })}
                  unreadNotificationCount={unreadAnnouncementsCount}
                  onOpenNotifications={() => pushScreen({ type: "notifications" })}
                />
              </div>
            )}

            {activeTab === "sell" && (
              <div className="absolute inset-0 flex flex-col overflow-hidden">
                <SellScreen 
                  currentUser={currentUser} 
                  onPublishSuccess={handlePublishSuccess} 
                  parts={parts}
                />
              </div>
            )}

            {activeTab === "chats" && (
              <div className="absolute inset-0 flex flex-col overflow-hidden">
                <ChatsScreen
                  currentUser={currentUser}
                  onSelectChat={(chat) => pushScreen({ type: "chat_room", chat })}
                  unreadCounts={unreadCounts}
                />
              </div>
            )}

            {activeTab === "myads" && (
              <div className="absolute inset-0 flex flex-col overflow-hidden">
                <ProfileScreen
                  currentUser={currentUser}
                  activeTab="myads"
                  onTabChange={(tab) => pushScreen({ type: "tab", tab })}
                  onLogout={handleLogout}
                  parts={parts}
                  favorites={favorites}
                  onPartDeleted={handlePartDeleted}
                  onFavoriteToggle={handleFavoriteToggle}
                  onViewPart={(part) => pushScreen({ type: "part_detail", part })}
                  onUpdateUser={handleUpdateUser}
                  onToggleSold={handleToggleSold}
                  onUpdatePrice={handleUpdatePrice}
                  onOpenAdminDashboard={() => pushScreen({ type: "admin_dashboard" })}
                />
              </div>
            )}

            {activeTab === "account" && (
              <div className="absolute inset-0 flex flex-col overflow-hidden">
                <ProfileScreen
                  currentUser={currentUser}
                  activeTab="account"
                  onTabChange={(tab) => pushScreen({ type: "tab", tab })}
                  onLogout={handleLogout}
                  parts={parts}
                  favorites={favorites}
                  onPartDeleted={handlePartDeleted}
                  onFavoriteToggle={handleFavoriteToggle}
                  onViewPart={(part) => pushScreen({ type: "part_detail", part })}
                  onUpdateUser={handleUpdateUser}
                  onToggleSold={handleToggleSold}
                  onUpdatePrice={handleUpdatePrice}
                  onOpenAdminDashboard={() => pushScreen({ type: "admin_dashboard" })}
                />
              </div>
            )}
          </div>

          {/* Bottom Floating Navigation Dock */}
          {!activeChat && (
            <div className="sticky bottom-0 inset-x-0 z-20 px-2 pb-2.5 pt-1 max-w-md mx-auto w-full shrink-0">
              <div className="h-16 bg-white/95 border border-slate-200/90 rounded-2xl flex flex-row items-center justify-around px-1.5 relative shadow-lg">
                {/* Home Tab */}
                <button
                  onClick={() => pushScreen({ type: "tab", tab: "home" })}
                  className="flex-1 flex flex-col items-center justify-center py-1 relative cursor-pointer"
                  id="nav-tab-home"
                >
                  <HomeIcon size={20} className={activeTab === "home" ? "text-slate-900" : "text-slate-600"} />
                  <span className={`text-[10px] mt-0.5 ${activeTab === "home" ? "text-slate-900 font-black" : "text-slate-600 font-bold"}`}>
                    Home
                  </span>
                </button>

                {/* Chat Tab */}
                <button
                  onClick={() => pushScreen({ type: "tab", tab: "chats" })}
                  className="flex-1 flex flex-col items-center justify-center py-1 relative cursor-pointer"
                  id="nav-tab-chats"
                >
                  <div className="relative">
                    <MessageSquare size={20} className={activeTab === "chats" ? "text-slate-900" : "text-slate-600"} />
                    {(Object.values(unreadCounts) as number[]).reduce((sum, count) => sum + count, 0) > 0 && (
                      <div className="absolute -top-1.5 -right-2 bg-rose-600 text-white h-4 min-w-4 px-1 rounded-full flex items-center justify-center">
                        <span className="text-white text-[8px] font-black">
                          {(Object.values(unreadCounts) as number[]).reduce((sum, count) => sum + count, 0)}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] mt-0.5 ${activeTab === "chats" ? "text-slate-900 font-black" : "text-slate-600 font-bold"}`}>
                    Chat
                  </span>
                </button>

                {/* Sell Tab */}
                <div className="flex-1 flex flex-col items-center justify-center relative">
                  <button
                    onClick={() => pushScreen({ type: "tab", tab: "sell" })}
                    className="w-12 h-12 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center p-0 border-2 border-white shadow-md hover:scale-105 transition-transform cursor-pointer"
                    id="nav-tab-sell"
                  >
                    <Plus size={24} strokeWidth={3} className="text-slate-900" />
                  </button>
                  <span className={`text-[10px] mt-0.5 ${activeTab === "sell" ? "text-amber-600 font-black" : "text-slate-700 font-black"}`}>
                    Sell
                  </span>
                </div>

                {/* My Ads Tab */}
                <button
                  onClick={() => pushScreen({ type: "tab", tab: "myads" })}
                  className="flex-1 flex flex-col items-center justify-center py-1 relative cursor-pointer"
                  id="nav-tab-myads"
                >
                  <Tag size={20} className={activeTab === "myads" ? "text-slate-900" : "text-slate-600"} />
                  <span className={`text-[10px] mt-0.5 ${activeTab === "myads" ? "text-slate-900 font-black" : "text-slate-600 font-bold"}`}>
                    My Ads
                  </span>
                </button>

                {/* Account Tab */}
                <button
                  onClick={() => pushScreen({ type: "tab", tab: "account" })}
                  className="flex-1 flex flex-col items-center justify-center py-1 relative cursor-pointer"
                  id="nav-tab-account"
                >
                  <UserIcon size={20} className={activeTab === "account" ? "text-slate-900" : "text-slate-600"} />
                  <span className={`text-[10px] mt-0.5 ${activeTab === "account" ? "text-slate-900 font-black" : "text-slate-600 font-bold"}`}>
                    Account
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Master Detail Overlay */}
          {detailedPart && (
            <div className="absolute inset-0 bg-slate-50 z-30 flex flex-col text-slate-900 overflow-hidden" id="master-detail-backdrop">
              {showShareToast && (
                <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-full shadow-lg font-bold flex flex-row items-center gap-2 z-[99]">
                  <Sparkles size={14} className="text-amber-400" />
                  <span className="text-white text-xs font-bold">Link copied to clipboard!</span>
                </div>
              )}

              {/* Sticky Top Header Bar */}
              <div className="sticky top-0 bg-white border-b border-slate-100 px-3.5 py-2.5 flex flex-row items-center justify-between z-20 shadow-xs">
                <div className="flex flex-row items-center gap-2">
                  <button
                    onClick={goBack}
                    className="p-1.5 rounded-full text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                    id="close-master-detail-btn"
                  >
                    <ArrowLeft size={22} strokeWidth={2.5} className="text-slate-800" />
                  </button>
                  <div className="flex flex-col">
                    <span className="font-extrabold text-xs text-slate-900 uppercase">Ad Details</span>
                    <span className="text-[10px] text-slate-400 font-bold font-mono">ID: {detailedPart.id.substring(0, 8).toUpperCase()}</span>
                  </div>
                </div>

                <div className="flex flex-row items-center gap-2">
                  <button
                    onClick={(e) => {
                      const shareUrl = window.location.origin + "?part=" + detailedPart.id;
                      if (navigator.share) {
                        navigator.share({
                          title: detailedPart.title,
                          text: `Check out this ${detailedPart.carBrand} ${detailedPart.carModel} ${detailedPart.title} on Autoparts India!`,
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
                    className="p-2 rounded-full text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <Share2 size={20} className="text-slate-700" />
                  </button>

                  <button
                    onClick={() => handleFavoriteToggle(detailedPart.id)}
                    className="p-2 rounded-full text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <Heart
                      size={20}
                      className={favorites.includes(detailedPart.id) ? "fill-red-500 text-red-500" : "text-slate-700"}
                    />
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto pb-24 bg-slate-50">
                {(() => {
                  const imageList: string[] = [];
                  if (detailedPart.imageUrls && detailedPart.imageUrls.length > 0) {
                    detailedPart.imageUrls.forEach(url => {
                      if (url && !imageList.includes(url)) {
                        imageList.push(url);
                      }
                    });
                  } else if (detailedPart.imageUrl) {
                    imageList.push(detailedPart.imageUrl);
                  }

                  return (
                    <div 
                      className="h-80 w-full bg-slate-950 relative flex items-center justify-center border-b border-slate-200 cursor-pointer group overflow-hidden select-none"
                      onClick={() => setIsGalleryOpen(true)}
                      title="Click to view full-screen image gallery"
                    >
                      {imageList[detailImageIndex] ? (
                        <img
                          src={imageList[detailImageIndex]}
                          alt={detailedPart.title}
                          className="w-full h-full max-h-80 object-contain p-1"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = 'none';
                            if (target.parentElement) {
                              const fallback = target.parentElement.querySelector('.detail-img-fallback');
                              if (fallback) fallback.classList.remove('hidden');
                            }
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full min-h-[220px] bg-slate-900 flex flex-col items-center justify-center text-indigo-300 gap-2 p-4 detail-img-fallback ${imageList[detailImageIndex] ? 'hidden' : ''}`}>
                        <ImageIcon size={36} className="text-indigo-400 animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                          {detailedPart.partName || detailedPart.category || "No Image Available"}
                        </span>
                      </div>

                      {/* Gallery hint badge (Top Left) */}
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsGalleryOpen(true);
                        }}
                        className="absolute top-3 left-4 bg-slate-900/80 backdrop-blur-sm text-[10px] font-black tracking-wider text-white px-2.5 py-1.5 rounded-md flex items-center gap-1 border border-white/10 opacity-90 hover:bg-indigo-600 transition-all z-10 cursor-pointer"
                      >
                        <Maximize2 size={10} className="text-indigo-400 animate-pulse" />
                        VIEW FULLSCREEN
                      </div>

                      {/* Left/Right click arrow buttons for multiple images */}
                      {imageList.length > 1 && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailImageIndex(prev => (prev > 0 ? prev - 1 : imageList.length - 1));
                            }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-indigo-600 text-white rounded-full transition-all z-10 cursor-pointer shadow-md"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailImageIndex(prev => (prev < imageList.length - 1 ? prev + 1 : 0));
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-indigo-600 text-white rounded-full transition-all z-10 cursor-pointer shadow-md"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </>
                      )}

                      {/* Image Counter Badge */}
                      <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-xs text-[11px] font-bold text-white px-2.5 py-1 rounded-md tracking-wider font-mono z-10 border border-white/10">
                        {detailImageIndex + 1} / {imageList.length}
                      </div>

                      {/* Indicator dots */}
                      {imageList.length > 1 && (
                        <div className="absolute bottom-4 left-4 flex items-center gap-1.5 z-10">
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

                      {detailedPart.sold && (
                        <div className="absolute inset-0 bg-slate-950/65 flex items-center justify-center z-20">
                          <span className="text-xs font-black tracking-widest text-white bg-rose-600 px-4 py-2 rounded-md uppercase border border-rose-500">
                            SOLD OUT
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="space-y-3 mt-3 px-3">
                  <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100 space-y-1.5">
                    <div className="flex flex-row justify-between items-start">
                      <span className="text-2xl font-black text-slate-900">
                        {formatPrice(detailedPart.price)}
                      </span>
                      <div className={`px-2.5 py-0.5 rounded border ${getConditionColor(detailedPart.condition)}`}>
                        <span className="text-[9px] font-black uppercase text-white">{detailedPart.condition}</span>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 mt-1">
                      {detailedPart.title}
                    </p>
                    <div className="flex flex-row items-center justify-between text-[11px] text-slate-500 font-medium pt-2 border-t border-slate-100">
                      <div className="flex flex-row items-center gap-1">
                        <MapPin size={13} className="text-slate-400" />
                        <span className="text-[11px] font-bold text-slate-500">{detailedPart.district || detailedPart.location}, {detailedPart.state || "All India"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase">
                      Details & Specifications
                    </h4>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-1">
                      <div className="flex flex-col border-b border-slate-100 pb-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Brand</span>
                        <span className="text-xs font-extrabold text-slate-800 mt-0.5">{detailedPart.carBrand}</span>
                      </div>
                      <div className="flex flex-col border-b border-slate-100 pb-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Model Compatibility</span>
                        <span className="text-xs font-extrabold text-slate-800 mt-0.5">{detailedPart.carModel}</span>
                      </div>
                      <div className="flex flex-col border-b border-slate-100 pb-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Category</span>
                        <span className="text-xs font-extrabold text-slate-800 mt-0.5">{detailedPart.category}</span>
                      </div>
                      <div className="flex flex-col border-b border-slate-100 pb-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Condition</span>
                        <span className="text-xs font-extrabold text-slate-800 mt-0.5">{detailedPart.condition}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100 space-y-2">
                    <h4 className="text-xs font-bold text-slate-900 uppercase">
                      Description
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {detailedPart.description}
                    </p>
                  </div>

                  <button 
                    onClick={() => setShowDetailedReviews(true)}
                    className="w-full bg-white p-4 rounded-2xl shadow-xs border border-slate-100 flex flex-row items-center justify-between text-left cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex flex-row items-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm uppercase">
                        <span className="text-indigo-600 font-bold text-sm uppercase">{detailedPart.contactName.substring(0, 2)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-indigo-600 font-black tracking-widest uppercase block">Verified Seller</span>
                        <span className="text-xs font-black text-slate-800 mt-0.5 block">{detailedPart.contactName}</span>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-400" />
                  </button>

                  {/* OpenStreetMap / Leaflet Location Container */}
                  <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={14} className="text-indigo-600" />
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                          Part Location (OpenStreetMap)
                        </h4>
                      </div>
                      <span className="text-[11px] font-extrabold text-slate-600">
                        {formatLocationName(detailedPart)}
                      </span>
                    </div>

                    <GMap
                      lat={detailedPart.lat}
                      lng={detailedPart.lng}
                      state={detailedPart.state}
                      district={detailedPart.district}
                      location={detailedPart.location}
                      height="200px"
                      className="w-full rounded-2xl border border-slate-200 overflow-hidden shadow-sm mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Sticky Bottom Action Bar */}
              <div className="absolute bottom-0 inset-x-0 bg-white border-t border-slate-200 p-3 flex flex-row items-center gap-3 z-20">
                {currentUser && (detailedPart.sellerId === currentUser.id || currentUser.email === "wwwautoparts2@gmail.com") ? (
                  <>
                    <button
                      onClick={() => setEditingPart(detailedPart)}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-md font-black text-xs uppercase text-center cursor-pointer transition-colors"
                      id="edit-own-listing-btn"
                    >
                      Edit Listing
                    </button>
                    <button
                      onClick={() => setDeletingPart(detailedPart)}
                      className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-md font-black text-xs uppercase text-center cursor-pointer transition-colors"
                      id="delete-own-listing-btn"
                    >
                      Delete Listing
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2.5 w-full">
                    {/* Left Button: Chat */}
                    <button
                      onClick={() => {
                        if (detailedPart.sold) return;
                        if (!currentUser) {
                          showToast("Please sign in to message sellers.", "error");
                          return;
                        }
                        const targetUrl = `/chat?sellerId=${detailedPart.sellerId}&listingId=${detailedPart.id}`;
                        try {
                          window.history.pushState({}, "", targetUrl);
                        } catch (e) {}
                        handleStartChat(detailedPart);
                      }}
                      disabled={detailedPart.sold}
                      className={`flex-1 flex flex-row items-center justify-center gap-2 py-3.5 px-3 rounded-xl font-black text-xs uppercase cursor-pointer transition-all active:scale-[0.98] shadow-sm ${
                        detailedPart.sold
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700"
                          : "bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white border border-slate-900 dark:border-slate-700"
                      }`}
                      id="inapp-chat-btn"
                    >
                      <MessageSquare size={16} />
                      <span>{detailedPart.sold ? t("soldOut") : "Chat"}</span>
                    </button>

                    {/* Right Button: Call */}
                    <button
                      onClick={() => {
                        if (detailedPart.sold) return;
                        const rawPhone = detailedPart.phoneNumber || detailedPart.contactPhone || (detailedPart as any).phone || "";
                        const phone = rawPhone.toString().trim();
                        if (phone && phone.length > 0) {
                          window.location.href = `tel:${phone}`;
                        } else {
                          showToast("Seller has not provided a phone number", "error");
                        }
                      }}
                      disabled={detailedPart.sold}
                      className={`flex-1 flex flex-row items-center justify-center gap-2 py-3.5 px-3 rounded-xl font-black text-xs uppercase cursor-pointer transition-all active:scale-[0.98] shadow-sm ${
                        detailedPart.sold
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white"
                      }`}
                      id="seller-call-btn"
                    >
                      <Phone size={16} />
                      <span>{detailedPart.sold ? t("soldOut") : "Call"}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Seller Profile Overlay */}
          {showDetailedReviews && detailedPart && (
            <SellerProfileView
              key="seller-profile-app-overlay"
              sellerId={detailedPart.sellerId}
              sellerName={detailedPart.contactName}
              currentUser={currentUser}
              onClose={() => setShowDetailedReviews(false)}
              onStartChat={handleStartChat}
              allParts={parts}
              onSelectPart={(part) => pushScreen({ type: "part_detail", part })}
              favorites={favorites}
              onToggleFavorite={handleFavoriteToggle}
            />
          )}

          {/* Active Chat room overlay */}
          {activeChat && (
            <div className="absolute inset-0 z-40 bg-slate-50">
              <ChatRoomWindow
                chat={activeChat}
                currentUser={currentUser}
                onClose={goBack}
              />
            </div>
          )}

          {/* Notifications Screen overlay */}
          {currentScreen.type === "notifications" && (
            <div className="absolute inset-0 z-40 bg-slate-50 flex flex-col">
              <NotificationsScreen
                announcements={announcements}
                isLoading={announcementsLoading}
                currentUser={currentUser}
                onBack={goBack}
              />
            </div>
          )}

          {/* Image Gallery Modal */}
          <ImageGalleryModal
            isOpen={isGalleryOpen}
            onClose={() => setIsGalleryOpen(false)}
            part={detailedPart}
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
                  await handlePartDeleted(id);
                }
              }}
            />
          )}

          {/* Delete Confirmation Modal */}
          {deletingPart && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4">
                <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shrink-0">
                  <Trash2 size={24} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-slate-900">Delete Listing?</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Are you sure you want to delete <span className="font-bold text-slate-900">"{deletingPart.title}"</span>? This action cannot be undone.
                  </p>
                </div>
                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeletingPart(null)}
                    disabled={isDeletingPart}
                    className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setIsDeletingPart(true);
                      try {
                        const targetId = deletingPart.id;
                        await deleteSparePartListing(targetId);
                        await handlePartDeleted(targetId);
                        setDeletingPart(null);
                      } catch (err: any) {
                        alert("Error deleting listing: " + (err.message || String(err)));
                      } finally {
                        setIsDeletingPart(false);
                      }
                    }}
                    disabled={isDeletingPart}
                    className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isDeletingPart ? (
                      <>
                        <Loader2 size={14} className="animate-spin text-white" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <span>Delete Listing</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Global Toast Banner */}
          {toastBanner && (
            <div className={`fixed bottom-16 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-2xl shadow-xl border text-xs font-extrabold z-[100] animate-in fade-in slide-in-from-bottom-3 duration-200 flex items-center gap-2 ${
              toastBanner.type === "error" ? "bg-rose-950 text-rose-100 border-rose-800" : "bg-slate-900 text-white border-slate-800"
            }`}>
              <CheckCircle2 size={16} className={toastBanner.type === "error" ? "text-rose-400" : "text-emerald-400"} />
              <span>{toastBanner.text}</span>
            </div>
          )}

          {deleteError && (
            <div className="fixed bottom-4 left-4 right-4 bg-rose-600 text-white p-3 rounded-xl z-50 text-xs flex flex-row items-center justify-between">
              <span className="text-white text-xs">{deleteError}</span>
              <button onClick={() => setDeleteError(null)} className="text-white font-bold underline text-xs cursor-pointer">
                Dismiss
              </button>
            </div>
          )}

          {/* App Update Dialog Modal */}
          {showUpdateModal && versionConfig && (
            <UpdateDialogModal
              versionConfig={versionConfig}
              isForceUpdate={isForceUpdate}
              onClose={() => {
                if (!isForceUpdate) {
                  setShowUpdateModal(false);
                }
              }}
            />
          )}

        </div>
      )}
    </div>
  );
}
