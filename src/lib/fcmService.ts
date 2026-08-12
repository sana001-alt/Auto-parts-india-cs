import { PushNotifications, Token, PushNotificationSchema, ActionPerformed, PermissionStatus } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, useFirebase, saveFCMNotificationToFirestore, registerFCMToken, setupFCMForegroundListener } from './firebase';

export interface FCMNotificationData {
  chatId?: string;
  partId?: string;
  senderId?: string;
  screen?: string;
  type?: string;
  partTitle?: string;
  partPrice?: number;
  partImageUrl?: string;
  buyerId?: string;
  buyerName?: string;
  sellerId?: string;
  sellerName?: string;
  [key: string]: any;
}

export type FCMNavigationHandler = (data: FCMNotificationData) => void;
export type FCMInAppBannerHandler = (title: string, body: string, data: FCMNotificationData) => void;

let isCapacitorPushInitialized = false;

/**
 * Request Push Notification Permission from the user.
 * Works across Capacitor Mobile (Android/iOS) and Web environments.
 */
export async function requestFCMNotificationPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      let permStatus: PermissionStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
        permStatus = await PushNotifications.requestPermissions();
      }
      return permStatus.receive === 'granted';
    } catch (err) {
      console.warn('[FCM Service] Error requesting Capacitor push permissions:', err);
      return false;
    }
  } else {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') return true;
      if (Notification.permission === 'default') {
        const result = await Notification.requestPermission().catch(() => 'denied');
        return result === 'granted';
      }
    }
    return false;
  }
}

/**
 * Saves FCM Token to Firestore user document users/{userId}.
 */
export async function saveFCMTokenToFirestore(userId: string, token: string): Promise<void> {
  if (!userId || !token) return;

  const cacheKey = `autoparts_fcm_token_${userId}`;
  localStorage.setItem(cacheKey, token);

  if (useFirebase && db) {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(
        userRef,
        {
          fcmToken: token,
          tokenUpdatedAt: serverTimestamp(),
          updatedAt: Date.now()
        },
        { merge: true }
      );
      console.log(`[FCM Service] Saved FCM Token successfully to Firestore user doc users/${userId}`);
    } catch (err) {
      console.warn('[FCM Service] Failed to save token to Firestore:', err);
    }
  }
}

/**
 * Initialize FCM Push Notification Listeners for native mobile (Capacitor) or Web fallback.
 */
export async function initFCMService(
  userId: string,
  onNavigate?: FCMNavigationHandler,
  onInAppBanner?: FCMInAppBannerHandler
): Promise<() => void> {
  if (!userId) return () => {};

  // Native Mobile Push (Capacitor)
  if (Capacitor.isNativePlatform()) {
    try {
      const granted = await requestFCMNotificationPermission();
      if (granted) {
        await PushNotifications.register();
      } else {
        console.log('[Capacitor FCM] Permission not granted for push notifications.');
      }

      // 1. Token generation event
      const regListener = await PushNotifications.addListener('registration', async (token: Token) => {
        console.log('[Capacitor FCM] Token registered:', token.value);
        if (token.value) {
          await saveFCMTokenToFirestore(userId, token.value);
        }
      });

      // 2. Registration error event
      const errListener = await PushNotifications.addListener('registrationError', (error: any) => {
        console.warn('[Capacitor FCM] Registration error:', error);
      });

      // 3. Foreground notification received event
      const receivedListener = await PushNotifications.addListener(
        'pushNotificationReceived',
        async (notification: PushNotificationSchema) => {
          console.log('[Capacitor FCM] Notification received in foreground:', notification);
          const title = notification.title || 'Auto Parts India Notification';
          const body = notification.body || '';
          const data: FCMNotificationData = notification.data || {};

          // Save notification to Firestore & LocalStorage
          await saveFCMNotificationToFirestore(userId, title, body, data);

          if (onInAppBanner) {
            onInAppBanner(title, body, data);
          } else {
            window.dispatchEvent(
              new CustomEvent('fcm_inapp_notification', {
                detail: { title, body, data }
              })
            );
          }
        }
      );

      // 4. Notification action (click) event
      const actionListener = await PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (action: ActionPerformed) => {
          console.log('[Capacitor FCM] Notification clicked action:', action);
          const data: FCMNotificationData = action.notification.data || {};

          // Save notification record
          saveFCMNotificationToFirestore(
            userId,
            action.notification.title || 'Notification',
            action.notification.body || '',
            data
          );

          // Handle navigation
          if (onNavigate) {
            onNavigate(data);
          } else {
            window.dispatchEvent(
              new CustomEvent('fcm_navigate_screen', {
                detail: data
              })
            );
          }
        }
      );

      return () => {
        try {
          regListener.remove();
          errListener.remove();
          receivedListener.remove();
          actionListener.remove();
        } catch (e) {
          PushNotifications.removeAllListeners();
        }
      };
    } catch (err) {
      console.warn('[Capacitor FCM] Error initializing push notifications:', err);
      return () => {};
    }
  } else {
    // Web Fallback
    try {
      const webToken = await registerFCMToken(userId);
      if (webToken) {
        await saveFCMTokenToFirestore(userId, webToken);
      }

      const unsubWeb = setupFCMForegroundListener((payload) => {
        const title = payload?.notification?.title || payload?.data?.title || 'Auto Parts India Notification';
        const body = payload?.notification?.body || payload?.data?.body || '';
        const data: FCMNotificationData = payload?.data || {};

        saveFCMNotificationToFirestore(userId, title, body, data);

        if (onInAppBanner) {
          onInAppBanner(title, body, data);
        } else {
          window.dispatchEvent(
            new CustomEvent('fcm_inapp_notification', {
              detail: { title, body, data }
            })
          );
        }
      });

      return unsubWeb;
    } catch (err) {
      console.warn('[Web FCM] Error setting up web notifications:', err);
      return () => {};
    }
  }
}
