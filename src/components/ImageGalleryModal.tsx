import React, { useState, useEffect, useRef, useCallback } from "react";
import QuickPinchZoom, { make3dTransformValue } from "react-quick-pinch-zoom";
import { 
  X, 
  ChevronLeft, 
  ChevronRight 
} from "lucide-react";
import { SparePart } from "../types";

interface ImageGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  part: SparePart | null;
  initialIndex?: number;
}

export default function ImageGalleryModal({ isOpen, onClose, part, initialIndex = 0 }: ImageGalleryModalProps) {
  // Build images array safely
  const images: string[] = [];
  if (part) {
    if (part.imageUrls && part.imageUrls.length > 0) {
      part.imageUrls.forEach(url => {
        if (url && !images.includes(url)) {
          images.push(url);
        }
      });
    } else if (part.imageUrl) {
      images.push(part.imageUrl);
    }
  }

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);

  const pinchZoomRef = useRef<any>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const lastTapRef = useRef<number>(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const onUpdate = useCallback(({ x, y, scale: currentScale }: { x: number; y: number; scale: number }) => {
    setScale(currentScale);
    if (imgRef.current) {
      imgRef.current.style.setProperty("transform", make3dTransformValue({ x, y, scale: currentScale }));
    }
  }, []);

  // Sync index when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex < images.length ? initialIndex : 0);
      setScale(1);
      if (pinchZoomRef.current) {
        pinchZoomRef.current.alignCenter({ scale: 1, animated: false });
      }
    }
  }, [isOpen, initialIndex, images.length]);

  // Lock body scroll when gallery modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const resetZoom = () => {
    setScale(1);
    if (pinchZoomRef.current) {
      pinchZoomRef.current.alignCenter({ scale: 1, animated: false });
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(images.length - 1);
    }
    resetZoom();
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
    resetZoom();
  };

  // Explicit Double-Tap / Double-Click Toggle Logic
  const executeDoubleTapZoom = (clientX: number, clientY: number) => {
    if (!pinchZoomRef.current) return;

    if (scale > 1.05) {
      // On double-tap when scale > 1.0: Smoothly animate zoom out back to default 1.0x and reset pan offsets (x: 0, y: 0)
      pinchZoomRef.current.alignCenter({ scale: 1, animated: true, duration: 250 });
      setScale(1);
    } else {
      // On double-tap when scale === 1.0: Smoothly animate zoom in to 2.5x focused on double-tap coordinates
      const rect = imgRef.current?.getBoundingClientRect();
      const x = rect ? clientX - rect.left : clientX;
      const y = rect ? clientY - rect.top : clientY;

      if (typeof pinchZoomRef.current.scaleTo === "function") {
        pinchZoomRef.current.scaleTo({ x, y, scale: 2.5, animated: true, duration: 250 });
      } else if (typeof pinchZoomRef.current.alignCenter === "function") {
        pinchZoomRef.current.alignCenter({ x, y, scale: 2.5, animated: true, duration: 250 });
      }
    }
  };

  const handleDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    let clientX = window.innerWidth / 2;
    let clientY = window.innerHeight / 2;

    if ("touches" in e && e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ("changedTouches" in e && e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else if ("clientX" in e && typeof (e as React.MouseEvent).clientX === "number") {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      executeDoubleTapZoom(clientX, clientY);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Only handle horizontal swipe navigation if image is at normal scale (1.0x)
    if (scale <= 1.05 && touchStartX.current !== null && touchStartY.current !== null && images.length > 1) {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartX.current;
      const deltaY = touchEndY - touchStartY.current;

      if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        if (deltaX > 0) {
          handlePrev();
        } else {
          handleNext();
        }
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  if (!isOpen || !part || images.length === 0) return null;

  return (
    <div 
      className="fixed inset-0 w-vw h-vh w-screen h-screen bg-black z-[9999] overflow-hidden select-none touch-none flex items-center justify-center"
      style={{ touchAction: "none" }}
      onClick={onClose}
    >
      {/* Absolute Fullscreen Image View Area (100vw x 100vh) */}
      <div 
        className="absolute inset-0 w-screen h-screen w-full h-full flex items-center justify-center p-0 m-0 overflow-hidden touch-none bg-black"
        style={{ touchAction: "none" }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <QuickPinchZoom
          ref={pinchZoomRef}
          onUpdate={onUpdate}
          draggable={true}
          wheelScaleFactor={0.05}
          inertia={true}
          maxZoom={5}
          minZoom={1}
          doubleTapToggleZoom={true}
          tapZoomFactor={1.5}
          animationDuration={250}
          containerProps={{ 
            style: { 
              width: "100vw", 
              height: "100vh", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              overflow: "hidden", 
              background: "#000",
              touchAction: "none"
            } 
          }}
        >
          <img
            ref={imgRef}
            src={images[currentIndex]}
            alt={part.title}
            onClick={handleDoubleTap}
            className="w-full h-full max-w-none max-h-none object-contain select-none block"
            style={{ 
              width: "100%", 
              height: "100%", 
              objectFit: "contain",
              willChange: "transform",
              transformOrigin: "0 0",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden"
            }}
            draggable={false}
          />
        </QuickPinchZoom>

        {/* Floating Side Navigation Arrows */}
        {images.length > 1 && scale <= 1.05 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="absolute left-3 sm:left-6 p-3 bg-black/60 hover:bg-indigo-600 rounded-full text-white border border-white/20 z-40 shadow-2xl transition-all cursor-pointer"
              title="Previous Image"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-3 sm:right-6 p-3 bg-black/60 hover:bg-indigo-600 rounded-full text-white border border-white/20 z-40 shadow-2xl transition-all cursor-pointer"
              title="Next Image"
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}
      </div>

      {/* Top Bar Overlay: Title, Counter & Close (X) */}
      <div 
        className="absolute top-0 inset-x-0 w-full px-4 py-3 bg-gradient-to-b from-black/95 via-black/60 to-transparent flex items-center justify-between z-50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title & Counter */}
        <div className="flex items-center gap-3 min-w-0 pr-2">
          <span className="bg-white/15 border border-white/15 text-white font-mono text-xs font-bold px-3 py-1 rounded-full shadow-md backdrop-blur-md">
            {currentIndex + 1} / {images.length}
          </span>
          <h3 className="text-sm font-bold text-slate-100 truncate max-w-[200px] sm:max-w-md hidden sm:block">
            {part.title}
          </h3>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-2 bg-black/60 hover:bg-rose-600 border border-white/25 rounded-full text-white shadow-xl transition-all cursor-pointer ml-1"
          id="gallery-close-btn"
          title="Close Preview"
        >
          <X size={20} />
        </button>
      </div>

      {/* Bottom Overlay Thumbnail Strip (if multiple images) */}
      {images.length > 1 && (
        <div 
          className="absolute bottom-0 inset-x-0 w-full pb-6 pt-3 px-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex items-center justify-center gap-2 overflow-x-auto z-50"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((url, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentIndex(idx);
                resetZoom();
              }}
              className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                idx === currentIndex
                  ? "border-indigo-500 scale-105 shadow-lg shadow-indigo-500/40"
                  : "border-white/20 opacity-50 hover:opacity-100"
              }`}
            >
              <img 
                src={url} 
                alt={`Thumb ${idx + 1}`} 
                className="w-full h-full object-contain bg-black/60 p-0.5" 
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=300&auto=format&fit=crop&q=60";
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


