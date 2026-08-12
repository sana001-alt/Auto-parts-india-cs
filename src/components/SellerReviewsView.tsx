import React, { useState, useEffect } from "react";
import { Star, X, MessageSquare, Tag, Calendar, User as UserIcon } from "lucide-react";
import { SellerReview, User, SparePart } from "../types";
import { fetchSellerReviews } from "../lib/firebase";
import RatingModal from "./RatingModal";

interface SellerReviewsViewProps {
  key?: string;
  sellerId: string;
  sellerName: string;
  currentUser: User | null;
  onClose: () => void;
  currentPart?: SparePart;
}

export default function SellerReviewsView({
  sellerId,
  sellerName,
  currentUser,
  onClose,
  currentPart
}: SellerReviewsViewProps) {
  const [reviews, setReviews] = useState<SellerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWriteOpen, setIsWriteOpen] = useState(false);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const data = await fetchSellerReviews(sellerId);
      setReviews(data);
    } catch (err) {
      console.error("Failed to load seller reviews", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
    
    const handleReviewsUpdated = () => {
      loadReviews();
    };

    window.addEventListener("autoparts_reviews_updated", handleReviewsUpdated);
    window.addEventListener("storage", handleReviewsUpdated);

    return () => {
      window.removeEventListener("autoparts_reviews_updated", handleReviewsUpdated);
      window.removeEventListener("storage", handleReviewsUpdated);
    };
  }, [sellerId]);

  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0 
    ? parseFloat((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
    : 0;

  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => {
    const star = Math.round(r.rating) as 5 | 4 | 3 | 2 | 1;
    if (breakdown[star] !== undefined) {
      breakdown[star]++;
    }
  });

  const getPercentage = (count: number) => {
    if (totalReviews === 0) return 0;
    return Math.round((count / totalReviews) * 100);
  };

  const isSellerSelf = currentUser ? currentUser.id === sellerId : false;

  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col z-40 animate-in fade-in duration-200" id="seller-reviews-view-root">
      {/* Top Header */}
      <div className="bg-slate-900 text-white py-4 px-4 flex flex-row items-center justify-between shadow-md sticky top-0 z-10">
        <div>
          <span className="text-[8px] font-black tracking-widest text-indigo-400 uppercase block">Seller Profile</span>
          <h2 className="text-sm font-extrabold text-white mt-0.5">{sellerName}'s Ratings</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition-colors cursor-pointer"
          id="close-reviews-view"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 p-4 space-y-4 pb-24 overflow-y-auto max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Loading Reviews...</span>
          </div>
        ) : (
          <>
            {/* Rating Summary Card */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
              <div className="grid grid-cols-5 gap-4 items-center">
                <div className="col-span-2 text-center border-r border-slate-100 pr-2">
                  <span className="text-4xl font-black text-slate-900 font-mono block">
                    {totalReviews > 0 ? averageRating : "N/A"}
                  </span>
                  <div className="flex flex-row items-center justify-center gap-0.5 text-amber-400 mt-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={12}
                        fill={s <= Math.round(averageRating) && totalReviews > 0 ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth={1.5}
                        className="text-amber-400"
                      />
                    ))}
                  </div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1.5 block text-center">
                    {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
                  </span>
                </div>

                {/* Progress bars breakdown */}
                <div className="col-span-3 space-y-1.5 pl-2">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = breakdown[star as 5 | 4 | 3 | 2 | 1] || 0;
                    const percent = getPercentage(count);
                    return (
                      <div key={star} className="flex flex-row items-center gap-2 text-[10px]">
                        <span className="font-bold text-slate-500 w-3 font-mono">{star}</span>
                        <Star size={10} className="text-amber-400 shrink-0 fill-current" />
                        <div className="flex-1 bg-slate-50 rounded-full h-2 overflow-hidden border border-slate-100">
                          <div 
                            className="bg-amber-400 h-full rounded-full transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-400 w-6 text-right font-mono">{percent}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Write a Review Promoted Area */}
            {currentUser && !isSellerSelf && (
              <div className="bg-indigo-50/50 border border-indigo-100/60 rounded-3xl p-4 flex flex-col items-center text-center space-y-2.5">
                <p className="text-[10px] font-bold text-indigo-800 text-center">
                  Had a successful trade or chatted with {sellerName} about auto parts?
                </p>
                <button
                  onClick={() => setIsWriteOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-4 py-2 rounded-xl text-[10px] uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                  id="write-review-trigger-btn"
                >
                  Write a Review
                </button>
              </div>
            )}

            {/* Reviews List */}
            <div className="space-y-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block">
                Buyer Feedbacks & Comments
              </span>

              {reviews.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 border border-slate-100 text-center shadow-sm flex flex-col items-center">
                  <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-3">
                    <MessageSquare size={16} />
                  </div>
                  <h3 className="text-xs font-bold text-slate-700">No Reviews Yet</h3>
                  <p className="text-[10px] text-slate-400 mt-1 text-center">
                    Be the first to leave a feedback on {sellerName}'s communication and parts reliability.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((rev) => (
                    <div 
                      key={rev.id}
                      className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm text-left space-y-2.5"
                    >
                      <div className="flex flex-row justify-between items-start">
                        <div className="flex flex-row items-center gap-2">
                          <div className="w-7 h-7 bg-indigo-50 text-indigo-500 rounded-lg flex items-center justify-center font-bold text-[10px] uppercase">
                            <span>{rev.buyerName.substring(0, 2)}</span>
                          </div>
                          <div>
                            <span className="text-[11px] font-bold text-slate-800 block">{rev.buyerName}</span>
                            <span className="text-[8px] text-slate-400 font-bold font-mono block">
                              BUYER · {new Date(rev.createdAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric"
                              })}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex flex-row items-center gap-0.5 text-amber-400">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star 
                              key={s} 
                              size={10} 
                              fill={s <= rev.rating ? "currentColor" : "none"} 
                              stroke="currentColor" 
                              strokeWidth={1.5}
                              className="text-amber-400"
                            />
                          ))}
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                        "{rev.comment}"
                      </p>

                      {rev.partTitle && (
                        <div className="inline-flex flex-row items-center gap-1 text-[9px] text-indigo-600 bg-indigo-50/40 px-2 py-1 rounded-lg border border-indigo-100/30">
                          <Tag size={10} className="text-indigo-600" />
                          <span className="font-bold text-indigo-600 text-[9px]">Bought: {rev.partTitle}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Interactive Rating Modal Overlay */}
      {currentUser && (
        <RatingModal
          isOpen={isWriteOpen}
          onClose={() => setIsWriteOpen(false)}
          sellerId={sellerId}
          sellerName={sellerName}
          buyerId={currentUser.id}
          buyerName={currentUser.name}
          partId={currentPart?.id}
          partTitle={currentPart?.title}
          onSuccess={loadReviews}
        />
      )}
    </div>
  );
}
