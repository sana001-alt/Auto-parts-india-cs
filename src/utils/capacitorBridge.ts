import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { Network } from '@capacitor/network';

export async function initCapacitorBridge() {
  if (!Capacitor.isNativePlatform()) {
    console.log('[CapacitorBridge] Running in web browser environment.');
    return;
  }

  console.log('[CapacitorBridge] Native mobile container detected. Initializing plugins...');

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0F172A' });
  } catch (err) {
    console.warn('[CapacitorBridge] StatusBar init error:', err);
  }

  try {
    await Keyboard.setAccessoryBarVisible({ isVisible: false });
  } catch (err) {
    console.warn('[CapacitorBridge] Keyboard init error:', err);
  }

  try {
    Network.addListener('networkStatusChange', (status) => {
      console.log('[CapacitorBridge] Network status changed:', status.connected ? 'online' : 'offline');
    });
  } catch (err) {
    console.warn('[CapacitorBridge] Network init error:', err);
  }
}
