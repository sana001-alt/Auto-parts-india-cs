import React, { useState, useEffect, useRef } from "react";
import { 
  Camera, 
  Tag, 
  Compass, 
  MapPin, 
  Phone, 
  User as UserIcon, 
  Image as ImageIcon, 
  CheckCircle2, 
  Sparkles, 
  AlertCircle,
  FileText,
  DollarSign,
  Car,
  Layers,
  UploadCloud,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Navigation,
  Loader2,
  Trash2,
  Star
} from "lucide-react";
import { User, SparePart } from "../types";
import { createSparePartListing, uploadProductImage, subscribeToTaxonomyConfig } from "../lib/firebase";
import { INDIAN_STATES_AND_DISTRICTS } from "../data/indianLocations";
import MapLocationModal from "./MapLocationModal";
import { getApproxCoordinates, detectUserLocationWithReverseGeocode, geocodeLocation } from "../utils/locationHelper";
import { useLanguage } from "../lib/LanguageContext";
import { translateDynamic } from "../lib/translations";
import BrandLogo from "./BrandLogo";
import { requestCameraPermissionJIT } from "../utils/permissionUtils";
import { compressImageFile } from "../utils/imageCompressor";

interface SellScreenProps {
  currentUser: User;
  onPublishSuccess: (newPart: SparePart) => void;
  parts: SparePart[];
}

export default function SellScreen({ currentUser, onPublishSuccess, parts }: SellScreenProps) {
  const { t, language } = useLanguage();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(""); // Stores numeric string e.g. "2500"
  const [carBrand, setCarBrand] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carVariant, setCarVariant] = useState("");
  const [category, setCategory] = useState("");
  const [partName, setPartName] = useState("");
  const [condition, setCondition] = useState<"Brand New" | "Like New" | "Used (Good)" | "For Scrap/Spares">("Brand New");
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [contactName, setContactName] = useState(currentUser.name || "");
  const [contactPhone, setContactPhone] = useState(currentUser.phone || "");

  useEffect(() => {
    if (currentUser.name) {
      setContactName(currentUser.name);
    }
    if (currentUser.phone) {
      setContactPhone(currentUser.phone);
    }
  }, [currentUser.name, currentUser.phone]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const [submittedAttempt, setSubmittedAttempt] = useState(false);
  const [isTaxonomyLoading, setIsTaxonomyLoading] = useState(true);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  // Dynamic taxonomy state
  const [taxonomy, setTaxonomy] = useState<{
    categories: string[];
    brands: Record<string, string[]>;
    subcategories: Record<string, string[]>;
    variants: Record<string, string[]>;
    states: string[];
    districts: Record<string, string[]>;
  }>({
    categories: [],
    brands: {},
    subcategories: {},
    variants: {},
    states: [],
    districts: {}
  });

  useEffect(() => {
    setIsTaxonomyLoading(true);
    const unsub = subscribeToTaxonomyConfig((full) => {
      setTaxonomy({
        categories: full.categories || [],
        brands: full.brands || {},
        subcategories: full.subcategories || {},
        variants: full.variants || {},
        states: full.states || [],
        districts: full.districts || {}
      });
      setIsTaxonomyLoading(false);
    });
    return () => unsub();
  }, []);
  
  // Coordinates State
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [showMapModal, setShowMapModal] = useState(false);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic dropdown options derived from taxonomy state
  const availableModels = carBrand ? taxonomy.brands[carBrand] || [] : [];
  const availableVariants = carModel ? (taxonomy.variants[carModel] || taxonomy.variants[`${carBrand}_${carModel}`] || ["Base", "Mid", "Top Spec", "VXi", "ZXi", "SX", "Alpha", "GT", "LXi"]) : [];
  const availablePartNames = category ? taxonomy.subcategories[category] || [] : [];
  const availableDistricts = selectedState ? taxonomy.districts[selectedState] || [] : [];

  // Helper to format currency in Indian numbering format (e.g., 2500 -> 2,500 ; 200000 -> 2,00,000)
  const formatIndianCurrency = (val: string) => {
    const clean = val.replace(/\D/g, "");
    if (!clean) return "";
    const num = parseInt(clean, 10);
    return num.toLocaleString("en-IN");
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, "");
    setPrice(rawDigits);
  };

  const updateAutoTitle = (brand: string, model: string, variant: string, part: string) => {
    const partsList = [brand, model, variant, part].filter(Boolean);
    if (partsList.length >= 2) {
      setTitle(partsList.join(" "));
    }
  };

  const handleBrandChange = (brand: string) => {
    setCarBrand(brand);
    setCarModel("");
    setCarVariant("");
    updateAutoTitle(brand, "", "", partName);
  };

  const handleModelChange = (model: string) => {
    setCarModel(model);
    setCarVariant("");
    updateAutoTitle(carBrand, model, "", partName);
  };

  const handleVariantChange = (v: string) => {
    setCarVariant(v);
    updateAutoTitle(carBrand, carModel, v, partName);
  };

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    setPartName("");
    updateAutoTitle(carBrand, carModel, carVariant, "");
  };

  const handlePartNameChange = (part: string) => {
    setPartName(part);
    updateAutoTitle(carBrand, carModel, carVariant, part);
  };

  const handlePhotoPickerClick = async (e: React.MouseEvent) => {
    const res = await requestCameraPermissionJIT();
    if (!res.granted) {
      e.preventDefault();
      setError(res.message || "Camera & Photos permission is needed to attach spare part images.");
    }
  };

  const handleImageFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length > 6 || uploadedImages.length + files.length > 6) {
      setError("Maximum 6 images allowed per listing.");
      return;
    }

    setError(null);
    const newBase64s: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressedBase64 = await compressImageFile(file, 1200, 1200, 0.82);
        newBase64s.push(compressedBase64);
      }
      setUploadedImages(prev => [...prev, ...newBase64s]);
    } catch (err: any) {
      setError(err.message || "Failed to read local image files.");
    }
    // reset input
    e.target.value = "";
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setUploadedImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleMoveImage = (index: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= uploadedImages.length) return;
    setUploadedImages(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleSetCoverPhoto = (index: number) => {
    if (index === 0) return;
    setUploadedImages(prev => {
      const copy = [...prev];
      const target = copy.splice(index, 1)[0];
      return [target, ...copy];
    });
  };

  const handleDetectLocation = async () => {
    setIsDetectingLocation(true);
    setError(null);
    try {
      const loc = await detectUserLocationWithReverseGeocode(INDIAN_STATES_AND_DISTRICTS);
      setSelectedState(loc.state);
      setSelectedDistrict(loc.district);
      setLat(loc.lat);
      setLng(loc.lng);
    } catch (err: any) {
      setError(err.message || "Could not auto-detect location. Please select State and District manually.");
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const isSubmittingRef = useRef(false);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedAttempt(true);
    setError(null);

    if (isSubmittingRef.current || isUploading || isSubmitting) {
      return;
    }

    if (!title.trim() || !description.trim() || !price || !carBrand || !carModel || !category || !partName || !selectedState || !selectedDistrict || !contactName.trim()) {
      setError("Please fill in all required fields indicated in red below.");
      return;
    }

    const cleanPhone = contactPhone.replace(/\D/g, "");
    if (!contactPhone.trim() || cleanPhone.length < 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError("Please specify a valid price in ₹.");
      return;
    }

    if (uploadedImages.length === 0) {
      setError("Please upload at least 1 photo of the spare part.");
      return;
    }

    const isDuplicate = parts.some(
      p => p.sellerId === currentUser.id &&
           (p.title || "").trim().toLowerCase() === title.trim().toLowerCase() &&
           p.price === priceNum &&
           (p.description || "").trim().toLowerCase() === description.trim().toLowerCase()
    );
    if (isDuplicate) {
      setError("You have already published a duplicate listing with these details.");
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setIsUploading(true);
    setUploadProgress(`Uploading images... 0/${uploadedImages.length}`);

    try {
      // 1. Asynchronous Image Upload Pipeline:
      // Ensure image files are uploaded directly to Cloudinary BEFORE constructing the Firestore payload object.
      // Wait for Promise.all() on all Cloudinary image uploads to return plain HTTPS image URL strings.
      // Under no circumstances send raw Base64 image strings or File objects to Firestore.

      let completedCount = 0;
      const totalCount = uploadedImages.length;

      const uploadPromises = uploadedImages.map(async (img) => {
        if (img.startsWith("data:image/")) {
          const uploadedUrl = await uploadProductImage(img);
          completedCount++;
          setUploadProgress(`Uploading images... ${completedCount}/${totalCount}`);
          return uploadedUrl;
        }
        completedCount++;
        setUploadProgress(`Uploading images... ${completedCount}/${totalCount}`);
        return img;
      });

      const cloudinaryUrls = await Promise.all(uploadPromises);

      // Filter and verify strictly HTTPS Cloudinary URLs
      const cleanCloudinaryUrls = cloudinaryUrls.filter(
        url => url && typeof url === "string" && !url.startsWith("data:image/")
      );

      if (cleanCloudinaryUrls.length === 0) {
        throw new Error("Failed to upload image(s) to Cloudinary. Please check connection and try again.");
      }

      setUploadProgress("Saving listing...");
      
      let finalLat = lat;
      let finalLng = lng;
      if (finalLat === undefined || finalLng === undefined || finalLat === 0 || finalLng === 0) {
        try {
          const geocoded = await geocodeLocation(selectedState, selectedDistrict);
          finalLat = geocoded.lat;
          finalLng = geocoded.lng;
        } catch (e) {
          // non-blocking
        }
      }

      const savedPart = await createSparePartListing({
        title: title.trim(),
        description: description.trim(),
        price: priceNum,
        carBrand,
        carModel,
        carVariant: carVariant || undefined,
        category,
        partName,
        condition,
        location: `${selectedDistrict}, ${selectedState}`,
        state: selectedState,
        district: selectedDistrict,
        lat: finalLat,
        lng: finalLng,
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        phoneNumber: contactPhone.trim(),
        imageUrl: cleanCloudinaryUrls[0],
        imageUrls: cleanCloudinaryUrls,
        sellerId: currentUser.id,
        sellerEmail: currentUser.email
      });

      setUploadProgress(null);
      setShowSuccess(true);
      
      setTimeout(() => {
        resetForm();
        onPublishSuccess(savedPart);
      }, 1000);

    } catch (err: any) {
      console.error("[Post Ad Error]", err);
      const errorMsg = err?.message || "Failed to publish listing. Please check internet connection.";
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
      setUploadProgress(null);
      isSubmittingRef.current = false;
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPrice("");
    setCarBrand("");
    setCarModel("");
    setCarVariant("");
    setCategory("");
    setPartName("");
    setCondition("Brand New");
    setSelectedState("");
    setSelectedDistrict("");
    setContactName(currentUser.name || "");
    setContactPhone(currentUser.phone || "");
    setLat(undefined);
    setLng(undefined);
    setUploadedImages([]);
    setUploadProgress(null);
    setShowSuccess(false);
    setError(null);
    setSubmittedAttempt(false);
  };

  if (showSuccess) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center animate-fade-in" id="sell-success-container">
        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
          <CheckCircle2 size={38} className="animate-bounce" />
        </div>
        <h2 className="text-xl font-black tracking-tight text-white">✅ Ad posted successfully.</h2>
        <p className="text-xs text-slate-300 mt-2 max-w-xs leading-relaxed font-medium">
          Your spare part listing is now live across India! Buyers can contact you directly via phone or in-app chat.
        </p>
        <span className="text-[11px] text-[#60A5FA] mt-6 font-mono font-bold animate-pulse">Redirecting to marketplace...</span>
      </div>
    );
  }

  const userActiveAds = parts.filter(p => 
    p.sellerId === currentUser.id && 
    p.sold !== true && 
    (Date.now() - p.createdAt) <= 90 * 24 * 60 * 60 * 1000
  );
  const isLimitReached = userActiveAds.length >= 5;

  if (isLimitReached) {
    return (
      <div className="flex-1 flex flex-col bg-slate-50 text-slate-900 h-full overflow-hidden" id="sell-screen-container">
        <div className="bg-[#0B1220] text-white px-4 py-3 sticky top-0 z-10 shadow-xs border-b border-[#18233C] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <BrandLogo size="sm" variant="icon" theme="dark" showTagline={false} />
            <div>
              <h2 className="text-sm font-black text-white">Sell Spare Part</h2>
              <p className="text-[9px] text-slate-400">Post ads across India</p>
            </div>
          </div>
          <Sparkles size={16} className="text-[#60A5FA]" />
        </div>

        <div className="p-4 flex-1 overflow-y-auto flex flex-col justify-center items-center text-center max-w-md mx-auto">
          <div className="w-12 h-12 bg-amber-50 text-amber-500 border border-amber-200 rounded-2xl flex items-center justify-center mb-3">
            <AlertCircle size={24} />
          </div>
          <h3 className="text-base font-black text-slate-800">5 Active Ads Limit Reached</h3>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            You currently have 5 active listings. Delete or mark an old ad as sold to post new parts.
          </p>
          <div className="mt-4 p-3.5 bg-white border border-slate-200 rounded-2xl w-full text-left shadow-xs">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Your Active Ads:</h4>
            <div className="space-y-2">
              {userActiveAds.map(ad => (
                <div key={ad.id} className="flex gap-2.5 items-center text-xs p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="w-8 h-8 rounded bg-slate-900 overflow-hidden shrink-0 flex items-center justify-center">
                    {ad.imageUrl ? (
                      <img 
                        src={ad.imageUrl} 
                        alt="" 
                        className="w-full h-full object-contain p-0.5" 
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=300&auto=format&fit=crop&q=60";
                        }}
                      />
                    ) : (
                      <Car size={14} className="text-slate-400" />
                    )}
                  </div>
                  <span className="font-bold text-slate-700 truncate flex-1">{ad.title}</span>
                  <span className="font-mono font-black text-slate-900">₹{ad.price.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const CONDITION_OPTIONS = [
    { id: "Brand New", label: "Brand New", icon: "✨" },
    { id: "Like New", label: "Like New", icon: "👍" },
    { id: "Used (Good)", label: "Used (Good)", icon: "🔧" },
    { id: "For Scrap/Spares", label: "For Scrap / Spares", icon: "♻" }
  ] as const;

  return (
    <div className="flex-1 flex flex-col bg-slate-50 text-slate-900 h-full overflow-hidden" id="sell-screen-container">
      {/* OLX Mobile Style Top App Bar */}
      <div className="bg-[#0F172A] text-white px-4 py-3 shrink-0 shadow-xs border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BrandLogo size="sm" variant="icon" theme="dark" showTagline={false} />
          <div>
            <h2 className="text-sm font-black text-white tracking-tight">Post Your Ad</h2>
            <p className="text-[10px] text-slate-400 font-medium">Sell genuine spare parts fast</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isTaxonomyLoading && (
            <div className="flex items-center gap-1 text-[10px] text-slate-300 font-semibold bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700">
              <Loader2 size={10} className="animate-spin text-slate-300" />
              <span>Catalog Syncing...</span>
            </div>
          )}
          <span className="text-[10px] font-mono font-black bg-slate-800 text-slate-200 px-2.5 py-0.5 rounded-full border border-slate-700">
            Free Listing
          </span>
        </div>
      </div>

      {/* Main Form Scroll Area with MD3 Style Card Layout */}
      <form onSubmit={handlePublish} className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-5 pb-28 max-w-2xl mx-auto w-full">
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5 shadow-xs animate-shake">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
            <span className="font-semibold leading-normal">{error}</span>
          </div>
        )}

        {/* 1. Photos Section */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 space-y-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Camera size={16} className="text-slate-900" />
                Upload Photos
              </span>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">Upload clear photos of the spare part</p>
            </div>
            <span className="text-[10px] font-black font-mono bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200">
              {uploadedImages.length} / 6 Photos
            </span>
          </div>

          {/* Photo Count Progress Bar */}
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-slate-900 h-full transition-all duration-300 rounded-full"
              style={{ width: `${(uploadedImages.length / 6) * 100}%` }}
            />
          </div>

          {uploadProgress && (
            <div className="text-xs text-slate-900 font-bold bg-slate-100 p-2.5 rounded-xl border border-slate-300 flex items-center gap-2 animate-pulse">
              <Loader2 size={14} className="animate-spin text-slate-900" />
              <span>{uploadProgress}</span>
            </div>
          )}

          {/* Compact Upload Box when empty */}
          {uploadedImages.length === 0 && (
            <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-all bg-slate-50/60 hover:bg-slate-50 flex flex-col items-center justify-center ${
              submittedAttempt && uploadedImages.length === 0 ? "border-rose-400 bg-rose-50/20" : "border-slate-300 hover:border-slate-900"
            }`}>
              <UploadCloud size={26} className="text-slate-700 mb-1" />
              <p className="text-xs font-black text-slate-900">Tap to select or take photos</p>
              <p className="text-[10px] text-slate-500 mt-0.5">JPG, PNG format up to 6 photos. First photo is cover.</p>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageFilesChange}
                className="hidden"
                id="image-file-picker"
              />
              <label
                htmlFor="image-file-picker"
                onClick={handlePhotoPickerClick}
                className="mt-3 px-4 py-2 bg-white hover:bg-slate-900 hover:text-white text-slate-900 border-2 border-slate-900 rounded-xl text-xs font-bold cursor-pointer shadow-xs active:scale-95 transition-all flex items-center gap-1.5"
                id="btn-upload-file"
              >
                <Camera size={14} />
                <span>Choose Photos</span>
              </label>
            </div>
          )}

          {/* Responsive 3-Column Preview Grid */}
          {uploadedImages.length > 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {Array.from({ length: 6 }).map((_, slotIndex) => {
                  const imgUrl = uploadedImages[slotIndex];
                  if (imgUrl) {
                    const isCover = slotIndex === 0;
                    return (
                      <div 
                        key={slotIndex} 
                        className={`aspect-square rounded-xl bg-slate-900 border overflow-hidden relative group shadow-xs ${
                          isCover ? "border-slate-900 ring-2 ring-slate-900/20" : "border-slate-200"
                        }`}
                      >
                        <img
                          src={imgUrl}
                          alt={`Upload ${slotIndex + 1}`}
                          className="w-full h-full object-contain p-0.5"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=300&auto=format&fit=crop&q=60";
                          }}
                        />
                        
                        {/* Cover Badge */}
                        {isCover && (
                          <div className="absolute top-1.5 left-1.5 bg-slate-900 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                            <Star size={9} className="fill-white" />
                            <span>Cover</span>
                          </div>
                        )}

                        {/* Top Right Remove Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(slotIndex)}
                          className="absolute top-1.5 right-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow-md transition-transform hover:scale-110 cursor-pointer"
                          title="Remove photo"
                          id={`remove-img-${slotIndex}`}
                        >
                          <X size={12} />
                        </button>

                        {/* Bottom Actions Overlay (Reorder / Set Cover) */}
                        <div className="absolute bottom-0 inset-x-0 bg-slate-950/85 backdrop-blur-xs p-1 flex items-center justify-between opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          {!isCover && (
                            <button
                              type="button"
                              onClick={() => handleSetCoverPhoto(slotIndex)}
                              className="text-[8px] font-bold text-slate-100 hover:text-white bg-slate-800/90 hover:bg-slate-900 px-1.5 py-0.5 rounded cursor-pointer"
                              title="Make Cover"
                            >
                              Set Cover
                            </button>
                          )}
                          <div className="flex items-center gap-1 ml-auto">
                            {slotIndex > 0 && (
                              <button
                                type="button"
                                onClick={() => handleMoveImage(slotIndex, "left")}
                                className="p-0.5 text-white hover:text-slate-300 cursor-pointer"
                                title="Move Left"
                              >
                                <ChevronLeft size={14} />
                              </button>
                            )}
                            {slotIndex < uploadedImages.length - 1 && (
                              <button
                                type="button"
                                onClick={() => handleMoveImage(slotIndex, "right")}
                                className="p-0.5 text-white hover:text-slate-300 cursor-pointer"
                                title="Move Right"
                              >
                                <ChevronRight size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Render Slot for Next Photo Picker if available
                  if (slotIndex === uploadedImages.length && uploadedImages.length < 6) {
                    return (
                      <div key={slotIndex} className="aspect-square">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageFilesChange}
                          className="hidden"
                          id={`add-more-slot-${slotIndex}`}
                        />
                        <label
                          htmlFor={`add-more-slot-${slotIndex}`}
                          onClick={handlePhotoPickerClick}
                          className="w-full h-full rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-900 bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center text-slate-500 hover:text-slate-900 transition-all cursor-pointer p-2 text-center"
                        >
                          <Camera size={20} className="mb-1" />
                          <span className="text-[10px] font-black">+ Add Photo</span>
                        </label>
                      </div>
                    );
                  }

                  // Empty Slot Placeholder
                  return (
                    <div key={slotIndex} className="aspect-square rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-center text-slate-300">
                      <span className="text-[9px] font-mono font-bold">{slotIndex + 1}</span>
                    </div>
                  );
                })}
              </div>

              {uploadedImages.length < 6 && (
                <div className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                  <span className="text-[11px] font-bold text-slate-700">Add up to {6 - uploadedImages.length} more photo{6 - uploadedImages.length > 1 ? "s" : ""}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageFilesChange}
                    className="hidden"
                    id="add-more-image-picker"
                  />
                  <label
                    htmlFor="add-more-image-picker"
                    onClick={handlePhotoPickerClick}
                    className="px-3 py-1 bg-white border border-slate-300 hover:border-slate-900 text-slate-900 rounded-lg text-xs font-black hover:bg-slate-50 cursor-pointer shadow-xs active:scale-95 transition-all"
                  >
                    + Add More
                  </label>
                </div>
              )}
            </div>
          )}

          {submittedAttempt && uploadedImages.length === 0 && (
            <p className="text-[10px] font-bold text-rose-500 mt-1 flex items-center gap-1">
              <AlertCircle size={11} /> Please upload at least 1 photo of the item.
            </p>
          )}
        </div>

        {/* 2. Vehicle & Category Fitment */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 space-y-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Car size={16} className="text-slate-900" />
              Vehicle & Category Fitment
            </span>
            {isTaxonomyLoading && (
              <Loader2 size={14} className="animate-spin text-slate-700" />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Brand */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600 uppercase block">Car Brand *</label>
              <select
                value={carBrand}
                onChange={(e) => handleBrandChange(e.target.value)}
                className={`w-full bg-slate-50/50 focus:bg-white border rounded-xl py-2.5 px-3.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 cursor-pointer transition-all ${
                  submittedAttempt && !carBrand ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
                }`}
                required
                id="listing-brand"
              >
                <option value="">Select Brand</option>
                {Object.keys(taxonomy.brands).map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              {submittedAttempt && !carBrand && (
                <p className="text-[9px] font-bold text-rose-500 mt-0.5 flex items-center gap-0.5">
                  <AlertCircle size={9} /> Brand is required
                </p>
              )}
            </div>

            {/* Model (Disabled until Brand selected) */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600 uppercase block">Car Model *</label>
              <select
                value={carModel}
                disabled={!carBrand}
                onChange={(e) => handleModelChange(e.target.value)}
                className={`w-full border rounded-xl py-2.5 px-3.5 text-xs font-bold transition-all ${
                  !carBrand 
                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" 
                    : submittedAttempt && !carModel
                    ? "border-rose-400 bg-rose-50/30 text-slate-900"
                    : "bg-slate-50/50 focus:bg-white border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 cursor-pointer"
                }`}
                required
                id="listing-model"
              >
                <option value="">{carBrand ? "Select Model" : "Select Brand First"}</option>
                {availableModels.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              {submittedAttempt && carBrand && !carModel && (
                <p className="text-[9px] font-bold text-rose-500 mt-0.5 flex items-center gap-0.5">
                  <AlertCircle size={9} /> Model is required
                </p>
              )}
            </div>

            {/* Variant (Disabled until Model selected) */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600 uppercase block">Variant (Optional)</label>
              <select
                value={carVariant}
                disabled={!carModel}
                onChange={(e) => handleVariantChange(e.target.value)}
                className={`w-full border rounded-xl py-2.5 px-3.5 text-xs font-bold transition-all ${
                  !carModel 
                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" 
                    : "bg-slate-50/50 focus:bg-white border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 cursor-pointer"
                }`}
                id="listing-variant"
              >
                <option value="">{carModel ? "Select Variant" : "Select Model First"}</option>
                {availableVariants.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Category */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600 uppercase block">Part Category *</label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className={`w-full bg-slate-50/50 focus:bg-white border rounded-xl py-2.5 px-3.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 cursor-pointer transition-all ${
                  submittedAttempt && !category ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
                }`}
                required
                id="listing-category"
              >
                <option value="">Select Category</option>
                {taxonomy.categories.map((cat) => (
                  <option key={cat} value={cat}>{translateDynamic(cat, language)}</option>
                ))}
              </select>
              {submittedAttempt && !category && (
                <p className="text-[9px] font-bold text-rose-500 mt-0.5 flex items-center gap-0.5">
                  <AlertCircle size={9} /> Category is required
                </p>
              )}
            </div>

            {/* Specific Part Name (Disabled until Category selected) */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600 uppercase block">Specific Spare Part *</label>
              <select
                value={partName}
                disabled={!category}
                onChange={(e) => handlePartNameChange(e.target.value)}
                className={`w-full border rounded-xl py-2.5 px-3.5 text-xs font-bold transition-all ${
                  !category 
                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" 
                    : submittedAttempt && !partName
                    ? "border-rose-400 bg-rose-50/30 text-slate-900"
                    : "bg-slate-50/50 focus:bg-white border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 cursor-pointer"
                }`}
                required
                id="listing-part-name"
              >
                <option value="">{category ? "Select Specific Part" : "Select Category First"}</option>
                {availablePartNames.map((part) => (
                  <option key={part} value={part}>{part}</option>
                ))}
              </select>
              {submittedAttempt && category && !partName && (
                <p className="text-[9px] font-bold text-rose-500 mt-0.5 flex items-center gap-0.5">
                  <AlertCircle size={9} /> Part name is required
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 3. Title, Condition & Price */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 space-y-4 shadow-2xs hover:shadow-xs transition-shadow">
          <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Tag size={16} className="text-slate-900" />
            Ad Title, Condition & Price
          </span>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-600 uppercase block">Ad Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mahindra XUV700 Front Bumper Assembly"
              className={`w-full bg-slate-50/50 focus:bg-white border rounded-xl py-2.5 px-3.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all ${
                submittedAttempt && !title.trim() ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
              }`}
              required
              id="listing-title"
            />
            {submittedAttempt && !title.trim() && (
              <p className="text-[9px] font-bold text-rose-500 mt-0.5 flex items-center gap-0.5">
                <AlertCircle size={9} /> Title is required
              </p>
            )}
          </div>

          {/* Condition with dark active state (#0F172A) & light inactive border */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 uppercase block">Condition *</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CONDITION_OPTIONS.map((opt) => {
                const isSelected = condition === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCondition(opt.id as any)}
                    className={`py-2.5 px-3 text-xs rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs font-black"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 font-bold"
                    }`}
                    id={`condition-opt-${opt.id.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  >
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Price with Fixed ₹ symbol & Indian formatting */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600 uppercase block">Price (₹ INR) *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-900 text-sm font-black font-mono pointer-events-none z-10">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={price ? formatIndianCurrency(price) : ""}
                  onChange={handlePriceChange}
                  placeholder="e.g. 2,500"
                  className={`w-full bg-slate-50/50 focus:bg-white border rounded-xl py-2.5 pl-8 pr-3.5 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 font-mono transition-all ${
                    submittedAttempt && !price ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
                  }`}
                  required
                  id="listing-price"
                />
              </div>
              {submittedAttempt && !price && (
                <p className="text-[9px] font-bold text-rose-500 mt-0.5 flex items-center gap-0.5">
                  <AlertCircle size={9} /> Valid price in ₹ is required
                </p>
              )}
            </div>

            {/* Description with character counter */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-600 uppercase block">Description *</label>
                <span className="text-[9px] font-mono font-bold text-slate-400">{description.length}/1000</span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
                placeholder="Original Mahindra XUV700 Front Bumper. Excellent condition."
                rows={3}
                className={`w-full bg-slate-50/50 focus:bg-white border rounded-xl py-2.5 px-3.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all ${
                  submittedAttempt && !description.trim() ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
                }`}
                required
                id="listing-description"
              />
              {submittedAttempt && !description.trim() && (
                <p className="text-[9px] font-bold text-rose-500 mt-0.5 flex items-center gap-0.5">
                  <AlertCircle size={9} /> Description is required
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 4. Location & Map Pin */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 space-y-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <MapPin size={16} className="text-slate-900" />
              Item Location
            </span>
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={isDetectingLocation}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-900 text-slate-800 hover:text-slate-900 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95 disabled:opacity-50 shadow-xs"
              id="btn-use-current-location"
            >
              {isDetectingLocation ? (
                <Loader2 size={13} className="animate-spin text-slate-800" />
              ) : (
                <Navigation size={13} className="fill-slate-800 text-slate-800" />
              )}
              <span>{isDetectingLocation ? "Detecting..." : "Use Current Location"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600 uppercase block">State *</label>
              <select
                value={selectedState}
                onChange={async (e) => {
                  const newState = e.target.value;
                  setSelectedState(newState);
                  setSelectedDistrict("");
                  if (newState) {
                    const coords = await geocodeLocation(newState, "");
                    setLat(coords.lat);
                    setLng(coords.lng);
                  }
                }}
                className={`w-full bg-slate-50/50 focus:bg-white border rounded-xl py-2.5 px-3.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 cursor-pointer transition-all ${
                  submittedAttempt && !selectedState ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
                }`}
                required
                id="listing-state"
              >
                <option value="">Select State</option>
                {INDIAN_STATES_AND_DISTRICTS.map((s) => (
                  <option key={s.state} value={s.state}>{s.state}</option>
                ))}
              </select>
              {submittedAttempt && !selectedState && (
                <p className="text-[9px] font-bold text-rose-500 mt-0.5 flex items-center gap-0.5">
                  <AlertCircle size={9} /> State is required
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600 uppercase block">District / City *</label>
              <select
                value={selectedDistrict}
                disabled={!selectedState}
                onChange={async (e) => {
                  const newDistrict = e.target.value;
                  setSelectedDistrict(newDistrict);
                  if (newDistrict && selectedState) {
                    const coords = await geocodeLocation(selectedState, newDistrict);
                    setLat(coords.lat);
                    setLng(coords.lng);
                  }
                }}
                className={`w-full border rounded-xl py-2.5 px-3.5 text-xs font-bold transition-all ${
                  !selectedState 
                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" 
                    : submittedAttempt && !selectedDistrict
                    ? "border-rose-400 bg-rose-50/30 text-slate-900"
                    : "bg-slate-50/50 focus:bg-white border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 cursor-pointer"
                }`}
                required
                id="listing-district"
              >
                <option value="">{selectedState ? "Select District" : "Select State First"}</option>
                {availableDistricts.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              {submittedAttempt && selectedState && !selectedDistrict && (
                <p className="text-[9px] font-bold text-rose-500 mt-0.5 flex items-center gap-0.5">
                  <AlertCircle size={9} /> District is required
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowMapModal(true)}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-xs ${
              typeof lat === "number" && typeof lng === "number"
                ? "bg-slate-100 border-slate-400 text-slate-900 font-black"
                : "bg-white border-slate-200 text-slate-700 hover:border-slate-900 hover:text-slate-900"
            }`}
            id="listing-map-picker-trigger"
          >
            <Compass size={15} className={typeof lat === "number" && typeof lng === "number" ? "text-slate-900" : "text-slate-400"} />
            {typeof lat === "number" && typeof lng === "number" ? (
              <span>Map Location Set ({lat.toFixed(3)}, {lng.toFixed(3)})</span>
            ) : (
              <span>Choose on Map (Optional)</span>
            )}
          </button>
        </div>

        {/* 5. Seller Info */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 space-y-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <UserIcon size={16} className="text-slate-900" />
              Seller Information
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600 uppercase block">Seller Name *</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className={`w-full bg-slate-50/50 focus:bg-white border rounded-xl py-2.5 px-3.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all ${
                  submittedAttempt && !contactName.trim() ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
                }`}
                required
                id="listing-contact-name"
              />
              {submittedAttempt && !contactName.trim() && (
                <p className="text-[9px] font-bold text-rose-500 mt-0.5 flex items-center gap-0.5">
                  <AlertCircle size={9} /> Seller name is required
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600 uppercase block">Phone Number / WhatsApp Number *</label>
              <div className="relative">
                <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="tel"
                  inputMode="numeric"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className={`w-full bg-slate-50/50 focus:bg-white border rounded-xl py-2.5 pl-9 pr-3.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all ${
                    submittedAttempt && (!contactPhone.trim() || contactPhone.replace(/\D/g, "").length < 10) ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
                  }`}
                  required
                  id="listing-contact-phone"
                />
              </div>
              {submittedAttempt && (!contactPhone.trim() || contactPhone.replace(/\D/g, "").length < 10) && (
                <p className="text-[9px] font-bold text-rose-500 mt-0.5 flex items-center gap-0.5">
                  <AlertCircle size={9} /> Please enter a valid 10-digit phone number
                </p>
              )}
            </div>
          </div>

          <div className="p-3 bg-teal-50 border border-teal-200/80 rounded-xl flex items-center gap-2.5">
            <ShieldCheck size={18} className="text-teal-600 shrink-0" />
            <div className="min-w-0">
              <span className="text-[11px] font-extrabold text-teal-950 block">Protected Seller Privacy</span>
              <span className="text-[10px] font-medium text-teal-700/90 block">
                Your email and contact number are kept safe. Interested buyers can connect with you via in-app chat or verified phone call.
              </span>
            </div>
          </div>
        </div>

        {/* Sticky Bottom Action Bar */}
        <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md p-3.5 sm:p-4 border-t border-slate-200/90 shadow-lg z-30 flex items-center justify-center">
          <div className="max-w-2xl w-full">
            <button
              type="submit"
              disabled={isUploading || isSubmitting}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3.5 rounded-xl text-sm tracking-wider uppercase transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              id="listing-submit-btn"
            >
              {(isUploading || isSubmitting) ? (
                <>
                  <Loader2 size={18} className="animate-spin text-white" />
                  <span>{uploadProgress || "Saving Listing..."}</span>
                </>
              ) : (
                <span>POST AD NOW</span>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Map Picker Modal */}
      {showMapModal && (
        <MapLocationModal
          initialLat={lat}
          initialLng={lng}
          state={selectedState}
          district={selectedDistrict}
          onConfirm={(selectedLat, selectedLng, details) => {
            setLat(selectedLat);
            setLng(selectedLng);
            if (details?.state) setSelectedState(details.state);
            if (details?.district) setSelectedDistrict(details.district);
          }}
          onClose={() => setShowMapModal(false)}
        />
      )}
    </div>
  );
}
