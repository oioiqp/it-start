/**
 * Lightweight VK Bridge Adapter & Launch Parameters Parser
 *
 * Implements official VK Mini App bridge protocol:
 * - Detects execution inside VK iframe / mobile app via URL query params & window.vkBridge
 * - Parses vk_* launch parameters (vk_user_id, vk_app_id, vk_platform, vk_language)
 * - Safely calls VKWebAppInit, VKWebAppGetUserInfo, and Taptic feedback
 * - Graceful fallback in standard browser and test environments
 */

export interface VkLaunchParams {
  vk_user_id?: number;
  vk_app_id?: number;
  vk_is_app_user?: number;
  vk_are_notifications_enabled?: number;
  vk_language?: string;
  vk_ref?: string;
  vk_access_token_settings?: string;
  vk_group_id?: number;
  vk_viewer_group_role?: string;
  vk_platform?:
    | 'mobile_web'
    | 'desktop_web'
    | 'mobile_android'
    | 'mobile_iphone'
    | 'mobile_ipad'
    | 'android'
    | 'iphone'
    | string;
  vk_is_favorite?: number;
  vk_ts?: number;
  sign?: string;
  [key: string]: string | number | undefined;
}

export interface VkUser {
  id: number;
  first_name?: string;
  last_name?: string;
  sex?: number;
  city?: { id: number; title: string };
  country?: { id: number; title: string };
  photo_100?: string;
  photo_200?: string;
  timezone?: number;
}

declare global {
  interface Window {
    vkBridge?: {
      send: (method: string, params?: Record<string, any>) => Promise<any>;
      subscribe: (fn: (event: { detail: { type: string; data: any } }) => void) => void;
      unsubscribe: (fn: (event: { detail: { type: string; data: any } }) => void) => void;
      isWebView?: () => boolean;
      supports?: (method: string) => boolean;
    };
  }
}

/**
 * Parse vk_* launch parameters from a query string or current window.location.search
 */
export function parseVkLaunchParams(searchString?: string): VkLaunchParams {
  const search =
    searchString !== undefined
      ? searchString
      : typeof window !== 'undefined'
      ? window.location.search
      : '';

  if (!search) return {};

  const clean = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(clean);
  const result: VkLaunchParams = {};

  params.forEach((value, key) => {
    if (key.startsWith('vk_') || key === 'sign') {
      const num = Number(value);
      (result as any)[key] = !isNaN(num) && value.trim() !== '' && !key.includes('language') && !key.includes('platform') && !key.includes('role')
        ? num
        : value;
    }
  });

  return result;
}

/**
 * Detect if the application is currently running inside VK Mini App
 */
export function isVkMiniApp(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Check window.vkBridge existence
  if (window.vkBridge && typeof window.vkBridge.send === 'function') {
    return true;
  }

  // 2. Check vk_user_id in query params
  const launchParams = parseVkLaunchParams();
  if (launchParams.vk_user_id || launchParams.vk_app_id) {
    return true;
  }

  return false;
}

/**
 * Get active VK Launch Parameters
 */
export function getVkLaunchParams(): VkLaunchParams {
  return parseVkLaunchParams();
}

/**
 * Initialize VK Bridge connection
 */
export async function initVkBridge(): Promise<{
  success: boolean;
  user: VkUser | null;
  launchParams: VkLaunchParams;
}> {
  const launchParams = getVkLaunchParams();
  let user: VkUser | null = null;

  if (typeof window === 'undefined') {
    return { success: false, user: null, launchParams };
  }

  // 1. If vk_user_id is present in launch params, initialize minimal user
  if (launchParams.vk_user_id) {
    user = {
      id: launchParams.vk_user_id,
      first_name: 'Пользователь VK',
    };
  }

  // 2. Call VKWebAppInit if bridge is available
  if (window.vkBridge && typeof window.vkBridge.send === 'function') {
    try {
      await window.vkBridge.send('VKWebAppInit');

      try {
        const userInfo = await window.vkBridge.send('VKWebAppGetUserInfo');
        if (userInfo && userInfo.id) {
          user = userInfo;
        }
      } catch {
        // User info may require permissions; fallback to launchParams
      }

      return { success: true, user, launchParams };
    } catch (e) {
      console.warn('[VK Bridge] Ошибка вызова VKWebAppInit:', e);
    }
  }

  return { success: isVkMiniApp(), user, launchParams };
}

/**
 * Trigger haptic/taptic feedback in VK Mini App
 */
export function triggerVkHaptic(type: 'impact' | 'notification' | 'selection' = 'impact') {
  if (typeof window === 'undefined' || !window.vkBridge) return;

  try {
    if (type === 'notification') {
      window.vkBridge.send('VKWebAppTapticNotificationOccurred', { result_type: 'success' }).catch(() => {});
    } else if (type === 'selection') {
      window.vkBridge.send('VKWebAppTapticSelectionChanged', {}).catch(() => {});
    } else {
      window.vkBridge.send('VKWebAppTapticImpactOccurred', { style: 'light' }).catch(() => {});
    }
  } catch {
    // Ignore haptic errors on unsupported platforms
  }
}
