declare module "react-quick-pinch-zoom" {
  import React from "react";

  export interface UpdateAction {
    x: number;
    y: number;
    scale: number;
  }

  export interface QuickPinchZoomProps {
    onUpdate: (action: UpdateAction) => void;
    draggable?: boolean;
    wheelScaleFactor?: number;
    inertia?: boolean;
    maxZoom?: number;
    minZoom?: number;
    tapZoomFactor?: number;
    zoomOutFactor?: number;
    doubleTapToggleZoom?: boolean;
    doubleTapZoomOutOnMaxScale?: boolean;
    animationDuration?: number;
    onDoubleTap?: () => void;
    doubleTapOptions?: {
      disabled?: boolean;
      zoomOutFactor?: number;
    };
    containerProps?: React.HTMLAttributes<HTMLDivElement>;
    children?: React.ReactNode;
  }

  export function make3dTransformValue(action: UpdateAction): string;

  export default class QuickPinchZoom extends React.Component<QuickPinchZoomProps> {
    alignCenter(options: { scale: number; animated?: boolean; duration?: number; x?: number; y?: number }): void;
    scaleTo(options: { x: number; y: number; scale: number; animated?: boolean; duration?: number }): void;
  }
}

