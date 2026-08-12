import React from "react";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  variant?: "full" | "icon" | "horizontal";
  theme?: "light" | "dark";
  showTagline?: boolean;
  className?: string;
}

export default function BrandLogo({
  size = "md",
  variant = "full",
  theme = "dark",
  showTagline = true,
  className = ""
}: BrandLogoProps) {
  const iconSizes = {
    sm: "w-7 h-7 max-w-[28px] max-h-[28px]",
    md: "w-9 h-9 max-w-[36px] max-h-[36px]",
    lg: "w-10 h-10 max-w-[40px] max-h-[40px]",
    xl: "w-12 h-12 max-w-[48px] max-h-[48px]",
    "2xl": "w-14 h-14 max-w-[56px] max-h-[56px]"
  };

  const textSizes = {
    sm: "text-xs font-bold",
    md: "text-sm font-extrabold",
    lg: "text-base font-black",
    xl: "text-lg font-black",
    "2xl": "text-xl font-black"
  };

  const pixelDimensions: Record<string, { width: number; height: number }> = {
    sm: { width: 28, height: 28 },
    md: { width: 36, height: 36 },
    lg: { width: 40, height: 40 },
    xl: { width: 48, height: 48 },
    "2xl": { width: 56, height: 56 }
  };

  const currentDim = pixelDimensions[size] || pixelDimensions.md;

  return (
    <div className={`inline-flex flex-row items-center gap-2 select-none shrink-0 max-h-[40px] ${className}`}>
      {/* Brand Emblem Logo Vector SVG */}
      <div
        className={`${iconSizes[size]} relative flex items-center justify-center shrink-0 max-h-[40px]`}
        style={{ width: currentDim.width, height: currentDim.height, maxHeight: 40 }}
      >
        <svg 
          viewBox="0 0 1024 1024" 
          fill="none" 
          style={{ width: currentDim.width, height: currentDim.height, maxWidth: 40, maxHeight: 40 }}
          className="shrink-0 block w-full h-full max-h-[40px] max-w-[40px]"
        >
          {/* Background Rounded Shield for Icon Clarity */}
          <rect width="1024" height="1024" rx="224" fill={theme === "light" ? "#0B1220" : "#0B1220"} />
          
          <g transform="translate(0, -10)">
            {/* Primary Outer Apex Chevron - Primary Blue #1565FF */}
            <path d="M 512 180 L 800 564 L 700 564 L 512 312 L 324 564 L 224 564 Z" fill="#1565FF" />

            {/* Secondary Inner Dynamic Chevron - Pure White #FFFFFF */}
            <path d="M 512 340 L 712 612 L 620 612 L 512 464 L 404 612 L 312 612 Z" fill="#FFFFFF" />

            {/* Core Apex Notch - Primary Blue #1565FF */}
            <path d="M 512 492 L 624 652 L 548 652 L 512 600 L 476 652 L 400 652 Z" fill="#1565FF" />

            {/* Precision Anchor Diamond - Pure White #FFFFFF */}
            <path d="M 512 680 L 560 744 L 512 808 L 464 744 Z" fill="#FFFFFF" />
          </g>
        </svg>
      </div>

      {/* Brand Name & Tagline */}
      {variant !== "icon" && (
        <div className="flex flex-col justify-center shrink-0">
          <div className={`tracking-tight flex flex-row items-center ${textSizes[size]}`}>
            <span className={theme === "dark" ? "text-white font-black uppercase tracking-tight flex items-center gap-1" : "text-[#0B1220] font-black uppercase tracking-tight flex items-center gap-1"}>
              <span>AUTO PARTS</span>
              <span className="text-blue-500">INDIA</span>
            </span>
          </div>

          {showTagline && (
            <span
              className={`text-[9px] font-semibold tracking-wider uppercase ${
                theme === "dark" ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Automotive Marketplace
            </span>
          )}
        </div>
      )}
    </div>
  );
}

