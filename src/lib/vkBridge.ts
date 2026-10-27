import officialVkBridge from '@vkontakte/vk-bridge';

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
  let search =
    searchString !== undefined
      ? searchString
      : typeof window !== 'undefined'
      ? window.location.search
      : '';

  // If search query is empty, check hash query (for SPA / GitHub Pages routing)
  if (!search && typeof window !== 'undefined' && window.location.hash.includes('vk_')) {
    const qIndex = window.location.hash.indexOf('?');
    if (qIndex !== -1) {
      search = window.location.hash.slice(qIndex);
    } else {
      search = window.location.hash.slice(1);
    }
  }

  if (!search) return {};

  let clean = search;
  const qIndex = clean.indexOf('?');
  if (qIndex !== -1) {
    clean = clean.slice(qIndex + 1);
  } else if (clean.startsWith('#')) {
    clean = clean.slice(1);
  }

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
 * Get active VK Bridge instance (window.vkBridge if defined, otherwise official @vkontakte/vk-bridge)
 */
export function getVkBridge() {
  if (typeof window !== 'undefined' && (window as any).vkBridge) {
    return (window as any).vkBridge;
  }
  return officialVkBridge;
}

/**
 * Detect if the application is currently running inside VK Mini App
 */
export function isVkMiniApp(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Check vk_* query parameters in URL (primary indicator of VK Mini App launch)
  const launchParams = parseVkLaunchParams();
  if (launchParams.vk_user_id || launchParams.vk_app_id || launchParams.vk_platform) {
    return true;
  }

  // 2. Check if running inside VK mobile WebView
  const bridge = getVkBridge();
  if (typeof bridge?.isWebView === 'function' && bridge.isWebView()) {
    return true;
  }

  // 3. Check if cached VK user exists
  if (cachedVkUser) {
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

export interface VkViewSettings {
  statusBarStyle?: 'light' | 'dark';
  actionBarColor?: string;
  navigationBarColor?: string;
}

let cachedVkUser: VkUser | null = null;

export function getCachedVkUser(): VkUser | null {
  return cachedVkUser;
}

export function setCachedVkUser(user: VkUser | null): void {
  cachedVkUser = user;
}

/**
 * Configure VK Mini App View Settings (Status Bar and Action Bar colors)
 */
export async function setVkViewSettings(settings?: VkViewSettings): Promise<boolean> {
  const bridge = getVkBridge();
  if (!bridge || typeof bridge.send !== 'function') {
    return false;
  }

  try {
    await bridge.send('VKWebAppSetViewSettings', {
      status_bar_style: settings?.statusBarStyle || 'dark',
      action_bar_color: settings?.actionBarColor || '#ffffff',
      navigation_bar_color: settings?.navigationBarColor || '#ffffff',
    });
    return true;
  } catch {
    // Unsupported on some desktop/web contexts
    return false;
  }
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
  let user: VkUser | null = cachedVkUser;

  if (typeof window === 'undefined') {
    return { success: false, user: null, launchParams };
  }

  // 1. If vk_user_id is present in launch params, initialize minimal user fallback
  if (!user && launchParams.vk_user_id) {
    user = {
      id: launchParams.vk_user_id,
      first_name: 'Пользователь VK',
    };
  }

  // 2. Call VKWebAppInit & SetViewSettings if bridge is available and running inside VK
  const isInsideVk = isVkMiniApp();
  const bridge = getVkBridge();
  if (bridge && typeof bridge.send === 'function' && isInsideVk) {
    try {
      // Subscribe to VK Bridge events for dynamic safe-area insets
      if (typeof bridge.subscribe === 'function') {
        bridge.subscribe((event: any) => {
          if (event?.detail?.type === 'VKWebAppUpdateConfig') {
            const insets = event.detail.data?.insets;
            if (insets && typeof document !== 'undefined') {
              const root = document.documentElement;
              if (insets.top != null) root.style.setProperty('--vk-safe-area-top', `${insets.top}px`);
              if (insets.right != null) root.style.setProperty('--vk-safe-area-right', `${insets.right}px`);
              if (insets.bottom != null) root.style.setProperty('--vk-safe-area-bottom', `${insets.bottom}px`);
              if (insets.left != null) root.style.setProperty('--vk-safe-area-left', `${insets.left}px`);
            }
          }
        });
      }

      await bridge.send('VKWebAppInit');
      await setVkViewSettings({
        statusBarStyle: 'dark',
        actionBarColor: '#ffffff',
        navigationBarColor: '#ffffff',
      });

      try {
        const userInfo = await bridge.send('VKWebAppGetUserInfo');
        if (userInfo && userInfo.id) {
          user = {
            ...(user || {}),
            ...userInfo,
          };
        }
      } catch {
        // User info may require permissions; fallback to launchParams
      }

      cachedVkUser = user;
      return { success: true, user, launchParams };
    } catch (e) {
      console.warn('[VK Bridge] Ошибка вызова VKWebAppInit:', e);
    }
  }

  cachedVkUser = user;
  return { success: isVkMiniApp(), user, launchParams };
}

/**
 * Request native VK permission for bot community messages (VKWebAppAllowMessagesFromGroup)
 * and/or push notifications inside VK Mini App
 */
export async function requestVkNotificationsPermission(groupId: number = 242573933): Promise<{ success: boolean; error?: string }> {
  const bridge = getVkBridge();
  if (!bridge || typeof bridge.send !== 'function') {
    return { success: false, error: 'VK Bridge недоступен вне клиента ВКонтакте' };
  }

  try {
    const res = await bridge.send('VKWebAppAllowMessagesFromGroup', { group_id: groupId });
    if (res?.result) {
      return { success: true };
    }
  } catch (e: any) {
    // If user already gave permission or dismissed without fatal block
    const reason = e?.error_data?.error_reason || '';
    if (reason.includes('already') || e?.error_type === 'client_error') {
      return { success: true };
    }
    return { success: false, error: e?.error_data?.error_description || reason || e?.message || 'Разрешение не получено' };
  }

  return { success: true };
}

/**
 * Direct request for current VK User profile
 */
export async function getVkUserProfile(): Promise<VkUser | null> {
  if (cachedVkUser) return cachedVkUser;
  const res = await initVkBridge();
  return res.user;
}

export type VkHapticImpactStyle = 'light' | 'medium' | 'heavy';
export type VkHapticNotificationType = 'success' | 'warning' | 'error';

/**
 * Trigger haptic/taptic feedback in VK Mini App
 */
export function triggerVkHaptic(
  type: 'impact' | 'notification' | 'selection' = 'impact',
  styleOrResult?: VkHapticImpactStyle | VkHapticNotificationType | string
) {
  const bridge = getVkBridge();
  if (!bridge || typeof bridge.send !== 'function') return;

  try {
    if (type === 'notification') {
      const resType =
        styleOrResult === 'warning' || styleOrResult === 'error' ? styleOrResult : 'success';
      bridge.send('VKWebAppTapticNotificationOccurred', { result_type: resType }).catch(() => {});
    } else if (type === 'selection') {
      bridge.send('VKWebAppTapticSelectionChanged', {}).catch(() => {});
    } else {
      const style =
        styleOrResult === 'medium' || styleOrResult === 'heavy' ? styleOrResult : 'light';
      bridge.send('VKWebAppTapticImpactOccurred', { style }).catch(() => {});
    }
  } catch {
    // Ignore haptic errors on unsupported platforms
  }
}
