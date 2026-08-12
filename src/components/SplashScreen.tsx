import React, { useEffect } from "react";
import { motion } from "motion/react";
import { SplashScreen as CapacitorSplashScreen } from "@capacitor/splash-screen";

interface SplashScreenProps {
  onFinish?: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  useEffect(() => {
    // Hide native Capacitor splash screen if running in Capacitor native Android/iOS
    const hideNativeSplash = async () => {
      try {
        await CapacitorSplashScreen.hide();
      } catch {
        // Safe fallback if not in native Capacitor container
      }
    };
    hideNativeSplash();

    // Auto dismiss after 2.2 seconds
    const timer = setTimeout(() => {
      if (onFinish) {
        onFinish();
      }
    }, 2200);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <motion.div
      key="splash-screen"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white select-none p-6 overflow-hidden"
    >
      {/* Premium dark navy background with subtle ambient radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Brand Hero Section - Clean & Minimal */}
      <div className="flex flex-col items-center text-center z-10 space-y-6">
        {/* Official Auto Parts India App Logo Emblem */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative"
        >
          {/* Subtle Outer Glow */}
          <div className="absolute -inset-3 rounded-3xl bg-blue-600/20 blur-xl animate-pulse pointer-events-none" />

          <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center shrink-0">
            <img 
              src="/assets/icon.png" 
              alt="Auto Parts India" 
              className="w-full h-full object-contain rounded-2xl drop-shadow-[0_12px_30px_rgba(21,101,255,0.45)]"
            />
          </div>
        </motion.div>

        {/* Brand Name ONLY */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
          className="flex items-center justify-center gap-1.5"
        >
          <span className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
            AUTO PARTS
          </span>
          <span className="text-2xl sm:text-3xl font-black text-blue-500 tracking-tight uppercase">
            INDIA
          </span>
        </motion.div>

        {/* Minimal Loader Ring (No Text) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="pt-2"
        >
          <div className="w-6 h-6 rounded-full border-2 border-slate-800 border-t-[#1565FF] animate-spin" />
        </motion.div>
      </div>
    </motion.div>
  );
}
