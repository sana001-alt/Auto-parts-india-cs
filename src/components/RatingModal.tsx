import React, { useState } from "react";
import { Star, X, CheckCircle2 } from "lucide-react";
import { createSellerReview } from "../lib/firebase";

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  buyerName: string;
  partId?: string;
  partTitle?: string;
  onSuccess?: () => void;
}

export default function RatingModal({
  isOpen,
  onClose,
  sellerId,
  sellerName,
  buyerId,
  buyerName,
  partId,
  partTitle,
  onSuccess
}: RatingModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (rating < 1 || rating > 5) {
      setError("Please select a rating between 1 and 5 stars.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createSellerReview({
        sellerId,
        buyerId,
        buyerName,
        rating,
        comment: comment.trim() || "Excellent and prompt transaction!",
        partId,
        partTitle
      });

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setComment("");
        setRating(5);
        if (onSuccess) onSuccess();
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Failed to submit seller review:", err);
      setError("Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div 
        className="bg-white rounded-[28px] w-full max-w-sm overflow-hidden shadow-2xl relative text-slate-900 border border-slate-100 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex flex-row items-center justify-between">
          <div>
            <span className="text-[9px] font-black tracking-widest text-indigo-400 uppercase block">Rate Transaction</span>
            <span className="text-sm font-extrabold text-white mt-0.5 block">Review for {sellerName}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
            id="close-rating-modal"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center text-center py-6 space-y-3">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center border border-emerald-100">
                <CheckCircle2 size={24} className="text-emerald-500" />
              </div>
              <span className="text-xs font-black text-emerald-800 uppercase tracking-wider block">Review Submitted!</span>
              <p className="text-[11px] text-slate-500 max-w-[240px] leading-relaxed">
                Thank you! Your 1-5 star feedback helps keep our car parts community safe and trustworthy.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {error && (
                <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl">
                  <span className="text-rose-600 text-[10px] font-bold block">{error}</span>
                </div>
              )}

              {partTitle && (
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-left">
                  <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider block">SPARE PART BOUGHT</span>
                  <span className="text-[10px] font-bold text-slate-700 block truncate mt-0.5">{partTitle}</span>
                </div>
              )}

              {/* Stars Indicator */}
              <div className="space-y-1.5 items-center">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block text-center">
                  HOW WOULD YOU RATE THE SELLER?
                </span>
                <div className="flex flex-row items-center justify-center gap-2 pt-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isActive = hoverRating !== null ? star <= hoverRating : star <= rating;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(null)}
                        className="p-1 text-amber-400 cursor-pointer hover:scale-110 transition-transform"
                        id={`star-btn-${star}`}
                      >
                        <Star
                          size={28}
                          fill={isActive ? "currentColor" : "none"}
                          stroke="currentColor"
                          strokeWidth={isActive ? 1.5 : 2}
                        />
                      </button>
                    );
                  })}
                </div>
                <span className="text-[10px] font-bold text-amber-600 tracking-wider text-center mt-1 font-mono block">
                  {rating === 5 && "⭐ Outstanding Service!"}
                  {rating === 4 && "⭐ Good Experience!"}
                  {rating === 3 && "⭐ Average Trade"}
                  {rating === 2 && "⭐ Below Average"}
                  {rating === 1 && "⭐ Disappointing Trade"}
                </span>
              </div>

              {/* Comment Textarea */}
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                  SHARE YOUR EXPERIENCE (OPTIONAL)
                </span>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Enter a brief comment on payment, pickup, part condition, or coordination..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 font-medium leading-relaxed h-20 resize-none focus:outline-none focus:border-indigo-500"
                  maxLength={150}
                />
                <span className="text-right text-[8px] text-slate-400 font-mono block">
                  {comment.length}/150 characters
                </span>
              </div>

              {/* Actions */}
              <div className="flex flex-row gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={isSubmitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md transition-all cursor-pointer"
                  id="submit-review-btn"
                >
                  {isSubmitting ? "Submitting..." : "Submit Review"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
