import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';

export interface PermissionResult {
  granted: boolean;
  deniedPermanently?: boolean;
  message?: string;
}

/**
 * Request camera permission JIT (Just-In-Time) when user explicitly taps "Add Photo" or "Open Camera".
 * Uses @capacitor/camera on native platforms and standard HTML5 file picker on web.
 */
export async function requestCameraPermissionJIT(): Promise<PermissionResult> {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await Camera.checkPermissions();
      if (status.camera === 'granted') {
        return { granted: true };
      }
      const req = await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
      if (req.camera === 'granted' || req.photos === 'granted') {
        return { granted: true };
      }
      return {
        granted: false,
        deniedPermanently: req.camera === 'denied',
        message: 'Camera permission is required to take photos of auto parts.'
      };
    } catch (err: any) {
      console.warn('[Camera JIT Permission Error]:', err);
    }
  }
  // Web platform: permission requested by browser automatically on input file picker trigger
  return { granted: true };
}

/**
 * Request location permission JIT (Just-In-Time) when user explicitly taps "Use Current Location" or "My GPS".
 * Uses @capacitor/geolocation on native platforms and navigator.geolocation on web.
 */
export async function requestLocationPermissionJIT(): Promise<{
  granted: boolean;
  coords?: { lat: number; lng: number };
  message?: string;
  canOpenSettings?: boolean;
}> {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await Geolocation.checkPermissions();
      if (status.location !== 'granted') {
        const req = await Geolocation.requestPermissions();
        if (req.location !== 'granted') {
          return {
            granted: false,
            canOpenSettings: true,
            message: 'Location permission was denied. Please allow location access in your device settings.'
          };
        }
      }
      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
      return {
        granted: true,
        coords: {
          lat: parseFloat(position.coords.latitude.toFixed(6)),
          lng: parseFloat(position.coords.longitude.toFixed(6))
        }
      };
    } catch (err: any) {
      console.warn('[Geolocation Native Error]:', err);
      return {
        granted: false,
        message: 'Could not fetch GPS coordinates from device sensor.'
      };
    }
  }

  // Web browser fallback
  return new Promise((resolve) => {
    // Detect iframe preview limitation
    const isIframe = typeof window !== "undefined" && window.self !== window.top;
    if (isIframe) {
      resolve({
        granted: false,
        message: "Current GPS location is unavailable in Preview iframe. Please test on a real mobile device or select location on the map."
      });
      return;
    }

    if (!navigator.geolocation) {
      resolve({
        granted: false,
        message: "Geolocation is not supported by your browser."
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          granted: true,
          coords: {
            lat: parseFloat(position.coords.latitude.toFixed(6)),
            lng: parseFloat(position.coords.longitude.toFixed(6))
          }
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          resolve({
            granted: false,
            canOpenSettings: true,
            message: "Location permission was denied. Please allow location access in browser/device settings to use GPS pinpointing."
          });
        } else {
          resolve({
            granted: false,
            message: "Could not fetch GPS coordinates. You can still select your state & district manually or drop a pin on the map."
          });
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  });
}

