import React, { useState } from "react";
import { 
  ArrowLeft, 
  Bell, 
  BellOff, 
  CheckCheck, 
  Megaphone, 
  RefreshCw, 
  Sparkles, 
  Clock, 
  Check, 
  ShieldCheck, 
  AlertCircle 
} from "lucide-react";
import { Announcement, User } from "../types";
import { markAnnouncementAsRead, markAllAnnouncementsAsRead } from "../lib/firebase";

interface NotificationsScreenProps {
  announcements: Announcement[];
  isLoading?: boolean;
  currentUser: User | null;
  onBack: () => void;
}

export default function NotificationsScreen({
  announcements,
  isLoading = false,
  currentUser,
  onBack
}: NotificationsScreenProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const unreadList = announcements.filter((a) => !a.isRead);
  const unreadCount = unreadList.length;

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const handleMarkAsRead = async (annId: string) => {
    await markAnnouncementAsRead(currentUser?.id || null, annId);
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = unreadList.map((a) => a.id);
    if (unreadIds.length > 0) {
      await markAllAnnouncementsAsRead(currentUser?.id || null, unreadIds);
    }
  };

  const formatRelativeTime = (timestamp: number) => {
    if (!timestamp) return "Recently";
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return new Date(timestamp).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const formatFullDate = (timestamp: number) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 text-slate-900 min-h-screen relative" id="notifications-screen">
      {/* Sticky Top Bar / App Bar */}
      <div className="bg-[#0F172A] text-white sticky top-0 z-30 shadow-md border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-3 flex flex-row items-center justify-between gap-3">
          <div className="flex flex-row items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 -ml-1 rounded-full text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
              id="notifications-back-btn"
            >
              <ArrowLeft size={20} className="text-slate-200" />
            </button>
            <div className="flex flex-row items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                <Bell size={18} className="text-blue-400" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white leading-tight">Notifications</h1>
                <p className="text-[11px] text-slate-400">System broadcasts & announcements</p>
              </div>
            </div>
          </div>

          <div className="flex flex-row items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex flex-row items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-full shadow-xs transition-colors cursor-pointer"
                id="mark-all-read-btn"
              >
                <CheckCheck size={14} className="text-white" />
                <span className="text-xs font-semibold text-white">Mark all read</span>
              </button>
            )}

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-full text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
              id="notifications-refresh-btn"
            >
              <RefreshCw size={18} className={isRefreshing ? "text-blue-400 animate-spin" : "text-slate-300"} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-4 py-4 space-y-3 pb-24 overflow-y-auto">
        {/* Unread Status Banner */}
        {unreadCount > 0 && (
          <div className="bg-blue-50 border border-blue-200/80 rounded-2xl p-3.5 flex flex-row items-center justify-between text-blue-900 shadow-xs mb-3">
            <div className="flex flex-row items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
              <span className="text-xs font-semibold text-blue-900">
                You have {unreadCount} unread {unreadCount === 1 ? "notification" : "notifications"}
              </span>
            </div>
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-100/80 px-2 py-0.5 rounded-md">
              Real-time
            </span>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading ? (
          <div className="space-y-3 py-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs space-y-3">
                <div className="flex flex-row items-center justify-between">
                  <div className="h-4 bg-slate-200 rounded-md w-1/3 animate-pulse" />
                  <div className="h-3 bg-slate-100 rounded-md w-16 animate-pulse" />
                </div>
                <div className="h-3 bg-slate-100 rounded-md w-3/4 animate-pulse" />
                <div className="h-3 bg-slate-100 rounded-md w-1/2 animate-pulse" />
              </div>
            ))}
          </div>
        ) : announcements.length === 0 ? (
          /* Empty State */
          <div
            className="bg-white rounded-2xl border border-slate-100 shadow-2xs p-8 text-center flex flex-col items-center justify-center my-8 space-y-3"
            id="notifications-empty-state"
          >
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
              <BellOff size={28} className="text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Notifications Yet</h3>
            <p className="text-xs text-slate-500 text-center max-w-sm">
              When Super Admin sends system broadcasts or news announcements, they will appear here automatically in real time.
            </p>
          </div>
        ) : (
          /* Notifications List */
          <div className="space-y-3">
            {announcements.map((ann) => {
              const isUnread = !ann.isRead;
              return (
                <div
                  key={ann.id}
                  onClick={() => isUnread && handleMarkAsRead(ann.id)}
                  className={`rounded-2xl p-4 border transition-all cursor-pointer ${
                    isUnread
                      ? "bg-blue-50/70 border-blue-200/90 shadow-2xs hover:bg-blue-50"
                      : "bg-white border-slate-200/80 hover:border-slate-300"
                  }`}
                  id={`notification-card-${ann.id}`}
                >
                  <div className="flex flex-row items-start gap-3">
                    {/* Left Icon Badge */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isUnread
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <Megaphone size={18} className={isUnread ? "text-white" : "text-slate-500"} />
                    </div>

                    {/* Main Text Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-row items-start justify-between gap-2">
                        <div className="flex flex-row items-center gap-2 flex-1">
                          <h4 className={`text-xs font-bold ${isUnread ? "text-slate-900" : "text-slate-700"}`}>
                            {ann.title}
                          </h4>
                          {isUnread && (
                            <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                              NEW
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-medium text-slate-400 shrink-0">
                          {formatRelativeTime(ann.createdAt)}
                        </span>
                      </div>

                      <p className={`text-xs mt-1.5 leading-relaxed ${isUnread ? "text-slate-800 font-medium" : "text-slate-600"}`}>
                        {ann.text}
                      </p>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-row items-center justify-between text-[11px]">
                        <div className="flex flex-row items-center gap-1.5 text-slate-400">
                          <ShieldCheck size={12} className="text-blue-500" />
                          <span className="text-[11px] text-slate-400">System Administrator</span>
                        </div>

                        {isUnread ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(ann.id);
                            }}
                            className="flex flex-row items-center gap-1 text-blue-600 hover:text-blue-700 font-bold text-[11px] cursor-pointer"
                          >
                            <Check size={12} />
                            <span>Mark as read</span>
                          </button>
                        ) : (
                          <div className="flex flex-row items-center gap-1">
                            <CheckCheck size={12} className="text-emerald-500" />
                            <span className="text-slate-400 text-[11px]">Read</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
