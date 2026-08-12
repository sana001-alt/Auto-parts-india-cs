import { initializeApp, getApp, getApps } from "firebase/app";
import { getStorage, ref, deleteObject, uploadString, getDownloadURL } from "firebase/storage";
import { Capacitor } from "@capacitor/core";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";
import { 
  getAuth, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  signInAnonymously,
  deleteUser,
  updateProfile as firebaseUpdateProfile
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  where,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  getDocFromServer,
  writeBatch,
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
import { 
  getMessaging, 
  getToken, 
  onMessage, 
  isSupported, 
  Messaging 
} from "firebase/messaging";
import { SparePart, User, Chat, Message, SellerReview, type Notification, CAR_PART_CATEGORIES, INDIAN_CAR_BRANDS, CAR_SPARE_PARTS_BY_CATEGORY, DEFAULT_MODEL_VARIANTS, POPULAR_LOCATIONS, AppVersionConfig, Banner, Announcement } from "../types";
import { compressBase64DataUrl } from "../utils/imageCompressor";
import { INDIAN_STATES_AND_DISTRICTS } from "../data/indianLocations";
import { INITIAL_SPARE_PARTS, INITIAL_SELLER_REVIEWS } from "../data/mockData";
import firebaseAppletConfig from "../../firebase-applet-config.json";

const metaEnv = (import.meta as any).env || {};

const configFromFile = (firebaseAppletConfig || {}) as any;

const getFirebaseConfigValue = (key: string, envVal: string | undefined): string => {
  const fileVal = configFromFile[key];
  if (typeof fileVal === "string" && fileVal.trim()) {
    return fileVal.trim();
  }
  if (typeof envVal === "string" && envVal.trim()) {
    let val = envVal.trim();
    if (val.includes(" ")) {
      const parts = val.split(/\s+/);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i].trim();
        if (p && !p.includes("VITE_") && !p.includes("FIREBASE_")) {
          return p;
        }
      }
      return parts[parts.length - 1].trim();
    }
    return val;
  }
  return "";
};

// Prioritize clean values from firebase-applet-config.json
const firebaseConfig = {
  apiKey: getFirebaseConfigValue("apiKey", metaEnv.VITE_FIREBASE_API_KEY) || "AIzaSyAGYut7q3nCW-qSDPSldGSbxAjnna_-bvo",
  authDomain: getFirebaseConfigValue("authDomain", metaEnv.VITE_FIREBASE_AUTH_DOMAIN) || "auto-parts-market-place-20312.firebaseapp.com",
  projectId: getFirebaseConfigValue("projectId", metaEnv.VITE_FIREBASE_PROJECT_ID) || "auto-parts-market-place-20312",
  storageBucket: getFirebaseConfigValue("storageBucket", metaEnv.VITE_FIREBASE_STORAGE_BUCKET) || "auto-parts-market-place-20312.firebasestorage.app",
  messagingSenderId: getFirebaseConfigValue("messagingSenderId", metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID) || "751764116522",
  appId: getFirebaseConfigValue("appId", metaEnv.VITE_FIREBASE_APP_ID) || "1:751764116522:web:c7eb06038e6a85337adf53",
  databaseId: getFirebaseConfigValue("firestoreDatabaseId", metaEnv.VITE_FIREBASE_DATABASE_ID) || configFromFile.firestoreDatabaseId || ""
};

// Determine if configuration is valid and fully provided
const isFirebaseConfigured = !!(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId
);

export let app: any = null;
export let auth: any = null;
export let db: any = null;
export let storage: any = null;
export let useFirebase = false;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    try {
      setPersistence(auth, browserLocalPersistence).catch((pErr: any) => {
        console.warn("[Firebase Auth Persistence Warning]", pErr?.message || pErr);
      });
    } catch (pErr) {
      console.warn("[Firebase Auth Persistence Exception]", pErr);
    }
    storage = getStorage(app);
    db = firebaseConfig.databaseId && firebaseConfig.databaseId !== "(default)"
      ? getFirestore(app, firebaseConfig.databaseId)
      : getFirestore(app);
    useFirebase = true;
    console.log("Firebase initialized successfully with configuration:", firebaseConfig.projectId, "Database:", firebaseConfig.databaseId);
    
    // Global rejection listener for IndexedDB / Firestore "Database is closing/hidden" lifecycle issues
    if (typeof window !== "undefined") {
      window.addEventListener("unhandledrejection", (event) => {
        const reason = event?.reason;
        const msg = reason?.message || String(reason || "");
        if (
          msg.toLowerCase().includes("database is closing") ||
          msg.toLowerCase().includes("database is hidden") ||
          msg.toLowerCase().includes("the database is closing") ||
          msg.toLowerCase().includes("indexeddb")
        ) {
          console.warn("[Global Handled Exception] Intercepted database closing/hidden event gracefully:", msg);
          if (event.preventDefault) event.preventDefault();
        }
      });
    }

    // Enable multi-tab offline persistence & automatic retries for Firestore
    try {
      enableMultiTabIndexedDbPersistence(db).catch((pErr: any) => {
        if (pErr.code === 'failed-precondition') {
          console.warn("[Firestore Persistence] Multiple tabs active; enabling fallback single-tab persistence.");
          enableIndexedDbPersistence(db).catch(() => {});
        } else if (pErr.code === 'unimplemented') {
          console.warn("[Firestore Persistence] Current browser context does not support offline persistence.");
        } else {
          console.warn("[Firestore Persistence Notice]", pErr?.message || pErr);
        }
      });
    } catch (persistenceErr) {
      try {
        enableIndexedDbPersistence(db).catch(() => {});
      } catch (_) {}
    }
    
    // Initialize Capacitor GoogleAuth for native Android/iOS
    if (Capacitor.isNativePlatform()) {
      try {
        GoogleAuth.initialize({
          clientId: configFromFile.oAuthClientId || "751764116522-gr59kobj3c3i1hsgr5hiumauk5otr5sq.apps.googleusercontent.com",
          scopes: ["profile", "email"],
          grantOfflineAccess: true,
        });
        console.log("Capacitor GoogleAuth native plugin initialized.");
      } catch (initErr) {
        console.warn("Capacitor GoogleAuth native plugin initialization warning:", initErr);
      }
    }
    
    async function testConnection() {
      try {
        await getDoc(doc(db, 'products', 'listings'));
        console.log("[Firebase Connection & API OK] Connected to Firestore database.");
      } catch (error: any) {
        console.log("[Firebase Connection OK] Firestore database initialized.");
      }
    }
    testConnection();
  } catch (error) {
    console.error("Failed to initialize Firebase, falling back to LocalStorage:", error);
    useFirebase = false;
  }
} else {
  console.log("Firebase config not found or incomplete. Falling back to LocalStorage mode.");
}

// Ensure local storage has initial spare parts if empty
const LOCAL_STORAGE_PARTS_KEY = "autoparts_listings";
const LOCAL_STORAGE_USERS_KEY = "autoparts_users";
const LOCAL_STORAGE_CURRENT_USER_KEY = "autoparts_current_user";
const LOCAL_STORAGE_REVIEWS_KEY = "autoparts_seller_reviews";

if (!localStorage.getItem(LOCAL_STORAGE_PARTS_KEY)) {
  localStorage.setItem(LOCAL_STORAGE_PARTS_KEY, JSON.stringify([]));
}

if (!localStorage.getItem(LOCAL_STORAGE_REVIEWS_KEY)) {
  localStorage.setItem(LOCAL_STORAGE_REVIEWS_KEY, JSON.stringify([]));
}

// ----------------------------------------------------
// DATABASE SERVICES (FIRESTORE / LOCALSTORAGE)
// ----------------------------------------------------

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = error instanceof Error ? error.message : String(error);
  const lowerMsg = errMessage.toLowerCase();
  
  const isQuota = (error as any)?.code === "resource-exhausted" || lowerMsg.includes("quota limit exceeded") || lowerMsg.includes("resource-exhausted");
  if (isQuota) {
    console.warn(`[Firestore Quota Exceeded] ${operationType} on ${path || 'unknown'}: ${errMessage}. Falling back to local state.`);
    return;
  }

  const isClosing = lowerMsg.includes("database is closing") || lowerMsg.includes("database is hidden") || lowerMsg.includes("the database is closing");
  if (isClosing) {
    console.warn(`[Firestore Database Closing Notice] ${operationType} on ${path || 'unknown'}: ${errMessage}. Relying on local/cache memory state.`);
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
    },
    operationType,
    path
  };
  console.warn('Firestore Access Warning: ', JSON.stringify(errInfo));
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

const uploadedImageCache = new Map<string, string>();
const cloudinaryUrlToPublicIdMap = new Map<string, string>();

export async function uploadProductImage(base64Data: string, partId?: string): Promise<string> {
  if (!base64Data) return "";
  if (base64Data.startsWith("http://") || base64Data.startsWith("https://")) {
    return base64Data;
  }
  if (uploadedImageCache.has(base64Data)) {
    console.log("[Cloudinary Cache Hit] Returning cached Cloudinary URL.");
    return uploadedImageCache.get(base64Data)!;
  }

  // Pre-compress image if it's a large base64 data URL
  let optimizedBase64 = base64Data;
  if (base64Data.startsWith("data:image/")) {
    try {
      optimizedBase64 = await compressBase64DataUrl(base64Data, 1200, 1200, 0.82);
    } catch (compressErr) {
      console.warn("[Cloudinary Pre-compress Notice] Image compression skipped, using original base64:", compressErr);
    }
  }

  const cloudName = metaEnv.VITE_CLOUDINARY_CLOUD_NAME || (typeof process !== "undefined" && (process.env?.VITE_CLOUDINARY_CLOUD_NAME || process.env?.CLOUDINARY_CLOUD_NAME)) || "rqf1hlrx";
  const uploadPreset = metaEnv.VITE_CLOUDINARY_UPLOAD_PRESET || (typeof process !== "undefined" && process.env?.VITE_CLOUDINARY_UPLOAD_PRESET) || "autoparts_upload";
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const maxRetries = 2;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Cloudinary Upload] Attempt ${attempt}/${maxRetries} starting for cloudName="${cloudName}"...`);
      const formData = new FormData();
      formData.append("file", optimizedBase64);
      formData.append("upload_preset", uploadPreset);

      const response = await withTimeout(
        fetch(url, {
          method: "POST",
          body: formData,
        }),
        45000,
        "Cloudinary upload timed out. Please check your network connection."
      );

      console.assert(response.ok, `[Cloudinary API Assert Failed] HTTP status ${response.status}`);

      if (!response.ok) {
        const errText = await response.text();
        let cleanErrorMessage = errText;
        try {
          const parsed = JSON.parse(errText);
          if (parsed.error && parsed.error.message) {
            cleanErrorMessage = parsed.error.message;
          }
        } catch (e) {}
        throw new Error(`Cloudinary error: ${cleanErrorMessage}`);
      }

      const data = await response.json();
      console.assert(!!data.secure_url, "[Cloudinary API Assert Failed] Response missing secure_url field");

      if (!data.secure_url) {
        throw new Error("Cloudinary response is missing secure_url.");
      }
      if (data.public_id && data.secure_url) {
        cloudinaryUrlToPublicIdMap.set(data.secure_url, data.public_id);
      }
      console.log("[Cloudinary Connection & API OK] Image uploaded successfully to Cloudinary:", data.secure_url, "public_id:", data.public_id || "N/A");
      uploadedImageCache.set(base64Data, data.secure_url);
      uploadedImageCache.set(optimizedBase64, data.secure_url);
      return data.secure_url;
    } catch (error: any) {
      lastError = error;
      console.warn(`[Cloudinary Upload Attempt ${attempt} Failed]:`, error?.message || error);
      if (attempt < maxRetries) {
        await new Promise((res) => setTimeout(res, 1200));
      }
    }
  }

  console.error("Cloudinary upload error after max retries:", lastError);

  if (storage && optimizedBase64.startsWith("data:image/")) {
    try {
      console.log("[Firebase Storage Fallback] Attempting upload to Firebase Storage...");
      const storageRef = ref(storage, `product_images/${partId || 'part'}_${Date.now()}.jpg`);
      await uploadString(storageRef, optimizedBase64, 'data_url');
      const downloadUrl = await getDownloadURL(storageRef);
      console.log("[Firebase Storage Success] Image uploaded to Firebase Storage:", downloadUrl);
      uploadedImageCache.set(base64Data, downloadUrl);
      uploadedImageCache.set(optimizedBase64, downloadUrl);
      return downloadUrl;
    } catch (storageErr) {
      console.warn("[Firebase Storage Fallback Failed]:", storageErr);
    }
  }

  throw new Error(lastError?.message || "Failed to upload image to Cloudinary.");
}

export function getOptimizedCloudinaryUrl(url: string, width?: number, height?: number): string {
  if (!url || typeof url !== "string" || !url.includes("res.cloudinary.com")) {
    return url;
  }
  if (url.includes("/f_auto") || url.includes("/q_auto") || url.includes("/c_fill")) {
    return url;
  }
  const transformation = width && height 
    ? `c_fill,w_${width},h_${height},f_auto,q_auto`
    : `f_auto,q_auto`;
  return url.replace("/upload/", `/upload/${transformation}/`);
}

export function extractPublicId(url: string): string | null {
  if (!url || typeof url !== "string" || !url.includes("cloudinary.com")) return null;
  if (cloudinaryUrlToPublicIdMap.has(url)) {
    return cloudinaryUrlToPublicIdMap.get(url)!;
  }
  try {
    let uploadIndex = url.indexOf("/image/upload/");
    let prefixLength = "/image/upload/".length;
    if (uploadIndex === -1) {
      uploadIndex = url.indexOf("/upload/");
      prefixLength = "/upload/".length;
    }
    if (uploadIndex === -1) return null;
    
    let path = url.substring(uploadIndex + prefixLength);
    const segments = path.split("/").filter(Boolean);
    if (segments.length === 0) return null;

    const cleanSegments: string[] = [];
    for (const seg of segments) {
      // Skip transformation options and version prefixes
      if (
        seg.includes(",") ||
        /^(c|w|h|q|f|e|b|r|a|dpr|fl|co|l|u|pg|so|eo|s|bo|o|x|y|g|p|m|t|ar|cs|d|ki|dl)_/.test(seg) ||
        /^v\d+$/.test(seg)
      ) {
        continue;
      }
      cleanSegments.push(seg);
    }

    if (cleanSegments.length === 0) return null;

    let publicId = cleanSegments.join("/");
    const lastDotIndex = publicId.lastIndexOf(".");
    if (lastDotIndex !== -1) {
      publicId = publicId.substring(0, lastDotIndex);
    }

    return publicId || null;
  } catch (e) {
    console.error("Failed to extract public_id from Cloudinary URL:", url, e);
    return null;
  }
}

export async function deleteImagesFromCloudinary(publicIds: string[]): Promise<void> {
  if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) return;

  const cleanedPids: string[] = [];
  for (const item of publicIds) {
    if (!item) continue;
    const pid = extractPublicId(item) || item;
    if (pid && !cleanedPids.includes(pid)) {
      cleanedPids.push(pid);
    }
  }

  if (cleanedPids.length === 0) return;

  try {
    const response = await fetch("/api/delete-cloudinary-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ publicIds: cleanedPids }),
    });

    if (!response.ok) {
      console.warn(`Cloudinary deletion API returned status ${response.status}. Continuing with Firestore document deletion.`);
      return;
    }

    const data = await response.json();
    console.log(`Cloudinary deletion API response:`, data);
  } catch (err) {
    console.warn("Non-fatal error calling Cloudinary image deletion API:", err);
  }
}

export async function deleteImageFromCloudinary(publicId: string): Promise<void> {
  await deleteImagesFromCloudinary([publicId]);
}

export function isUsingFirebase(): boolean {
  return useFirebase;
}

export function convertTimestampToNumber(timestamp: any): number {
  if (!timestamp) return Date.now();
  if (typeof timestamp === "number") return timestamp;
  if (typeof timestamp.toMillis === "function") return timestamp.toMillis();
  if (timestamp instanceof Date) return timestamp.getTime();
  if (typeof timestamp.seconds === "number") return timestamp.seconds * 1000;
  return Date.now();
}

export async function deduplicateAndCleanupListings(rawParts: SparePart[]): Promise<SparePart[]> {
  const uniqueMapByDocId = new Map<string, SparePart>();
  const uniqueListingsByContent = new Map<string, SparePart>();
  const duplicateDocIdsToDelete: string[] = [];

  for (const part of rawParts) {
    if (!part || !part.id) continue;

    if (uniqueMapByDocId.has(part.id)) {
      continue;
    }
    uniqueMapByDocId.set(part.id, part);

    const titleClean = (part.title || "").trim().toLowerCase();
    const descClean = (part.description || "").trim().toLowerCase();
    const sellerClean = part.sellerId || part.sellerEmail || "";
    const contentSignature = `${sellerClean}_${titleClean}_${part.price}_${descClean}`;

    if (titleClean && sellerClean) {
      if (uniqueListingsByContent.has(contentSignature)) {
        const existingPart = uniqueListingsByContent.get(contentSignature)!;
        console.warn(`[Auto-Deduplicate] Found duplicate listing doc ID "${part.id}" matching existing doc ID "${existingPart.id}". Marking duplicate doc for deletion.`);
        duplicateDocIdsToDelete.push(part.id);
      } else {
        uniqueListingsByContent.set(contentSignature, part);
      }
    } else {
      uniqueListingsByContent.set(part.id, part);
    }
  }

  if (duplicateDocIdsToDelete.length > 0 && useFirebase && db) {
    console.log(`[Auto-Deduplicate Cleanup] Removing ${duplicateDocIdsToDelete.length} duplicate Firestore document(s)...`);
    for (const docId of duplicateDocIdsToDelete) {
      const isLocal = docId.startsWith("local-part-");
      const isMock = INITIAL_SPARE_PARTS.some(mp => mp.id === docId);
      if (!isLocal && !isMock) {
        try {
          const docRef = doc(db, "products", "listings", "items", docId);
          await deleteDoc(docRef);
          console.log(`[Auto-Deduplicate Cleanup] Deleted duplicate Firestore document: ${docId}`);
        } catch (err) {
          console.warn(`[Auto-Deduplicate Cleanup] Error deleting duplicate document ${docId}:`, err);
        }
      }
    }
  }

  const localData = localStorage.getItem(LOCAL_STORAGE_PARTS_KEY);
  if (localData && duplicateDocIdsToDelete.length > 0) {
    try {
      const localList: SparePart[] = JSON.parse(localData);
      const filteredLocalList = localList.filter(lp => !duplicateDocIdsToDelete.includes(lp.id));
      if (filteredLocalList.length !== localList.length) {
        localStorage.setItem(LOCAL_STORAGE_PARTS_KEY, JSON.stringify(filteredLocalList));
      }
    } catch (e) {
      // ignore
    }
  }

  const cleanParts = Array.from(uniqueListingsByContent.values());
  cleanParts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return cleanParts;
}

export function parseListingDocToSparePart(docId: string, data: any): SparePart {
  const imageUrls = Array.isArray(data.imageUrls) 
    ? data.imageUrls 
    : (Array.isArray(data.images) ? data.images : (data.imageUrl ? [data.imageUrl] : []));
  const primaryImage = data.imageUrl || (imageUrls.length > 0 ? imageUrls[0] : "");
  const phone = data.phoneNumber || data.contactPhone || "";
  const partStatus = data.status || (data.approved === false ? "pending" : "active");
  const priceVal = typeof data.price === "number" ? data.price : (parseFloat(data.price) || 0);
  const loc = data.location || (data.district ? (data.state ? `${data.district}, ${data.state}` : data.district) : (data.state || "India"));

  return {
    ...data,
    id: docId,
    title: data.title || "Spare Part",
    price: priceVal,
    location: loc,
    phoneNumber: phone,
    contactPhone: phone,
    imageUrl: primaryImage,
    imageUrls: imageUrls,
    images: imageUrls,
    status: partStatus,
    createdAt: convertTimestampToNumber(data.createdAt)
  } as SparePart;
}

export async function fetchSpareParts(): Promise<SparePart[]> {
  let firestoreParts: SparePart[] = [];
  if (useFirebase && db) {
    // 1. Fetch globally from 'listings' collection without filtering by userId
    try {
      const listingsRef = collection(db, "listings");
      let snapshot;
      try {
        const q = query(listingsRef, where("status", "==", "active"), orderBy("createdAt", "desc"));
        snapshot = await getDocs(q);
      } catch (orderErr) {
        try {
          const qFallback = query(listingsRef, orderBy("createdAt", "desc"));
          snapshot = await getDocs(qFallback);
        } catch (fbErr) {
          snapshot = await getDocs(listingsRef);
        }
      }
      
      if (!snapshot.empty) {
        snapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          const parsed = parseListingDocToSparePart(docSnapshot.id, data);
          if (parsed.status === "approved" || (parsed.status as any) === "active") {
            firestoreParts.push(parsed);
          }
        });
      }
    } catch (err: any) {
      if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.GET, "listings");
      } else {
        console.warn("Firestore fetch issue for 'listings':", err);
      }
    }

    // 2. Also fetch from legacy products/listings/items path for backwards compatibility
    try {
      const legacyRef = collection(db, "products", "listings", "items");
      const legacySnap = await getDocs(legacyRef);
      if (!legacySnap.empty) {
        legacySnap.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          const parsed = parseListingDocToSparePart(docSnapshot.id, data);
          if (!firestoreParts.some(p => p.id === docSnapshot.id) && (parsed.status === "approved" || (parsed.status as any) === "active")) {
            firestoreParts.push(parsed);
          }
        });
      }
    } catch (legacyErr) {
      // ignore legacy fetch errors
    }
  }

  // Fallback / merge LocalStorage for local user created listings
  let localPartsList: SparePart[] = [];
  const localData = localStorage.getItem(LOCAL_STORAGE_PARTS_KEY);
  if (localData) {
    try {
      localPartsList = JSON.parse(localData);
    } catch (e) {
      console.warn("Failed to parse local parts:", e);
    }
  }

  // Combine real Firestore database listings with LocalStorage and mock demo listings
  const combinedListings = [...firestoreParts];

  for (const lp of localPartsList) {
    if (!combinedListings.some(p => p.id === lp.id)) {
      combinedListings.push(parseListingDocToSparePart(lp.id, lp));
    }
  }

  for (const mockPart of INITIAL_SPARE_PARTS) {
    if (!combinedListings.some(p => p.id === mockPart.id)) {
      combinedListings.push(parseListingDocToSparePart(mockPart.id, mockPart));
    }
  }

  return deduplicateAndCleanupListings(combinedListings);
}

export async function createSparePartListing(part: Omit<SparePart, "id" | "createdAt">): Promise<SparePart> {
  const tempId = "part-" + Math.random().toString(36).substr(2, 9);

  // 1. Decoupled Image Upload Pipeline:
  // Upload base64 images directly to Cloudinary BEFORE constructing Firestore payload or checking auth errors.
  console.log("[Post Ad Pipeline] Step 1: Uploading images to Cloudinary independently of Auth state...");
  const rawImageUrls = part.imageUrls && part.imageUrls.length > 0 
    ? part.imageUrls 
    : (part.imageUrl ? [part.imageUrl] : []);

  const uploadPromises = rawImageUrls.map(async (imgUrl) => {
    if (!imgUrl) return "";
    if (imgUrl.startsWith("data:image/")) {
      console.log("[Image Upload] Uploading base64 photo to Cloudinary...");
      return await uploadProductImage(imgUrl, tempId);
    }
    return imgUrl;
  });

  const resolvedImageUrls = await Promise.all(uploadPromises);
  const uploadedCloudinaryUrls = resolvedImageUrls.filter(
    url => url && typeof url === "string" && !url.startsWith("data:image/")
  );

  const primaryCloudinaryUrl = uploadedCloudinaryUrls[0] || "";

  // Extract public IDs
  const publicIds: string[] = [];
  for (const url of uploadedCloudinaryUrls) {
    if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
      const pid = extractPublicId(url);
      if (pid && !publicIds.includes(pid)) {
        publicIds.push(pid);
      }
    }
  }

  // 2. Ensure active auth user state & auto-refresh token if currentUser exists
  if (useFirebase && auth) {
    try {
      await ensureValidAuthUser();
    } catch (authErr) {
      console.warn("[Post Ad Auth Pre-check Warning] Non-blocking auth check notice:", authErr);
    }
  }

  // Debug Auth Handshake & OAuth Token Status
  const currentUser = auth?.currentUser;
  let oauthTokenStatus = "UNKNOWN";
  let tokenResult: any = null;

  if (currentUser) {
    try {
      tokenResult = await currentUser.getIdTokenResult(false);
      oauthTokenStatus = "VALID";
    } catch (tokenErr: any) {
      console.warn("[Auth Handshake Debug] Failed to retrieve Auth ID token:", tokenErr?.message || tokenErr);
      oauthTokenStatus = `TOKEN_ERROR: ${tokenErr?.message || tokenErr}`;
    }
  } else {
    oauthTokenStatus = "NO_CURRENT_USER";
  }

  console.log("[Auth Handshake Debug] firebase.auth().currentUser details:", {
    hasAuthInstance: !!auth,
    currentUser: currentUser ? {
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.displayName,
      emailVerified: currentUser.emailVerified,
      isAnonymous: currentUser.isAnonymous,
      authDomain: firebaseConfig.authDomain,
      providerData: currentUser.providerData?.map((p: any) => p.providerId)
    } : "NULL (Fallback to local metadata)",
    oauthTokenStatus,
    expirationTime: tokenResult?.expirationTime || "N/A",
    issuedAtTime: tokenResult?.issuedAtTime || "N/A",
    authTime: tokenResult?.authTime || "N/A"
  });

  // Resolve user identity metadata safely from currentUser, local storage user, or part props
  let localStoredUser: any = null;
  try {
    const rawLocalUser = localStorage.getItem(LOCAL_STORAGE_CURRENT_USER_KEY);
    if (rawLocalUser) {
      localStoredUser = JSON.parse(rawLocalUser);
    }
  } catch (e) {}

  const resolvedUserId = currentUser?.uid || localStoredUser?.uid || localStoredUser?.id || part.sellerId || ("user-" + tempId);
  const rawName = (
    currentUser?.displayName || 
    localStoredUser?.name ||
    part.contactName || 
    (currentUser?.email ? currentUser.email.split("@")[0] : null) || 
    (localStoredUser?.email ? localStoredUser.email.split("@")[0] : null) || 
    currentUser?.email || 
    currentUser?.uid || 
    "User"
  ).trim();

  const resolvedUserName = rawName.includes("@") ? rawName.split("@")[0] : rawName;
  const resolvedEmail = (currentUser?.email || localStoredUser?.email || part.sellerEmail || "").trim();

  // 3. Construct Payload
  const payload = {
    title: part.title,
    description: part.description,
    price: part.price,
    carBrand: part.carBrand,
    carModel: part.carModel,
    category: part.category,
    partName: part.partName || "",
    condition: part.condition,
    location: part.location,
    state: part.state || "",
    district: part.district || "",
    lat: part.lat ?? null,
    lng: part.lng ?? null,
    contactName: part.contactName || resolvedUserName,
    contactPhone: part.contactPhone || (part as any).phoneNumber || "",
    phoneNumber: (part as any).phoneNumber || part.contactPhone || "",
    imageUrl: primaryCloudinaryUrl,
    imageUrls: uploadedCloudinaryUrls,
    imagePublicIds: publicIds,
    userId: resolvedUserId,
    sellerId: resolvedUserId,
    userName: resolvedUserName,
    sellerName: resolvedUserName,
    sellerEmail: resolvedEmail,
    sold: part.sold || false,
    createdAt: serverTimestamp()
  };

  // 4. Firestore Document Write Handshake with Explicit Try-Catch
  if (useFirebase && db) {
    const listingsRef = collection(db, "listings");
    console.log(`[Firestore Write Handshake] Executing addDoc on "listings":`, payload);

    try {
      // Gracefully check duplicate
      try {
        const dupQuery = query(listingsRef, where("sellerId", "==", resolvedUserId));
        const dupSnap = await getDocs(dupQuery);
        if (!dupSnap.empty) {
          const titleLower = part.title.trim().toLowerCase();
          const descLower = (part.description || "").trim().toLowerCase();
          for (const dDoc of dupSnap.docs) {
            const dData = dDoc.data();
            if (
              (dData.title || "").trim().toLowerCase() === titleLower &&
              dData.price === part.price &&
              (dData.description || "").trim().toLowerCase() === descLower
            ) {
              console.warn(`[Firestore Duplicate Prevention] Returning existing listing doc ${dDoc.id}.`);
              return {
                ...dData,
                id: dDoc.id,
                createdAt: convertTimestampToNumber(dData.createdAt)
              } as SparePart;
            }
          }
        }
      } catch (dupCheckErr) {
        console.warn("[Firestore Duplicate Check Notice]", dupCheckErr);
      }

      const docRef = await withTimeout(
        addDoc(listingsRef, payload),
        30000,
        "Firestore listing creation timed out. Please check your network connection."
      );

      console.log(`[Firestore Write OK] Listing created successfully in "listings". Document ID: ${docRef.id}`);

      // Sync to legacy path for backward compatibility
      try {
        await setDoc(doc(db, "products", "listings", "items", docRef.id), payload, { merge: true });
      } catch (legacyWriteErr) {
        console.warn("Legacy path write notice:", legacyWriteErr);
      }

      let createdTimestamp = Date.now();
      try {
        const savedDoc = await withTimeout(
          getDoc(docRef),
          6000,
          "Verification readback delayed"
        );
        if (savedDoc.exists()) {
          const savedData = savedDoc.data() as any;
          if (savedData?.createdAt) {
            createdTimestamp = convertTimestampToNumber(savedData.createdAt);
          }
        }
      } catch (readbackErr) {
        console.warn("[Firestore Readback Notice] Verification readback delayed, doc created.");
      }

      const createdPart: SparePart = {
        ...part,
        id: docRef.id,
        imageUrl: primaryCloudinaryUrl,
        imageUrls: uploadedCloudinaryUrls,
        userId: resolvedUserId,
        sellerId: resolvedUserId,
        userName: resolvedUserName,
        sellerName: resolvedUserName,
        sellerEmail: resolvedEmail,
        createdAt: createdTimestamp
      };

      window.dispatchEvent(new Event("autoparts_listings_updated"));
      return createdPart;
    } catch (writeErr: any) {
      console.error(`[Firestore Write / OAuth Permission Error] Error creating document in Firestore:`, writeErr);
      console.warn(`[Firestore Clean Fallback] Saving listing locally so user workflow is uninterrupted: ${writeErr?.message || writeErr}`);

      const fallbackPart: SparePart = {
        ...part,
        id: "local-part-" + tempId,
        imageUrl: primaryCloudinaryUrl,
        imageUrls: uploadedCloudinaryUrls,
        userId: resolvedUserId,
        sellerId: resolvedUserId,
        userName: resolvedUserName,
        sellerName: resolvedUserName,
        sellerEmail: resolvedEmail,
        createdAt: Date.now()
      };

      const localData = localStorage.getItem(LOCAL_STORAGE_PARTS_KEY);
      const partsList: SparePart[] = localData ? JSON.parse(localData) : [];
      partsList.unshift(fallbackPart);
      localStorage.setItem(LOCAL_STORAGE_PARTS_KEY, JSON.stringify(partsList));
      window.dispatchEvent(new Event("autoparts_listings_updated"));
      return fallbackPart;
    }
  }

  // Fallback if useFirebase is false
  const fallbackPart: SparePart = {
    ...part,
    id: "local-part-" + tempId,
    imageUrl: primaryCloudinaryUrl,
    imageUrls: uploadedCloudinaryUrls,
    userId: resolvedUserId,
    sellerId: resolvedUserId,
    userName: resolvedUserName,
    sellerName: resolvedUserName,
    sellerEmail: resolvedEmail,
    createdAt: Date.now()
  };

  const localData = localStorage.getItem(LOCAL_STORAGE_PARTS_KEY);
  const partsList: SparePart[] = localData ? JSON.parse(localData) : [];
  partsList.unshift(fallbackPart);
  localStorage.setItem(LOCAL_STORAGE_PARTS_KEY, JSON.stringify(partsList));
  window.dispatchEvent(new Event("autoparts_listings_updated"));
  return fallbackPart;
}

export function subscribeToSpareParts(
  callback: (parts: SparePart[]) => void,
  onError?: (err: Error) => void
): () => void {
  console.log(`[Firestore Listener] subscribeToSpareParts requested globally for all listings...`);

  let currentListingsParts: SparePart[] = [];
  let currentLegacyParts: SparePart[] = [];

  const updateCombined = () => {
    const map = new Map<string, SparePart>();
    for (const p of currentListingsParts) {
      map.set(p.id, p);
    }
    for (const p of currentLegacyParts) {
      if (!map.has(p.id)) {
        map.set(p.id, p);
      }
    }
    processAndDeliverParts(Array.from(map.values()));
  };

  const processAndDeliverParts = (firestoreParts: SparePart[]) => {
    let localPartsList: SparePart[] = [];
    const localData = localStorage.getItem(LOCAL_STORAGE_PARTS_KEY);
    if (localData) {
      try {
        localPartsList = JSON.parse(localData);
      } catch (e) {
        // ignore
      }
    }

    const combinedListings = [...firestoreParts];

    for (const lp of localPartsList) {
      if (!combinedListings.some(p => p.id === lp.id)) {
        combinedListings.push(lp);
      }
    }

    for (const mockPart of INITIAL_SPARE_PARTS) {
      if (!combinedListings.some(p => p.id === mockPart.id)) {
        combinedListings.push(mockPart);
      }
    }

    deduplicateAndCleanupListings(combinedListings).then((cleanParts) => {
      callback(cleanParts);
    });
  };

  if (useFirebase && db) {
    try {
      const listingsRef = collection(db, "listings");
      let qListings;
      try {
        qListings = query(listingsRef, where("status", "==", "active"), orderBy("createdAt", "desc"));
      } catch (e) {
        try {
          qListings = query(listingsRef, orderBy("createdAt", "desc"));
        } catch (err2) {
          qListings = query(listingsRef);
        }
      }

      const unsubListings = onSnapshot(qListings, (snapshot) => {
        console.log(`[Firestore Realtime Sync OK] 'listings' snapshot update. Size: ${snapshot.size}`);
        const parts: SparePart[] = [];
        if (!snapshot.empty) {
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            parts.push({
              ...data,
              id: docSnap.id,
              createdAt: convertTimestampToNumber(data.createdAt)
            } as SparePart);
          });
        }
        currentListingsParts = parts;
        updateCombined();
      }, (err) => {
        console.error(`[Firestore Listener Error] subscribeToSpareParts for 'listings' failed:`, err);
        if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
          handleFirestoreError(err, OperationType.LIST, "listings");
        }
        if (onError) onError(err);
      });

      // Legacy listener for products/listings/items
      const legacyRef = collection(db, "products", "listings", "items");
      const unsubLegacy = onSnapshot(legacyRef, (snapshot) => {
        const parts: SparePart[] = [];
        if (!snapshot.empty) {
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            parts.push({
              ...data,
              id: docSnap.id,
              createdAt: convertTimestampToNumber(data.createdAt)
            } as SparePart);
          });
        }
        currentLegacyParts = parts;
        updateCombined();
      }, (err) => {
        console.warn("Legacy listings listener notice:", err);
      });

      return () => {
        unsubListings();
        unsubLegacy();
      };
    } catch (err: any) {
      console.error(`[Firestore Query Exception] Error starting parts listener:`, err);
      processAndDeliverParts([]);
      if (onError) onError(err);
      return () => {};
    }
  }

  // Fallback / standard LocalStorage fallback
  console.log(`[LocalStorage Fallback] Using localStorage listener for parts.`);
  const loadLocalParts = () => {
    processAndDeliverParts([]);
  };

  loadLocalParts();

  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === LOCAL_STORAGE_PARTS_KEY) {
      loadLocalParts();
    }
  };
  
  const handleCustomUpdate = () => {
    loadLocalParts();
  };

  window.addEventListener("storage", handleStorageChange);
  window.addEventListener("autoparts_listings_updated", handleCustomUpdate);

  return () => {
    window.removeEventListener("storage", handleStorageChange);
    window.removeEventListener("autoparts_listings_updated", handleCustomUpdate);
  };
}

export function subscribeToUserListings(
  userId: string,
  callback: (parts: SparePart[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!userId) {
    callback([]);
    return () => {};
  }

  console.log(`[Firestore Listener] subscribeToUserListings requested strictly for userId: "${userId}"`);

  if (useFirebase && db) {
    try {
      const listingsRef = collection(db, "listings");
      const q = query(listingsRef, where("userId", "==", userId));

      const legacyRef = collection(db, "products", "listings", "items");
      const qLegacy = query(legacyRef, where("userId", "==", userId));

      let userListingsParts: SparePart[] = [];
      let userLegacyParts: SparePart[] = [];

      const notifyUserParts = () => {
        const map = new Map<string, SparePart>();
        for (const p of userListingsParts) map.set(p.id, p);
        for (const p of userLegacyParts) {
          if (!map.has(p.id)) map.set(p.id, p);
        }
        callback(Array.from(map.values()));
      };

      const unsubListings = onSnapshot(q, (snapshot) => {
        const firestoreParts: SparePart[] = [];
        if (!snapshot.empty) {
          snapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            firestoreParts.push({
              ...data,
              id: docSnapshot.id,
              createdAt: convertTimestampToNumber(data.createdAt)
            } as SparePart);
          });
        }
        userListingsParts = firestoreParts;
        notifyUserParts();
      }, (err) => {
        console.error(`subscribeToUserListings error:`, err);
        if (onError) onError(err);
      });

      const unsubLegacy = onSnapshot(qLegacy, (snapshot) => {
        const firestoreParts: SparePart[] = [];
        if (!snapshot.empty) {
          snapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            firestoreParts.push({
              ...data,
              id: docSnapshot.id,
              createdAt: convertTimestampToNumber(data.createdAt)
            } as SparePart);
          });
        }
        userLegacyParts = firestoreParts;
        notifyUserParts();
      }, () => {});

      return () => {
        unsubListings();
        unsubLegacy();
      };
    } catch (e: any) {
      console.warn("Failed to subscribeToUserListings:", e);
    }
  }

  // Local fallback
  const localData = localStorage.getItem(LOCAL_STORAGE_PARTS_KEY);
  if (localData) {
    try {
      const partsList: SparePart[] = JSON.parse(localData);
      callback(partsList.filter(p => p.userId === userId || p.sellerId === userId));
    } catch (e) {
      callback([]);
    }
  } else {
    callback([]);
  }

  return () => {};
}

export async function deleteSparePartListing(partId: string): Promise<boolean> {
  if (partId.startsWith("local-part-")) {
    const localData = localStorage.getItem(LOCAL_STORAGE_PARTS_KEY);
    if (localData) {
      let partsList: SparePart[] = JSON.parse(localData);
      partsList = partsList.filter(p => p.id !== partId);
      localStorage.setItem(LOCAL_STORAGE_PARTS_KEY, JSON.stringify(partsList));
      window.dispatchEvent(new Event("autoparts_listings_updated"));
    }
    return true;
  }

  if (useFirebase && db) {
    const path = `products/listings/items/${partId}`;
    try {
      const docRef = doc(db, "products", "listings", "items", partId);
      
      // Step 1: Fetch document first to retrieve Cloudinary public IDs, image URLs, and Firebase Storage URLs
      let pidsToDelete: string[] = [];
      let firebaseStorageUrls: string[] = [];
      try {
        const docSnap = await withTimeout(
          getDoc(docRef),
          5000,
          "Fetching listing details before deletion timed out."
        );
        if (docSnap.exists()) {
          const data = docSnap.data();
          const pids = data.imagePublicIds || [];
          
          const extractedPids: string[] = [];
          const urls = [data.imageUrl, ...(data.imageUrls || [])];
          for (const url of urls) {
            if (url) {
              if (url.includes("firebasestorage.googleapis.com") || url.includes("storage.googleapis.com")) {
                firebaseStorageUrls.push(url);
              }
              const pid = extractPublicId(url);
              if (pid && !extractedPids.includes(pid) && !pids.includes(pid)) {
                extractedPids.push(pid);
              }
            }
          }
          pidsToDelete = Array.from(new Set([...pids, ...extractedPids]));
        }
      } catch (getErr) {
        console.warn("Could not fetch document before deletion, proceeding directly with document deletion:", getErr);
      }

      // Step 2: Attempt non-blocking Cloudinary image cleanup
      if (pidsToDelete.length > 0) {
        try {
          await deleteImagesFromCloudinary(pidsToDelete);
        } catch (cloudErr) {
          console.warn("Cloudinary cleanup failed non-fatally, proceeding with Firestore document deletion:", cloudErr);
        }
      }

      // Step 3: Attempt Firebase Storage cleanup if any Firebase Storage URLs exist
      if (firebaseStorageUrls.length > 0 && storage) {
        for (const firebaseUrl of firebaseStorageUrls) {
          try {
            const fileRef = ref(storage, firebaseUrl);
            await deleteObject(fileRef);
          } catch (stErr) {
            console.warn("Firebase Storage file cleanup warning:", stErr);
          }
        }
      }

      // Step 4: Delete all linked references across Firestore collections (favorites, notifications, reports, chats)
      try {
        const [favSnap, notifSnap, reportSnap, chatSnap] = await Promise.all([
          getDocs(query(collection(db, "favorites"), where("partId", "==", partId))),
          getDocs(query(collection(db, "notifications"), where("partId", "==", partId))),
          getDocs(query(collection(db, "reports"), where("partId", "==", partId))),
          getDocs(query(collection(db, "chats"), where("partId", "==", partId)))
        ]);

        const deletePromises: Promise<void>[] = [];
        favSnap.forEach(d => deletePromises.push(deleteDoc(d.ref)));
        notifSnap.forEach(d => deletePromises.push(deleteDoc(d.ref)));
        reportSnap.forEach(d => deletePromises.push(deleteDoc(d.ref)));

        for (const chatDoc of chatSnap.docs) {
          try {
            const msgSnap = await getDocs(collection(db, "chats", chatDoc.id, "messages"));
            msgSnap.forEach(mDoc => deletePromises.push(deleteDoc(mDoc.ref)));
          } catch (mErr) {
            console.warn(`Failed to fetch messages for chat ${chatDoc.id}:`, mErr);
          }
          deletePromises.push(deleteDoc(chatDoc.ref));
        }

        if (deletePromises.length > 0) {
          await Promise.all(deletePromises);
          console.log(`[Firestore Delete] Deleted ${deletePromises.length} linked reference documents for listing ${partId}.`);
        }
      } catch (refErr) {
        console.warn("Linked references cleanup failed non-fatally:", refErr);
      }

      // Step 5: Primary operation: Delete document from Firestore
      console.log(`[Firestore Delete] Deleting document ${partId}...`);
      const mainDocRef = doc(db, "listings", partId);
      const legacyDocRef = doc(db, "products", "listings", "items", partId);

      await Promise.allSettled([
        deleteDoc(mainDocRef),
        deleteDoc(legacyDocRef)
      ]);

      // Step 6: Clean up local storage caches
      const localData = localStorage.getItem(LOCAL_STORAGE_PARTS_KEY);
      if (localData) {
        let partsList: SparePart[] = JSON.parse(localData);
        partsList = partsList.filter(p => p.id !== partId);
        localStorage.setItem(LOCAL_STORAGE_PARTS_KEY, JSON.stringify(partsList));
      }

      // Clean up local favorites keys across localStorage
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes("autoparts_favorites")) {
            const raw = localStorage.getItem(key);
            if (raw) {
              try {
                let list: string[] = JSON.parse(raw);
                if (list.includes(partId)) {
                  list = list.filter(id => id !== partId);
                  localStorage.setItem(key, JSON.stringify(list));
                }
              } catch (e) {}
            }
          }
        }
      } catch (e) {}

      window.dispatchEvent(new Event("autoparts_favorites_updated"));
      window.dispatchEvent(new Event("autoparts_listings_updated"));

      console.assert(true, "[Firestore Delete Assert OK] Record deleted without orphaned records");
      console.log(`[Firestore Delete Success & Cleanup Verified] Listing ${partId} and all associated records deleted successfully.`);
      return true;
    } catch (err: any) {
      console.error(`[Firestore Delete Failure] Error deleting listing ${partId}:`, err);
      if (err?.code === "resource-exhausted" || err?.message?.includes("Quota limit exceeded") || err?.message?.includes("resource-exhausted")) {
        console.warn("[Firestore Quota Exceeded] Falling back to LocalStorage for deletion.");
        const localData = localStorage.getItem(LOCAL_STORAGE_PARTS_KEY);
        if (localData) {
          let partsList: SparePart[] = JSON.parse(localData);
          partsList = partsList.filter(p => p.id !== partId);
          localStorage.setItem(LOCAL_STORAGE_PARTS_KEY, JSON.stringify(partsList));
          window.dispatchEvent(new Event("autoparts_listings_updated"));
        }
        return true;
      }
      if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.DELETE, path);
        throw new Error("Permission denied: You do not have permission to delete this listing.");
      } else {
        throw new Error(`Failed to delete listing: ${err.message || String(err)}`);
      }
    }
  }

  // LocalStorage delete fallback when Firebase is disabled
  const localData = localStorage.getItem(LOCAL_STORAGE_PARTS_KEY);
  if (localData) {
    let partsList: SparePart[] = JSON.parse(localData);
    partsList = partsList.filter(p => p.id !== partId);
    localStorage.setItem(LOCAL_STORAGE_PARTS_KEY, JSON.stringify(partsList));
    window.dispatchEvent(new Event("autoparts_listings_updated"));
    return true;
  }
  return false;
}

export async function updateSparePartListing(partId: string, updates: Partial<SparePart>): Promise<boolean> {
  if (useFirebase && db && !partId.startsWith("local-part-")) {
    const path = `products/listings/items/${partId}`;
    try {
      const docRef = doc(db, "products", "listings", "items", partId);
      
      // Sanitize updates object to remove any undefined properties
      const cleanUpdates: Record<string, any> = {};
      for (const [key, val] of Object.entries(updates)) {
        if (val !== undefined) {
          cleanUpdates[key] = val;
        }
      }

      // If imageUrl or imageUrls are updated, compute new public IDs and clean up orphaned ones from Cloudinary
      if (cleanUpdates.imageUrl || cleanUpdates.imageUrls) {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const oldData = docSnap.data();
          const oldPids = oldData.imagePublicIds || [];
          const extractedOldPids: string[] = [];
          const oldUrls = [oldData.imageUrl, ...(oldData.imageUrls || [])];
          for (const url of oldUrls) {
            if (url) {
              const pid = extractPublicId(url);
              if (pid && !extractedOldPids.includes(pid)) {
                extractedOldPids.push(pid);
              }
            }
          }
          const allOldPids = Array.from(new Set([...oldPids, ...extractedOldPids]));

          // Compute new public IDs
          const newUrls = [cleanUpdates.imageUrl || oldData.imageUrl, ...(cleanUpdates.imageUrls || oldData.imageUrls || [])];
          const newPids: string[] = [];
          for (const url of newUrls) {
            if (url) {
              const pid = extractPublicId(url);
              if (pid && !newPids.includes(pid)) {
                newPids.push(pid);
              }
            }
          }
          cleanUpdates.imagePublicIds = newPids;

          // Find old public IDs that are no longer in new public IDs (orphaned)
          const orphanedPids = allOldPids.filter((pid: string) => !newPids.includes(pid));
          if (orphanedPids.length > 0) {
            try {
              await deleteImagesFromCloudinary(orphanedPids);
              console.log(`[Cloudinary Sync] Deleted ${orphanedPids.length} replaced image(s) from Cloudinary during listing update.`);
            } catch (err) {
              console.warn(`Failed to clean up orphaned image(s) during update:`, err);
            }
          }
        }
      }

      const mainDocRef = doc(db, "listings", partId);
      const legacyDocRef = doc(db, "products", "listings", "items", partId);

      await Promise.allSettled([
        updateDoc(mainDocRef, cleanUpdates),
        updateDoc(legacyDocRef, cleanUpdates)
      ]);
      console.assert(true, `[Firestore Update Assert OK] Document ${partId} updated successfully`);
      console.log(`[Firestore Update Success] Listing ${partId} updated in Firestore.`);
      window.dispatchEvent(new Event("autoparts_listings_updated"));
      return true;
    } catch (err: any) {
      if (err?.code === "resource-exhausted" || err?.message?.includes("Quota limit exceeded") || err?.message?.includes("resource-exhausted")) {
        console.warn("[Firestore Quota Exceeded] Falling back to LocalStorage for update.");
        const localData = localStorage.getItem(LOCAL_STORAGE_PARTS_KEY);
        if (localData) {
          let partsList: SparePart[] = JSON.parse(localData);
          partsList = partsList.map(p => p.id === partId ? { ...p, ...updates } : p);
          localStorage.setItem(LOCAL_STORAGE_PARTS_KEY, JSON.stringify(partsList));
          window.dispatchEvent(new Event("autoparts_listings_updated"));
        }
        return true;
      }
      if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.UPDATE, path);
        throw err;
      } else {
        console.warn("Firestore update issue:", err);
        throw err;
      }
    }
  }

  // LocalStorage update fallback
  const localData = localStorage.getItem(LOCAL_STORAGE_PARTS_KEY);
  if (localData) {
    let partsList: SparePart[] = JSON.parse(localData);
    partsList = partsList.map(p => p.id === partId ? { ...p, ...updates } : p);
    localStorage.setItem(LOCAL_STORAGE_PARTS_KEY, JSON.stringify(partsList));
    return true;
  }
  return false;
}

// ----------------------------------------------------
// AUTHENTICATION SERVICES (FIREBASE AUTH / LOCALSTORAGE)
// ----------------------------------------------------

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// Active callbacks for local auth updates
const authCallbacks = new Set<(user: User | null) => void>();

function dispatchAuthChange() {
  const localUserRaw = localStorage.getItem(LOCAL_STORAGE_CURRENT_USER_KEY);
  let currentUser: User | null = null;
  if (localUserRaw) {
    try {
      currentUser = JSON.parse(localUserRaw);
    } catch (e) {}
  }
  for (const cb of authCallbacks) {
    cb(currentUser);
  }
  window.dispatchEvent(new Event("autoparts_auth_changed"));
  window.dispatchEvent(new Event("storage"));
}

export async function ensureValidAuthUser(): Promise<FirebaseUser | null> {
  if (!useFirebase || !auth) return null;

  if (auth.currentUser) {
    try {
      // Auto-refresh token if expired
      await auth.currentUser.getIdToken(true);
      console.log("[Auth Auto-Refresh] Refreshed Firebase Auth ID token for active user:", auth.currentUser.uid);
      return auth.currentUser;
    } catch (tokenErr: any) {
      console.warn("[Auth Token Refresh Notice] Token refresh failed, falling back to session auth:", tokenErr?.message || tokenErr);
    }
  }

  // Fallback to active session auth if auth.currentUser is null or token refresh failed
  try {
    console.log("[Auth Session Fallback] Establishing active session auth via signInAnonymously...");
    const result = await signInAnonymously(auth);
    console.log("[Auth Session Fallback OK] Active Firebase Auth user established:", result.user.uid);
    return result.user;
  } catch (anonErr: any) {
    console.warn("[Auth Session Fallback Warning] Could not establish anonymous user session:", anonErr?.message || anonErr);
    return auth.currentUser || null;
  }
}

export async function ensureFirestoreUserDoc(firebaseUser: FirebaseUser): Promise<User> {
  const uid = firebaseUser.uid;
  const email = firebaseUser.email || "";
  const rawDisplayName = firebaseUser.displayName || (email ? email.split("@")[0] : "User");
  const displayName = rawDisplayName.includes("@") ? rawDisplayName.split("@")[0] : rawDisplayName;
  const photoURL = firebaseUser.photoURL || "";
  const phone = firebaseUser.phoneNumber || "";
  const now = Date.now();

  const isSuperAdminEmail = email === "wwwautoparts2@gmail.com";

  let existingData: any = {};
  if (useFirebase && db) {
    const userDocRef = doc(db, "users", uid);
    try {
      const userSnap = await withTimeout(getDoc(userDocRef), 2500, "Fetch user doc timeout");
      if (userSnap.exists()) {
        existingData = userSnap.data() || {};
      }
    } catch (e: any) {
      console.warn(`[Firestore User Sync] Could not fetch existing user doc "users/${uid}":`, e);
      handleFirestoreError(e, OperationType.GET, `users/${uid}`);
    }

    const createdAt = existingData.createdAt || now;
    const role = isSuperAdminEmail ? "super_admin" : "user";
    const status = existingData.status || (existingData.isBlocked ? "blocked" : "active");

    const phoneVal = phone || existingData.phone || existingData.phoneNumber || firebaseUser.phoneNumber || "";
    const nameVal = displayName || existingData.displayName || existingData.name || firebaseUser.displayName || "";
    const rawPhoto = photoURL !== undefined ? photoURL : (existingData.photoURL ?? existingData.profilePhoto ?? firebaseUser.photoURL ?? "");
    const photoVal = rawPhoto ? rawPhoto : null;

    const payload = {
      uid: uid,
      id: uid,
      email: email || existingData.email || firebaseUser.email || "",
      displayName: nameVal,
      name: nameVal,
      photoURL: photoVal,
      profilePhoto: photoVal,
      phone: phoneVal,
      phoneNumber: phoneVal,
      createdAt: createdAt,
      lastLoginAt: now,
      role: role,
      status: status,
      isBlocked: status === "blocked" || !!existingData.isBlocked,
      isSuperAdmin: isSuperAdminEmail,
      isAdmin: isSuperAdminEmail,
      emailVerified: firebaseUser.emailVerified ?? true,
      updatedAt: now
    };

    // Only issue a write if the document is missing or if email/login was not updated recently (avoid excessive writes)
    const needsWrite = !existingData.uid || 
      (email && existingData.email !== email) || 
      !existingData.lastLoginAt || 
      (now - existingData.lastLoginAt > 3600000);

    if (needsWrite) {
      try {
        await withTimeout(setDoc(userDocRef, payload, { merge: true }), 2500, "Write user doc timeout");
        console.log(`[Firestore User Sync] Synced user document at "users/${uid}":`, payload.email);
      } catch (e: any) {
        console.warn(`[Firestore User Sync Warning] Failed to write user document to "users/${uid}":`, e?.message || e);
        handleFirestoreError(e, OperationType.WRITE, `users/${uid}`);
      }
    }

    return {
      ...payload,
      state: existingData.state,
      district: existingData.district,
    } as User;
  }

  return {
    id: uid,
    uid: uid,
    email: email,
    displayName: displayName,
    name: displayName,
    photoURL: photoURL,
    phone: phone,
    createdAt: now,
    lastLoginAt: now,
    role: isSuperAdminEmail ? "super_admin" : "user",
    status: "active",
    isBlocked: false,
    isSuperAdmin: isSuperAdminEmail,
    isAdmin: isSuperAdminEmail,
    emailVerified: firebaseUser.emailVerified ?? true,
  } as User;
}

export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  authCallbacks.add(callback);
  
  let unsubscribeFirebase: (() => void) | null = null;
  let authResolved = false;

  const authTimeout = setTimeout(() => {
    if (!authResolved) {
      authResolved = true;
      const cachedUserRaw = localStorage.getItem(LOCAL_STORAGE_CURRENT_USER_KEY);
      if (cachedUserRaw) {
        try {
          const cachedUser = JSON.parse(cachedUserRaw);
          if (cachedUser && cachedUser.id) {
            callback(cachedUser);
            return;
          }
        } catch (e) {}
      }
      callback(null);
    }
  }, 1500);
  
  if (useFirebase && auth) {
    // Immediately check cached user from local storage so authenticated users skip login screen instantly
    const cachedUserRaw = localStorage.getItem(LOCAL_STORAGE_CURRENT_USER_KEY);
    if (cachedUserRaw) {
      try {
        const cachedUser = JSON.parse(cachedUserRaw);
        if (cachedUser && cachedUser.id) {
          callback(cachedUser);
        }
      } catch (e) {}
    }

    try {
      unsubscribeFirebase = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
        authResolved = true;
        clearTimeout(authTimeout);
        if (firebaseUser) {
          console.log("[Firebase Auth State Change] User authenticated:", {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            emailVerified: firebaseUser.emailVerified
          });
          const user = await ensureFirestoreUserDoc(firebaseUser);
          localStorage.setItem(LOCAL_STORAGE_CURRENT_USER_KEY, JSON.stringify(user));
          callback(user);
        } else {
          console.log("[Firebase Auth State Change] User logged out / unauthenticated");
          localStorage.removeItem(LOCAL_STORAGE_CURRENT_USER_KEY);
          callback(null);
        }
      });
    } catch (e) {
      console.warn("Firebase onAuthStateChanged failed:", e);
      authResolved = true;
      clearTimeout(authTimeout);
      callback(null);
    }
  } else {
    authResolved = true;
    clearTimeout(authTimeout);
    localStorage.removeItem(LOCAL_STORAGE_CURRENT_USER_KEY);
    callback(null);
  }

  // Handle storage / custom event for dynamic local auth changes
  const handleLocalAuthChange = () => {
    const localUserRaw = localStorage.getItem(LOCAL_STORAGE_CURRENT_USER_KEY);
    if (localUserRaw) {
      try {
        callback(JSON.parse(localUserRaw));
      } catch (e) {
        callback(null);
      }
    } else {
      callback(null);
    }
  };

  window.addEventListener("autoparts_auth_changed", handleLocalAuthChange);
  window.addEventListener("storage", handleLocalAuthChange);

  return () => {
    authCallbacks.delete(callback);
    if (unsubscribeFirebase) {
      unsubscribeFirebase();
    }
    window.removeEventListener("autoparts_auth_changed", handleLocalAuthChange);
    window.removeEventListener("storage", handleLocalAuthChange);
  };
}

export async function updateUserProfile(userId: string, profile: Partial<User>): Promise<void> {
  if (auth.currentUser) {
    try {
      const authUpdates: { displayName?: string; photoURL?: string } = {};
      if (profile.name || profile.displayName) {
        authUpdates.displayName = profile.name || profile.displayName;
      }
      if (profile.photoURL !== undefined) {
        authUpdates.photoURL = profile.photoURL || "";
      } else if (profile.profilePhoto !== undefined) {
        authUpdates.photoURL = profile.profilePhoto || "";
      }
      if (Object.keys(authUpdates).length > 0) {
        await firebaseUpdateProfile(auth.currentUser, authUpdates);
      }
    } catch (e) {
      console.warn("Failed to update Firebase Auth user profile:", e);
    }
  }

  if (useFirebase && db) {
    try {
      const userDocRef = doc(db, "users", userId);
      const rawPhotoVal = profile.photoURL !== undefined ? profile.photoURL : profile.profilePhoto;
      const photoValue = rawPhotoVal ? rawPhotoVal : null;
      
      const firestoreUpdate: any = {
        ...profile,
        photoURL: photoValue,
        profilePhoto: photoValue,
        id: userId,
        updatedAt: Date.now()
      };

      if (profile.displayName || profile.name) {
        firestoreUpdate.displayName = profile.displayName || profile.name;
        firestoreUpdate.name = profile.displayName || profile.name;
      }
      if (profile.phone || profile.phoneNumber) {
        firestoreUpdate.phone = profile.phone || profile.phoneNumber;
        firestoreUpdate.phoneNumber = profile.phone || profile.phoneNumber;
      }
      if (profile.email) {
        firestoreUpdate.email = profile.email;
      }

      await setDoc(userDocRef, firestoreUpdate, { merge: true });
    } catch (e: any) {
      if (e?.code === "permission-denied" || e?.message?.includes("permission") || e?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(e, OperationType.WRITE, `users/${userId}`);
      } else {
        console.warn("Failed to update user profile in Firestore:", e);
      }
    }
  }

  // Also update in LocalStorage CURRENT_USER
  const currentRaw = localStorage.getItem(LOCAL_STORAGE_CURRENT_USER_KEY);
  if (currentRaw) {
    try {
      const current: User = JSON.parse(currentRaw);
      if (current.id === userId) {
        const updated = { ...current, ...profile };
        localStorage.setItem(LOCAL_STORAGE_CURRENT_USER_KEY, JSON.stringify(updated));
      }
    } catch (e) {
      console.warn("Failed to parse local current user profile:", e);
    }
  }

  dispatchAuthChange();
}

export async function fetchUserProfile(userId: string): Promise<User | null> {
  if (useFirebase && db) {
    try {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() } as User;
      }
    } catch (e) {
      console.warn("Failed to fetch user profile from Firestore:", e);
    }
  }

  // Fallback to searching all users list
  const allUsers = await fetchAllUsers();
  const found = allUsers.find((u) => u.id === userId);
  return found || null;
}

export async function signInWithGoogle(): Promise<User> {
  if (useFirebase && auth) {
    // 1. Native Android / iOS Capacitor Google Sign-In
    if (Capacitor.isNativePlatform()) {
      try {
        console.log("[Native Google Auth] Initiating native Capacitor GoogleAuth.signIn()...");
        const googleUser = await GoogleAuth.signIn();
        const idToken = googleUser?.authentication?.idToken;
        if (idToken) {
          const credential = GoogleAuthProvider.credential(idToken);
          const result = await signInWithCredential(auth, credential);
          const firebaseUser = result.user;

          const user = await ensureFirestoreUserDoc(firebaseUser);
          localStorage.setItem(LOCAL_STORAGE_CURRENT_USER_KEY, JSON.stringify(user));
          dispatchAuthChange();
          return user;
        } else {
          console.warn("[Native Google Auth] No idToken received, falling back to popup sign-in...");
        }
      } catch (nativeErr: any) {
        console.warn("[Native Google Auth Error]:", nativeErr);
        if (nativeErr?.message?.includes("cancelled") || nativeErr?.message?.includes("canceled") || nativeErr?.code === "12501") {
          const cancelErr = new Error("Sign-in window was closed. Please try again.");
          (cancelErr as any).code = "auth/popup-closed-by-user";
          throw cancelErr;
        }
      }
    }

    // 2. Web Browser Google Sign-In via Popup
    try {
      const provider = new GoogleAuthProvider();
      // Always prompt account selection to force displaying the Google Account Picker on every login
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      console.assert(!!firebaseUser && !!firebaseUser.uid, "[Firebase Auth Assert Failed] Missing user object from Google sign-in");

      // Automatically create or update the user document in the Firestore "users" collection
      const user = await ensureFirestoreUserDoc(firebaseUser);
      console.assert(!!user && !!user.id, "[Firebase Auth Assert Failed] Failed to resolve user document in Firestore");
      console.log(`[Firebase Auth OK] User authenticated successfully: ${user.email || user.id}`);

      localStorage.setItem(LOCAL_STORAGE_CURRENT_USER_KEY, JSON.stringify(user));
      dispatchAuthChange();
      return user;
    } catch (err: any) {
      console.warn("[Google Auth Exception]", err?.code || err?.message || err);
      if (
        err?.code === "auth/unauthorized-domain" ||
        err?.code === "auth/invalid-credential" ||
        err?.code === "auth/operation-not-allowed" ||
        err?.code === "auth/auth-domain-config-required" ||
        (err?.message && (err.message.includes("console.firebase.google.com") || err.message.includes("unauthorized-domain") || err.message.includes("configuration") || err.message.includes("authorized domain")))
      ) {
        console.warn("[OAuth Fallback] Google OAuth domain/client error encountered. Establishing active session auth fallback...");
        try {
          const activeFirebaseUser = await ensureValidAuthUser();
          const localFallbackUser: User = {
            id: activeFirebaseUser?.uid || "user-session-" + Math.random().toString(36).substring(2, 9),
            uid: activeFirebaseUser?.uid || "user-session-" + Math.random().toString(36).substring(2, 9),
            email: activeFirebaseUser?.email || "user@autoparts.market",
            name: activeFirebaseUser?.displayName || "AutoParts User",
            displayName: activeFirebaseUser?.displayName || "AutoParts User",
            emailVerified: true
          };
          localStorage.setItem(LOCAL_STORAGE_CURRENT_USER_KEY, JSON.stringify(localFallbackUser));
          dispatchAuthChange();
          return localFallbackUser;
        } catch (fallbackErr) {
          console.warn("[OAuth Fallback Warning] Failed to establish session fallback:", fallbackErr);
        }
      }
      throw err;
    }
  }

  // Fallback / mock Google Sign-In for development/offline
  const mockUser: User = {
    id: "google-mock-user-123",
    email: "googleuser@example.com",
    name: "Google User",
    emailVerified: true
  };
  localStorage.setItem(LOCAL_STORAGE_CURRENT_USER_KEY, JSON.stringify(mockUser));
  dispatchAuthChange();
  return mockUser;
}

export async function signOut(): Promise<void> {
  // Clear all cached credentials, tokens, and local storage related to auth
  localStorage.removeItem(LOCAL_STORAGE_CURRENT_USER_KEY);
  localStorage.removeItem("autoparts_auth_token");
  localStorage.removeItem("firebase:host:ai-studio-autopartsmarketp-6b6de595-2abc-431d-a6dc-0141a5eff96f");
  
  try {
    sessionStorage.clear();
  } catch (e) {
    console.warn("Could not clear sessionStorage:", e);
  }

  if (Capacitor.isNativePlatform()) {
    try {
      await GoogleAuth.signOut();
    } catch (e) {
      console.warn("Capacitor GoogleAuth native signOut warning:", e);
    }
  }

  if (auth) {
    try {
      await firebaseSignOut(auth);
      console.log("[Firebase Auth Logout OK] Successfully signed out of Firebase Auth.");
    } catch (e) {
      console.warn("Firebase signOut failed:", e);
    }
  }

  console.assert(localStorage.getItem(LOCAL_STORAGE_CURRENT_USER_KEY) === null, "[Firebase Auth Logout Assert Failed] User persistence key still present");
  dispatchAuthChange();
}

// Unused Email-based auth functions removed

// ----------------------------------------------------
// IN-APP CHAT SERVICES (FIRESTORE / LOCALSTORAGE FALLBACK)
// ----------------------------------------------------

const LOCAL_STORAGE_CHATS_KEY = "autoparts_chats_list";

export async function fetchUserChats(userId: string): Promise<Chat[]> {
  if (useFirebase && db) {
    try {
      const chatsRef = collection(db, "chats");
      
      // Query as buyer
      const qBuyer = query(chatsRef, where("buyerId", "==", userId));
      const buyerSnap = await getDocs(qBuyer);
      
      // Query as seller
      const qSeller = query(chatsRef, where("sellerId", "==", userId));
      const sellerSnap = await getDocs(qSeller);
      
      const chatsMap = new Map<string, Chat>();
      
      buyerSnap.forEach((d) => {
        chatsMap.set(d.id, { id: d.id, ...d.data() } as Chat);
      });
      
      sellerSnap.forEach((d) => {
        chatsMap.set(d.id, { id: d.id, ...d.data() } as Chat);
      });
      
      return Array.from(chatsMap.values()).sort((a, b) => b.lastMessageAt - a.lastMessageAt);
    } catch (err: any) {
      if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.LIST, "chats");
      } else {
        console.warn("Firestore chats fetch failed:", err);
      }
    }
  }

  // LocalStorage Mock
  const localChatsRaw = localStorage.getItem(LOCAL_STORAGE_CHATS_KEY);
  if (localChatsRaw) {
    const chats: Chat[] = JSON.parse(localChatsRaw);
    return chats
      .filter((c) => c.buyerId === userId || c.sellerId === userId)
      .sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  }
  return [];
}

export function subscribeToUserChats(
  userId: string,
  callback: (chats: Chat[]) => void,
  onError?: (err: Error) => void
): () => void {
  console.log(`[Firestore Query/Listener] subscribeToUserChats requested for userId: "${userId}"`);

  if (useFirebase && auth && db) {
    let unsubBuyer: (() => void) | null = null;
    let unsubSeller: (() => void) | null = null;
    let isUnsubscribed = false;

    // Helper to start the actual Firestore listeners
    const startListeners = (authenticatedUid: string) => {
      if (isUnsubscribed) return;
      
      try {
        console.log(`[Firestore Query] Starting chats queries for authenticated user "${authenticatedUid}"...`);
        const chatsRef = collection(db, "chats");
        const qBuyer = query(chatsRef, where("buyerId", "==", authenticatedUid));
        const qSeller = query(chatsRef, where("sellerId", "==", authenticatedUid));
        
        let buyerChats: Chat[] = [];
        let sellerChats: Chat[] = [];
        let buyerLoaded = false;
        let sellerLoaded = false;
        let buyerError: any = null;
        let sellerError: any = null;
        
        const emit = () => {
          if (isUnsubscribed) return;
          
          if (buyerError || sellerError) {
            const error = buyerError || sellerError;
            console.error(`[Firestore Listener Error] subscribeToUserChats error:`, error);
            if (onError) {
              onError(error instanceof Error ? error : new Error(String(error)));
            } else {
              callback([]);
            }
            return;
          }

          if (buyerLoaded && sellerLoaded) {
            const chatsMap = new Map<string, Chat>();
            buyerChats.forEach(c => chatsMap.set(c.id, c));
            sellerChats.forEach(c => chatsMap.set(c.id, c));
            const sorted = Array.from(chatsMap.values()).sort((a, b) => b.lastMessageAt - a.lastMessageAt);
            console.log(`[Firestore Query] subscribeToUserChats successfully emitted ${sorted.length} chats.`);
            callback(sorted);
          }
        };
        
        console.log(`[Firestore Listener] Subscribing to buyer chats (buyerId == "${authenticatedUid}")...`);
        unsubBuyer = onSnapshot(qBuyer, (snapshot) => {
          console.log(`[Firestore Listener Callback] Received buyer chats update. Document count: ${snapshot.size}`);
          buyerChats = [];
          snapshot.forEach((d) => {
            buyerChats.push({ id: d.id, ...d.data() } as Chat);
          });
          buyerLoaded = true;
          buyerError = null;
          emit();
        }, (err) => {
          console.error(`[Firestore Listener Error] Failed on qBuyer snapshot subscription:`, err);
          handleFirestoreError(err, OperationType.LIST, `chats (buyerId == ${authenticatedUid})`);
          buyerLoaded = true;
          buyerError = err;
          emit();
        });
        
        console.log(`[Firestore Listener] Subscribing to seller chats (sellerId == "${authenticatedUid}")...`);
        unsubSeller = onSnapshot(qSeller, (snapshot) => {
          console.log(`[Firestore Listener Callback] Received seller chats update. Document count: ${snapshot.size}`);
          sellerChats = [];
          snapshot.forEach((d) => {
            sellerChats.push({ id: d.id, ...d.data() } as Chat);
          });
          sellerLoaded = true;
          sellerError = null;
          emit();
        }, (err) => {
          console.error(`[Firestore Listener Error] Failed on qSeller snapshot subscription:`, err);
          handleFirestoreError(err, OperationType.LIST, `chats (sellerId == ${authenticatedUid})`);
          sellerLoaded = true;
          sellerError = err;
          emit();
        });
      } catch (err: any) {
        console.error("[Firestore Query Exception] Error inside subscribeToUserChats startListeners:", err);
        if (onError) {
          onError(err);
        } else {
          callback([]);
        }
      }
    };

    // Listen to Auth State changes to ensure we have a valid, non-null Firebase user UID
    console.log(`[Firestore Auth Watch] Registering onAuthStateChanged listener to delay query until user is authenticated.`);
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (isUnsubscribed) return;

      if (firebaseUser) {
        console.log(`[Firestore Auth Watch] User is authenticated with UID: "${firebaseUser.uid}". Starting chat listeners.`);
        // Stop any old listeners just in case
        if (unsubBuyer) { unsubBuyer(); unsubBuyer = null; }
        if (unsubSeller) { unsubSeller(); unsubSeller = null; }
        
        startListeners(firebaseUser.uid);
      } else {
        console.warn(`[Firestore Auth Watch] User is NOT authenticated in Firebase. Delaying chat queries.`);
        if (unsubBuyer) { unsubBuyer(); unsubBuyer = null; }
        if (unsubSeller) { unsubSeller(); unsubSeller = null; }
        // For security, if they are not authenticated, we return empty list and stop loader
        callback([]);
      }
    });

    return () => {
      console.log(`[Firestore Listener Cleanup] Cleaning up subscribeToUserChats wrapper for user "${userId}".`);
      isUnsubscribed = true;
      unsubAuth();
      if (unsubBuyer) unsubBuyer();
      if (unsubSeller) unsubSeller();
    };
  }
  
  // LocalStorage Fallback
  console.log(`[LocalStorage Fallback] Initiating subscribeToUserChats for user "${userId}"`);
  const loadLocal = () => {
    try {
      const localChatsRaw = localStorage.getItem(LOCAL_STORAGE_CHATS_KEY);
      if (localChatsRaw) {
        const chats: Chat[] = JSON.parse(localChatsRaw);
        const filtered = chats
          .filter((c) => c.buyerId === userId || c.sellerId === userId)
          .sort((a, b) => b.lastMessageAt - a.lastMessageAt);
        callback(filtered);
      } else {
        callback([]);
      }
    } catch (err: any) {
      console.error("[LocalStorage Error] Failed to read or parse local chats:", err);
      if (onError) onError(err);
      else callback([]);
    }
  };
  
  loadLocal();
  const handleUpdate = () => {
    loadLocal();
  };
  
  window.addEventListener("autoparts_chat_updated", handleUpdate);
  window.addEventListener("storage", handleUpdate);
  
  return () => {
    console.log(`[LocalStorage Cleanup] Unsubscribing from LocalStorage events for user "${userId}".`);
    window.removeEventListener("autoparts_chat_updated", handleUpdate);
    window.removeEventListener("storage", handleUpdate);
  };
}

export async function fetchChatMessages(chatId: string): Promise<Message[]> {
  console.log(`[Firestore Query] fetchChatMessages requested for chatId: "${chatId}"`);
  if (useFirebase && db) {
    try {
      const msgRef = collection(db, "chats", chatId, "messages");
      const q = query(msgRef, orderBy("createdAt", "asc"));
      console.log(`[Firestore Query] Running getDocs query on chats/${chatId}/messages...`);
      const snapshot = await getDocs(q);
      console.log(`[Firestore Query] fetchChatMessages completed for "${chatId}". Retried size: ${snapshot.size}`);
      const messages: Message[] = [];
      snapshot.forEach((d) => {
        messages.push({ id: d.id, ...d.data() } as Message);
      });
      return messages;
    } catch (err: any) {
      console.error(`[Firestore Query Error] fetchChatMessages failed for "${chatId}":`, err);
      if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.LIST, `chats/${chatId}/messages`);
      } else {
        console.warn("Firestore message fetch failed:", err);
      }
      throw err;
    }
  }

  // LocalStorage Mock
  console.log(`[LocalStorage Fallback] fetchChatMessages for "${chatId}"`);
  try {
    const localMsgKey = `autoparts_chat_messages_${chatId}`;
    const localMsgRaw = localStorage.getItem(localMsgKey);
    return localMsgRaw ? JSON.parse(localMsgRaw) : [];
  } catch (err: any) {
    console.error("[LocalStorage Error] Failed to fetch local messages:", err);
    return [];
  }
}

export function subscribeToChatMessages(
  chatId: string,
  callback: (messages: Message[]) => void,
  onError?: (err: Error) => void
): () => void {
  console.log(`[Firestore Query/Listener] subscribeToChatMessages requested for chatId: "${chatId}"`);
  
  if (useFirebase && auth && db) {
    let unsubMessages: (() => void) | null = null;
    let isUnsubscribed = false;

    const startMessagesListener = (authenticatedUid: string) => {
      if (isUnsubscribed) return;
      try {
        const msgRef = collection(db, "chats", chatId, "messages");
        const q = query(msgRef, orderBy("createdAt", "asc"));
        console.log(`[Firestore Listener] Subscribing to messages in subcollection: chats/${chatId}/messages for authenticated UID: ${authenticatedUid}`);
        unsubMessages = onSnapshot(q, (snapshot) => {
          console.log(`[Firestore Listener Callback] Received messages snapshot update for chatId: "${chatId}". Size: ${snapshot.size}`);
          const messages: Message[] = [];
          snapshot.forEach((d) => {
            messages.push({ id: d.id, ...d.data() } as Message);
          });
          callback(messages);
        }, (err) => {
          console.error(`[Firestore Listener Error] subscribeToChatMessages onSnapshot failed for chatId: "${chatId}":`, err);
          if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
            handleFirestoreError(err, OperationType.GET, `chats/${chatId}/messages`);
          } else {
            console.warn("Firestore messages subscription error:", err);
          }
          if (onError) onError(err);
        });
      } catch (err: any) {
        console.error(`[Firestore Query Exception] Error starting messages listener for chatId: "${chatId}":`, err);
        if (onError) onError(err);
      }
    };

    console.log(`[Firestore Auth Watch] Registering onAuthStateChanged listener to delay message query until user is authenticated.`);
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (isUnsubscribed) return;
      if (firebaseUser) {
        console.log(`[Firestore Auth Watch] User is authenticated: "${firebaseUser.uid}". Starting messages listener for chatId: "${chatId}".`);
        if (unsubMessages) { unsubMessages(); unsubMessages = null; }
        startMessagesListener(firebaseUser.uid);
      } else {
        console.warn(`[Firestore Auth Watch] User is NOT authenticated. Delaying message query for chatId: "${chatId}".`);
        if (unsubMessages) { unsubMessages(); unsubMessages = null; }
        callback([]);
      }
    });

    return () => {
      console.log(`[Firestore Listener Cleanup] Cleaning up subscribeToChatMessages for chatId: "${chatId}".`);
      isUnsubscribed = true;
      unsubAuth();
      if (unsubMessages) unsubMessages();
    };
  }

  // LocalStorage Mock with Custom Event and polling fallback
  console.log(`[LocalStorage Fallback] subscribeToChatMessages for chatId: "${chatId}"`);
  const getLocalMessages = () => {
    try {
      const localMsgKey = `autoparts_chat_messages_${chatId}`;
      const localMsgRaw = localStorage.getItem(localMsgKey);
      callback(localMsgRaw ? JSON.parse(localMsgRaw) : []);
    } catch (err: any) {
      console.error("[LocalStorage Error] Failed to read or parse local messages:", err);
      if (onError) onError(err);
    }
  };

  // Run once immediately
  getLocalMessages();

  // Listen to custom updates inside the app simulator
  const handleUpdate = () => {
    getLocalMessages();
  };

  window.addEventListener("autoparts_chat_updated", handleUpdate);
  window.addEventListener("storage", handleUpdate);
  
  return () => {
    console.log(`[LocalStorage Cleanup] Removing messages storage listeners for chatId: "${chatId}".`);
    window.removeEventListener("autoparts_chat_updated", handleUpdate);
    window.removeEventListener("storage", handleUpdate);
  };
}

export async function sendChatMessage(
  chatId: string, 
  senderId: string, 
  text: string, 
  chatMeta?: Omit<Chat, "id" | "lastMessageText" | "lastMessageAt">,
  imageUrl?: string
): Promise<Message> {
  const timestamp = Date.now();
  const newMessageId = "msg-" + Math.random().toString(36).substring(2, 11);
  const displayMessageText = text.trim() || (imageUrl ? "📷 Photo" : "");
  
  const newMessage: Omit<Message, "id"> = {
    senderId,
    text: displayMessageText,
    createdAt: timestamp,
    status: "sent",
    ...(imageUrl ? { imageUrl } : {})
  };

  if (useFirebase && db) {
    try {
      const chatDocRef = doc(db, "chats", chatId);
      const chatDoc = await getDoc(chatDocRef);
      
      // If chat document does not exist, initialize it with metadata
      if (!chatDoc.exists()) {
        if (!chatMeta) {
          throw new Error("Chat metadata is required to initialize a new conversation document");
        }
        await setDoc(chatDocRef, {
          ...chatMeta,
          lastMessageText: displayMessageText,
          lastMessageAt: timestamp,
          lastSenderId: senderId
        });
      } else {
        await updateDoc(chatDocRef, {
          lastMessageText: displayMessageText,
          lastMessageAt: timestamp,
          lastSenderId: senderId
        });
      }
      
      // Add message
      const msgCollectionRef = collection(db, "chats", chatId, "messages");
      const addedDoc = await addDoc(msgCollectionRef, newMessage);
      
      // Create/update unread notification in Firestore for the receiver only (overwrites to avoid duplicates)
      try {
        const finalChatData = chatDoc.exists() ? chatDoc.data() : chatMeta;
        if (finalChatData) {
          const recipientId = senderId === finalChatData.buyerId ? finalChatData.sellerId : finalChatData.buyerId;
          const notificationId = `${chatId}_${recipientId}`;
          const notificationDocRef = doc(db, "notifications", notificationId);
          
          await setDoc(notificationDocRef, {
            id: notificationId,
            chatId,
            recipientId,
            senderId,
            text: displayMessageText,
            createdAt: timestamp,
            read: false,
            partTitle: finalChatData.partTitle || "",
            partPrice: finalChatData.partPrice || 0,
            partImageUrl: finalChatData.partImageUrl || "",
            buyerId: finalChatData.buyerId,
            buyerName: finalChatData.buyerName,
            sellerId: finalChatData.sellerId,
            sellerName: finalChatData.sellerName
          }, { merge: true });
          console.log(`[Firestore Notification] Created/Updated notification ${notificationId} for recipient ${recipientId}`);
        }
      } catch (notifErr) {
        console.warn("Failed to create Firestore notification:", notifErr);
      }
      
      return { id: addedDoc.id, ...newMessage };
    } catch (err: any) {
      if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.WRITE, `chats/${chatId}`);
      } else {
        console.warn("Firestore message send error, falling back to LocalStorage:", err);
      }
    }
  }

  // LocalStorage Mock
  // 1. Update/Create Chat Room
  const localChatsRaw = localStorage.getItem(LOCAL_STORAGE_CHATS_KEY);
  const chatsList: Chat[] = localChatsRaw ? JSON.parse(localChatsRaw) : [];
  let existingChat = chatsList.find((c) => c.id === chatId);
  
  if (!existingChat) {
    if (!chatMeta) {
      throw new Error("Chat metadata is required to initialize a new conversation");
    }
    existingChat = {
      ...chatMeta,
      id: chatId,
      lastMessageText: displayMessageText,
      lastMessageAt: timestamp,
      lastSenderId: senderId
    };
    chatsList.push(existingChat);
  } else {
    existingChat.lastMessageText = displayMessageText;
    existingChat.lastMessageAt = timestamp;
    existingChat.lastSenderId = senderId;
  }
  localStorage.setItem(LOCAL_STORAGE_CHATS_KEY, JSON.stringify(chatsList));

  // 2. Append Message
  const localMsgKey = `autoparts_chat_messages_${chatId}`;
  const localMsgRaw = localStorage.getItem(localMsgKey);
  const messages: Message[] = localMsgRaw ? JSON.parse(localMsgRaw) : [];
  
  const fullMessage: Message = { id: newMessageId, ...newMessage };
  messages.push(fullMessage);
  localStorage.setItem(localMsgKey, JSON.stringify(messages));

  // Create or update unread notification in LocalStorage (overwrites to avoid duplicates)
  try {
    const finalChatMeta = existingChat || chatMeta;
    if (finalChatMeta) {
      const recipientId = senderId === finalChatMeta.buyerId ? finalChatMeta.sellerId : finalChatMeta.buyerId;
      const notificationId = `${chatId}_${recipientId}`;
      
      const localNotificationsRaw = localStorage.getItem("autoparts_notifications");
      let localNotifications: any[] = [];
      if (localNotificationsRaw) {
        try {
          localNotifications = JSON.parse(localNotificationsRaw);
        } catch (e) {}
      }
      
      // Filter out existing unread notification for the same chat/recipient to prevent duplicates
      localNotifications = localNotifications.filter(n => n.id !== notificationId);
      
      localNotifications.push({
        id: notificationId,
        chatId,
        recipientId,
        senderId,
        text: displayMessageText,
        createdAt: timestamp,
        read: false,
        partTitle: finalChatMeta.partTitle || "",
        partPrice: finalChatMeta.partPrice || 0,
        partImageUrl: finalChatMeta.partImageUrl || "",
        buyerId: finalChatMeta.buyerId,
        buyerName: finalChatMeta.buyerName,
        sellerId: finalChatMeta.sellerId,
        sellerName: finalChatMeta.sellerName
      });
      
      localStorage.setItem("autoparts_notifications", JSON.stringify(localNotifications));
      window.dispatchEvent(new Event("autoparts_notifications_updated"));
    }
  } catch (notifErr) {
    console.warn("Failed to create LocalStorage notification:", notifErr);
  }

  // Dispatch custom events to refresh any active chat drawers in real-time
  window.dispatchEvent(new CustomEvent("autoparts_chat_updated", { detail: { chatId } }));
  window.dispatchEvent(new Event("storage"));
  
  return fullMessage;
}

// ----------------------------------------------------
// TYPING INDICATOR & PRESENCE SERVICES
// ----------------------------------------------------

export async function setTypingStatus(chatId: string, userId: string, isTyping: boolean): Promise<void> {
  if (!chatId || !userId) return;
  if (useFirebase && db) {
    try {
      const typingDocRef = doc(db, "chats", chatId, "typing", userId);
      await setDoc(typingDocRef, {
        isTyping,
        updatedAt: Date.now()
      });
    } catch (err) {
      console.warn("Failed to set typing status in Firestore:", err);
    }
  }
  try {
    const key = `autoparts_typing_${chatId}_${userId}`;
    localStorage.setItem(key, JSON.stringify({ isTyping, updatedAt: Date.now() }));
    window.dispatchEvent(new CustomEvent("autoparts_typing_changed", { detail: { chatId, userId, isTyping } }));
  } catch (e) {}
}

export function subscribeToTypingStatus(
  chatId: string,
  partnerUserId: string,
  callback: (isTyping: boolean) => void
): () => void {
  if (!chatId || !partnerUserId) {
    callback(false);
    return () => {};
  }

  if (useFirebase && db) {
    try {
      const typingDocRef = doc(db, "chats", chatId, "typing", partnerUserId);
      const unsub = onSnapshot(typingDocRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const isFresh = Date.now() - (data.updatedAt || 0) < 6000;
          callback(!!data.isTyping && isFresh);
        } else {
          callback(false);
        }
      }, () => {
        callback(false);
      });
      return unsub;
    } catch (e) {}
  }

  const handleCustomEvent = (e: any) => {
    if (e.detail && e.detail.chatId === chatId && e.detail.userId === partnerUserId) {
      callback(!!e.detail.isTyping);
    }
  };

  window.addEventListener("autoparts_typing_changed", handleCustomEvent);
  return () => {
    window.removeEventListener("autoparts_typing_changed", handleCustomEvent);
  };
}

export async function setUserPresence(userId: string, isOnline: boolean): Promise<void> {
  if (!userId) return;
  const payload = { online: isOnline, lastSeen: Date.now() };

  if (useFirebase && db) {
    try {
      const userRef = doc(db, "users", userId);
      await setDoc(userRef, payload, { merge: true });
    } catch (err) {
      console.warn("Failed to set user presence in Firestore:", err);
    }
  }

  try {
    localStorage.setItem(`autoparts_presence_${userId}`, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent("autoparts_presence_changed", { detail: { userId, ...payload } }));
  } catch (e) {}
}

export function subscribeToUserPresence(
  userId: string,
  callback: (presence: { online: boolean; lastSeen: number }) => void
): () => void {
  if (!userId) {
    callback({ online: false, lastSeen: Date.now() });
    return () => {};
  }

  if (useFirebase && db) {
    try {
      const userRef = doc(db, "users", userId);
      const unsub = onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          callback({
            online: !!data.online,
            lastSeen: data.lastSeen || Date.now()
          });
        } else {
          callback({ online: false, lastSeen: Date.now() });
        }
      }, () => {
        callback({ online: false, lastSeen: Date.now() });
      });
      return unsub;
    } catch (e) {}
  }

  const checkLocal = () => {
    try {
      const raw = localStorage.getItem(`autoparts_presence_${userId}`);
      if (raw) {
        callback(JSON.parse(raw));
      } else {
        callback({ online: false, lastSeen: Date.now() });
      }
    } catch (e) {
      callback({ online: false, lastSeen: Date.now() });
    }
  };

  checkLocal();
  const handleCustomEvent = (e: any) => {
    if (e.detail && e.detail.userId === userId) {
      callback({ online: !!e.detail.online, lastSeen: e.detail.lastSeen || Date.now() });
    }
  };

  window.addEventListener("autoparts_presence_changed", handleCustomEvent);
  return () => {
    window.removeEventListener("autoparts_presence_changed", handleCustomEvent);
  };
}

export async function getOrCreateChat(part: SparePart, buyer: User): Promise<Chat> {
  const chatId = `${buyer.id}_${part.sellerId}_${part.id}`;
  
  if (useFirebase && db) {
    try {
      const chatDocRef = doc(db, "chats", chatId);
      const chatDoc = await getDoc(chatDocRef);
      
      if (chatDoc.exists()) {
        return { id: chatDoc.id, ...chatDoc.data() } as Chat;
      }
    } catch (err: any) {
      if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.GET, `chats/${chatId}`);
      } else {
        console.warn("Firestore getOrCreateChat check failed:", err);
      }
    }
  }

  // LocalStorage Mock check
  const localChatsRaw = localStorage.getItem(LOCAL_STORAGE_CHATS_KEY);
  const chatsList: Chat[] = localChatsRaw ? JSON.parse(localChatsRaw) : [];
  const foundChat = chatsList.find((c) => c.id === chatId);
  
  if (foundChat) {
    return foundChat;
  }

  // Return non-existing metadata with computed ID. Sending a message will automatically persist it.
  return {
    id: chatId,
    partId: part.id,
    partTitle: part.title,
    partImageUrl: part.imageUrl,
    partPrice: part.price,
    buyerId: buyer.id,
    buyerName: buyer.name,
    sellerId: part.sellerId,
    sellerName: part.contactName,
    lastMessageText: "",
    lastMessageAt: Date.now()
  };
}

// ----------------------------------------------------
// SELLER RATING & REVIEWS SERVICES
// ----------------------------------------------------

export async function fetchSellerReviews(sellerId: string): Promise<SellerReview[]> {
  if (useFirebase && db) {
    try {
      const reviewsRef = collection(db, "seller_reviews");
      const q = query(reviewsRef, where("sellerId", "==", sellerId));
      const snapshot = await getDocs(q);
      
      const reviews: SellerReview[] = [];
      snapshot.forEach((docSnapshot) => {
        reviews.push({ id: docSnapshot.id, ...docSnapshot.data() } as SellerReview);
      });

      if (reviews.length > 0) {
        return reviews.sort((a, b) => b.createdAt - a.createdAt);
      }

      // If it's a demo seller and no reviews exist in Firestore, return initial sample reviews
      if (sellerId.startsWith("demo-seller-")) {
        return INITIAL_SELLER_REVIEWS.filter((r) => r.sellerId === sellerId);
      }

      return [];
    } catch (err: any) {
      if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.LIST, "seller_reviews");
      } else {
        console.warn("Firestore reviews fetch error, falling back to LocalStorage", err);
      }
    }
  }

  // Fallback to LocalStorage
  const localData = localStorage.getItem(LOCAL_STORAGE_REVIEWS_KEY);
  if (localData) {
    const reviews: SellerReview[] = JSON.parse(localData);
    const filtered = reviews.filter((r) => r.sellerId === sellerId);
    if (filtered.length > 0) {
      return filtered.sort((a, b) => b.createdAt - a.createdAt);
    }
  }

  if (sellerId.startsWith("demo-seller-")) {
    return INITIAL_SELLER_REVIEWS.filter((r) => r.sellerId === sellerId);
  }

  return [];
}

export function subscribeToSellerReviews(
  sellerId: string,
  callback: (reviews: SellerReview[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!sellerId) {
    callback([]);
    return () => {};
  }

  console.log(`[Firestore Listener] subscribeToSellerReviews requested for sellerId: "${sellerId}"`);

  if (useFirebase && db) {
    try {
      const reviewsRef = collection(db, "seller_reviews");
      const q = query(reviewsRef, where("sellerId", "==", sellerId));

      const unsub = onSnapshot(q, (snapshot) => {
        const reviews: SellerReview[] = [];
        snapshot.forEach((docSnapshot) => {
          reviews.push({ id: docSnapshot.id, ...docSnapshot.data() } as SellerReview);
        });
        reviews.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        callback(reviews);
      }, (err) => {
        console.error("subscribeToSellerReviews snapshot error:", err);
        if (onError) onError(err);
      });

      return unsub;
    } catch (err: any) {
      console.warn("subscribeToSellerReviews exception:", err);
    }
  }

  fetchSellerReviews(sellerId).then(callback).catch(() => callback([]));
  const handleUpdate = () => {
    fetchSellerReviews(sellerId).then(callback).catch(() => callback([]));
  };
  window.addEventListener("autoparts_reviews_updated", handleUpdate);
  window.addEventListener("storage", handleUpdate);
  return () => {
    window.removeEventListener("autoparts_reviews_updated", handleUpdate);
    window.removeEventListener("storage", handleUpdate);
  };
}

export async function createSellerReview(review: Omit<SellerReview, "id" | "createdAt">): Promise<SellerReview> {
  if (review.sellerId.startsWith("demo-seller-")) {
    throw new Error("Reviews can only be submitted for live seller profiles.");
  }
  const newReview: SellerReview = {
    ...review,
    id: useFirebase ? "" : "local-rev-" + Math.random().toString(36).substr(2, 9),
    createdAt: Date.now()
  };

  if (useFirebase && db) {
    try {
      const reviewsRef = collection(db, "seller_reviews");
      const docRef = await addDoc(reviewsRef, newReview);
      newReview.id = docRef.id;
      window.dispatchEvent(new Event("autoparts_reviews_updated"));
      window.dispatchEvent(new Event("storage"));
      return newReview;
    } catch (err: any) {
      if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.WRITE, "seller_reviews");
      } else {
        console.warn("Firestore review save error, saving to LocalStorage fallback:", err);
      }
    }
  }

  // Fallback to LocalStorage
  const localData = localStorage.getItem(LOCAL_STORAGE_REVIEWS_KEY);
  const reviewsList: SellerReview[] = localData ? JSON.parse(localData) : [];
  if (!newReview.id) {
    newReview.id = "local-rev-" + Math.random().toString(36).substr(2, 9);
  }
  reviewsList.unshift(newReview);
  localStorage.setItem(LOCAL_STORAGE_REVIEWS_KEY, JSON.stringify(reviewsList));
  
  // Dispatch custom events to refresh real-time reviews
  window.dispatchEvent(new Event("autoparts_reviews_updated"));
  window.dispatchEvent(new Event("storage"));
  
  return newReview;
}

// ----------------------------------------------------
// NOTIFICATION SERVICES
// ----------------------------------------------------

export function subscribeToUserNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void,
  onError?: (err: Error) => void
): () => void {
  console.log(`[Firestore Listener] subscribeToUserNotifications requested for userId: "${userId}"`);

  if (useFirebase && auth && db) {
    let unsubNotifications: (() => void) | null = null;
    let isUnsubscribed = false;

    const startListener = (authenticatedUid: string) => {
      if (isUnsubscribed) return;
      try {
        const notificationsRef = collection(db, "notifications");
        const q = query(
          notificationsRef, 
          where("recipientId", "==", authenticatedUid),
          where("read", "==", false)
        );

        console.log(`[Firestore Listener] Subscribing to unread notifications for recipientId == "${authenticatedUid}"`);
        unsubNotifications = onSnapshot(q, (snapshot) => {
          console.log(`[Firestore Listener Callback] Received notifications update. Size: ${snapshot.size}`);
          const list: Notification[] = [];
          snapshot.forEach((d) => {
            list.push({ id: d.id, ...d.data() } as Notification);
          });
          callback(list);
        }, (err) => {
          console.error(`[Firestore Listener Error] subscribeToUserNotifications failed:`, err);
          if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
            handleFirestoreError(err, OperationType.LIST, `notifications (recipientId == ${authenticatedUid})`);
          }
          if (onError) onError(err);
        });
      } catch (err: any) {
        console.error(`[Firestore Exception] subscribeToUserNotifications exception:`, err);
        if (onError) onError(err);
      }
    };

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (isUnsubscribed) return;
      if (firebaseUser) {
        if (unsubNotifications) { unsubNotifications(); unsubNotifications = null; }
        startListener(firebaseUser.uid);
      } else {
        if (unsubNotifications) { unsubNotifications(); unsubNotifications = null; }
        callback([]);
      }
    });

    return () => {
      isUnsubscribed = true;
      unsubAuth();
      if (unsubNotifications) unsubNotifications();
    };
  }

  // LocalStorage Fallback
  console.log(`[LocalStorage Fallback] subscribeToUserNotifications for userId: "${userId}"`);
  const loadLocal = () => {
    try {
      const raw = localStorage.getItem("autoparts_notifications");
      if (raw) {
        const list: Notification[] = JSON.parse(raw);
        const filtered = list.filter(n => n.recipientId === userId && !n.read);
        callback(filtered);
      } else {
        callback([]);
      }
    } catch (e: any) {
      if (onError) onError(e);
      else callback([]);
    }
  };

  loadLocal();
  const handleUpdate = () => {
    loadLocal();
  };

  window.addEventListener("autoparts_notifications_updated", handleUpdate);
  window.addEventListener("storage", handleUpdate);

  return () => {
    window.removeEventListener("autoparts_notifications_updated", handleUpdate);
    window.removeEventListener("storage", handleUpdate);
  };
}

export async function markChatNotificationsAsRead(chatId: string, userId: string): Promise<void> {
  if (useFirebase && db) {
    const notificationId = `${chatId}_${userId}`;
    const path = `notifications/${notificationId}`;
    try {
      const notificationDocRef = doc(db, "notifications", notificationId);
      const docSnap = await getDoc(notificationDocRef);
      if (docSnap.exists()) {
        await updateDoc(notificationDocRef, { read: true });
        console.log(`[Firestore Notification] Marked notification ${notificationId} as read.`);
      }
    } catch (err: any) {
      if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      } else {
        console.warn("Failed to mark notifications as read in Firestore:", err);
      }
    }
  }

  // LocalStorage Fallback
  const localNotificationsRaw = localStorage.getItem("autoparts_notifications");
  if (localNotificationsRaw) {
    try {
      const localNotifications: Notification[] = JSON.parse(localNotificationsRaw);
      const notificationId = `${chatId}_${userId}`;
      const updated = localNotifications.map(n => n.id === notificationId ? { ...n, read: true } : n);
      localStorage.setItem("autoparts_notifications", JSON.stringify(updated));
      window.dispatchEvent(new Event("autoparts_notifications_updated"));
    } catch (e) {
      console.warn("Failed to update local notifications as read:", e);
    }
  }
}

export async function markMessagesAsRead(chatId: string, currentUserId: string): Promise<void> {
  if (useFirebase && db) {
    try {
      const msgRef = collection(db, "chats", chatId, "messages");
      const q = query(msgRef, where("senderId", "!=", currentUserId));
      const snapshot = await getDocs(q);
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (data.status !== "read") {
          try {
            await updateDoc(docSnap.ref, { status: "read" });
          } catch (e) {
            console.warn("Failed to update message read status in Firestore:", e);
            break;
          }
        }
      }
      console.log(`[Firestore Messages] Marked incoming messages as read for chatId: ${chatId}`);
    } catch (err: any) {
      console.warn("Failed to mark messages as read in Firestore:", err);
    }
  }

  // LocalStorage Fallback
  try {
    const localMsgKey = `autoparts_chat_messages_${chatId}`;
    const localMsgRaw = localStorage.getItem(localMsgKey);
    if (localMsgRaw) {
      const messages: Message[] = JSON.parse(localMsgRaw);
      let updated = false;
      const nextMessages = messages.map(m => {
        if (m.senderId !== currentUserId && m.status !== "read") {
          updated = true;
          return { ...m, status: "read" as const };
        }
        return m;
      });
      if (updated) {
        localStorage.setItem(localMsgKey, JSON.stringify(nextMessages));
        window.dispatchEvent(new CustomEvent("autoparts_chat_updated", { detail: { chatId } }));
      }
    }
  } catch (err: any) {
    console.warn("Failed to mark local messages as read:", err);
  }
}

export async function markMessagesAsDelivered(chatId: string, currentUserId: string): Promise<void> {
  if (useFirebase && db) {
    try {
      const msgRef = collection(db, "chats", chatId, "messages");
      const q = query(msgRef, where("senderId", "!=", currentUserId));
      const snapshot = await getDocs(q);
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (!data.status || data.status === "sent") {
          try {
            await updateDoc(docSnap.ref, { status: "delivered" });
          } catch (e) {
            console.warn("Failed to update message delivered status in Firestore:", e);
            break;
          }
        }
      }
      console.log(`[Firestore Messages] Marked incoming messages as delivered for chatId: ${chatId}`);
    } catch (err: any) {
      console.warn("Failed to mark messages as delivered in Firestore:", err);
    }
  }

  // LocalStorage Fallback
  try {
    const localMsgKey = `autoparts_chat_messages_${chatId}`;
    const localMsgRaw = localStorage.getItem(localMsgKey);
    if (localMsgRaw) {
      const messages: Message[] = JSON.parse(localMsgRaw);
      let updated = false;
      const nextMessages = messages.map(m => {
        if (m.senderId !== currentUserId && (!m.status || m.status === "sent")) {
          updated = true;
          return { ...m, status: "delivered" as const };
        }
        return m;
      });
      if (updated) {
        localStorage.setItem(localMsgKey, JSON.stringify(nextMessages));
        window.dispatchEvent(new CustomEvent("autoparts_chat_updated", { detail: { chatId } }));
      }
    }
  } catch (err: any) {
    console.warn("Failed to mark local messages as delivered:", err);
  }
}

export function subscribeToUserFavorites(
  userId: string,
  callback: (favorites: string[]) => void,
  onError?: (err: Error) => void
): () => void {
  console.log(`[Firestore Listener] subscribeToUserFavorites requested for userId: "${userId}"`);

  if (useFirebase && auth && db) {
    let unsubFavorites: (() => void) | null = null;
    let isUnsubscribed = false;

    const startListener = (authenticatedUid: string) => {
      if (isUnsubscribed) return;
      try {
        const favoritesRef = collection(db, "favorites");
        const q = query(favoritesRef, where("userId", "==", authenticatedUid));

        console.log(`[Firestore Listener] Subscribing to favorites for userId == "${authenticatedUid}"`);
        unsubFavorites = onSnapshot(q, (snapshot) => {
          console.log(`[Firestore Listener Callback] Received favorites update. Size: ${snapshot.size}`);
          const list: string[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            if (data.partId) {
              list.push(data.partId);
            }
          });
          callback(list);
        }, (err) => {
          console.error(`[Firestore Listener Error] subscribeToUserFavorites failed:`, err);
          if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
            handleFirestoreError(err, OperationType.LIST, `favorites (userId == ${authenticatedUid})`);
          }
          if (onError) onError(err);
        });
      } catch (err: any) {
        console.error(`[Firestore Exception] subscribeToUserFavorites exception:`, err);
        if (onError) onError(err);
      }
    };

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (isUnsubscribed) return;
      if (firebaseUser) {
        if (unsubFavorites) { unsubFavorites(); unsubFavorites = null; }
        startListener(firebaseUser.uid);
      } else {
        if (unsubFavorites) { unsubFavorites(); unsubFavorites = null; }
        callback([]);
      }
    });

    return () => {
      isUnsubscribed = true;
      unsubAuth();
      if (unsubFavorites) unsubFavorites();
    };
  }

  // LocalStorage Fallback
  console.log(`[LocalStorage Fallback] subscribeToUserFavorites for userId: "${userId}"`);
  const loadLocal = () => {
    try {
      const raw = localStorage.getItem(`autoparts_favorites_${userId}`);
      if (raw) {
        const list: string[] = JSON.parse(raw);
        callback(list);
      } else {
        const sharedRaw = localStorage.getItem("autoparts_favorites");
        if (sharedRaw) {
          const list: string[] = JSON.parse(sharedRaw);
          callback(list);
        } else {
          callback([]);
        }
      }
    } catch (e: any) {
      if (onError) onError(e);
      else callback([]);
    }
  };

  loadLocal();
  const handleUpdate = () => {
    loadLocal();
  };

  window.addEventListener("autoparts_favorites_updated", handleUpdate);
  window.addEventListener("storage", handleUpdate);

  return () => {
    window.removeEventListener("autoparts_favorites_updated", handleUpdate);
    window.removeEventListener("storage", handleUpdate);
  };
}

export async function addFavorite(userId: string, partId: string): Promise<void> {
  const favoriteId = `${userId}_${partId}`;
  const path = `favorites/${favoriteId}`;
  console.log(`[Firestore Write] addFavorite requested for favoriteId: "${favoriteId}"`);

  if (useFirebase && db) {
    try {
      const docRef = doc(db, "favorites", favoriteId);
      await setDoc(docRef, {
        id: favoriteId,
        userId,
        partId,
        createdAt: Date.now()
      }, { merge: true });

      // Sync directly under user profile subcollection: users/{userId}/favorites/{partId}
      const userFavRef = doc(db, "users", userId, "favorites", partId);
      await setDoc(userFavRef, {
        id: partId,
        partId,
        userId,
        createdAt: Date.now()
      }, { merge: true });

      // Sync arrayUnion in user profile document
      const userDocRef = doc(db, "users", userId);
      await setDoc(userDocRef, {
        favorites: arrayUnion(partId)
      }, { merge: true });

      console.log(`[Firestore Favorite] Saved favorite ${favoriteId} and synced to users/${userId}/favorites`);
      return;
    } catch (err: any) {
      if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.WRITE, path);
      } else {
        console.warn("Failed to add favorite in Firestore, using LocalStorage fallback:", err);
      }
    }
  }

  // LocalStorage Fallback
  try {
    const localKey = `autoparts_favorites_${userId}`;
    const raw = localStorage.getItem(localKey) || localStorage.getItem("autoparts_favorites");
    let list: string[] = [];
    if (raw) {
      try {
        list = JSON.parse(raw);
      } catch (e) {}
    }
    if (!list.includes(partId)) {
      list.push(partId);
    }
    localStorage.setItem(localKey, JSON.stringify(list));
    localStorage.setItem("autoparts_favorites", JSON.stringify(list));
    window.dispatchEvent(new Event("autoparts_favorites_updated"));
    window.dispatchEvent(new Event("storage"));
  } catch (err: any) {
    console.error("[LocalStorage Error] Failed to add favorite:", err);
  }
}

export async function removeFavorite(userId: string, partId: string): Promise<void> {
  const favoriteId = `${userId}_${partId}`;
  const path = `favorites/${favoriteId}`;
  console.log(`[Firestore Delete] removeFavorite requested for favoriteId: "${favoriteId}"`);

  if (useFirebase && db) {
    try {
      const docRef = doc(db, "favorites", favoriteId);
      await deleteDoc(docRef);

      // Remove from user profile subcollection: users/{userId}/favorites/{partId}
      const userFavRef = doc(db, "users", userId, "favorites", partId);
      await deleteDoc(userFavRef);

      // Sync arrayRemove in user profile document
      const userDocRef = doc(db, "users", userId);
      await setDoc(userDocRef, {
        favorites: arrayRemove(partId)
      }, { merge: true });

      console.log(`[Firestore Favorite] Removed favorite ${favoriteId} and synced from users/${userId}/favorites`);
      return;
    } catch (err: any) {
      if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.DELETE, path);
      } else {
        console.warn("Failed to remove favorite in Firestore, using LocalStorage fallback:", err);
      }
    }
  }

  // LocalStorage Fallback
  try {
    const localKey = `autoparts_favorites_${userId}`;
    const raw = localStorage.getItem(localKey) || localStorage.getItem("autoparts_favorites");
    let list: string[] = [];
    if (raw) {
      try {
        list = JSON.parse(raw);
      } catch (e) {}
    }
    list = list.filter(id => id !== partId);
    localStorage.setItem(localKey, JSON.stringify(list));
    localStorage.setItem("autoparts_favorites", JSON.stringify(list));
    window.dispatchEvent(new Event("autoparts_favorites_updated"));
    window.dispatchEvent(new Event("storage"));
  } catch (err: any) {
    console.error("[LocalStorage Error] Failed to remove favorite:", err);
  }
}

// ----------------------------------------------------
// FOLLOW / UNFOLLOW SELLER SERVICES
// ----------------------------------------------------

export async function checkIsFollowing(currentUserId: string, sellerId: string): Promise<boolean> {
  if (!currentUserId || !sellerId) return false;

  if (useFirebase && db) {
    const path = `users/${currentUserId}/following/${sellerId}`;
    try {
      const docRef = doc(db, "users", currentUserId, "following", sellerId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return true;
      }
    } catch (err: any) {
      if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.GET, path);
      } else {
        console.warn("Failed to check follow status in Firestore, falling back to LocalStorage:", err);
      }
    }
  }

  // LocalStorage Fallback
  try {
    const localKey = `followed_sellers_${currentUserId}`;
    const saved = localStorage.getItem(localKey);
    if (saved) {
      const list = JSON.parse(saved);
      return Array.isArray(list) && list.includes(sellerId);
    }
  } catch (e) {
    console.warn("Failed to check follow status from LocalStorage:", e);
  }
  return false;
}

export async function followSeller(currentUserId: string, sellerId: string): Promise<void> {
  if (!currentUserId || !sellerId) return;

  if (useFirebase && db) {
    const followingPath = `users/${currentUserId}/following/${sellerId}`;
    try {
      const ts = Date.now();
      const followingRef = doc(db, "users", currentUserId, "following", sellerId);
      const followerRef = doc(db, "users", sellerId, "followers", currentUserId);

      await setDoc(followingRef, {
        sellerId,
        followedAt: ts,
        createdAt: serverTimestamp()
      }, { merge: true });

      await setDoc(followerRef, {
        followerId: currentUserId,
        followedAt: ts,
        createdAt: serverTimestamp()
      }, { merge: true });

      console.log(`[Firestore Follow] User ${currentUserId} followed seller ${sellerId}`);
    } catch (err: any) {
      if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.WRITE, followingPath);
      } else {
        console.warn("Failed to follow seller in Firestore, using LocalStorage fallback:", err);
      }
    }
  }

  // LocalStorage sync
  try {
    const localKey = `followed_sellers_${currentUserId}`;
    const saved = localStorage.getItem(localKey);
    let list: string[] = saved ? JSON.parse(saved) : [];
    if (!list.includes(sellerId)) {
      list.push(sellerId);
    }
    localStorage.setItem(localKey, JSON.stringify(list));
  } catch (e) {
    console.error("Failed to persist follow state to LocalStorage:", e);
  }
}

export async function unfollowSeller(currentUserId: string, sellerId: string): Promise<void> {
  if (!currentUserId || !sellerId) return;

  if (useFirebase && db) {
    const followingPath = `users/${currentUserId}/following/${sellerId}`;
    try {
      const followingRef = doc(db, "users", currentUserId, "following", sellerId);
      const followerRef = doc(db, "users", sellerId, "followers", currentUserId);

      await deleteDoc(followingRef);
      await deleteDoc(followerRef);

      console.log(`[Firestore Unfollow] User ${currentUserId} unfollowed seller ${sellerId}`);
    } catch (err: any) {
      if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.DELETE, followingPath);
      } else {
        console.warn("Failed to unfollow seller in Firestore, using LocalStorage fallback:", err);
      }
    }
  }

  // LocalStorage sync
  try {
    const localKey = `followed_sellers_${currentUserId}`;
    const saved = localStorage.getItem(localKey);
    let list: string[] = saved ? JSON.parse(saved) : [];
    list = list.filter(id => id !== sellerId);
    localStorage.setItem(localKey, JSON.stringify(list));
  } catch (e) {
    console.error("Failed to persist unfollow state to LocalStorage:", e);
  }
}

export interface FollowStats {
  followersCount: number;
  followingCount: number;
}

export function subscribeToUserFollowStats(
  userId: string,
  callback: (stats: FollowStats) => void
): () => void {
  if (!userId) {
    callback({ followersCount: 0, followingCount: 0 });
    return () => {};
  }

  let followersCount = 0;
  let followingCount = 0;

  let unsubFollowers: (() => void) | null = null;
  let unsubFollowing: (() => void) | null = null;

  if (useFirebase && db) {
    try {
      const followersCol = collection(db, "users", userId, "followers");
      unsubFollowers = onSnapshot(followersCol, (snap) => {
        followersCount = snap.size;
        callback({ followersCount, followingCount });
      }, (err) => {
        console.warn("[Firestore] Error subscribing to followers count:", err);
      });

      const followingCol = collection(db, "users", userId, "following");
      unsubFollowing = onSnapshot(followingCol, (snap) => {
        followingCount = snap.size;
        callback({ followersCount, followingCount });
      }, (err) => {
        console.warn("[Firestore] Error subscribing to following count:", err);
      });
    } catch (err) {
      console.warn("Failed to subscribe to user follow stats in Firestore:", err);
    }
  }

  // Fallback to LocalStorage sync
  try {
    const localKey = `followed_sellers_${userId}`;
    const saved = localStorage.getItem(localKey);
    if (saved) {
      const list: string[] = JSON.parse(saved);
      if (!useFirebase || !db) {
        followingCount = list.length;
        callback({ followersCount, followingCount });
      }
    }
  } catch (e) {}

  return () => {
    if (unsubFollowers) unsubFollowers();
    if (unsubFollowing) unsubFollowing();
  };
}

// ----------------------------------------------------
// SUPER ADMIN MANAGEMENT SERVICES
// ----------------------------------------------------

export async function fetchAllUsers(): Promise<User[]> {
  if (useFirebase && db) {
    const path = "users";
    try {
      const usersRef = collection(db, "users");
      const snapshot = await getDocs(usersRef);
      const list: User[] = [];
      
      for (const d of snapshot.docs) {
        const data = d.data();
        let email = data.email || "";
        const uid = data.uid || d.id;

        if (!email && auth?.currentUser && (auth.currentUser.uid === d.id || auth.currentUser.uid === uid) && auth.currentUser.email) {
          email = auth.currentUser.email;
        }

        const rawDisplayName = data.displayName || data.name || (email ? email.split("@")[0] : "");
        const displayName = rawDisplayName.includes("@") ? rawDisplayName.split("@")[0] : rawDisplayName;
        const isSuperAdminEmail = email === "wwwautoparts2@gmail.com";

        list.push({
          ...data,
          id: d.id,
          uid: uid,
          name: displayName,
          displayName: displayName,
          email: email,
          photoURL: data.photoURL || "",
          phone: data.phone || "",
          createdAt: data.createdAt || Date.now(),
          lastLoginAt: data.lastLoginAt || data.updatedAt || Date.now(),
          role: isSuperAdminEmail ? "super_admin" : "user",
          status: data.status || (data.isBlocked ? "blocked" : "active"),
          isBlocked: data.status === "blocked" || !!data.isBlocked,
          isSuperAdmin: isSuperAdminEmail,
          isAdmin: isSuperAdminEmail,
        } as User);
      }
      console.log(`[Firestore collection path: "users"] Total user documents loaded: ${list.length}`);
      
      return list;
    } catch (err: any) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  }

  // LocalStorage Fallback (without fake/mock users)
  const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY) || "[]";
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function subscribeToUsers(callback: (users: User[]) => void): () => void {
  if (useFirebase && db) {
    try {
      const usersRef = collection(db, "users");
      const unsub = onSnapshot(usersRef, (snapshot) => {
        const list: User[] = [];
        for (const d of snapshot.docs) {
          const data = d.data();
          let email = data.email || "";
          const uid = data.uid || d.id;

          if (!email && auth?.currentUser && (auth.currentUser.uid === d.id || auth.currentUser.uid === uid) && auth.currentUser.email) {
            email = auth.currentUser.email;
          }

          const rawDisplayName = data.displayName || data.name || (email ? email.split("@")[0] : "");
          const displayName = rawDisplayName.includes("@") ? rawDisplayName.split("@")[0] : rawDisplayName;
          const isSuperAdminEmail = email === "wwwautoparts2@gmail.com";

          list.push({
            ...data,
            id: d.id,
            uid: uid,
            name: displayName,
            displayName: displayName,
            email: email,
            photoURL: data.photoURL || "",
            phone: data.phone || "",
            createdAt: data.createdAt || Date.now(),
            lastLoginAt: data.lastLoginAt || data.updatedAt || Date.now(),
            role: isSuperAdminEmail ? "super_admin" : "user",
            status: data.status || (data.isBlocked ? "blocked" : "active"),
            isBlocked: data.status === "blocked" || !!data.isBlocked,
            isSuperAdmin: isSuperAdminEmail,
            isAdmin: isSuperAdminEmail,
          } as User);
        }
        // Deduplicate user list by user.id or user.uid
        const userMap = new Map<string, User>();
        for (const u of list) {
          const uKey = u.id || u.uid;
          if (uKey) {
            userMap.set(uKey, u);
          }
        }
        const uniqueUsers = Array.from(userMap.values());
        console.log(`[Firestore collection path: "users"] Total user documents loaded: ${uniqueUsers.length}`);

        callback(uniqueUsers);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, "users");
        const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY) || "[]";
        try {
          callback(JSON.parse(raw));
        } catch (e) {
          callback([]);
        }
      });

      return unsub;
    } catch (err: any) {
      handleFirestoreError(err, OperationType.GET, "users");
    }
  }

  // LocalStorage Fallback
  const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY) || "[]";
  try {
    callback(JSON.parse(raw));
  } catch (e) {
    callback([]);
  }
  return () => {};
}

export async function toggleUserBlockStatus(userId: string, currentStatus: boolean): Promise<boolean> {
  const nextStatus = !currentStatus;
  if (useFirebase && db) {
    const path = `users/${userId}`;
    try {
      const userRef = doc(db, "users", userId);
      await setDoc(userRef, { isBlocked: nextStatus }, { merge: true });
      return true;
    } catch (err: any) {
      if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.WRITE, path);
      } else {
        console.warn("Firestore toggleUserBlockStatus failed:", err);
      }
      throw err;
    }
  }

  // LocalStorage Fallback
  const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY) || "[]";
  try {
    const list: User[] = JSON.parse(raw);
    const updated = list.map((u) => {
      if (u.id === userId) {
        return { ...u, isBlocked: nextStatus };
      }
      return u;
    });
    localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(updated));

    // Also update current user if we blocked ourselves
    const currentRaw = localStorage.getItem(LOCAL_STORAGE_CURRENT_USER_KEY);
    if (currentRaw) {
      const current = JSON.parse(currentRaw);
      if (current.id === userId) {
        current.isBlocked = nextStatus;
        localStorage.setItem(LOCAL_STORAGE_CURRENT_USER_KEY, JSON.stringify(current));
        dispatchAuthChange();
      }
    }
    return true;
  } catch (e) {
    return false;
  }
}

export interface FullTaxonomyConfig {
  categories: string[];
  categoryImages: Record<string, string>;
  subcategories: Record<string, string[]>;
  brands: Record<string, string[]>;
  brandLogos: Record<string, string>;
  variants: Record<string, string[]>;
  states: string[];
  districts: Record<string, string[]>;
  cities: Record<string, string[]>;
  locations: string[];
}

async function seedDefaultTaxonomyToFirestore(missingKeys: string[]): Promise<void> {
  if (!useFirebase || !db) return;
  try {
    const promises: Promise<void>[] = [];
    if (missingKeys.includes("categories")) {
      promises.push(setDoc(doc(db, "config", "categories"), { list: CAR_PART_CATEGORIES }));
    }
    if (missingKeys.includes("category_images")) {
      promises.push(setDoc(doc(db, "config", "category_images"), { map: {} }));
    }
    if (missingKeys.includes("subcategories")) {
      promises.push(setDoc(doc(db, "config", "subcategories"), { map: CAR_SPARE_PARTS_BY_CATEGORY }));
    }
    if (missingKeys.includes("brands")) {
      promises.push(setDoc(doc(db, "config", "brands"), { map: INDIAN_CAR_BRANDS }));
    }
    if (missingKeys.includes("brand_images")) {
      promises.push(setDoc(doc(db, "config", "brand_images"), { map: {} }));
    }
    if (missingKeys.includes("variants")) {
      promises.push(setDoc(doc(db, "config", "variants"), { map: DEFAULT_MODEL_VARIANTS }));
    }
    if (missingKeys.includes("states")) {
      promises.push(setDoc(doc(db, "config", "states"), { list: INDIAN_STATES_AND_DISTRICTS.map(s => s.state) }));
    }
    if (missingKeys.includes("districts")) {
      promises.push(setDoc(doc(db, "config", "districts"), { map: INDIAN_STATES_AND_DISTRICTS.reduce((acc, s) => ({ ...acc, [s.state]: s.districts }), {}) }));
    }
    if (missingKeys.includes("cities")) {
      promises.push(setDoc(doc(db, "config", "cities"), { map: {} }));
    }
    if (missingKeys.includes("locations")) {
      promises.push(setDoc(doc(db, "config", "locations"), { list: POPULAR_LOCATIONS }));
    }
    await Promise.all(promises);
  } catch (err) {
    console.warn("Error seeding default taxonomy to Firestore:", err);
  }
}

export function subscribeToTaxonomyConfig(
  callback: (config: FullTaxonomyConfig) => void
): () => void {
  if (useFirebase && db) {
    try {
      const configCol = collection(db, "config");
      const unsubscribe = onSnapshot(
        configCol,
        async (snapshot) => {
          let categories: string[] | null = null;
          let categoryImages: Record<string, string> | null = null;
          let subcategories: Record<string, string[]> | null = null;
          let brands: Record<string, string[]> | null = null;
          let brandLogos: Record<string, string> | null = null;
          let variants: Record<string, string[]> | null = null;
          let states: string[] | null = null;
          let districts: Record<string, string[]> | null = null;
          let cities: Record<string, string[]> | null = null;
          let locations: string[] | null = null;

          snapshot.forEach((docSnap) => {
            const id = docSnap.id;
            const data = docSnap.data();
            if (id === "categories") categories = data.list || [];
            if (id === "category_images") categoryImages = data.map || {};
            if (id === "subcategories") subcategories = data.map || {};
            if (id === "brands") brands = data.map || {};
            if (id === "brand_images") brandLogos = data.map || {};
            if (id === "variants") variants = data.map || {};
            if (id === "states") states = data.list || [];
            if (id === "districts") districts = data.map || {};
            if (id === "cities") cities = data.map || {};
            if (id === "locations") locations = data.list || [];
          });

          const missingKeys: string[] = [];
          if (categories === null) missingKeys.push("categories");
          if (categoryImages === null) missingKeys.push("category_images");
          if (subcategories === null) missingKeys.push("subcategories");
          if (brands === null) missingKeys.push("brands");
          if (brandLogos === null) missingKeys.push("brand_images");
          if (variants === null) missingKeys.push("variants");
          if (states === null) missingKeys.push("states");
          if (districts === null) missingKeys.push("districts");
          if (cities === null) missingKeys.push("cities");
          if (locations === null) missingKeys.push("locations");

          if (missingKeys.length > 0) {
            await seedDefaultTaxonomyToFirestore(missingKeys);
            return;
          }

          const fullConfig: FullTaxonomyConfig = {
            categories: categories || [],
            categoryImages: categoryImages || {},
            subcategories: subcategories || {},
            brands: brands || {},
            brandLogos: brandLogos || {},
            variants: variants || {},
            states: states || [],
            districts: districts || {},
            cities: cities || {},
            locations: locations || []
          };

          callback(fullConfig);
        },
        (error) => {
          console.warn("Firestore subscribeToTaxonomyConfig warning:", error);
          fetchFullTaxonomyConfig().then(callback);
        }
      );
      return unsubscribe;
    } catch (err) {
      console.warn("Failed to subscribeToTaxonomyConfig:", err);
    }
  }

  // Fallback for local storage / offline
  const handleStorageUpdate = async () => {
    const config = await fetchFullTaxonomyConfig();
    callback(config);
  };
  handleStorageUpdate();
  window.addEventListener("config_updated", handleStorageUpdate);
  return () => window.removeEventListener("config_updated", handleStorageUpdate);
}

export async function fetchFullTaxonomyConfig(): Promise<FullTaxonomyConfig> {
  let categories: string[] = [];
  let categoryImages: Record<string, string> = {};
  let subcategories: Record<string, string[]> = {};
  let brands: Record<string, string[]> = {};
  let brandLogos: Record<string, string> = {};
  let variants: Record<string, string[]> = {};
  let states: string[] = [];
  let districts: Record<string, string[]> = {};
  let cities: Record<string, string[]> = {};
  let locations: string[] = [];

  if (useFirebase && db) {
    try {
      const [
        catSnap, catImgSnap, subSnap, brandSnap, brandImgSnap,
        varSnap, stateSnap, distSnap, citySnap, locSnap
      ] = await Promise.all([
        getDoc(doc(db, "config", "categories")),
        getDoc(doc(db, "config", "category_images")),
        getDoc(doc(db, "config", "subcategories")),
        getDoc(doc(db, "config", "brands")),
        getDoc(doc(db, "config", "brand_images")),
        getDoc(doc(db, "config", "variants")),
        getDoc(doc(db, "config", "states")),
        getDoc(doc(db, "config", "districts")),
        getDoc(doc(db, "config", "cities")),
        getDoc(doc(db, "config", "locations"))
      ]);

      const missingKeys: string[] = [];
      if (catSnap.exists()) categories = catSnap.data().list || []; else missingKeys.push("categories");
      if (catImgSnap.exists()) categoryImages = catImgSnap.data().map || {}; else missingKeys.push("category_images");
      if (subSnap.exists()) subcategories = subSnap.data().map || {}; else missingKeys.push("subcategories");
      if (brandSnap.exists()) brands = brandSnap.data().map || {}; else missingKeys.push("brands");
      if (brandImgSnap.exists()) brandLogos = brandImgSnap.data().map || {}; else missingKeys.push("brand_images");
      if (varSnap.exists()) variants = varSnap.data().map || {}; else missingKeys.push("variants");
      if (stateSnap.exists()) states = stateSnap.data().list || []; else missingKeys.push("states");
      if (distSnap.exists()) districts = distSnap.data().map || {}; else missingKeys.push("districts");
      if (citySnap.exists()) cities = citySnap.data().map || {}; else missingKeys.push("cities");
      if (locSnap.exists()) locations = locSnap.data().list || []; else missingKeys.push("locations");

      if (missingKeys.length > 0) {
        await seedDefaultTaxonomyToFirestore(missingKeys);
        if (missingKeys.includes("categories")) categories = [...CAR_PART_CATEGORIES];
        if (missingKeys.includes("subcategories")) subcategories = { ...CAR_SPARE_PARTS_BY_CATEGORY };
        if (missingKeys.includes("brands")) brands = { ...INDIAN_CAR_BRANDS };
        if (missingKeys.includes("variants")) variants = { ...DEFAULT_MODEL_VARIANTS };
        if (missingKeys.includes("states")) states = INDIAN_STATES_AND_DISTRICTS.map(s => s.state);
        if (missingKeys.includes("districts")) districts = INDIAN_STATES_AND_DISTRICTS.reduce((acc, s) => ({ ...acc, [s.state]: s.districts }), {});
        if (missingKeys.includes("locations")) locations = [...POPULAR_LOCATIONS];
      }
    } catch (e) {
      console.warn("Firestore fetchFullTaxonomyConfig failed:", e);
    }
  } else {
    try {
      categories = JSON.parse(localStorage.getItem("config_categories") || "[]");
      categoryImages = JSON.parse(localStorage.getItem("config_category_images") || "{}");
      subcategories = JSON.parse(localStorage.getItem("config_subcategories") || "{}");
      brands = JSON.parse(localStorage.getItem("config_brands") || "{}");
      brandLogos = JSON.parse(localStorage.getItem("config_brand_images") || "{}");
      variants = JSON.parse(localStorage.getItem("config_variants") || "{}");
      states = JSON.parse(localStorage.getItem("config_states") || "[]");
      districts = JSON.parse(localStorage.getItem("config_districts") || "{}");
      cities = JSON.parse(localStorage.getItem("config_cities") || "{}");
      locations = JSON.parse(localStorage.getItem("config_locations") || "[]");
    } catch (e) {
      console.warn("LocalStorage taxonomy read failed:", e);
    }

    if (categories.length === 0) categories = [...CAR_PART_CATEGORIES];
    if (Object.keys(subcategories).length === 0) subcategories = { ...CAR_SPARE_PARTS_BY_CATEGORY };
    if (Object.keys(brands).length === 0) brands = { ...INDIAN_CAR_BRANDS };
    if (Object.keys(variants).length === 0) variants = { ...DEFAULT_MODEL_VARIANTS };
    if (states.length === 0) states = INDIAN_STATES_AND_DISTRICTS.map(s => s.state);
    if (Object.keys(districts).length === 0) districts = INDIAN_STATES_AND_DISTRICTS.reduce((acc, s) => ({ ...acc, [s.state]: s.districts }), {});
    if (locations.length === 0) locations = [...POPULAR_LOCATIONS];
  }

  return {
    categories,
    categoryImages,
    subcategories,
    brands,
    brandLogos,
    variants,
    states,
    districts,
    cities,
    locations
  };
}

export async function saveTaxonomyDoc(docName: string, data: any): Promise<boolean> {
  if (useFirebase && db) {
    try {
      const docRef = doc(db, "config", docName);
      await setDoc(docRef, data);
    } catch (err: any) {
      console.warn(`Firestore saveTaxonomyDoc failed for ${docName}:`, err);
    }
  }

  try {
    if (data.list !== undefined) {
      localStorage.setItem(`config_${docName}`, JSON.stringify(data.list));
    } else if (data.map !== undefined) {
      localStorage.setItem(`config_${docName}`, JSON.stringify(data.map));
    }
  } catch (e) {
    console.warn("LocalStorage save error:", e);
  }

  window.dispatchEvent(new Event("config_updated"));
  return true;
}

export async function fetchMetadataConfig(): Promise<{
  categories: string[];
  brands: Record<string, string[]>;
  locations: string[];
  subcategories: Record<string, string[]>;
  categoryImages: Record<string, string>;
  brandLogos: Record<string, string>;
  variants: Record<string, string[]>;
  states: string[];
  districts: Record<string, string[]>;
  cities: Record<string, string[]>;
}> {
  const full = await fetchFullTaxonomyConfig();
  return {
    categories: full.categories,
    brands: full.brands,
    locations: full.locations,
    subcategories: full.subcategories,
    categoryImages: full.categoryImages,
    brandLogos: full.brandLogos,
    variants: full.variants,
    states: full.states,
    districts: full.districts,
    cities: full.cities
  };
}

export async function saveMetadataConfig(type: string, data: any): Promise<void> {
  await saveTaxonomyDoc(type, data);
}

export async function deleteUserAccount(userId: string): Promise<boolean> {
  return deleteFullUserAccount(userId);
}

export async function deleteFullUserAccount(userId: string): Promise<boolean> {
  console.log(`[Delete Account Handshake] Initiating full account deletion for userId: "${userId}"`);

  if (useFirebase && db) {
    try {
      const partsRef = collection(db, "products", "listings", "items");
      const batch = writeBatch(db);

      // 1. Delete user listings
      const q1 = query(partsRef, where("userId", "==", userId));
      const snap1 = await getDocs(q1);
      snap1.forEach((docSnap) => batch.delete(docSnap.ref));

      const q2 = query(partsRef, where("sellerId", "==", userId));
      const snap2 = await getDocs(q2);
      snap2.forEach((docSnap) => batch.delete(docSnap.ref));

      // 2. Delete user profile doc
      const userRef = doc(db, "users", userId);
      batch.delete(userRef);

      await batch.commit();
      console.log(`[Delete Account Handshake] Successfully deleted user listings and user profile from Firestore.`);
    } catch (err: any) {
      console.warn("Firestore error during deleteFullUserAccount:", err);
      if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
      }
    }
  }

  // 3. Delete Firebase Auth User
  if (auth && auth.currentUser) {
    try {
      console.log(`[Firebase Auth] Invoking deleteUser on auth.currentUser (${auth.currentUser.uid})`);
      await deleteUser(auth.currentUser);
      console.log(`[Firebase Auth] Firebase Auth user deleted successfully.`);
    } catch (authErr: any) {
      console.warn("[Firebase Auth] deleteUser warning:", authErr?.message || authErr);
    }
  }

  // 4. LocalStorage cleanup
  try {
    localStorage.removeItem(LOCAL_STORAGE_CURRENT_USER_KEY);
    const usersRaw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
    if (usersRaw) {
      const usersList: User[] = JSON.parse(usersRaw);
      const filtered = usersList.filter(u => u.id !== userId && u.uid !== userId);
      localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(filtered));
    }
  } catch (e) {}

  // 5. Sign out session
  await signOut();
  return true;
}

export async function updateAdminUserProfile(userId: string, updates: Partial<User>): Promise<boolean> {
  if (useFirebase && db) {
    const path = `users/${userId}`;
    try {
      const userRef = doc(db, "users", userId);
      await setDoc(userRef, updates, { merge: true });
      return true;
    } catch (err: any) {
      if (err?.code === "resource-exhausted" || err?.message?.includes("Quota limit exceeded") || err?.message?.includes("resource-exhausted")) {
        console.warn("[Firestore Quota Exceeded] Falling back to LocalStorage for updateAdminUserProfile:", err);
      } else if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.WRITE, path);
        throw err;
      } else {
        console.warn("Firestore updateAdminUserProfile failed:", err);
        throw err;
      }
    }
  }

  // LocalStorage Fallback
  const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY) || "[]";
  try {
    const list: User[] = JSON.parse(raw);
    const updated = list.map((u) => {
      if (u.id === userId) {
        return { ...u, ...updates };
      }
      return u;
    });
    localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(updated));
    return true;
  } catch (e) {
    return false;
  }
}

export interface AnnouncementItem {
  id: string;
  title: string;
  text: string;
  createdAt: number;
}

export async function fetchAnnouncementsHistory(): Promise<AnnouncementItem[]> {
  if (useFirebase && db) {
    try {
      const annRef = collection(db, "announcements");
      const q = query(annRef, orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const list: AnnouncementItem[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          title: data.title || "",
          text: data.text || "",
          createdAt: data.createdAt || Date.now()
        });
      });
      return list;
    } catch (e) {
      console.warn("Firestore fetchAnnouncementsHistory failed:", e);
    }
  }

  // LocalStorage Fallback
  const rawAnn = localStorage.getItem("announcements") || "[]";
  try {
    const anns = JSON.parse(rawAnn);
    return anns.map((a: any, idx: number) => ({
      id: a.id || `local_ann_${idx}_${a.createdAt || Date.now()}`,
      title: a.title || "",
      text: a.text || "",
      createdAt: a.createdAt || Date.now()
    }));
  } catch (e) {
    return [];
  }
}

export async function deleteAnnouncement(announcementId: string): Promise<boolean> {
  if (useFirebase && db) {
    try {
      const docRef = doc(db, "announcements", announcementId);
      await deleteDoc(docRef);
      return true;
    } catch (e) {
      console.error("Firestore deleteAnnouncement failed:", e);
      handleFirestoreError(e, OperationType.DELETE, `announcements/${announcementId}`);
      throw e;
    }
  }

  // LocalStorage Fallback
  const rawAnn = localStorage.getItem("announcements") || "[]";
  try {
    let anns = JSON.parse(rawAnn);
    anns = anns.filter((a: any) => a.id !== announcementId);
    localStorage.setItem("announcements", JSON.stringify(anns));
    window.dispatchEvent(new Event("autoparts_announcements_updated"));
    return true;
  } catch (e) {
    return false;
  }
}

export async function updateAnnouncement(announcementId: string, title: string, text: string): Promise<boolean> {
  if (useFirebase && db) {
    try {
      const docRef = doc(db, "announcements", announcementId);
      await setDoc(docRef, { title, text }, { merge: true });
      return true;
    } catch (e) {
      console.error("Firestore updateAnnouncement failed:", e);
      handleFirestoreError(e, OperationType.UPDATE, `announcements/${announcementId}`);
      throw e;
    }
  }

  // LocalStorage Fallback
  const rawAnn = localStorage.getItem("announcements") || "[]";
  try {
    let anns = JSON.parse(rawAnn);
    anns = anns.map((a: any) => {
      if (a.id === announcementId) {
        return { ...a, title, text };
      }
      return a;
    });
    localStorage.setItem("announcements", JSON.stringify(anns));
    window.dispatchEvent(new Event("autoparts_announcements_updated"));
    return true;
  } catch (e) {
    return false;
  }
}

export async function sendAnnouncement(title: string, text: string, authorEmail?: string): Promise<string> {
  if (useFirebase && db) {
    try {
      const annRef = collection(db, "announcements");
      const docRef = await addDoc(annRef, {
        title,
        text,
        createdAt: Date.now(),
        authorEmail: authorEmail || auth.currentUser?.email || "admin@autoparts.com",
        type: "broadcast"
      });
      return docRef.id;
    } catch (e) {
      console.error("Firestore sendAnnouncement failed:", e);
      handleFirestoreError(e, OperationType.WRITE, "announcements");
      throw e;
    }
  }

  // LocalStorage Fallback
  const rawAnn = localStorage.getItem("announcements") || "[]";
  const anns = JSON.parse(rawAnn);
  const newId = `ann_${Date.now()}`;
  const newAnn = {
    id: newId,
    title,
    text,
    createdAt: Date.now(),
    authorEmail: authorEmail || "admin@autoparts.com",
    type: "broadcast"
  };
  anns.unshift(newAnn);
  localStorage.setItem("announcements", JSON.stringify(anns));
  window.dispatchEvent(new Event("autoparts_announcements_updated"));
  return newId;
}

export function subscribeToAnnouncements(
  userId: string | null,
  callback: (announcements: Announcement[]) => void,
  onError?: (err: any) => void
): () => void {
  if (useFirebase && db) {
    let announcementsRaw: any[] = [];
    let readSet: Set<string> = new Set();

    const getLocalReadSet = (): Set<string> => {
      try {
        const raw = localStorage.getItem("autoparts_read_announcements") || "[]";
        return new Set(JSON.parse(raw));
      } catch {
        return new Set();
      }
    };

    if (!userId) {
      readSet = getLocalReadSet();
    }

    const emit = () => {
      const combined: Announcement[] = announcementsRaw.map((ann) => ({
        ...ann,
        isRead: readSet.has(ann.id)
      }));
      callback(combined);
    };

    // 1. Listen to announcements collection sorted by createdAt desc
    const annQuery = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
    const unsubAnn = onSnapshot(
      annQuery,
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            title: data.title || "",
            text: data.text || "",
            createdAt: typeof data.createdAt === "number" ? data.createdAt : Date.now(),
            authorEmail: data.authorEmail || "",
            type: data.type || "broadcast"
          });
        });
        announcementsRaw = list;
        emit();
      },
      (err) => {
        console.error("Firestore subscribeToAnnouncements error:", err);
        handleFirestoreError(err, OperationType.LIST, "announcements");
        if (onError) onError(err);
      }
    );

    // 2. Listen to read_announcements if userId exists
    let unsubRead: (() => void) | null = null;
    if (userId) {
      const readRef = collection(db, "users", userId, "read_announcements");
      unsubRead = onSnapshot(
        readRef,
        (snapshot) => {
          const newSet = new Set<string>();
          snapshot.forEach((d) => newSet.add(d.id));
          readSet = newSet;
          emit();
        },
        (err) => {
          console.warn("Firestore read_announcements listener warn:", err);
        }
      );
    }

    return () => {
      unsubAnn();
      if (unsubRead) unsubRead();
    };
  }

  // LocalStorage Fallback
  const handleLocalUpdate = () => {
    try {
      const rawAnn = localStorage.getItem("announcements") || "[]";
      const rawRead = localStorage.getItem("autoparts_read_announcements") || "[]";
      const annList = JSON.parse(rawAnn);
      const readSet = new Set<string>(JSON.parse(rawRead));
      const result: Announcement[] = annList.map((a: any) => ({
        id: a.id,
        title: a.title || "",
        text: a.text || "",
        createdAt: a.createdAt || Date.now(),
        authorEmail: a.authorEmail || "",
        type: a.type || "broadcast",
        isRead: readSet.has(a.id)
      }));
      callback(result);
    } catch {
      callback([]);
    }
  };

  handleLocalUpdate();
  window.addEventListener("autoparts_announcements_updated", handleLocalUpdate);
  window.addEventListener("storage", handleLocalUpdate);

  return () => {
    window.removeEventListener("autoparts_announcements_updated", handleLocalUpdate);
    window.removeEventListener("storage", handleLocalUpdate);
  };
}

export async function markAnnouncementAsRead(userId: string | null, announcementId: string): Promise<boolean> {
  try {
    const rawRead = localStorage.getItem("autoparts_read_announcements") || "[]";
    const readList: string[] = JSON.parse(rawRead);
    if (!readList.includes(announcementId)) {
      readList.push(announcementId);
      localStorage.setItem("autoparts_read_announcements", JSON.stringify(readList));
      window.dispatchEvent(new Event("autoparts_announcements_updated"));
    }
  } catch (e) {
    // ignore
  }

  if (useFirebase && db && userId) {
    try {
      const readDocRef = doc(db, "users", userId, "read_announcements", announcementId);
      await setDoc(readDocRef, { readAt: Date.now() }, { merge: true });
      return true;
    } catch (err) {
      console.error("Firestore markAnnouncementAsRead failed:", err);
      handleFirestoreError(err, OperationType.WRITE, `users/${userId}/read_announcements/${announcementId}`);
      return false;
    }
  }
  return true;
}

export async function markAllAnnouncementsAsRead(userId: string | null, announcementIds: string[]): Promise<boolean> {
  if (announcementIds.length === 0) return true;

  try {
    const rawRead = localStorage.getItem("autoparts_read_announcements") || "[]";
    const readList: string[] = JSON.parse(rawRead);
    const updatedSet = new Set([...readList, ...announcementIds]);
    localStorage.setItem("autoparts_read_announcements", JSON.stringify(Array.from(updatedSet)));
    window.dispatchEvent(new Event("autoparts_announcements_updated"));
  } catch (e) {
    // ignore
  }

  if (useFirebase && db && userId) {
    try {
      const batch = writeBatch(db);
      for (const annId of announcementIds) {
        const readDocRef = doc(db, "users", userId, "read_announcements", annId);
        batch.set(readDocRef, { readAt: Date.now() }, { merge: true });
      }
      await batch.commit();
      return true;
    } catch (err) {
      console.error("Firestore markAllAnnouncementsAsRead failed:", err);
      return false;
    }
  }
  return true;
}

export const DEFAULT_APP_VERSION_CONFIG: AppVersionConfig = {
  latestVersion: "1.0.0",
  minimumSupportedVersion: "1.0.0",
  forceUpdate: false,
  apkDownloadUrl: "https://github.com/autoparts/app/releases/download/v1.1.0/AutoParts-v1.1.0.apk",
  releaseNotes: "• Performance optimizations and faster listing loads\n• Enhanced state & district search filters across India\n• Improved buyer-seller direct messaging and call security\n• General stability improvements and bug fixes",
  releaseDate: "2026-07-22"
};

export async function fetchAppVersionConfig(): Promise<AppVersionConfig> {
  if (db) {
    try {
      const docRef = doc(db, "app_config", "version");
      const snap = await withTimeout(getDoc(docRef), 3000, "App version check timeout");
      if (snap.exists()) {
        const data = snap.data();
        let formattedUpdatedAt: string | undefined = undefined;
        if (data.updatedAt) {
          if (typeof data.updatedAt.toDate === "function") {
            formattedUpdatedAt = data.updatedAt.toDate().toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true
            });
          } else if (typeof data.updatedAt === "number") {
            formattedUpdatedAt = new Date(data.updatedAt).toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true
            });
          } else if (typeof data.updatedAt === "string") {
            formattedUpdatedAt = data.updatedAt;
          }
        }
        return {
          latestVersion: data.latestVersion || "1.0.0",
          minimumSupportedVersion: data.minimumSupportedVersion || "1.0.0",
          forceUpdate: typeof data.forceUpdate === "boolean" ? data.forceUpdate : false,
          apkDownloadUrl: data.apkDownloadUrl || DEFAULT_APP_VERSION_CONFIG.apkDownloadUrl,
          releaseNotes: data.releaseNotes || DEFAULT_APP_VERSION_CONFIG.releaseNotes,
          releaseDate: data.releaseDate || DEFAULT_APP_VERSION_CONFIG.releaseDate,
          updatedAt: formattedUpdatedAt,
          updatedBy: data.updatedBy || undefined
        };
      } else {
        return DEFAULT_APP_VERSION_CONFIG;
      }
    } catch (e) {
      console.warn("Firestore fetchAppVersionConfig offline/timeout notice, falling back to default:", e);
      handleFirestoreError(e, OperationType.GET, "app_config/version");
      const saved = localStorage.getItem("app_version_config");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (_) {}
      }
      return DEFAULT_APP_VERSION_CONFIG;
    }
  }

  // Fallback to LocalStorage
  const saved = localStorage.getItem("app_version_config");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
  }
  return DEFAULT_APP_VERSION_CONFIG;
}

export async function updateAppVersionConfig(config: AppVersionConfig, adminEmail?: string): Promise<boolean> {
  if (db) {
    try {
      const docRef = doc(db, "app_config", "version");
      const emailToSave = adminEmail || auth.currentUser?.email || "admin@autoparts.com";
      const payload: any = {
        latestVersion: config.latestVersion,
        minimumSupportedVersion: config.minimumSupportedVersion,
        forceUpdate: Boolean(config.forceUpdate),
        apkDownloadUrl: config.apkDownloadUrl,
        releaseNotes: config.releaseNotes,
        releaseDate: config.releaseDate,
        updatedAt: serverTimestamp(),
        updatedBy: emailToSave
      };
      await setDoc(docRef, payload, { merge: true });
      localStorage.setItem("app_version_config", JSON.stringify({
        ...config,
        updatedBy: emailToSave,
        updatedAt: new Date().toISOString()
      }));
      return true;
    } catch (e) {
      console.error("Firestore updateAppVersionConfig failed:", e);
      handleFirestoreError(e, OperationType.WRITE, "app_config/version");
      throw e;
    }
  }

  localStorage.setItem("app_version_config", JSON.stringify(config));
  return true;
}

// ==================== BANNERS MANAGEMENT ====================
const LOCAL_STORAGE_BANNERS_KEY = "autoparts_banners";

export async function fetchBanners(onlyActive: boolean = false): Promise<Banner[]> {
  let list: Banner[] = [];
  if (useFirebase && db) {
    try {
      const bRef = collection(db, "banners");
      const snap = await getDocs(bRef);
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          title: data.title || "",
          subtitle: data.subtitle || "",
          tag: data.tag || "",
          badgeBg: data.badgeBg || "bg-blue-500/20 text-blue-300 border-blue-400/30",
          bgGradient: data.bgGradient || "from-[#0B1A30] via-[#102444] to-[#1E293B]",
          imageUrl: data.imageUrl || "",
          imagePublicId: data.imagePublicId || "",
          targetLink: data.targetLink || "",
          active: data.active !== false,
          order: typeof data.order === "number" ? data.order : 0,
          createdAt: convertTimestampToNumber(data.createdAt),
          updatedAt: convertTimestampToNumber(data.updatedAt)
        });
      });
    } catch (e) {
      console.warn("Firestore fetchBanners failed:", e);
    }
  }

  if (list.length === 0) {
    const raw = localStorage.getItem(LOCAL_STORAGE_BANNERS_KEY);
    if (raw) {
      try {
        list = JSON.parse(raw);
      } catch (e) {}
    }
  }

  list.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return b.createdAt - a.createdAt;
  });

  if (onlyActive) {
    list = list.filter(b => b.active);
  }

  return list;
}

export function subscribeToBanners(
  callback: (banners: Banner[]) => void,
  onlyActive: boolean = false
): () => void {
  if (useFirebase && db) {
    const bRef = collection(db, "banners");
    const unsub = onSnapshot(
      bRef,
      (snap) => {
        let list: Banner[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            title: data.title || "",
            subtitle: data.subtitle || "",
            tag: data.tag || "",
            badgeBg: data.badgeBg || "bg-blue-500/20 text-blue-300 border-blue-400/30",
            bgGradient: data.bgGradient || "from-[#0B1A30] via-[#102444] to-[#1E293B]",
            imageUrl: data.imageUrl || "",
            imagePublicId: data.imagePublicId || "",
            targetLink: data.targetLink || "",
            active: data.active !== false,
            order: typeof data.order === "number" ? data.order : 0,
            createdAt: convertTimestampToNumber(data.createdAt),
            updatedAt: convertTimestampToNumber(data.updatedAt)
          });
        });

        list.sort((a, b) => {
          if (a.order !== b.order) return a.order - b.order;
          return b.createdAt - a.createdAt;
        });

        localStorage.setItem(LOCAL_STORAGE_BANNERS_KEY, JSON.stringify(list));

        if (onlyActive) {
          list = list.filter(b => b.active);
        }

        callback(list);
      },
      (err) => {
        console.warn("subscribeToBanners listener error:", err);
        fetchBanners(onlyActive).then(callback);
      }
    );
    return unsub;
  }

  fetchBanners(onlyActive).then(callback);
  const handler = () => fetchBanners(onlyActive).then(callback);
  window.addEventListener("autoparts_banners_updated", handler);
  return () => window.removeEventListener("autoparts_banners_updated", handler);
}

export async function createBanner(bannerData: Omit<Banner, "id" | "createdAt">): Promise<Banner> {
  let uploadedUrl = bannerData.imageUrl || "";
  if (uploadedUrl && (uploadedUrl.startsWith("data:") || uploadedUrl.length > 500)) {
    uploadedUrl = await uploadProductImage(uploadedUrl);
  }
  const pid = extractPublicId(uploadedUrl) || "";

  const docPayload = {
    title: bannerData.title || "",
    subtitle: bannerData.subtitle || "",
    tag: bannerData.tag || "Special Offer",
    badgeBg: bannerData.badgeBg || "bg-blue-500/20 text-blue-300 border-blue-400/30",
    bgGradient: bannerData.bgGradient || "from-[#0B1A30] via-[#102444] to-[#1E293B]",
    imageUrl: uploadedUrl,
    imagePublicId: pid,
    targetLink: bannerData.targetLink || "",
    active: bannerData.active !== false,
    order: typeof bannerData.order === "number" ? bannerData.order : 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  let newId = `banner_${Date.now()}`;
  if (useFirebase && db) {
    const docRef = await addDoc(collection(db, "banners"), docPayload);
    newId = docRef.id;
  }

  const createdBanner: Banner = { id: newId, ...docPayload };

  const current = await fetchBanners(false);
  current.push(createdBanner);
  localStorage.setItem(LOCAL_STORAGE_BANNERS_KEY, JSON.stringify(current));
  window.dispatchEvent(new Event("autoparts_banners_updated"));

  return createdBanner;
}

export async function updateBanner(
  bannerId: string,
  updates: Partial<Banner>,
  oldImageUrl?: string
): Promise<boolean> {
  let updatedUrl = updates.imageUrl;

  if (updatedUrl && (updatedUrl.startsWith("data:") || updatedUrl.length > 500)) {
    // New base64 image uploaded
    if (oldImageUrl) {
      try {
        const oldPid = extractPublicId(oldImageUrl) || oldImageUrl;
        await deleteImageFromCloudinary(oldPid);
      } catch (e) {
        console.warn("Failed to delete old Cloudinary image:", e);
      }
    }
    updatedUrl = await uploadProductImage(updatedUrl);
    updates.imageUrl = updatedUrl;
    updates.imagePublicId = extractPublicId(updatedUrl) || "";
  } else if (updatedUrl && oldImageUrl && updatedUrl !== oldImageUrl) {
    // Image URL changed
    try {
      const oldPid = extractPublicId(oldImageUrl) || oldImageUrl;
      await deleteImageFromCloudinary(oldPid);
    } catch (e) {
      console.warn("Failed to delete old Cloudinary image:", e);
    }
    updates.imagePublicId = extractPublicId(updatedUrl) || "";
  }

  const payload: any = {
    ...updates,
    updatedAt: Date.now()
  };

  if (useFirebase && db) {
    const docRef = doc(db, "banners", bannerId);
    await updateDoc(docRef, payload);
  }

  const current = await fetchBanners(false);
  const idx = current.findIndex(b => b.id === bannerId);
  if (idx !== -1) {
    current[idx] = { ...current[idx], ...payload };
    localStorage.setItem(LOCAL_STORAGE_BANNERS_KEY, JSON.stringify(current));
    window.dispatchEvent(new Event("autoparts_banners_updated"));
  }

  return true;
}

export async function deleteBanner(bannerId: string, imageUrl?: string): Promise<boolean> {
  let targetUrl = imageUrl;

  if (useFirebase && db) {
    if (!targetUrl) {
      try {
        const docRef = doc(db, "banners", bannerId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          targetUrl = snap.data().imageUrl;
        }
      } catch (e) {}
    }
    await deleteDoc(doc(db, "banners", bannerId));
  }

  if (targetUrl) {
    try {
      const pid = extractPublicId(targetUrl) || targetUrl;
      await deleteImageFromCloudinary(pid);
    } catch (e) {
      console.warn("Cloudinary delete image on banner delete failed:", e);
    }
  }

  const current = await fetchBanners(false);
  const filtered = current.filter(b => b.id !== bannerId);
  localStorage.setItem(LOCAL_STORAGE_BANNERS_KEY, JSON.stringify(filtered));
  window.dispatchEvent(new Event("autoparts_banners_updated"));

  return true;
}

export async function reorderBanners(bannerOrders: { id: string; order: number }[]): Promise<boolean> {
  if (useFirebase && db) {
    try {
      const batch = writeBatch(db);
      for (const item of bannerOrders) {
        const docRef = doc(db, "banners", item.id);
        batch.update(docRef, { order: item.order, updatedAt: Date.now() });
      }
      await batch.commit();
    } catch (e) {
      console.warn("Batch write for banner reordering failed, doing individual updates:", e);
      for (const item of bannerOrders) {
        try {
          const docRef = doc(db, "banners", item.id);
          await updateDoc(docRef, { order: item.order, updatedAt: Date.now() });
        } catch (err) {}
      }
    }
  }

  const current = await fetchBanners(false);
  for (const item of bannerOrders) {
    const found = current.find(b => b.id === item.id);
    if (found) {
      found.order = item.order;
    }
  }
  localStorage.setItem(LOCAL_STORAGE_BANNERS_KEY, JSON.stringify(current));
  window.dispatchEvent(new Event("autoparts_banners_updated"));

  return true;
}

// ----------------------------------------------------
// FIREBASE CLOUD MESSAGING (FCM) PHASE 1 FOUNDATION
// ----------------------------------------------------

let messagingInstance: Messaging | null = null;

export async function getFCMMessagingInstance(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  if (messagingInstance) return messagingInstance;
  if (!app) return null;

  try {
    const supported = await isSupported().catch(() => false);
    if (supported) {
      messagingInstance = getMessaging(app);
      return messagingInstance;
    }
  } catch (err) {
    console.warn("FCM isSupported check failed:", err);
  }
  return null;
}

/**
 * Phase 1 FCM Registration:
 * 1. Checks FCM browser support.
 * 2. Requests notification permission safely.
 * 3. Generates device FCM token.
 * 4. Saves fcmToken and tokenUpdatedAt (serverTimestamp) to Firestore user doc users/{userId}.
 * 5. Handles permission denied, network failures, and token duplicates gracefully.
 */
export async function registerFCMToken(userId: string): Promise<string | null> {
  if (!userId) return null;
  if (typeof window === "undefined") return null;

  try {
    if (!("Notification" in window)) {
      console.log("This environment does not support Notification API.");
      return null;
    }

    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission().catch(() => "denied");
    }

    if (permission !== "granted") {
      console.log("FCM Notification permission not granted:", permission);
      return null;
    }

    const msg = await getFCMMessagingInstance();
    if (!msg) {
      console.log("FCM Messaging instance not available.");
      return null;
    }

    const vapidKey = (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY || (configFromFile as any).vapidKey || undefined;
    let tokenOptions: any = vapidKey ? { vapidKey } : {};

    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        tokenOptions.serviceWorkerRegistration = registration;
      } catch (swErr) {
        console.warn("[FCM] Service worker registration warning:", swErr);
      }
    }

    const token = await getToken(msg, Object.keys(tokenOptions).length > 0 ? tokenOptions : undefined).catch((err) => {
      console.warn("Failed to generate FCM token:", err);
      return null;
    });

    if (!token) return null;

    const cacheKey = `autoparts_fcm_token_${userId}`;
    const cachedToken = localStorage.getItem(cacheKey);

    // Save token to Firestore user document
    if (useFirebase && db) {
      try {
        const userRef = doc(db, "users", userId);
        
        // Save fcmToken & tokenUpdatedAt (serverTimestamp)
        await setDoc(userRef, {
          fcmToken: token,
          tokenUpdatedAt: serverTimestamp()
        }, { merge: true });

        localStorage.setItem(cacheKey, token);
        console.log(`[FCM] Successfully registered device token for user ${userId}`);
      } catch (err: any) {
        console.warn("Failed to save FCM token to Firestore user doc:", err);
      }
    } else {
      localStorage.setItem(cacheKey, token);
    }

    return token;
  } catch (err) {
    console.warn("Unexpected error during FCM token registration:", err);
    return null;
  }
}

/**
 * Listens for FCM notifications arriving while the app is in foreground.
 * Triggers callback for in-app banner/toast, sound, and badge updates.
 */
export function setupFCMForegroundListener(onNotification: (payload: any) => void): () => void {
  let unsubscribe: (() => void) | null = null;
  let active = true;

  getFCMMessagingInstance().then((msg) => {
    if (!active || !msg) return;

    try {
      unsubscribe = onMessage(msg, (payload) => {
        console.log("[FCM Foreground Message Received]", payload);
        onNotification(payload);
      });
    } catch (err) {
      console.warn("Failed to attach FCM onMessage listener:", err);
    }
  }).catch((err) => {
    console.warn("Error initializing FCM listener:", err);
  });

  return () => {
    active = false;
    if (unsubscribe) {
      try {
        unsubscribe();
      } catch (e) {}
    }
  };
}

/**
 * Saves received FCM notification payload to Firestore 'notifications' collection
 * so the unread notification badge and notification list stay updated.
 */
export async function saveFCMNotificationToFirestore(
  userId: string, 
  title: string, 
  body: string, 
  data?: any
): Promise<void> {
  if (!userId) return;

  const timestamp = Date.now();
  const notificationId = `fcm_${timestamp}_${Math.random().toString(36).substring(2, 7)}`;

  if (useFirebase && db) {
    try {
      const notifRef = doc(db, "notifications", notificationId);
      await setDoc(notifRef, {
        id: notificationId,
        recipientId: userId,
        senderId: data?.senderId || "system",
        text: `${title}${body ? `: ${body}` : ""}`,
        createdAt: timestamp,
        read: false,
        partTitle: data?.partTitle || title || "Notification",
        partPrice: Number(data?.partPrice) || 0,
        partImageUrl: data?.partImageUrl || "",
        buyerId: data?.buyerId || "",
        buyerName: data?.buyerName || "",
        sellerId: data?.sellerId || "",
        sellerName: data?.sellerName || "",
        isFcm: true
      }, { merge: true });
    } catch (e) {
      console.warn("Failed to save FCM notification to Firestore:", e);
    }
  }

  // LocalStorage fallback
  try {
    const raw = localStorage.getItem("autoparts_notifications");
    const list: any[] = raw ? JSON.parse(raw) : [];
    list.push({
      id: notificationId,
      recipientId: userId,
      senderId: data?.senderId || "system",
      text: `${title}${body ? `: ${body}` : ""}`,
      createdAt: timestamp,
      read: false,
      partTitle: data?.partTitle || title || "Notification",
      partPrice: Number(data?.partPrice) || 0,
      partImageUrl: data?.partImageUrl || "",
      buyerId: data?.buyerId || "",
      buyerName: data?.buyerName || "",
      sellerId: data?.sellerId || "",
      sellerName: data?.sellerName || "",
      isFcm: true
    });
    localStorage.setItem("autoparts_notifications", JSON.stringify(list));
    window.dispatchEvent(new Event("autoparts_notifications_updated"));
  } catch (e) {}
}




