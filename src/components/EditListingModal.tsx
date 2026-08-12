import React, { useState, useEffect } from "react";
import { 
  X, 
  UploadCloud, 
  Check, 
  Camera, 
  Image as ImageIcon, 
  Sparkles, 
  AlertCircle, 
  FileText, 
  Compass, 
  MapPin, 
  Layers, 
  Phone, 
  User as UserIcon,
  Trash2,
  Navigation,
  Loader2,
  ShieldCheck
} from "lucide-react";
import { SparePart, INDIAN_CAR_BRANDS, CAR_PART_CATEGORIES, CAR_SPARE_PARTS_BY_CATEGORY, DEFAULT_MODEL_VARIANTS } from "../types";
import { INDIAN_STATES_AND_DISTRICTS } from "../data/indianLocations";
import { uploadProductImage, fetchFullTaxonomyConfig, subscribeToTaxonomyConfig, deleteSparePartListing } from "../lib/firebase";
import { useLanguage } from "../lib/LanguageContext";
import { translateDynamic } from "../lib/translations";
import MapLocationModal from "./MapLocationModal";
import { getApproxCoordinates, detectUserLocationWithReverseGeocode } from "../utils/locationHelper";
import { requestCameraPermissionJIT } from "../utils/permissionUtils";
import { compressImageFile } from "../utils/imageCompressor";

interface EditListingModalProps {
  part: SparePart;
  onClose: () => void;
  onSave: (partId: string, updates: Partial<SparePart>) => Promise<void>;
  onDelete?: (partId: string) => Promise<void>;
}

export default function EditListingModal({ part, onClose, onSave, onDelete }: EditListingModalProps) {
  const { t, language } = useLanguage();
  const [title, setTitle] = useState(part.title || "");
  const [description, setDescription] = useState(part.description || "");
  const [price, setPrice] = useState(part.price?.toString() || "");
  const [carBrand, setCarBrand] = useState(part.carBrand || "");
  const [carModel, setCarModel] = useState(part.carModel || "");
  const [carVariant, setCarVariant] = useState(part.carVariant || "");
  const [category, setCategory] = useState(part.category || "");
  const [partName, setPartName] = useState(part.partName || "");
  const [condition, setCondition] = useState<"Brand New" | "Like New" | "Used (Good)" | "For Scrap/Spares">(part.condition || "Brand New");
  const [selectedState, setSelectedState] = useState(part.state || "");
  const [selectedDistrict, setSelectedDistrict] = useState(part.district || "");
  const [contactName, setContactName] = useState(part.contactName || "");
  const [contactPhone, setContactPhone] = useState(part.contactPhone || "");
  const [uploadedImages, setUploadedImages] = useState<string[]>(part.imageUrls || (part.imageUrl ? [part.imageUrl] : []));
  const [isDeleting, setIsDeleting] = useState(false);
  
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
    const unsub = subscribeToTaxonomyConfig((full) => {
      setTaxonomy({
        categories: full.categories || [],
        brands: full.brands || {},
        subcategories: full.subcategories || {},
        variants: full.variants || {},
        states: full.states || [],
        districts: full.districts || {}
      });
    });
    return () => unsub();
  }, []);

  // Coordinates State
  const [lat, setLat] = useState<number | undefined>(part.lat);
  const [lng, setLng] = useState<number | undefined>(part.lng);
  const [showMapModal, setShowMapModal] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const availableModels = carBrand ? taxonomy.brands[carBrand] || [] : [];
  const availableVariants = carModel ? (taxonomy.variants[carModel] || taxonomy.variants[`${carBrand}_${carModel}`] || ["Base", "Mid", "Top Spec", "VXi", "ZXi", "SX", "Alpha", "GT", "LXi"]) : [];
  const availablePartNames = category ? taxonomy.subcategories[category] || [] : [];
  const availableDistricts = selectedState ? taxonomy.districts[selectedState] || [] : [];

  const handleBrandChange = (brand: string) => {
    setCarBrand(brand);
    setCarModel("");
    setCarVariant("");
  };

  const handleModelChange = (model: string) => {
    setCarModel(model);
    setCarVariant("");
  };

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    setPartName("");
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
      setError("Maximum 6 images allowed.");
      return;
    }

    setIsUploading(true);
    setError(null);

    const uploadedUrls: string[] = [];
    const initialCount = uploadedImages.length;
    const totalFiles = files.length;

    try {
      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        const currentProgressNum = initialCount + i + 1;
        setUploadProgress(`Uploading: ${currentProgressNum}/6`);

        const base64Data = await compressImageFile(file, 1200, 1200, 0.82);
        const cloudinaryUrl = await uploadProductImage(base64Data);
        uploadedUrls.push(cloudinaryUrl);
      }
      setUploadedImages(prev => [...prev, ...uploadedUrls]);
    } catch (err: any) {
      setError(err.message || "Failed to upload one or more images. Please try again.");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (!title || !description || !price || !carBrand || !carModel || !category || !partName || !selectedState || !selectedDistrict || !contactName) {
      setError("Please fill in all listing details including Car Brand, Model, Part Category, Specific Part, and complete Location.");
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError("Please specify a valid positive price in ₹.");
      return;
    }

    const cleanPhone = contactPhone.replace(/\D/g, "");
    if (!contactPhone.trim() || cleanPhone.length < 10) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }

    if (uploadedImages.length === 0) {
      setError("Please upload at least one photo of the spare part.");
      return;
    }

    setIsSaving(true);

    try {
      let finalLat = lat;
      let finalLng = lng;
      if (finalLat === undefined || finalLng === undefined || finalLat === 0 || finalLng === 0) {
        const approx = getApproxCoordinates(selectedState, selectedDistrict);
        finalLat = approx.lat;
        finalLng = approx.lng;
      }

      const primaryImage = uploadedImages[0] || "";
      const updates: Partial<SparePart> = {
        title: title.trim(),
        description: description.trim(),
        price: priceNum,
        carBrand: carBrand.trim(),
        carModel: carModel.trim(),
        carVariant: carVariant ? carVariant.trim() : "",
        category: category.trim(),
        partName: partName.trim(),
        condition,
        location: `${selectedDistrict}, ${selectedState}`,
        state: selectedState,
        district: selectedDistrict,
        lat: finalLat !== undefined ? finalLat : 0,
        lng: finalLng !== undefined ? finalLng : 0,
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        phoneNumber: contactPhone.trim(),
        imageUrl: primaryImage,
        imageUrls: uploadedImages || []
      };

      await onSave(part.id, updates);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to permanently delete this listing? All photos will be removed from Cloudinary storage.")) {
      setIsDeleting(true);
      setError(null);
      try {
        if (onDelete) {
          await onDelete(part.id);
        } else {
          await deleteSparePartListing(part.id);
        }
        onClose();
      } catch (err: any) {
        setError(err.message || "Failed to delete listing.");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200" id="edit-listing-modal-overlay" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-lg h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-slate-100" id="edit-listing-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex flex-row items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-extrabold tracking-tight text-white">Edit Advertisement</h2>
            <p className="text-[10px] text-slate-400">Update your spare part details</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
            id="close-edit-modal-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto" id="edit-listing-form">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-xs text-rose-600 flex flex-row items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
              <span className="text-xs text-rose-600 font-medium flex-1">{error}</span>
            </div>
          )}

          {/* Product photos section */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
            <div className="flex flex-row justify-between items-center">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Product Photos (Max 6)
              </span>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                {uploadedImages.length}/6
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-1.5">
              {uploadedImages.map((img, idx) => (
                <div key={idx} className="relative aspect-square bg-slate-200 rounded-xl overflow-hidden shadow-sm border border-slate-100">
                  <img 
                    src={img} 
                    alt="Product" 
                    className="w-full h-full object-contain bg-slate-900 p-0.5" 
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=300&auto=format&fit=crop&q=60";
                    }}
                  />
                  <button
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 p-1 bg-slate-950/70 text-white rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
                    title="Remove Photo"
                  >
                    <X size={10} />
                  </button>
                  {idx === 0 && (
                    <div className="absolute bottom-0 inset-x-0 bg-indigo-600 text-white text-[8px] font-black tracking-widest text-center py-0.5 uppercase">
                      Primary
                    </div>
                  )}
                </div>
              ))}

              {uploadedImages.length < 6 && (
                <label 
                  onClick={handlePhotoPickerClick}
                  className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                  isUploading 
                    ? "border-slate-300 bg-slate-100/50 cursor-not-allowed" 
                    : "border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/10"
                }`}>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageFilesChange}
                    disabled={isUploading}
                    className="hidden"
                  />
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[8px] text-slate-500 font-extrabold uppercase mt-1">{uploadProgress || "Uploading"}</span>
                    </div>
                  ) : (
                    <>
                      <Camera size={18} className="text-slate-400" />
                      <span className="text-[9px] text-slate-400 font-bold uppercase">Add Photo</span>
                    </>
                  )}
                </label>
              )}
            </div>
          </div>

          {/* Ad Title */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 block">ADVERTISEMENT TITLE</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Maruti Suzuki Swift Headlight Right Side"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Brand, Model & Variant */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 block">CAR BRAND</label>
              <div className="relative">
                <Layers size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
                <select
                  value={carBrand}
                  onChange={(e) => handleBrandChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-8 pr-1 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none font-bold"
                  required
                >
                  <option value="">Choose Brand</option>
                  {Object.keys(taxonomy.brands).map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 block">CAR MODEL</label>
              <div className="relative">
                <Layers size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
                <select
                  value={carModel}
                  disabled={!carBrand}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="w-full bg-slate-50 disabled:opacity-50 border border-slate-200 rounded-xl py-2.5 pl-8 pr-1 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none font-bold"
                  required
                >
                  <option value="">Choose Model</option>
                  {availableModels.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 block">VARIANT</label>
              <div className="relative">
                <Layers size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
                <select
                  value={carVariant}
                  disabled={!carModel}
                  onChange={(e) => setCarVariant(e.target.value)}
                  className="w-full bg-slate-50 disabled:opacity-50 border border-slate-200 rounded-xl py-2.5 pl-8 pr-1 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none font-bold"
                >
                  <option value="">Variant</option>
                  {availableVariants.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Category & Specific Part */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 block">PART CATEGORY</label>
              <div className="relative">
                <Compass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none font-bold"
                  required
                >
                  <option value="">{t("selectCategory")}</option>
                  {taxonomy.categories.map((cat) => (
                    <option key={cat} value={cat}>{translateDynamic(cat, language)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 block">SPECIFIC SPARE PART</label>
              <div className="relative">
                <Compass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
                <select
                  value={partName}
                  disabled={!category}
                  onChange={(e) => setPartName(e.target.value)}
                  className="w-full bg-slate-50 disabled:opacity-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none font-bold"
                  required
                >
                  <option value="">Select Specific Part</option>
                  {availablePartNames.map((part) => (
                    <option key={part} value={part}>{part}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Condition */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 block">PART CONDITION</label>
            <div className="grid grid-cols-2 gap-2">
              {(["Brand New", "Like New", "Used (Good)", "For Scrap/Spares"] as const).map((opt) => (
                <button
                  type="button"
                  key={opt}
                  onClick={() => setCondition(opt)}
                  className={`py-2 px-1 rounded-xl border flex flex-row items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    condition === opt
                      ? "bg-indigo-50 border-indigo-500 text-indigo-600 font-extrabold"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {condition === opt && <Check size={11} className="text-indigo-600 shrink-0" />}
                  <span className={`text-[11px] font-bold ${condition === opt ? "text-indigo-600 font-extrabold" : "text-slate-500"}`}>
                    {opt}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Price & State & District */}
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 block">PRICE (₹ INR)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-700 text-xs font-black font-mono z-10 pointer-events-none">₹</span>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 4500"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-8 pr-4 text-xs font-bold text-slate-700 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">LOCATION DETAILS</label>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={isDetectingLocation}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-[10px] font-bold cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                id="edit-btn-use-current-location"
              >
                {isDetectingLocation ? (
                  <Loader2 size={11} className="animate-spin text-indigo-700" />
                ) : (
                  <Navigation size={11} className="fill-indigo-700 text-indigo-700" />
                )}
                <span>{isDetectingLocation ? "Detecting GPS..." : "Use Current Location"}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 block">STATE</label>
                <div className="relative">
                  <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
                  <select
                    value={selectedState}
                    onChange={(e) => {
                      setSelectedState(e.target.value);
                      setSelectedDistrict("");
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none font-bold"
                    required
                  >
                    <option value="">Choose State</option>
                    {INDIAN_STATES_AND_DISTRICTS.map((s) => (
                      <option key={s.state} value={s.state}>{s.state}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 block">DISTRICT / CITY</label>
                <div className="relative">
                  <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
                  <select
                    value={selectedDistrict}
                    disabled={!selectedState}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="w-full bg-slate-50 disabled:opacity-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none font-bold"
                    required
                  >
                    <option value="">Choose District</option>
                    {availableDistricts.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Map Picker Trigger Button */}
            <div className="pt-1.5">
              <button
                type="button"
                onClick={() => setShowMapModal(true)}
                className={`w-full flex flex-row items-center justify-center gap-2 py-2 px-4 rounded-2xl text-xs font-extrabold border transition-all cursor-pointer ${
                  typeof lat === "number" && typeof lng === "number"
                    ? "bg-indigo-50 border-indigo-200 text-indigo-600 font-extrabold"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
                id="edit-map-picker-trigger"
              >
                <Compass size={14} className={typeof lat === "number" && typeof lng === "number" ? "text-indigo-600" : "text-slate-400"} />
                <span>
                  {typeof lat === "number" && typeof lng === "number"
                    ? `📍 Pin Placed (${lat.toFixed(4)}, ${lng.toFixed(4)})`
                    : "Select Shop Location on Map (Optional Pin)"}
                </span>
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 block">AD DESCRIPTION</label>
            <div className="relative">
              <FileText size={15} className="absolute left-3 top-3 text-slate-400 z-10 pointer-events-none" />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Specify details..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-4 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Contact Details Card */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-4">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Seller Contact Info
            </span>

            <div className="grid grid-cols-1 gap-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 block">NAME</label>
                <div className="relative">
                  <UserIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Seller contact name"
                    className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-9 pr-4 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-teal-50 border border-teal-200/80 rounded-xl flex items-center gap-2">
                <ShieldCheck size={16} className="text-teal-600 shrink-0" />
                <span className="text-[10px] font-bold text-teal-900">
                  Seller Contact Info Hidden for Privacy (In-App Chat Only)
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-row gap-2.5 pt-2 shrink-0">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSaving || isUploading || isDeleting}
              className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-extrabold px-3 py-3 rounded-2xl text-xs uppercase tracking-wider transition-colors cursor-pointer flex flex-row items-center gap-1.5 shrink-0 disabled:opacity-50"
              title="Delete Listing"
            >
              <Trash2 size={15} />
              <span className="hidden sm:inline">{isDeleting ? "Deleting..." : "Delete Ad"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving || isDeleting}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-2xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isSaving || isUploading || isDeleting}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 rounded-2xl text-xs uppercase tracking-wider shadow-md transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

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
