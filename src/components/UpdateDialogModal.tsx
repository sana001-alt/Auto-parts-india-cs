import React from "react";
import { Download, Sparkles, ShieldAlert, ArrowUpRight, Calendar, CheckCircle2, X } from "lucide-react";
import { AppVersionConfig } from "../types";
import { CURRENT_APP_VERSION } from "../utils/versionUtils";

interface UpdateDialogModalProps {
  versionConfig: AppVersionConfig;
  isForceUpdate: boolean;
  onClose?: () => void;
}

export const UpdateDialogModal: React.FC<UpdateDialogModalProps> = ({
  versionConfig,
  isForceUpdate,
  onClose,
}) => {
  const handleUpdateNow = () => {
    if (versionConfig.apkDownloadUrl) {
      window.open(versionConfig.apkDownloadUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className={`p-6 text-white relative ${isForceUpdate ? "bg-gradient-to-r from-red-600 to-rose-700" : "bg-gradient-to-r from-indigo-600 to-blue-700"}`}>
          {!isForceUpdate && onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          )}

          <div className="flex flex-row items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0 shadow-inner">
              {isForceUpdate ? (
                <ShieldAlert className="w-6 h-6 text-amber-300" />
              ) : (
                <Sparkles className="w-6 h-6 text-amber-300" />
              )}
            </div>
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-white/20 text-white mb-1">
                {isForceUpdate ? "Critical Update Required" : "New Version Available"}
              </span>
              <h2 className="text-xl font-black tracking-tight leading-snug text-white">
                Auto Parts India v{versionConfig.latestVersion}
              </h2>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Version Comparison Card */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Current Version</span>
              <span className="text-sm font-extrabold text-slate-700 font-mono block">v{CURRENT_APP_VERSION}</span>
            </div>
            <div className="space-y-0.5 border-l border-slate-200 pl-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 block">Latest Version</span>
              <div className="flex flex-row items-center gap-1">
                <span className="text-sm font-extrabold text-indigo-700 font-mono">
                  v{versionConfig.latestVersion}
                </span>
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
              </div>
            </div>
          </div>

          {/* Release Date */}
          {versionConfig.releaseDate && (
            <div className="flex flex-row items-center gap-1.5 text-xs text-slate-500 font-medium px-1">
              <Calendar size={14} className="text-slate-400" />
              <span className="text-xs text-slate-500 font-medium">Release Date: {versionConfig.releaseDate}</span>
            </div>
          )}

          {/* Release Notes */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">What's New</span>
            <div className="p-4 bg-indigo-50/50 border border-indigo-100/60 rounded-2xl max-h-48 overflow-y-auto text-xs text-slate-600 leading-relaxed font-sans">
              {versionConfig.releaseNotes || "Performance enhancements, security updates, and bug fixes."}
            </div>
          </div>

          {isForceUpdate && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-2xl flex flex-row items-start gap-2.5 text-xs text-red-700">
              <ShieldAlert size={16} className="shrink-0 text-red-500 mt-0.5" />
              <p className="font-medium text-xs text-red-700">
                This update is required to continue using the application securely. Please update now.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={handleUpdateNow}
              className="flex-1 py-3.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-2xl text-xs shadow-lg shadow-indigo-200 flex flex-row items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Download size={16} />
              <span>Update Now</span>
              <ArrowUpRight size={14} className="opacity-70 text-white" />
            </button>

            {!isForceUpdate && onClose && (
              <button
                onClick={onClose}
                className="py-3.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-all flex items-center justify-center cursor-pointer"
              >
                <span>Later</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
